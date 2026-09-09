const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // chat message بھیجیں
  sendMessage: (message, projectPath) =>
    ipcRenderer.invoke("chat-message", { message, projectPath }),

  // files list کریں
  listFiles: (projectPath, subPath) =>
    ipcRenderer.invoke("list-files", { projectPath, subPath }),

  // agent reset کریں
  resetAgent: (projectPath) =>
    ipcRenderer.invoke("reset-agent", { projectPath }),
});