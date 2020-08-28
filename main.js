const {shell, app, BrowserWindow, Menu, dialog} = require('electron');

global.arguments = process.argv;

function createWindow()
{
    var win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        },
        title: "Mesh Viewer",
        icon: __dirname + "/src/icon.png"
    });

    if(app.requestSingleInstanceLock()){
        app.on("second-instance", (e, args, dir) => {
            if(args.length > 1){
                file = args[1];
                win.webContents.send("open", file);
                win.focus();
            }
        });
    } else {
        app.quit();
    }

    var menu = [
        {
            label: "File",
            submenu: [
                {
                    label: "Open File",
                    accelerator: "CommandOrControl+O",
                    click: () => {
                        dialog.showOpenDialog({
                            title: "Select an 3D file",
                            filters: [
                                {
                                    name: 'All supported files',
                                    extensions: ['obj', 'fbx', 'gltf', 'glb', 'jpg', 'jpeg', 'png']
                                },
                                {
                                    name: 'OBJ File with MTL',
                                    extensions: ['obj']
                                },
                                {
                                    name: "FBX File",
                                    extensions: ['fbx'],
                                },
                                {
                                    name: "GLTF File",
                                    extensions: ['gltf', 'glb']
                                },
                                {
                                    name: "Image (Texture) File",
                                    extensions: ['jpg', 'jpeg', 'png'],
                                }
                                // {
                                //     name: "STL File",
                                //     extensions: ['stl'],
                                // }
                            ],
                            properties: ['openFile']
                        }).then(result => {
                            if(result.filePaths.length > 0){
                                let file = result.filePaths[0];
                                win.webContents.send("open", file);
                            }
                        });
                    }
                },
                {
                    label: "Quit",
                    role: "quit"
                }
            ],
        },
        {
            label: "Help",
            submenu: [
                // {
                //     label: "Toggle Developer Tools",
                //     role: "toggleDevTools"
                // },
                {
                    label: "GitHub Repository",
                    click: () => {
                        shell.openExternal("https://github.com/rbfraphael/meshviewer");
                    }
                },
                {
                    label: "About",
                    click: () => {
                        let msg = "Created by: RBFraphael (rbfraphael.com.br)";
                        msg += "\nVersion: 1.0.6";
                        msg += "\nRepository: github.com/rbfraphael/meshviewer";
                        dialog.showMessageBox(win, {
                            title: "About Mesh Viewer",
                            message: msg,
                            buttons: ['Thanks!']
                        });
                    }
                }
            ],
        }
    ];

    var winMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(winMenu);

    win.loadFile(__dirname + "/src/index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if(process.platform != "darwin"){
        app.quit();
    }
});

app.on("activate", () => {
    if(BrowserWindow.getAllWindows().length == 0){
        createWindow();
    }
});
