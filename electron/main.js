const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require("electron");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ═══════════════════════════════════════════════════════
// CONSTANTS (✅ سب اوپر — hoisting issue fix)
// ═══════════════════════════════════════════════════════
const MEMORY_PATH = path.join(__dirname, "../memory/projects");
const SETTINGS_FILE = path.join(__dirname, "../memory/settings.json");
const PROJECTS_FILE = path.join(__dirname, "../memory/projects.json");
const isDev = process.env.NODE_ENV !== "production";

// ═══════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════
let mainWindow;
let agentInstance = null;
let currentProjectId = null; // ✅ Track current project

// ═══════════════════════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════════════════════
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: "#ffffff",
  });

  // ✅ Right-click context menu
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new Menu();
    if (params.selectionText) {
      menu.append(new MenuItem({
        label: "Copy",
        click: () => mainWindow.webContents.copy(),
      }));
    }
    if (params.isEditable) {
      menu.append(new MenuItem({ label: "Cut", click: () => mainWindow.webContents.cut() }));
      menu.append(new MenuItem({ label: "Paste", click: () => mainWindow.webContents.paste() }));
      menu.append(new MenuItem({ label: "Select All", click: () => mainWindow.webContents.selectAll() }));
    }
    if (menu.items.length > 0) menu.popup();
  });

  if (isDev) {
    const tryLoad = () => {
      mainWindow.loadURL("http://localhost:3000").catch(() => setTimeout(tryLoad, 1000));
    };
    tryLoad();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
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

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════
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

function getKnowledgeDir(projectId) {
  const dir = path.join(getProjectDir(projectId), "knowledge");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ═══════════════════════════════════════════════════════
// 🔒 PATH VALIDATION (Security)
// ═══════════════════════════════════════════════════════
function validateProjectPath(filePath, projectPath) {
  const resolved = path.resolve(filePath);
  const projectResolved = path.resolve(projectPath);

  if (resolved !== projectResolved && !resolved.startsWith(projectResolved + path.sep)) {
    throw new Error(`Access denied: path escapes project directory`);
  }
  return resolved;
}

function isAllowedProjectPath(filePath) {
  // Check if file belongs to any registered project
  if (!fs.existsSync(PROJECTS_FILE)) return false;

  try {
    const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8"));
    const resolved = path.resolve(filePath);
    return projects.some(p => {
      const projResolved = path.resolve(p.path);
      return resolved === projResolved || resolved.startsWith(projResolved + path.sep);
    });
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// 🤖 AGENT MANAGEMENT (✅ Fix: ہر بار نیا نہیں بنائے گا)
// ═══════════════════════════════════════════════════════
function getAgent(projectPath, projectId) {
  // ✅ صرف تب نیا بنائیں جب project بدل گیا ہو یا agent null ہو
  if (agentInstance &&
      agentInstance.projectPath === projectPath &&
      currentProjectId === projectId) {
    return agentInstance;
  }

  const Agent = require("../agent-src/agent");
  const ModelClient = require("../agent-src/modelClient");

  const projectMemoryPath = projectId
    ? path.join(MEMORY_PATH, projectId)
    : path.join(__dirname, "../memory");

  if (!fs.existsSync(projectMemoryPath)) {
    fs.mkdirSync(projectMemoryPath, { recursive: true });
  }

  agentInstance = new Agent(projectPath, projectMemoryPath);
  currentProjectId = projectId;

  // Settings لوڈ کریں
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      const provider = settings.provider || "groq";
      let config = {};

      switch (provider) {
        case "groq":
          config = {
            apiKey: settings.groqApiKey || process.env.GROQ_API_KEY,
            model: settings.groqModel || "llama-3.3-70b-versatile",
          };
          break;
        case "gemini":
          config = {
            apiKey: settings.geminiApiKey || process.env.GEMINI_API_KEY,
            model: settings.geminiModel || "gemini-1.5-flash",
          };
          break;
        case "ollama":
          config = {
            baseURL: settings.ollamaUrl || "http://localhost:11434",
            model: settings.ollamaModel || "llama3.2",
          };
          break;
      }

      agentInstance.modelClient = new ModelClient(provider, config);

      if (settings.agentSettings) {
        agentInstance.systemPrompt = agentInstance.buildSystemPrompt(settings.agentSettings);
      }

      console.log(`✅ Agent initialized: ${provider} / ${config.model}`);
    } catch (error) {
      console.error("❌ Error loading settings:", error);
    }
  } else {
    console.warn("⚠️ Settings file not found. Using defaults.");
  }

  return agentInstance;
}

// ═══════════════════════════════════════════════════════
// IPC: CHAT MESSAGE (✅ Streaming + Error handling)
// ═══════════════════════════════════════════════════════
ipcMain.handle("chat-message", async (event, { message, projectPath, instructions, projectId }) => {
  try {
    const agent = getAgent(projectPath, projectId);

    // Instructions append
    if (instructions && instructions.trim()) {
      agent.systemPrompt = agent.systemPrompt.replace(
        /\nCUSTOM PROJECT INSTRUCTIONS:[\s\S]*?(?=\nMEMORY|\nPROJECT CONTEXT|$)/,
        ""
      );
      agent.systemPrompt += `\nCUSTOM PROJECT INSTRUCTIONS:\n${instructions}`;
    }

    // Tool status wrapper
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
      let fullResponse = "";
      try {
        await agent.chat(message, (chunk) => {
          if (chunk === null) {
            event.sender.send("chat-stream", { type: "tool" });
          } else {
            fullResponse += chunk;
            event.sender.send("chat-stream", { type: "chunk", chunk });
          }
        });
        event.sender.send("chat-stream", { type: "done" });
        return { success: true, response: fullResponse };
      } catch (streamError) {
        event.sender.send("chat-stream", { type: "error", error: streamError.message });
        return { success: false, error: streamError.message };
      }
    }
  } catch (error) {
    event.sender.send("chat-stream", { type: "error", error: error.message });
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: LIST FILES (✅ projectId add)
// ═══════════════════════════════════════════════════════
ipcMain.handle("list-files", async (event, { projectPath, subPath, projectId }) => {
  try {
    const agent = getAgent(projectPath, projectId);
    const result = agent.fileSystem.listFiles(subPath || "");
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: RESET AGENT (✅ Smart reset)
// ═══════════════════════════════════════════════════════
ipcMain.handle("reset-agent", async (event, { projectPath, projectId }) => {
  // ✅ صرف تب reset کریں جب project بدل گیا ہو
  if (agentInstance &&
      agentInstance.projectPath === projectPath &&
      currentProjectId === projectId) {
    // Agent کو refresh کریں — conversation history رکھیں
    agentInstance.refreshSystemPrompt();
  } else {
    agentInstance = null;
    currentProjectId = null;
  }
  return { success: true };
});

// ═══════════════════════════════════════════════════════
// IPC: FOLDER PICKER
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// IPC: PROJECTS
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-projects", async () => {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) return { success: true, projects: [] };
    const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8"));
    return { success: true, projects: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-projects", async (event, { projects }) => {
  try {
    const dir = path.dirname(PROJECTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: CHATS
// ═══════════════════════════════════════════════════════
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
    return { success: true, chats: [] }; // Empty is OK
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
    const chatFile = path.join(getChatsDir(projectId), `${chatId}.json`);
    if (fs.existsSync(chatFile)) fs.unlinkSync(chatFile);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("rename-chat", async (event, { projectId, chatId, newTitle }) => {
  try {
    const chatFile = path.join(getChatsDir(projectId), `${chatId}.json`);
    if (!fs.existsSync(chatFile)) return { success: false, error: "Chat not found" };
    const chat = JSON.parse(fs.readFileSync(chatFile, "utf-8"));
    chat.title = newTitle;
    chat.updatedAt = Date.now();
    fs.writeFileSync(chatFile, JSON.stringify(chat, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: INSTRUCTIONS
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// IPC: ATTACHMENTS (✅ Security fix)
// ═══════════════════════════════════════════════════════
ipcMain.handle("read-attachment", async (event, { filePath }) => {
  try {
    // ✅ Security: صرف allowed paths
    if (!isAllowedProjectPath(filePath)) {
      return { success: false, error: "Access denied: file not in any project" };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }

    // ✅ Size check (max 5MB)
    const stat = fs.statSync(filePath);
    if (stat.size > 5 * 1024 * 1024) {
      return { success: false, error: "File too large (max 5MB)" };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: SETTINGS
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-settings", async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return { success: true, settings: {} };
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

    if (settings.groqApiKey) process.env.GROQ_API_KEY = settings.groqApiKey;
    if (settings.geminiApiKey) process.env.GEMINI_API_KEY = settings.geminiApiKey;

    // Agent reset — نئی settings apply ہوں گی
    agentInstance = null;
    currentProjectId = null;

    console.log("✅ Settings saved. Agent will reload on next message.");
    return { success: true };
  } catch (error) {
    console.error("❌ Save settings error:", error);
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: KNOWLEDGE FILES
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-knowledge-files", async (event, { projectId }) => {
  try {
    const dir = getKnowledgeDir(projectId);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const result = files.map((file) =>
      JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"))
    );
    return { success: true, files: result };
  } catch (error) {
    return { success: true, files: [] };
  }
});

ipcMain.handle("save-knowledge-file", async (event, { projectId, file }) => {
  try {
    const dir = getKnowledgeDir(projectId);
    const filePath = path.join(dir, `${file.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-knowledge-file", async (event, { projectId, fileName }) => {
  try {
    const filePath = path.join(getKnowledgeDir(projectId), `${fileName}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: PROJECT MEMORY (✅ Syntax error fix)
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-project-memory", async (event, { projectId }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");

    const defaultData = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
      activePlan: null,
      knowledgeIndex: [],
    };

    if (!fs.existsSync(memoryFile)) {
      return { success: true, memory: "", data: defaultData };
    }

    const data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    const merged = { ...defaultData, ...data };

    const lines = [];

    if (merged.preferences?.length > 0) {
      lines.push("PREFERENCES:");
      merged.preferences.forEach((p) => lines.push(`- ${p}`));
    }
    if (merged.projectDecisions?.length > 0) {
      lines.push("");  // ✅ empty line
      lines.push("PROJECT DECISIONS:");
      merged.projectDecisions.forEach((d) => lines.push(`- ${d}`));
    }
    if (merged.completedTasks?.length > 0) {
      lines.push("");
      lines.push("COMPLETED TASKS:");
      merged.completedTasks.forEach((t) => lines.push(`- ${t}`));
    }
    if (merged.notes?.length > 0) {
      lines.push("");
      lines.push("NOTES:");
      merged.notes.forEach((n) => lines.push(`- ${n}`));
    }
    if (merged.activePlan) {
      lines.push("");
      lines.push("ACTIVE PLAN:");
      lines.push(`Task: ${merged.activePlan.taskDescription || "Untitled"}`);
      lines.push(`Progress: ${merged.activePlan.steps?.filter(s => s.status === "done").length || 0}/${merged.activePlan.totalSteps || 0}`);
    }

    return {
      success: true,
      memory: lines.join("\n"),
      data: merged,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("add-project-memory", async (event, { projectId, category, item }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    let data = {
      preferences: [],
      projectDecisions: [],
      completedTasks: [],
      notes: [],
      activePlan: null,
      knowledgeIndex: [],
    };

    if (fs.existsSync(memoryFile)) {
      data = { ...data, ...JSON.parse(fs.readFileSync(memoryFile, "utf-8")) };
    }

    if (!data[category]) data[category] = [];
    if (!data[category].includes(item)) {
      data[category].push(item);
      fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2), "utf-8");
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("remove-project-memory", async (event, { projectId, category, item }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    if (!fs.existsSync(memoryFile)) {
      return { success: false, error: "Memory file not found" };
    }
    let data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    if (data[category]) {
      data[category] = data[category].filter((i) => i !== item);
      fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2), "utf-8");
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// 🆕 IPC: KNOWLEDGE INDEX (نیا!)
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-knowledge-index", async (event, { projectId }) => {
  try {
    const indexFile = path.join(getProjectDir(projectId), "knowledge-index.json");

    if (!fs.existsSync(indexFile)) {
      return { success: true, index: {} };
    }

    const data = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
    return { success: true, index: data };
  } catch (error) {
    return { success: false, error: error.message, index: {} };
  }
});

ipcMain.handle("delete-knowledge-index", async (event, { projectId, fileName }) => {
  try {
    const indexFile = path.join(getProjectDir(projectId), "knowledge-index.json");

    if (!fs.existsSync(indexFile)) {
      return { success: false, error: "Index file not found" };
    }

    const data = JSON.parse(fs.readFileSync(indexFile, "utf-8"));

    if (data[fileName]) {
      delete data[fileName];
      fs.writeFileSync(indexFile, JSON.stringify(data, null, 2), "utf-8");
      return { success: true, index: data };
    }

    return { success: false, error: "File not in index" };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// 🆕 IPC: CHAT SUMMARY (نیا!)
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-chat-summary", async (event, { projectId }) => {
  try {
    const summaryFile = path.join(getProjectDir(projectId), "chat-summary.json");

    if (!fs.existsSync(summaryFile)) {
      return { success: true, summary: { olderMessages: "", lastUpdated: null, messageCount: 0 } };
    }

    const data = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
    return { success: true, summary: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-chat-summary", async (event, { projectId, summary, messageCount }) => {
  try {
    const summaryFile = path.join(getProjectDir(projectId), "chat-summary.json");

    const data = {
      olderMessages: summary,
      lastUpdated: new Date().toISOString(),
      messageCount: messageCount,
    };

    fs.writeFileSync(summaryFile, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// 🆕 IPC: GET KNOWLEDGE FILES CONTENT (نیا!)
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-knowledge-files-content", async (event, { projectId }) => {
  try {
    const dir = getKnowledgeDir(projectId);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

    const result = files.map((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      return { name: data.name, content: data.content };
    });

    return { success: true, files: result };
  } catch (error) {
    return { success: true, files: [] };
  }
});

// ═══════════════════════════════════════════════════════
// 🆕 IPC: PLAN MANAGEMENT (نئے!)
// ═══════════════════════════════════════════════════════
ipcMain.handle("get-active-plan", async (event, { projectId }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    if (!fs.existsSync(memoryFile)) {
      return { success: true, plan: null };
    }
    const data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    return { success: true, plan: data.activePlan || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-active-plan", async (event, { projectId, plan }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    let data = {};
    if (fs.existsSync(memoryFile)) {
      data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    }
    data.activePlan = plan;
    fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: FILE TREE (✅ Depth limit + Performance)
// ═══════════════════════════════════════════════════════
ipcMain.handle("list-files-tree", async (event, { projectPath }) => {
  try {
    const ignored = [
      "node_modules", ".git", ".next", "dist", "build",
      ".expo", ".cache", ".vite", "coverage", ".idea", ".vscode",
    ];

    const MAX_DEPTH = 5;
    const MAX_ITEMS_PER_DIR = 200;

    const buildTree = (dirPath, relativePath = "", depth = 0) => {
      if (depth > MAX_DEPTH) return [];

      let items;
      try {
        items = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch {
        return [];
      }

      const result = [];
      let itemCount = 0;

      for (const item of items) {
        if (itemCount >= MAX_ITEMS_PER_DIR) {
          result.push({
            name: `... (${items.length - itemCount} more)`,
            type: "truncated",
            path: `${relativePath}/...`,
          });
          break;
        }

        if (item.name.startsWith(".")) continue;
        if (item.isDirectory() && ignored.includes(item.name)) continue;

        itemCount++;
        const itemRelative = relativePath
          ? `${relativePath}/${item.name}`
          : item.name;

        if (item.isDirectory()) {
          result.push({
            name: item.name,
            type: "folder",
            path: itemRelative,
            children: buildTree(path.join(dirPath, item.name), itemRelative, depth + 1),
          });
        } else {
          result.push({
            name: item.name,
            type: "file",
            path: itemRelative,
          });
        }
      }

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

// ═══════════════════════════════════════════════════════
// IPC: READ FILE CONTENT (✅ Security + Binary check)
// ═══════════════════════════════════════════════════════
ipcMain.handle("read-file-content", async (event, { projectPath, filePath }) => {
  try {
    const fullPath = path.join(projectPath, filePath);

    // ✅ Security: Path validation
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(projectPath))) {
      return { success: false, error: "Access denied" };
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: "File not found" };
    }

    // ✅ Binary file check
    const binaryExts = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".exe", ".woff", ".woff2", ".ttf", ".ico"];
    const ext = path.extname(fullPath).toLowerCase();
    if (binaryExts.includes(ext)) {
      return { success: false, error: "Cannot read binary file" };
    }

    // ✅ Size check (max 5MB)
    const stat = fs.statSync(fullPath);
    if (stat.size > 5 * 1024 * 1024) {
      return { success: false, error: "File too large (max 5MB)" };
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: READ FILE (✅ Security fix — auto-detect port)
// ═══════════════════════════════════════════════════════
ipcMain.handle("read-file", async (event, { filePath }) => {
  try {
    // ✅ Security: صرف allowed paths
    if (!isAllowedProjectPath(filePath)) {
      return { success: false, error: "Access denied: file not in any project" };
    }

    if (!fs.existsSync(filePath)) {
      return { success: false, error: "File not found" };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: EXPORT CHAT (✅ Null check)
// ═══════════════════════════════════════════════════════
ipcMain.handle("export-chat", async (event, { chat }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export Chat",
      defaultPath: `${chat.title.replace(/[^a-zA-Z0-9]/g, "-")}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (result.canceled || !result.filePath) return { success: false };

    let content = `# ${chat.title}\n\n`;
    content += `*Exported: ${new Date().toLocaleDateString()}*\n\n---\n\n`;

    for (const msg of chat.messages) {
      if (msg.role === "system") continue;
      const sender = msg.role === "user" ? "**You**" : "**Coder**";
      content += `### ${sender}\n\n${msg.content}\n\n---\n\n`;
    }

    fs.writeFileSync(result.filePath, content, "utf-8");
    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: FETCH MODELS (✅ Provider-wise)
// ═══════════════════════════════════════════════════════
ipcMain.handle("fetch-gemini-models", async (event, { apiKey }) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    const models = (data.models || [])
      .filter(m => Array.isArray(m.supportedGenerationMethods) &&
                   m.supportedGenerationMethods.includes("generateContent"))
      .map(m => ({
        id: m.name?.replace("models/", "") || m.name,
        name: m.displayName || m.name?.replace("models/", "") || "Unknown",
      }));

    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fetch-groq-models", async (event, { apiKey }) => {
  try {
    const ModelClient = require("../agent-src/modelClient");
    const client = new ModelClient("groq", { apiKey, model: "dummy" });
    const models = await client.getAvailableModels();
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fetch-ollama-models", async () => {
  try {
    const ModelClient = require("../agent-src/modelClient");
    const client = new ModelClient("ollama", { baseURL: "http://localhost:11434" });
    const models = await client.getAvailableModels();
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════
// IPC: WINDOW CONTROLS
// ═══════════════════════════════════════════════════════
ipcMain.handle("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.close();
});
