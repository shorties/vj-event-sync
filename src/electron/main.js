const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        frame: false, // Custom frame
        titleBarStyle: 'hidden',
        backgroundColor: '#1a1a1a'
    });

    // In development, load from webpack dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:8080');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built files
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    // Handle window state
    const windowState = store.get('windowState', {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined
    });

    if (windowState.x !== undefined && windowState.y !== undefined) {
        mainWindow.setPosition(windowState.x, windowState.y);
    }
    mainWindow.setSize(windowState.width, windowState.height);

    mainWindow.on('close', () => {
        const { width, height, x, y } = mainWindow.getBounds();
        store.set('windowState', { width, height, x, y });
    });
}

// Custom window controls
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

// Handle app lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle server process
ipcMain.on('start-server', async () => {
    try {
        const server = require('../server/index');
        serverProcess = server;
        mainWindow.webContents.send('server-started');
    } catch (error) {
        mainWindow.webContents.send('server-error', error.message);
    }
});

ipcMain.on('stop-server', async () => {
    if (serverProcess) {
        try {
            await serverProcess.close();
            serverProcess = null;
            mainWindow.webContents.send('server-stopped');
        } catch (error) {
            mainWindow.webContents.send('server-error', error.message);
        }
    }
}); 