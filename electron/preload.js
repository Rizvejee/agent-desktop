const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Agent
  sendMessage: (message, projectPath, instructions) =>
    ipcRenderer.invoke("chat-message", { message, projectPath, instructions }),
  listFiles: (projectPath, subPath) =>
    ipcRenderer.invoke("list-files", { projectPath, subPath }),
  resetAgent: (projectPath) =>
    ipcRenderer.invoke("reset-agent", { projectPath }),

  // Folder picker
  selectFolder: () =>
    ipcRenderer.invoke("select-folder"),

  // Projects
  getProjects: () =>
    ipcRenderer.invoke("get-projects"),
  saveProjects: (projects) =>
    ipcRenderer.invoke("save-projects", { projects }),

  // Chats
  getChats: (projectId) =>
    ipcRenderer.invoke("get-chats", { projectId }),
  saveChat: (projectId, chat) =>
    ipcRenderer.invoke("save-chat", { projectId, chat }),
  deleteChat: (projectId, chatId) =>
    ipcRenderer.invoke("delete-chat", { projectId, chatId }),

  // Instructions
  getInstructions: (projectId) =>
    ipcRenderer.invoke("get-instructions", { projectId }),
  saveInstructions: (projectId, instructions) =>
    ipcRenderer.invoke("save-instructions", { projectId, instructions }),

  // Attachments
  readAttachment: (filePath) =>
    ipcRenderer.invoke("read-attachment", { filePath }),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) =>
    ipcRenderer.invoke("save-settings", { settings }),

  // Tool Status
  onToolStatus: (callback) =>
  ipcRenderer.on("tool-status", (event, data) => callback(data)),
  removeToolStatusListener: () =>
  ipcRenderer.removeAllListeners("tool-status"),

  // Knowledge Files
  getKnowledgeFiles: (projectId) =>
  ipcRenderer.invoke("get-knowledge-files", { projectId }),
  saveKnowledgeFile: (projectId, file) =>
  ipcRenderer.invoke("save-knowledge-file", { projectId, file }),
  deleteKnowledgeFile: (projectId, fileName) =>
  ipcRenderer.invoke("delete-knowledge-file", { projectId, fileName }),

   // Project Memory
  getProjectMemory: (projectId) =>
  ipcRenderer.invoke("get-project-memory", { projectId }),

  // Rename Chat
  renameChat: (projectId, chatId, newTitle) =>
  ipcRenderer.invoke("rename-chat", { projectId, chatId, newTitle }),

  // Stream listeners
  onChatStream: (callback) =>
    ipcRenderer.on("chat-stream", (event, data) => callback(data)),
  removeChatStreamListener: () =>
    ipcRenderer.removeAllListeners("chat-stream"),
  // Terminal
  runTerminalCommand: (command, projectPath) =>
    ipcRenderer.invoke("run-terminal-command", { command, projectPath }),

  // File Explorer
  listFilesTree: (projectPath) =>
  ipcRenderer.invoke("list-files-tree", { projectPath }),
  readFileContent: (projectPath, filePath) =>
  ipcRenderer.invoke("read-file-content", { projectPath, filePath }),
});
