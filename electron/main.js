const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const isDev = process.env.NODE_ENV !== "production";
let mainWindow;

// ─── Window ──────────────────────────────────────────────
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
    show: false,
    backgroundColor: "#ffffff",
  });

  if (isDev) {
    const tryLoad = () => {
      mainWindow.loadURL("http://localhost:3000").catch(() => {
        setTimeout(tryLoad, 1000);
      });
    };
    tryLoad();
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
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ─── Agent ───────────────────────────────────────────────
let agentInstance = null;

function getAgent(projectPath) {
  if (!agentInstance || agentInstance.projectPath !== projectPath) {
    const Agent = require("../agent-src/agent");
    agentInstance = new Agent(projectPath);
  }
  return agentInstance;
}

// ─── Memory Path ─────────────────────────────────────────
const MEMORY_PATH = path.join(__dirname, "../memory/projects");

function getProjectDir(projectId) {
  const dir = path.join(MEMORY_PATH, projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getChatsDir(projectId) {
  const dir = path.join(getProjectDir(projectId), "chats");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── IPC: Agent ──────────────────────────────────────────
ipcMain.handle("chat-message", async (event, { message, projectPath, instructions }) => {
  try {
    const agent = getAgent(projectPath);
    if (instructions && instructions.trim()) {
      agent.systemPrompt = agent.systemPrompt.replace(
        /\nCUSTOM PROJECT INSTRUCTIONS:[\s\S]*?(?=\nMEMORY|\nPROJECT CONTEXT|$)/,
        ""
      );
      agent.systemPrompt += `\n\nCUSTOM PROJECT INSTRUCTIONS:\n${instructions}`;
    }
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

ipcMain.handle("list-files", async (event, { projectPath, subPath }) => {
  try {
    const agent = getAgent(projectPath);
    const result = agent.fileSystem.listFiles(subPath || "");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("reset-agent", async (event, { projectPath }) => {
  agentInstance = null;
  return { success: true };
});

// ─── IPC: Folder Picker ──────────────────────────────────
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Project Folder",
  });
  if (result.canceled) return { success: false };
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  return { success: true, path: folderPath, name: folderName };
});

// ─── IPC: Projects ───────────────────────────────────────
ipcMain.handle("get-projects", async () => {
  try {
    const projectsFile = path.join(__dirname, "../memory/projects.json");
    if (!fs.existsSync(projectsFile)) return { success: true, projects: [] };
    const data = JSON.parse(fs.readFileSync(projectsFile, "utf-8"));
    return { success: true, projects: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-projects", async (event, { projects }) => {
  try {
    const projectsFile = path.join(__dirname, "../memory/projects.json");
    const dir = path.dirname(projectsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Chats ──────────────────────────────────────────
ipcMain.handle("get-chats", async (event, { projectId }) => {
  try {
    const chatsDir = getChatsDir(projectId);
    const files = fs.readdirSync(chatsDir).filter((f) => f.endsWith(".json"));
    const chats = files.map((file) =>
      JSON.parse(fs.readFileSync(path.join(chatsDir, file), "utf-8"))
    );
    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    return { success: true, chats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-chat", async (event, { projectId, chat }) => {
  try {
    const chatsDir = getChatsDir(projectId);
    fs.writeFileSync(
      path.join(chatsDir, `${chat.id}.json`),
      JSON.stringify(chat, null, 2)
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-chat", async (event, { projectId, chatId }) => {
  try {
    const chatsDir = getChatsDir(projectId);
    const chatFile = path.join(chatsDir, `${chatId}.json`);
    if (fs.existsSync(chatFile)) fs.unlinkSync(chatFile);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Instructions ───────────────────────────────────
ipcMain.handle("get-instructions", async (event, { projectId }) => {
  try {
    const file = path.join(getProjectDir(projectId), "instructions.md");
    if (!fs.existsSync(file)) return { success: true, instructions: "" };
    return { success: true, instructions: fs.readFileSync(file, "utf-8") };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-instructions", async (event, { projectId, instructions }) => {
  try {
    const file = path.join(getProjectDir(projectId), "instructions.md");
    fs.writeFileSync(file, instructions, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Attachments ────────────────────────────────────
ipcMain.handle("read-attachment", async (event, { filePath }) => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
// ─── IPC: Settings ───────────────────────────────────────
const SETTINGS_FILE = path.join(__dirname, "../memory/settings.json");

ipcMain.handle("get-settings", async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { success: true, settings: {} };
    }
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    return { success: true, settings: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-settings", async (event, { settings }) => {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

    // API key اور model update کریں
    if (settings.apiKey) {
      process.env.GROQ_API_KEY = settings.apiKey;
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
