const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const isDev = process.env.NODE_ENV !== "production";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    show: false,
    backgroundColor: "#ffffff",
  });

  // dev میں localhost، production میں build folder
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Agent کو IPC کے ذریعے چلائیں
let agentInstance = null;

function getAgent(projectPath) {
  if (!agentInstance || agentInstance.projectPath !== projectPath) {
    const Agent = require("../agent-src/agent");
    agentInstance = new Agent(projectPath);
  }
  return agentInstance;
}

// chat message handle کریں
ipcMain.handle("chat-message", async (event, { message, projectPath }) => {
  try {
    const agent = getAgent(projectPath);

    let response;
    if (message.startsWith("/")) {
      response = await agent.handleCommand(message);
    } else {
      response = await agent.chat(message);
    }

    return { success: true, response };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// project files list کریں
ipcMain.handle("list-files", async (event, { projectPath, subPath }) => {
  try {
    const agent = getAgent(projectPath);
    const result = agent.fileSystem.listFiles(subPath || "");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// agent reset کریں
ipcMain.handle("reset-agent", async (event, { projectPath }) => {
  agentInstance = null;
  return { success: true };
});