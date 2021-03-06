'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as wget from './wget';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { executeCommand, checkOutput } from './processtool';

var extensionPath: string

const HUSARION_TOOLS_URL = "https://cdn.atomshare.net/cc70b0184feefaf7ead3741c58f98200cf8e017b/HusarionTools-v3.exe";
const HUSARION_TOOLS_VERSION = "3";

class Extension {
    public context: vscode.ExtensionContext;
    public statusBarReady: boolean;
};

async function getVarsInfo(): Promise<Map<String, Array<String>>> {
    let out = await checkOutput([getToolsPath() + "ninja", "-C", vscode.workspace.rootPath, "printvars"], getExecuteOptions());
    var vars = new Map<String, Array<String>>();
    for (let line of out.split("\n")) {
        if (line.startsWith("VARS::") || line.startsWith("'VARS::")) {
            for (let expr of line.split("::").splice(1)) {
                let exprS = expr.split("=", 2);
                if (exprS.length != 2) continue;
                if (!(exprS[0] in vars)) vars[exprS[0]] = [];
                vars[exprS[0]].push(exprS[1]);
            }
        }
    }
    var myExtDir = vscode.extensions.getExtension("husarion.husarion").extensionPath;
    vars["include"].push(myExtDir + "/sdk/include/hCloudClient");
    vars["include"].push(myExtDir + "/sdk/include/hROS");
    return vars;
}

function getToolsPath() {
    if (process.platform == "win32")
        return path.normalize(extensionPath + '/../../HusarionTools/bin/');
    else
        return "";
}

function downloadFile(channel: vscode.OutputChannel, url: string, target: string) {
    return new Promise(function(resolve, reject) {
        channel.append("Downloading " + url + " ");
        let download = wget.download(url, target);
        var lastProgress = 0;
        download.on('progress', function (progress) {
            if (Math.floor(lastProgress * 40) != Math.floor(progress * 40)) {
                channel.append(".");
                lastProgress = progress;
            }
        });
        download.on('error', function(err) {
            channel.append("\nError: " + err);
            reject();
        });
        download.on('end', function(output) {
            channel.append(" OK\n");
            resolve();
        });
    });
}

async function downloadToolsIfNeeded() {
    if (process.platform != "win32") {
        // for other platforms, we only check if the tools are installed
        var requiredTools = ["arm-none-eabi-gcc", "arm-none-eabi-gdb", "cmake", "ninja"];
        var notOk = requiredTools.filter((name) => spawnSync("which " + name, {shell: true}).status != 0);
        if (notOk.length > 0) {
            vscode.window.showErrorMessage("To use Husarion extension, install the following programs: " + notOk.join(", ") + " (see docs.husarion.com)");
        }
        return;
    }

    let channel = vscode.window.createOutputChannel("Installing Husarion tools");
    channel.show(true);
    const versionFile = extensionPath + "/../../HusarionTools-version.txt";
    if (!fs.existsSync(versionFile) || fs.readFileSync(versionFile).toString("utf-8") != HUSARION_TOOLS_VERSION) {
        const installerPath = extensionPath + "/HusarionTools.exe";
        await downloadFile(channel, HUSARION_TOOLS_URL, installerPath);
        channel.append("Extracting...\n");
        await executeCommand("Extract Husarion Tools", [installerPath, "-y", "-o" + extensionPath + "/../../"], {}, true);
        channel.append("Done\n");
        fs.unlinkSync(installerPath);
        fs.writeFileSync(versionFile, HUSARION_TOOLS_VERSION);
    }
}

function getExecuteOptions() {
    var env = JSON.parse(JSON.stringify(process.env));
    if (process.platform == "win32")
        env['Path'] = getToolsPath() + ';' + env['Path'];
    return { cwd: vscode.workspace.rootPath, env: env };
}

function initStatusBar(self: Extension) {
    self.statusBarReady = true;
    const icons = [
        ["$(cloud-upload)", "Flash Husarion project", "extension.flashCORE2"],
        ["$(terminal)", "Open CORE2 serial console", "extension.consoleCORE2"],
    ];

    for (var i=0; i < icons.length; i++) {
        let item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100 + i);
        item.text = icons[i][0];
        item.tooltip = icons[i][1];
        item.command = icons[i][2];
        item.show();
        self.context.subscriptions.push(item);
    }
}

