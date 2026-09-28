const { contextBridge, ipcRenderer } = require("electron");

// ═══════════════════════════════════════════════════════
// ✅ SAFE API — React کو صرف یہی methods ملیں گی
// ═══════════════════════════════════════════════════════
contextBridge.exposeInMainWorld("electronAPI", {
  // ─── Agent / Chat ───────────────────────────────────
  sendMessage: (message, projectPath, instructions, projectId) =>
    ipcRenderer.invoke("chat-message", {
      message, projectPath, instructions, projectId
    }),
  resetAgent: (projectPath, projectId) =>
    ipcRenderer.invoke("reset-agent", { projectPath, projectId }),

  // ─── Files (Agent side) ─────────────────────────────
  listFiles: (projectPath, subPath, projectId) =>
    ipcRenderer.invoke("list-files", { projectPath, subPath, projectId }),

  // ─── Folder Picker ──────────────────────────────────
  selectFolder: () =>
    ipcRenderer.invoke("select-folder"),

  // ─── Projects ───────────────────────────────────────
  getProjects: () =>
    ipcRenderer.invoke("get-projects"),
  saveProjects: (projects) =>
    ipcRenderer.invoke("save-projects", { projects }),

  // ─── Chats ──────────────────────────────────────────
  getChats: (projectId) =>
    ipcRenderer.invoke("get-chats", { projectId }),
  saveChat: (projectId, chat) =>
    ipcRenderer.invoke("save-chat", { projectId, chat }),
  deleteChat: (projectId, chatId) =>
    ipcRenderer.invoke("delete-chat", { projectId, chatId }),
  renameChat: (projectId, chatId, newTitle) =>
    ipcRenderer.invoke("rename-chat", { projectId, chatId, newTitle }),

  // ─── Instructions ───────────────────────────────────
  getInstructions: (projectId) =>
    ipcRenderer.invoke("get-instructions", { projectId }),
  saveInstructions: (projectId, instructions) =>
    ipcRenderer.invoke("save-instructions", { projectId, instructions }),

  // ─── Attachments ────────────────────────────────────
  readAttachment: (filePath) =>
    ipcRenderer.invoke("read-attachment", { filePath }),

  // ─── Settings ───────────────────────────────────────
  getSettings: () =>
    ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) =>
    ipcRenderer.invoke("save-settings", { settings }),

  // ─── Knowledge Files ────────────────────────────────
  getKnowledgeFiles: (projectId) =>
    ipcRenderer.invoke("get-knowledge-files", { projectId }),
  saveKnowledgeFile: (projectId, file) =>
    ipcRenderer.invoke("save-knowledge-file", { projectId, file }),
  deleteKnowledgeFile: (projectId, fileName) =>
    ipcRenderer.invoke("delete-knowledge-file", { projectId, fileName }),

  // ─── Project Memory (صرف 4 categories) ──────────────
  getProjectMemory: (projectId) =>
    ipcRenderer.invoke("get-project-memory", { projectId }),
  addProjectMemory: (projectId, category, item) =>
    ipcRenderer.invoke("add-project-memory", { projectId, category, item }),
  removeProjectMemory: (projectId, category, item) =>
    ipcRenderer.invoke("remove-project-memory", { projectId, category, item }),

  // ✅ REMOVED: Project Structure APIs (Deprecated per Point 9)
  // getProjectStructure اور clearProjectStructure ہٹا دیے گئے

  // ─── Chat Summary ───────────────────────────────────
  getChatSummary: (projectId) =>
    ipcRenderer.invoke("get-chat-summary", { projectId }),
  saveChatSummary: (projectId, summary, messageCount) =>
    ipcRenderer.invoke("save-chat-summary", { projectId, summary, messageCount }),

  // ─── Knowledge Files Content ────────────────────────
  getKnowledgeFilesContent: (projectId) =>
    ipcRenderer.invoke("get-knowledge-files-content", { projectId }),

  // ─── 🆕 Active Plan (الگ file — memory سے الگ) ─────
  // ✅ Point 24: Plan کو Memory category نہ بناؤ
  getActivePlan: (projectId) =>
    ipcRenderer.invoke("get-active-plan", { projectId }),
  saveActivePlan: (projectId, plan) =>
    ipcRenderer.invoke("save-active-plan", { projectId, plan }),

  // ─── File Explorer ──────────────────────────────────
  listFilesTree: (projectPath) =>
    ipcRenderer.invoke("list-files-tree", { projectPath }),
  readFileContent: (projectPath, filePath) =>
    ipcRenderer.invoke("read-file-content", { projectPath, filePath }),

  // ─── File Operations (VS Code style) ────────────────
  renameFile: (projectPath, oldPath, newName) =>
    ipcRenderer.invoke("rename-file", { projectPath, oldPath, newName }),
  deleteFileOrFolder: (projectPath, filePath) =>
    ipcRenderer.invoke("delete-file-or-folder", { projectPath, filePath }),
  createNewFile: (projectPath, filePath, content = "") =>
    ipcRenderer.invoke("create-new-file", { projectPath, filePath, content }),
  createNewFolder: (projectPath, folderPath) =>
    ipcRenderer.invoke("create-new-folder", { projectPath, folderPath }),
  saveFileContent: (projectPath, filePath, content) =>
    ipcRenderer.invoke("save-file-content", { projectPath, filePath, content }),

  // ─── Read file (for port detection etc.) ────────────
  readFile: (filePath) =>
    ipcRenderer.invoke("read-file", { filePath }),

  // ─── Export Chat ────────────────────────────────────
  exportChat: (chat) =>
    ipcRenderer.invoke("export-chat", { chat }),

  // ─── Fetch Available Models ─────────────────────────
  fetchGeminiModels: (apiKey) =>
    ipcRenderer.invoke("fetch-gemini-models", { apiKey }),
  fetchGroqModels: (apiKey) =>
    ipcRenderer.invoke("fetch-groq-models", { apiKey }),
  fetchOllamaModels: () =>
    ipcRenderer.invoke("fetch-ollama-models"),

  // ─── Stream Listeners ───────────────────────────────
  onChatStream: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("chat-stream", listener);
    return listener;
  },
  removeChatStreamListener: () =>
    ipcRenderer.removeAllListeners("chat-stream"),
  onToolStatus: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on("tool-status", listener);
    return listener;
  },
  removeToolStatusListener: () =>
    ipcRenderer.removeAllListeners("tool-status"),

  // ─── Window Controls ────────────────────────────────
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  maximizeWindow: () => ipcRenderer.invoke("maximize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
});