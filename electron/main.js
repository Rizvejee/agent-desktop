const { app, BrowserWindow, ipcMain, dialog } = require("electron");

// Folder picker
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Project Folder",
  });

  if (result.canceled) return { success: false };
  
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  
  return {
    success: true,
    path: folderPath,
    name: folderName,
  };
});