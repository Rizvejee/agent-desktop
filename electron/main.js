const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require("electron");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MEMORY_PATH = path.join(__dirname, "../memory/projects");
const SETTINGS_FILE = path.join(__dirname, "../memory/settings.json");
const PROJECTS_FILE = path.join(__dirname, "../memory/projects.json");
const isDev = process.env.NODE_ENV !== "production";

let mainWindow;
let agentInstance = null;
let currentProjectId = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    frame: false, titleBarStyle: "hidden",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
    show: false, backgroundColor: "#ffffff",
  });
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new Menu();
    if (params.selectionText) menu.append(new MenuItem({ label: "Copy", click: () => mainWindow.webContents.copy() }));
    if (params.isEditable) {
      menu.append(new MenuItem({ label: "Cut", click: () => mainWindow.webContents.cut() }));
      menu.append(new MenuItem({ label: "Paste", click: () => mainWindow.webContents.paste() }));
      menu.append(new MenuItem({ label: "Select All", click: () => mainWindow.webContents.selectAll() }));
    }
    if (menu.items.length > 0) menu.popup();
  });
  if (isDev) {
    const tryLoad = () => mainWindow.loadURL("http://localhost:3000").catch(() => setTimeout(tryLoad, 1000));
    tryLoad();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => mainWindow.show());
}

app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

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

function isAllowedProjectPath(filePath) {
  if (!fs.existsSync(PROJECTS_FILE)) return false;
  try {
    const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8"));
    const resolved = path.resolve(filePath);
    return projects.some(p => { const projResolved = path.resolve(p.path); return resolved === projResolved || resolved.startsWith(projResolved + path.sep); });
  } catch { return false; }
}

function getAgent(projectPath, projectId) {
  if (agentInstance && agentInstance.projectPath === projectPath && currentProjectId === projectId) return agentInstance;
  const Agent = require("../agent-src/agent");
  const ModelClient = require("../agent-src/modelClient");
  const projectMemoryPath = projectId ? path.join(MEMORY_PATH, projectId) : path.join(__dirname, "../memory");
  if (!fs.existsSync(projectMemoryPath)) fs.mkdirSync(projectMemoryPath, { recursive: true });
  agentInstance = new Agent(projectPath, projectMemoryPath);
  currentProjectId = projectId;
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      const provider = settings.provider || "groq";
      let config = {};
      switch (provider) {
        case "groq": config = { apiKey: settings.groqApiKey || process.env.GROQ_API_KEY, model: settings.groqModel || "llama-3.3-70b-versatile" }; break;
        case "gemini": config = { apiKey: settings.geminiApiKey || process.env.GEMINI_API_KEY, model: settings.geminiModel || "gemini-1.5-flash" }; break;
        case "ollama": config = { baseURL: settings.ollamaUrl || "http://localhost:11434", model: settings.ollamaModel || "llama3.2" }; break;
      }
      agentInstance.modelClient = new ModelClient(provider, config);
      if (settings.agentSettings) agentInstance.systemPrompt = agentInstance.buildSystemPrompt(settings.agentSettings);
    } catch (error) { console.error("❌ Error loading settings:", error); }
  }
  return agentInstance;
}

