const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld(
  "novaDesktop",
  Object.freeze({
    electron: true,
    platform: process.platform,
  }),
);