async function reloadProjectInfo(self: Extension, hard: boolean = false) {
    if (hard) {
        for (let name of ["CMakeCache.txt", "build.ninja", "rules.ninja"]) {
            let path = vscode.workspace.rootPath + "/" + name;
            if (fs.existsSync(path)) fs.unlinkSync(path);
        }
    }

    if (!self.statusBarReady)
        initStatusBar(self);

    if (!fs.existsSync(vscode.workspace.rootPath + "/CMakeCache.txt")) {
        await executeCommand("Husarion: initialize build",
            [getToolsPath() + "cmake", ".",
                "-GNinja", "-DCMAKE_MAKE_PROGRAM=ninja",
                "-DPORT=stm32",
                "-DBOARD_VERSION=1.0.0",
                "-DBOARD_TYPE=core2",
            "-DHFRAMEWORK_PATH=" + extensionPath + "/sdk"], getExecuteOptions());
    } else {
        let cmakeCache = fs.readFileSync(vscode.workspace.rootPath + "/CMakeCache.txt");
        let usesBuiltinSdk = cmakeCache.toString("utf-8").split("\n")
            .filter((line) => line.startsWith("HFRAMEWORK_PATH:") && line.indexOf(".vscode") != -1).length != 0;

        await executeCommand("Husarion: reload build", [getToolsPath() + "cmake", "."].concat(
            usesBuiltinSdk ? ["-DHFRAMEWORK_PATH=" + extensionPath + "/sdk"] : []), getExecuteOptions(), true);
    }

    let vars = await getVarsInfo();
    let vscodeDir = vscode.workspace.rootPath + "/.vscode";
    if (!fs.existsSync(vscodeDir))
        fs.mkdirSync(vscodeDir);

    fs.writeFileSync(vscodeDir + "/c_cpp_properties.json", JSON.stringify({
        "_comment": "Autogenerated by Husarion plugin",
        "configurations": [
            {
                "name": "Husarion",
                "includePath": vars["include"].concat(os.platform() == 'win32' ? [getToolsPath() + "/../arm-none-eabi/include/"] : ["/usr/include"]), // TODO: windows
                "defines": [
                    "BOARD_TYPE=CORE2",
                    "PORT=STM32",
                    "BOARD_VERSION=1.0.0"
                ],
                "browse": {
                    "limitSymbolsToIncludedHeaders": true,
                    "databaseFilename": ""
                }
            }
        ]
    }));

    let problemMatcher = {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "pattern": {
            "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
            "file": 1,
            "line": 2,
            "column": 3,
            "severity": 4,
            "message": 5
        }
    };

    var taskOptions = {};
    if (process.platform == "win32") {
        taskOptions['env'] = {"Path": getToolsPath() + ';' + process.env.Path}
    }

    var initialTasks = [];
    if (fs.existsSync(vscodeDir + "/tasks.json")) {
        let tasksJson = JSON.parse(fs.readFileSync(vscodeDir + "/tasks.json").toString("UTF-8"));
        if (tasksJson["version"] == "2.0.0") {
            for (let task of tasksJson["tasks"]) {
                if (task["taskName"] != "build" && task["taskName"] != "flash")
                    initialTasks.push(task);
            }
        }
    }

    initialTasks = initialTasks.concat([
        {
            "taskName": "build",
            "command": getToolsPath() + "ninja",
            "options": taskOptions,
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "presentation": {
                "echo": true,
                "reveal": "silent",
                "focus": false,
                "panel": "shared"
            },
            "problemMatcher": problemMatcher
            },
        {
            "taskName": "flash",
            "command": getToolsPath() + "ninja",
            "options": taskOptions,
            "args": ["flash"],
            "problemMatcher": problemMatcher
        }
    ]);

    fs.writeFileSync(vscodeDir + "/tasks.json", JSON.stringify({
        "_comment": "Autogenerated by Husarion plugin",
        "version": "2.0.0",
        "tasks": initialTasks
    }, null, 4));

    let debuggerInfo = {
        "MIMode": "gdb"
    };
    let mainExeName = vars["main_executable"][0];

    if (process.platform == "win32") {
        fs.writeFileSync(vscodeDir + "/debugger.bat",
            `set PATH=${getToolsPath()};%PATH%
cd ${vscode.workspace.rootPath} || exit 1
start /wait st-flash write ${mainExeName}.bin 0x08010000 || exit 1
start st-util
arm-none-eabi-gdb %*`);
    } else {
        const termCommand = (process.platform == "darwin") ?
            `osascript -e 'tell application "Terminal" to activate do script "cat ${vscode.workspace.rootPath}/.term"'` :
            `x-terminal-emulator -e "cat $PWD/.term" &`;
        fs.writeFileSync(vscodeDir + "/debugger.bat",
            `#!/bin/bash
        cd ${vscode.workspace.rootPath} || exit 1
        rm .term 2>/dev/null
        mkfifo .term
        ${termCommand}

        (
            echo "Flashing application..."
            st-flash write ${mainExeName}.bin 0x08010000
            if [ $? != 0 ]; then
                echo st-flash failed
                # hold fd
                sleep 10 & 
                exit 1
            fi) > .term 2>&1 || exit 1
        st-util & pid=$!
        trap "kill $pid" EXIT
        sleep 0.5
        rm .term
        arm-none-eabi-gdb "$@"`);
        fs.chmodSync(vscodeDir + "/debugger.bat", 0o755);
    }

    fs.writeFileSync(vscodeDir + "/launch.json", JSON.stringify({
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Flash to CORE2",
                "type": "cppdbg",
                "request": "launch",
                "program": "${workspaceRoot}/" + mainExeName + ".elf",
                "args": [],
                "stopAtEntry": false,
                "cwd": "${workspaceRoot}",
                "env": {
                    "GDBWRAPPER_FLASH": "true",
                },
                "miDebuggerPath": vscodeDir + "/debugger.bat",
                "miDebuggerServerAddress": "localhost:4242",
                "externalConsole": true,
                "linux": debuggerInfo,
                "windows": debuggerInfo,
            }, // TODO: request "attach"
        ]
    }))
}

