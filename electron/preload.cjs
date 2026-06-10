const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dailySummaryDesktop", {
  auth: {
    login: (email, password) => ipcRenderer.invoke("desktop-auth:login", { email, password }),
    me: () => ipcRenderer.invoke("desktop-auth:me"),
    logout: () => ipcRenderer.invoke("desktop-auth:logout"),
  },
  api: {
    request: (payload) => ipcRenderer.invoke("desktop-api:request", payload),
  },
  settings: {
    getStartup: () => ipcRenderer.invoke("desktop-settings:getStartup"),
    setStartup: (openAtLogin) =>
      ipcRenderer.invoke("desktop-settings:setStartup", { openAtLogin }),
  },
});
