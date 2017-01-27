import * as vscode from 'vscode';
import { execFile } from 'child_process';

export function executeCommand(title: string, command: Array<string>, options: any, hide: boolean = false): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let channel = vscode.window.createOutputChannel(title);
        if (!hide)
            channel.show(true);

        let process = execFile(command[0], command.slice(1), options)
        channel.appendLine('[Running ' + command.join(" ") + ']');

        process.stdout.on('data', (data: Buffer) => {
            channel.append(data.toString("utf8"));
        });

        process.stderr.on('data', (data: Buffer) => {
            channel.append(data.toString("utf8"));
        });

        process.on('close', (code) => {
            if (code == 0) {
                resolve();
            } else {
                if (hide) channel.show(true);
                reject("command " + command + " failed with code " + code);
            }
        });
    });
}

export function checkOutput(command: Array<string>): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        execFile(command[0], command.slice(1), (error, stdout, stderr) => {
            if (error)
                reject("command finished with an error: " + error + " stderr: " + stderr);
            else
                resolve(stdout);
        });
    });
}