async function setupProject(self: Extension) {
    console.log(vscode.workspace.rootPath);
    if (!fs.existsSync(vscode.workspace.rootPath + "/main.cpp")) {
        fs.writeFileSync(vscode.workspace.rootPath + "/main.cpp", fs.readFileSync(extensionPath + "/sdk/project_template/main.cpp"))
    }

    fs.writeFileSync(vscode.workspace.rootPath + "/CMakeLists.txt", fs.readFileSync(extensionPath + "/sdk/project_template/CMakeLists.txt"));

    const gitignore = "# These file are generated by Husarion VSCode extension\n\n" +
        "/.vscode/c_cpp_properties.json\n/.vscode/tasks.json\n/.vscode/launch.json\n/CMakeCache.txt\n/CMakeFiles\nMakefile\n*.ninja\n*.hex\n*.elf\n*.bin\ncmake_install.cmake\n.ninja_deps\n.ninja_log\n";
    if (fs.existsSync(vscode.workspace.rootPath + "/.gitignore")) {
        fs.appendFileSync(vscode.workspace.rootPath + "/.gitignore", gitignore);
    } else {
        fs.writeFileSync(vscode.workspace.rootPath + "/.gitignore", gitignore);
    }

    await reloadProjectInfo(self);
}

async function reconfigure(name: string, value: string) {
    await executeCommand("Husarion: reconfigure", [getToolsPath() + "cmake", ".", "-D" + name + "=" + value], getExecuteOptions());
}

async function changeHusarionProjectVariable(self: Extension) {
    let resp = await vscode.window.showQuickPick([
        { description: "SDK path", label: "HFRAMEWORK_PATH" },
        { description: "Target board type", label: "BOARD_TYPE" },
        { description: "Target board version", label: "BOARD_VERSION" },
        { description: "Debug information", label: "DEBUG" },
    ])
    if (!resp) return;
    if (resp.label == "HFRAMEWORK_PATH") {
        await reconfigure(resp.label, await vscode.window.showInputBox({ "prompt": "Path to hFramework" }));
    } else if (resp.label == "BOARD_TYPE") {
        await reconfigure(resp.label, await vscode.window.showQuickPick(["core2", "core2mini", "robocore"]));
    } else if (resp.label == "BOARD_VERSION") {
        await reconfigure(resp.label, await vscode.window.showQuickPick(["1.0.0", "0.1.0", "0.2.0"]));
    } else if (resp.label == "DEBUG") {
        await reconfigure(resp.label, await vscode.window.showQuickPick(["true", "false"]));
    }
    await reloadProjectInfo(self);
}

function openTerminal(name: string, ninjaCmd: string) {
    let defaultShell = process.platform == "win32" ? process.env.windir + "\\system32\\cmd.exe" : undefined;
    let terminal = vscode.window.createTerminal(name, defaultShell);
    terminal.show(true);
    if (process.platform == "win32") {
        terminal.sendText("set PATH=%PATH%;" + getToolsPath());
        if (ninjaCmd)
            terminal.sendText("\"" + getToolsPath() + "ninja\" " + ninjaCmd);
    } else {
        if (ninjaCmd)
            terminal.sendText("ninja " + ninjaCmd);
    }
}

export async function activate(context: vscode.ExtensionContext) {
    const extension = vscode.extensions.getExtension("husarion.husarion");
    extensionPath = extension.extensionPath;
    let self = new Extension();
    self.context = context;
    self.statusBarReady = false;

    await downloadToolsIfNeeded();

    context.subscriptions.push(vscode.commands.registerCommand('extension.createHusarionProject', async () => {
        if (!vscode.workspace.rootPath) {
            vscode.window.showErrorMessage("Please open a project directory first (use File > Open).");
            return;
        }

        var cmakeListsPath = vscode.workspace.rootPath + '/CMakeLists.txt';

        if (fs.existsSync(cmakeListsPath)) {
            vscode.window.showErrorMessage("CMakeLists.txt already exists in current workspace.");
            await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("file://" + cmakeListsPath));
            await reloadProjectInfo(self);
            return;
        }

        await setupProject(self);
    }));


    context.subscriptions.push(vscode.commands.registerCommand('extension.reloadHusarionProject', () => reloadProjectInfo(self, true)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.changeHusarionProjectVariable', () => changeHusarionProjectVariable(self)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.flashCORE2', () => {
        openTerminal("Flash", "flash");
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.consoleCORE2', () => {
        openTerminal("Serial console", "console");
    }));

    if (fs.existsSync(vscode.workspace.rootPath + '/CMakeLists.txt')) {
        reloadProjectInfo(self);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
