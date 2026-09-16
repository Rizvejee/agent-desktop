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

  // Right click context menu
const { Menu, MenuItem } = require("electron");

mainWindow.webContents.on("context-menu", (event, params) => {
  const menu = new Menu();

  if (params.selectionText) {
    menu.append(new MenuItem({
      label: "Copy",
      click: () => mainWindow.webContents.copy(),
    }));
  }

  if (params.isEditable) {
    menu.append(new MenuItem({
      label: "Cut",
      click: () => mainWindow.webContents.cut(),
    }));
    menu.append(new MenuItem({
      label: "Paste",
      click: () => mainWindow.webContents.paste(),
    }));
    menu.append(new MenuItem({
      label: "Select All",
      click: () => mainWindow.webContents.selectAll(),
    }));
  }

  if (menu.items.length > 0) {
    menu.popup();
  }
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

    // settings سے provider اور model لوڈ کریں
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));

      // model client کو settings کے مطابق بنائیں
      const ModelClient = require("../agent-src/modelClient");
      const provider = settings.provider || "groq";

      let config = {};
      switch (provider) {
        case "groq":
          config = {
            apiKey: settings.groqApiKey || process.env.GROQ_API_KEY,
            model: settings.groqModel || "openai/gpt-oss-120b",
          };
          break;
        case "gemini":
          config = {
            apiKey: settings.geminiApiKey || process.env.GEMINI_API_KEY,
            model: settings.geminiModel || "gemini-2.0-flash",
          };
          break;
        case "ollama":
          config = {
            baseURL: settings.ollamaUrl || "http://localhost:11434/v1",
            model: settings.ollamaModel || "llama3.2",
          };
          break;
      }

      agentInstance.modelClient = new ModelClient(provider, config);

      // agent settings بھی apply کریں
      if (settings.agentSettings) {
        agentInstance.systemPrompt = agentInstance.buildSystemPrompt(
          settings.agentSettings
        );
      }
    }
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

    const originalExecuteTool = agent.toolHandler.executeTool.bind(agent.toolHandler);
    agent.toolHandler.executeTool = async (toolName, toolInput) => {
      event.sender.send("tool-status", {
        status: "running",
        tool: toolName,
        input: toolInput,
      });

      const result = await originalExecuteTool(toolName, toolInput);

      event.sender.send("tool-status", {
        status: "done",
        tool: toolName,
        input: toolInput,
      });

      return result;
    };

    let response;

    if (message.startsWith("/")) {
      response = await agent.handleCommand(message);
      return { success: true, response };
    } else {
      // streaming mode
      let fullResponse = "";

      await agent.chat(message, (chunk) => {
        if (chunk === null) {
          // tool call شروع ہو رہی ہے
          event.sender.send("chat-stream", { type: "tool" });
        } else {
          fullResponse += chunk;
          event.sender.send("chat-stream", { type: "chunk", chunk });
        }
      });

      event.sender.send("chat-stream", { type: "done" });
      return { success: true, response: fullResponse };
    }
  } catch (error) {
    event.sender.send("chat-stream", { type: "error", error: error.message });
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
    // agent reset کریں تاکہ نئی settings apply ہوں
    agentInstance = null;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Knowledge Files ─────────────────────────────────
ipcMain.handle("get-knowledge-files", async (event, { projectId }) => {
  try {
    const dir = path.join(getProjectDir(projectId), "knowledge");
    if (!fs.existsSync(dir)) return { success: true, files: [] };
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const result = files.map((file) => {
      const data = JSON.parse(
        fs.readFileSync(path.join(dir, file), "utf-8")
      );
      return data;
    });
    return { success: true, files: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-knowledge-file", async (event, { projectId, file }) => {
  try {
    const dir = path.join(getProjectDir(projectId), "knowledge");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${file.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-knowledge-file", async (event, { projectId, fileName }) => {
  try {
    const dir = path.join(getProjectDir(projectId), "knowledge");
    const filePath = path.join(dir, `${fileName}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Project Memory ──────────────────────────────────
ipcMain.handle("get-project-memory", async (event, { projectId }) => {
  try {
    const memoryFile = path.join(
      __dirname,
      "../memory/agent-memory.json"
    );
    if (!fs.existsSync(memoryFile)) {
      return { success: true, memory: "" };
    }
    const data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    const lines = [];
    if (data.preferences?.length > 0) {
      lines.push("PREFERENCES:");
      data.preferences.forEach((p) => lines.push(`  - ${p}`));
    }
    if (data.projectDecisions?.length > 0) {
      lines.push("\nPROJECT DECISIONS:");
      data.projectDecisions.forEach((d) => lines.push(`  - ${d}`));
    }
    if (data.completedTasks?.length > 0) {
      lines.push("\nCOMPLETED TASKS:");
      data.completedTasks.forEach((t) => lines.push(`  - ${t}`));
    }
    if (data.notes?.length > 0) {
      lines.push("\nNOTES:");
      data.notes.forEach((n) => lines.push(`  - ${n}`));
    }
    return { success: true, memory: lines.join("\n") };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Rename Chat ─────────────────────────────────────
ipcMain.handle("rename-chat", async (event, { projectId, chatId, newTitle }) => {
  try {
    const chatsDir = getChatsDir(projectId);
    const chatFile = path.join(chatsDir, `${chatId}.json`);
    if (!fs.existsSync(chatFile)) {
      return { success: false, error: "Chat not found" };
    }
    const chat = JSON.parse(fs.readFileSync(chatFile, "utf-8"));
    chat.title = newTitle;
    chat.updatedAt = Date.now();
    fs.writeFileSync(chatFile, JSON.stringify(chat, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Terminal ───────────────────────────────────────
ipcMain.handle("run-terminal-command", async (event, { command, projectPath }) => {
  return new Promise((resolve) => {
    const { exec } = require("child_process");

    const allowedCommands = [
      "npm", "npx", "node", "ls", "pwd", "cat",
      "mkdir", "touch", "git", "yarn", "pnpm",
      "expo", "react-native", "next",
    ];

    const commandName = command.trim().split(" ")[0];
    const isAllowed = allowedCommands.some(
      (allowed) => commandName === allowed
    );

    if (!isAllowed) {
      resolve({
        success: false,
        output: `Command not allowed: "${commandName}"\nAllowed: ${allowedCommands.join(", ")}`,
      });
      return;
    }

    exec(
      command,
      {
        cwd: projectPath || require("os").homedir(),
        timeout: 60000,
        maxBuffer: 1024 * 1024 * 5,
      },
      (error, stdout, stderr) => {
        if (error && !stdout) {
          resolve({
            success: false,
            output: stderr || error.message,
          });
          return;
        }
        resolve({
          success: true,
          output: stdout + (stderr ? `\n${stderr}` : ""),
        });
      }
    );
  });
});

// ─── IPC: File Tree (VS Code style) ─────────────────────
ipcMain.handle("list-files-tree", async (event, { projectPath }) => {
  try {
    const ignored = [
      "node_modules", ".git", ".next", "dist", "build",
      ".expo", ".cache", ".vite", "coverage",
    ];

    const buildTree = (dirPath, relativePath = "") => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const result = [];

      for (const item of items) {
        // hidden files اور ignored folders skip کریں
        if (item.name.startsWith(".")) continue;
        if (item.isDirectory() && ignored.includes(item.name)) continue;

        const itemRelative = relativePath
          ? `${relativePath}/${item.name}`
          : item.name;

        if (item.isDirectory()) {
          result.push({
            name: item.name,
            type: "folder",
            path: itemRelative,
            children: buildTree(path.join(dirPath, item.name), itemRelative),
          });
        } else {
          result.push({
            name: item.name,
            type: "file",
            path: itemRelative,
          });
        }
      }

      // folders پہلے، پھر files — دونوں alphabetical
      result.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "folder" ? -1 : 1;
      });

      return result;
    };

    const tree = buildTree(projectPath);
    return { success: true, tree };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ─── IPC: Read File Content ─────────────────────────────
ipcMain.handle("read-file-content", async (event, { projectPath, filePath }) => {
  try {
    const fullPath = path.join(projectPath, filePath);
    // security: project کے باہر نہ جائے
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(projectPath))) {
      return { success: false, error: "Access denied" };
    }
    const content = fs.readFileSync(fullPath, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
