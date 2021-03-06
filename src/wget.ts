// (The MIT License)
//
// Copyright (c) 2012 Chengwei Wu <meegodevelop@gmail.com>
// Copyright (c) 2017 Husarion Inc
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// Based on code from github.com/bearjaws/node-wget
import * as http from 'http';
import * as https from 'https';
import * as tunnel from 'tunnel';
import * as url from 'url';
import * as zlib from 'zlib';
import * as fs from 'fs';
import {EventEmitter} from 'events';

/**
 * Downloads a file using http get and request
 * @param {string} src - The http URL to download from
 * @param {string} output - The filepath to save to
 * @param {object} options - Options object
 * @param {object} _parentEvent - Used for when their is a 302 redirect and need to maintain state to a new request
 * @param {number} redirects - The number of redirects, used to prevent infinite loops
 * @returns {*|EventEmitter}
 */
export function download(src: string, output: string, options = null, _parentEvent = null, redirects = 10) {
    var downloader = _parentEvent || new EventEmitter(),
        srcUrl,
        tunnelAgent,
        req;

    if (options) {
        options = parseOptions('download', options);
    } else {
        options = {
            gunzip: false
        };
    }
    srcUrl = url.parse(src);
    srcUrl.protocol = cleanProtocol(srcUrl.protocol);

    req = request({
        protocol: srcUrl.protocol,
        host: srcUrl.hostname,
        port: srcUrl.port,
        path: srcUrl.pathname + (srcUrl.search || ""),
        proxy: options?options.proxy:undefined,
        method: 'GET'
    }, function(res) {
        var fileSize: number, writeStream: fs.WriteStream, downloadedSize: number;
        var gunzip = zlib.createGunzip();

        // Handle 302 redirects
        if(res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
            redirects++;
            if(redirects >= 10) {
                downloader.emit('error', 'Infinite redirect loop detected');
            }
            download(res.headers.location, output, options, downloader, redirects);
        }

        if (res.statusCode === 200) {
            downloadedSize = 0;
            fileSize = res.headers['content-length'];
            writeStream = fs.createWriteStream(output, {
                flags: 'w+',
                encoding: 'binary'
            });

            res.on('error', function(err) {
                writeStream.end();
                writeStream.close();
                downloader.emit('error', err);
            });

            var encoding = "";
            if(typeof res.headers['content-encoding'] === "string") {
                encoding = res.headers['content-encoding'];
            }

            // If the user has specified to unzip, and the file is gzip encoded, pipe to gunzip
            if(options.gunzip === true && encoding === "gzip") {
                res.pipe(gunzip);
            } else {
                res.pipe(writeStream);
            }

            //emit a start event so the user knows the file-size he's gonna receive
            downloader.emit('start', fileSize);

            // Data handlers
            res.on('data', function(chunk) {
                downloadedSize += chunk.length;
                downloader.emit('progress', downloadedSize/fileSize);
            });
            gunzip.on('data', function(chunk) {
                writeStream.write(chunk);
            });

            writeStream.on('finish', function() {
                writeStream.on('close', function() {
                    downloader.emit('end', "Finished writing to disk");
                    req.end('finished');
                });
                writeStream.end();
                writeStream.close();
            });
        } else if(res.statusCode !== 200 && res.statusCode !== 301 && res.statusCode !== 302) {
            downloader.emit('error', 'Server responded with unhandled status: ' + res.statusCode);
        }
    });

    req.end('done');
    req.on('error', function(err) {
        downloader.emit('error', err);
    });
    // Attach request to our EventEmitter for backwards compatibility, enables actions such as
    // req.abort();
    downloader.req = req;

    return downloader;
}

function request(options, callback) {
    var newOptions = {}, newProxy = {}, key;
    options = parseOptions('request', options);
    if (options.protocol === 'http') {
        if (options.proxy) {
            for (key in options.proxy) {
                if (key !== 'protocol') {
                    newProxy[key] = options.proxy[key];
                }
            }
            if (options.proxy.protocol === 'http') {
                options.agent = tunnel.httpOverHttp({proxy: newProxy});
            } else if (options.proxy.protocol === 'https') {
                options.agent = tunnel.httpOverHttps({proxy: newProxy});
            } else {
                throw options.proxy.protocol + ' proxy is not supported!';
            }
        }
        for (key in options) {
            if (key !== 'protocol' && key !== 'proxy') {
                newOptions[key] = options[key];
            }
        }
        return http.request(newOptions, callback);
    }
    if (options.protocol === 'https') {
        if (options.proxy) {
            for (key in options.proxy) {
                if (key !== 'protocol') {
                    newProxy[key] = options.proxy[key];
                }
            }
            if (options.proxy.protocol === 'http') {
                options.agent = tunnel.httpsOverHttp({proxy: newProxy});
            } else if (options.proxy.protocol === 'https') {
                options.agent = tunnel.httpsOverHttps({proxy: newProxy});
            } else {
                throw options.proxy.protocol + ' proxy is not supported!';
            }
        }
        for (key in options) {
            if (key !== 'protocol' && key !== 'proxy') {
                newOptions[key] = options[key];
            }
        }
        return https.request(newOptions, callback);
    }
    throw 'only allow http or https request!';
}

function parseOptions(type, options) {
    var proxy;
    if (type === 'download') {
        if (options.proxy) {
            if (typeof options.proxy === 'string') {
                proxy = url.parse(options.proxy);
                options.proxy = {};
                options.proxy.protocol = cleanProtocol(proxy.protocol);
                options.proxy.host = proxy.hostname;
                options.proxy.port = proxy.port;
                options.proxy.proxyAuth = proxy.auth;
                options.proxy.headers = {'User-Agent': 'Node'};
            }
        }
        return options;
    }
    if (type === 'request') {
        if (!options.protocol) {
            options.protocol = 'http';
        }
        options.protocol = cleanProtocol(options.protocol);

        if (options.proxy) {
            if (typeof options.proxy === 'string') {
                proxy = url.parse(options.proxy);
                options.proxy = {};
                options.proxy.protocol = cleanProtocol(proxy.protocol);
                options.proxy.host = proxy.hostname;
                options.proxy.port = proxy.port;
                options.proxy.proxyAuth = proxy.auth;
                options.proxy.headers = {'User-Agent': 'Node'};
            }
        }

        options.gunzip = options.gunzip || false;
        return options;
    }
}

function cleanProtocol(str) {
    return str.trim().toLowerCase().replace(/:$/, '');
}
