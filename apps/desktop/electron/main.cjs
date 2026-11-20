const { app, BrowserWindow, shell } = require("electron");
const http = require("node:http");
const path = require("node:path");

let server = null;
let nextApp = null;
let mainWindow = null;
let baseUrl = "";

const protocol = "novapos";

function appDir() {
  return app.getAppPath();
}

/**
 * The desktop UI keeps its full Next.js runtime — routes, Clerk and Supabase
 * work exactly as they do on the hosted web app. Next is started in-process
 * and served on loopback so no port is exposed outside the machine.
 */
async function startNext() {
  const dir = appDir();
  process.chdir(dir);
  const next = require(require.resolve("next", { paths: [dir] }));
  nextApp = next({ dev: false, dir });
  await nextApp.prepare();
  const handler = nextApp.getRequestHandler();
  server = http.createServer((req, res) => {
    void handler(req, res).catch((error) => {
      console.error("[ScalPOS] request failed", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal error");
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function toLocalUrl(raw) {
  if (!raw || !raw.startsWith(`${protocol}://`)) return null;
  if (!server) return null;
  const rest = raw.slice(protocol.length + 1).replace(/^\/+/, "");
  return `http://127.0.0.1:${server.address().port}/${rest}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0a0e17",
    title: "ScalPOS",
    webPreferences: {
      preload: path.join(appDir(), "electron", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  void mainWindow.loadURL(baseUrl);
}

function focusOrOpen(raw) {
  const url = toLocalUrl(raw);
  if (!url) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(url);
    mainWindow.focus();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.setAsDefaultProtocolClient(protocol);
  app.on("second-instance", (_event, argv) => {
    focusOrOpen(argv.find((arg) => arg.startsWith(`${protocol}://`)));
  });
  app.on("open-url", (event, url) => {
    event.preventDefault();
    focusOrOpen(url);
  });

  app.whenReady().then(async () => {
    let base;
    try {
      base = await startNext();
    } catch (error) {
      console.error("[ScalPOS] could not start the desktop app", error);
      app.quit();
      return;
    }

    baseUrl = base;
    createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    if (server) server.close();
    if (nextApp) void nextApp.close().catch(() => {});
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && baseUrl) createWindow();
  });
}
