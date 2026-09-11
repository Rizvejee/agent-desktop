const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Agent
  sendMessage: (message, projectPath, instructions) =>
  ipcRenderer.invoke("chat-message", { message, projectPath, instructions }),
  listFiles: (projectPath, subPath) =>
    ipcRenderer.invoke("list-files", { projectPath, subPath }),
  resetAgent: (projectPath) =>
    ipcRenderer.invoke("reset-agent", { projectPath }),

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
});