// ═══════════════════════════════════════════════════════
// IPC HANDLERS
// ═══════════════════════════════════════════════════════
ipcMain.handle("chat-message", async (event, { message, projectPath, instructions, projectId }) => {
  try {
    const agent = getAgent(projectPath, projectId);
    if (instructions && instructions.trim()) {
      agent.systemPrompt = agent.systemPrompt.replace(/\nCUSTOM PROJECT INSTRUCTIONS:[\s\S]*?(?=\nMEMORY|\nPROJECT CONTEXT|$)/, "");
      agent.systemPrompt += `\nCUSTOM PROJECT INSTRUCTIONS:\n${instructions}`;
    }
    const originalExecuteTool = agent.toolHandler.executeTool.bind(agent.toolHandler);
    agent.toolHandler.executeTool = async (toolName, toolInput) => {
      event.sender.send("tool-status", { status: "running", tool: toolName, input: toolInput });
      const result = await originalExecuteTool(toolName, toolInput);
      event.sender.send("tool-status", { status: "done", tool: toolName, input: toolInput });
      return result;
    };
    if (message.startsWith("/")) {
      const response = await agent.handleCommand(message);
      return { success: true, response };
    } else {
      let fullResponse = "";
      try {
        await agent.chat(message, (chunk) => {
          if (chunk === null) event.sender.send("chat-stream", { type: "tool" });
          else { fullResponse += chunk; event.sender.send("chat-stream", { type: "chunk", chunk }); }
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

ipcMain.handle("list-files", async (event, { projectPath, subPath, projectId }) => {
  try { const agent = getAgent(projectPath, projectId); return { success: true, result: agent.fileSystem.listFiles(subPath || "") }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("reset-agent", async (event, { projectPath, projectId }) => {
  if (agentInstance && agentInstance.projectPath === projectPath && currentProjectId === projectId) agentInstance.refreshSystemPrompt();
  else { agentInstance = null; currentProjectId = null; }
  return { success: true };
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"], title: "Select Project Folder" });
  if (result.canceled) return { success: false };
  return { success: true, path: result.filePaths[0], name: path.basename(result.filePaths[0]) };
});

ipcMain.handle("get-projects", async () => {
  try { if (!fs.existsSync(PROJECTS_FILE)) return { success: true, projects: [] }; return { success: true, projects: JSON.parse(fs.readFileSync(PROJECTS_FILE, "utf-8")) }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("save-projects", async (event, { projects }) => {
  try { const dir = path.dirname(PROJECTS_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2)); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("get-chats", async (event, { projectId }) => {
  try {
    const chatsDir = getChatsDir(projectId);
    const files = fs.readdirSync(chatsDir).filter(f => f.endsWith(".json"));
    const chats = files.map(f => JSON.parse(fs.readFileSync(path.join(chatsDir, f), "utf-8")));
    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    return { success: true, chats };
  } catch { return { success: true, chats: [] }; }
});

ipcMain.handle("save-chat", async (event, { projectId, chat }) => {
  try { fs.writeFileSync(path.join(getChatsDir(projectId), `${chat.id}.json`), JSON.stringify(chat, null, 2)); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("delete-chat", async (event, { projectId, chatId }) => {
  try { const f = path.join(getChatsDir(projectId), `${chatId}.json`); if (fs.existsSync(f)) fs.unlinkSync(f); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("rename-chat", async (event, { projectId, chatId, newTitle }) => {
  try {
    const f = path.join(getChatsDir(projectId), `${chatId}.json`);
    if (!fs.existsSync(f)) return { success: false, error: "Chat not found" };
    const chat = JSON.parse(fs.readFileSync(f, "utf-8"));
    chat.title = newTitle; chat.updatedAt = Date.now();
    fs.writeFileSync(f, JSON.stringify(chat, null, 2));
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("get-instructions", async (event, { projectId }) => {
  try { const file = path.join(getProjectDir(projectId), "instructions.md"); if (!fs.existsSync(file)) return { success: true, instructions: "" }; return { success: true, instructions: fs.readFileSync(file, "utf-8") }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("save-instructions", async (event, { projectId, instructions }) => {
  try { fs.writeFileSync(path.join(getProjectDir(projectId), "instructions.md"), instructions, "utf-8"); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("read-attachment", async (event, { filePath }) => {
  try {
    if (!isAllowedProjectPath(filePath)) return { success: false, error: "Access denied" };
    if (!fs.existsSync(filePath)) return { success: false, error: "File not found" };
    if (fs.statSync(filePath).size > 5 * 1024 * 1024) return { success: false, error: "File too large" };
    return { success: true, content: fs.readFileSync(filePath, "utf-8") };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("get-settings", async () => {
  try { if (!fs.existsSync(SETTINGS_FILE)) return { success: true, settings: {} }; return { success: true, settings: JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("save-settings", async (event, { settings }) => {
  try {
    const dir = path.dirname(SETTINGS_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    if (settings.groqApiKey) process.env.GROQ_API_KEY = settings.groqApiKey;
    if (settings.geminiApiKey) process.env.GEMINI_API_KEY = settings.geminiApiKey;
    agentInstance = null; currentProjectId = null;
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("get-knowledge-files", async (event, { projectId }) => {
  try { const dir = getKnowledgeDir(projectId); const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")); return { success: true, files: files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"))) }; }
  catch { return { success: true, files: [] }; }
});

ipcMain.handle("save-knowledge-file", async (event, { projectId, file }) => {
  try { fs.writeFileSync(path.join(getKnowledgeDir(projectId), `${file.name}.json`), JSON.stringify(file, null, 2)); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("delete-knowledge-file", async (event, { projectId, fileName }) => {
  try { const f = path.join(getKnowledgeDir(projectId), `${fileName}.json`); if (fs.existsSync(f)) fs.unlinkSync(f); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

// ✅ FIXED: Memory Handler (projectStructure اور activePlan کو reject کرتا ہے)
ipcMain.handle("get-project-memory", async (event, { projectId }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    const defaultData = { preferences: [], projectDecisions: [], completedTasks: [], notes: [] };
    if (!fs.existsSync(memoryFile)) return { success: true, memory: "", data: defaultData };
    const data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    const merged = { ...defaultData, ...data };
    // Deprecated fields ہٹائیں
    delete merged.projectStructure;
    delete merged.activePlan; 
    delete merged.knowledgeIndex;

    const lines = [];
    if (merged.preferences?.length > 0) { lines.push("PREFERENCES:"); merged.preferences.forEach(p => lines.push(`- ${p}`)); }
    if (merged.projectDecisions?.length > 0) { lines.push(""); lines.push("PROJECT DECISIONS:"); merged.projectDecisions.forEach(d => lines.push(`- ${d}`)); }
    if (merged.completedTasks?.length > 0) { lines.push(""); lines.push("COMPLETED TASKS:"); merged.completedTasks.forEach(t => lines.push(`- ${t}`)); }
    if (merged.notes?.length > 0) { lines.push(""); lines.push("NOTES:"); merged.notes.forEach(n => lines.push(`- ${n}`)); }
    
    return { success: true, memory: lines.join("\n"), data: merged };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("add-project-memory", async (event, { projectId, category, item }) => {
  try {
    if (category === "projectStructure") return { success: false, error: "projectStructure is deprecated." };
    if (category === "activePlan") return { success: false, error: "Use separate Plan API." };
    const validCategories = ["preferences", "projectDecisions", "completedTasks", "notes"];
    if (!validCategories.includes(category)) return { success: false, error: `Invalid category. Use: ${validCategories.join(", ")}` };

    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    let data = { preferences: [], projectDecisions: [], completedTasks: [], notes: [] };
    if (fs.existsSync(memoryFile)) {
      data = { ...data, ...JSON.parse(fs.readFileSync(memoryFile, "utf-8")) };
      delete data.projectStructure; delete data.activePlan; delete data.knowledgeIndex;
    }
    if (!data[category]) data[category] = [];
    if (!data[category].includes(item)) {
      data[category].push(item);
      fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2), "utf-8");
    }
    return { success: true, data };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("remove-project-memory", async (event, { projectId, category, item }) => {
  try {
    const memoryFile = path.join(getProjectDir(projectId), "agent-memory.json");
    if (!fs.existsSync(memoryFile)) return { success: false, error: "Memory file not found" };
    let data = JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
    if (data[category]) {
      data[category] = data[category].filter(i => i !== item);
      fs.writeFileSync(memoryFile, JSON.stringify(data, null, 2), "utf-8");
    }
    return { success: true, data };
  } catch (error) { return { success: false, error: error.message }; }
});

// ✅ REMOVED: get-project-structure & clear-project-structure

ipcMain.handle("get-chat-summary", async (event, { projectId }) => {
  try { const f = path.join(getProjectDir(projectId), "chat-summary.json"); if (!fs.existsSync(f)) return { success: true, summary: { olderMessages: "", lastUpdated: null, messageCount: 0 } }; return { success: true, summary: JSON.parse(fs.readFileSync(f, "utf-8")) }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("save-chat-summary", async (event, { projectId, summary, messageCount }) => {
  try { const data = { olderMessages: summary, lastUpdated: new Date().toISOString(), messageCount }; fs.writeFileSync(path.join(getProjectDir(projectId), "chat-summary.json"), JSON.stringify(data, null, 2), "utf-8"); return { success: true }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("get-knowledge-files-content", async (event, { projectId }) => {
  try { const dir = getKnowledgeDir(projectId); const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")); return { success: true, files: files.map(f => { const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); return { name: data.name, content: data.content }; }) }; }
  catch { return { success: true, files: [] }; }
});

// ✅ FIXED: ACTIVE PLAN HANDLERS (الگ فائل active-plan.json استعمال کریں گے)
ipcMain.handle("get-active-plan", async (event, { projectId }) => {
  try {
    const planFile = path.join(getProjectDir(projectId), "active-plan.json");
    if (!fs.existsSync(planFile)) return { success: true, plan: null };
    const data = JSON.parse(fs.readFileSync(planFile, "utf-8"));
    return { success: true, plan: data };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("save-active-plan", async (event, { projectId, plan }) => {
  try {
    const planFile = path.join(getProjectDir(projectId), "active-plan.json");
    if (plan) {
      fs.writeFileSync(planFile, JSON.stringify(plan, null, 2), "utf-8");
    } else if (fs.existsSync(planFile)) {
      fs.unlinkSync(planFile);
    }
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("list-files-tree", async (event, { projectPath }) => {
  try {
    const ignored = ["node_modules", ".git", ".next", "dist", "build", ".expo", ".cache", ".vite", "coverage", ".idea", ".vscode"];
    const MAX_DEPTH = 5; const MAX_ITEMS = 200;
    const buildTree = (dirPath, relativePath = "", depth = 0) => {
      if (depth > MAX_DEPTH) return [];
      let items; try { items = fs.readdirSync(dirPath, { withFileTypes: true }); } catch { return []; }
      const result = []; let count = 0;
      for (const item of items) {
        if (count >= MAX_ITEMS) { result.push({ name: `... (${items.length - count} more)`, type: "truncated", path: `${relativePath}/...` }); break; }
        if (item.name.startsWith(".")) continue;
        if (item.isDirectory() && ignored.includes(item.name)) continue;
        count++;
        const rel = relativePath ? `${relativePath}/${item.name}` : item.name;
        if (item.isDirectory()) result.push({ name: item.name, type: "folder", path: rel, children: buildTree(path.join(dirPath, item.name), rel, depth + 1) });
        else result.push({ name: item.name, type: "file", path: rel });
      }
      result.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : (a.type === "folder" ? -1 : 1));
      return result;
    };
    return { success: true, tree: buildTree(projectPath) };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("read-file-content", async (event, { projectPath, filePath }) => {
  try {
    const fullPath = path.join(projectPath, filePath);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(projectPath))) return { success: false, error: "Access denied" };
    if (!fs.existsSync(fullPath)) return { success: false, error: "File not found" };
    const binaryExts = [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".exe", ".woff", ".woff2", ".ttf", ".ico"];
    if (binaryExts.includes(path.extname(fullPath).toLowerCase())) return { success: false, error: "Binary file" };
    if (fs.statSync(fullPath).size > 5 * 1024 * 1024) return { success: false, error: "File too large" };
    return { success: true, content: fs.readFileSync(fullPath, "utf-8") };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("read-file", async (event, { filePath }) => {
  try { if (!isAllowedProjectPath(filePath)) return { success: false, error: "Access denied" }; if (!fs.existsSync(filePath)) return { success: false, error: "File not found" }; return { success: true, content: fs.readFileSync(filePath, "utf-8") }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("export-chat", async (event, { chat }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, { title: "Export Chat", defaultPath: `${chat.title.replace(/[^a-zA-Z0-9]/g, "-")}.md`, filters: [{ name: "Markdown", extensions: ["md"] }] });
    if (result.canceled || !result.filePath) return { success: false };
    let content = `# ${chat.title}\n*Exported: ${new Date().toLocaleDateString()}*\n---\n`;
    for (const msg of chat.messages) { if (msg.role === "system") continue; content += `### ${msg.role === "user" ? "**You**" : "**Coder**"}\n${msg.content}\n---\n`; }
    fs.writeFileSync(result.filePath, content, "utf-8");
    return { success: true, filePath: result.filePath };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("fetch-gemini-models", async (event, { apiKey }) => {
  try { const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`); const data = await response.json(); if (data.error) return { success: false, error: data.error.message }; const models = (data.models || []).filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent")).map(m => ({ id: m.name?.replace("models/", "") || m.name, name: m.displayName || m.name?.replace("models/", "") || "Unknown" })); return { success: true, models }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("fetch-groq-models", async (event, { apiKey }) => {
  try { const ModelClient = require("../agent-src/modelClient"); const client = new ModelClient("groq", { apiKey, model: "dummy" }); return { success: true, models: await client.getAvailableModels() }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("fetch-ollama-models", async () => {
  try { const ModelClient = require("../agent-src/modelClient"); const client = new ModelClient("ollama", { baseURL: "http://localhost:11434" }); return { success: true, models: await client.getAvailableModels() }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("minimize-window", () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle("maximize-window", () => { if (mainWindow) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.handle("close-window", () => { if (mainWindow) mainWindow.close(); });

ipcMain.handle("rename-file", async (event, { projectPath, oldPath, newName }) => {
  try {
    const fullOldPath = path.join(projectPath, oldPath);
    const fullNewPath = path.join(path.dirname(fullOldPath), newName);
    const resolvedProject = path.resolve(projectPath);
    if (!path.resolve(fullOldPath).startsWith(resolvedProject) || !path.resolve(fullNewPath).startsWith(resolvedProject)) return { success: false, error: "Access denied" };
    if (fs.existsSync(fullNewPath)) return { success: false, error: `"${newName}" already exists` };
    if (!fs.existsSync(fullOldPath)) return { success: false, error: "File not found" };
    fs.renameSync(fullOldPath, fullNewPath);
    return { success: true, newPath: path.relative(projectPath, fullNewPath) };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("delete-file-or-folder", async (event, { projectPath, filePath }) => {
  try {
    const fullPath = path.join(projectPath, filePath);
    if (!path.resolve(fullPath).startsWith(path.resolve(projectPath))) return { success: false, error: "Access denied" };
    const rel = path.relative(projectPath, fullPath);
    if (rel === "" || rel === "node_modules" || rel.startsWith("node_modules" + path.sep)) return { success: false, error: "Cannot delete critical path" };
    if (!fs.existsSync(fullPath)) return { success: false, error: "Not found" };
    if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
    else fs.unlinkSync(fullPath);
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("create-new-file", async (event, { projectPath, filePath, content = "" }) => {
  try {
    const fullPath = path.join(projectPath, filePath);
    if (!path.resolve(fullPath).startsWith(path.resolve(projectPath))) return { success: false, error: "Access denied" };
    if (fs.existsSync(fullPath)) return { success: false, error: "Already exists" };
    const dir = path.dirname(fullPath); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("create-new-folder", async (event, { projectPath, folderPath }) => {
  try {
    const fullPath = path.join(projectPath, folderPath);
    if (!path.resolve(fullPath).startsWith(path.resolve(projectPath))) return { success: false, error: "Access denied" };
    if (fs.existsSync(fullPath)) return { success: false, error: "Already exists" };
    fs.mkdirSync(fullPath, { recursive: true });
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("save-file-content", async (event, { projectPath, filePath, content }) => {
  try {
    const fullPath = path.join(projectPath, filePath);
    if (!path.resolve(fullPath).startsWith(path.resolve(projectPath))) return { success: false, error: "Access denied" };
    if (!fs.existsSync(fullPath)) return { success: false, error: "Not found" };
    if (content.length > 5 * 1024 * 1024) return { success: false, error: "Too large" };
    fs.writeFileSync(fullPath, content, "utf-8");
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});