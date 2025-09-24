const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Example: save settings, export data, etc.
  exportSales: (data) => ipcRenderer.send("export-sales", data),
});
