const path = require("path");
const { app, BrowserWindow } = require("electron");

let mainWindow;
let splash;

function createWindow() {
  // Splash screen
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
  });
  splash.loadFile(path.join(__dirname, "splash.html"));

  // Main window (hidden at first)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // ✅ don’t show until ready
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    // Production build
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    // Dev server
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  }

  // When main window is ready, hide splash and show app
  mainWindow.once("ready-to-show", () => {
    splash.destroy();
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);
