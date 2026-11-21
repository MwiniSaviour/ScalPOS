import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, rm } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = "/data/data/com.termux/files/home/project/POS";
const MOBILE_PORT = 4310;
const DESKTOP_PORT = 4311;
const CDP_PORT = 9339;
const PROFILE = `/data/data/com.termux/files/usr/tmp/opencode/smoke-chrome-${Date.now()}`;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(root, port) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const clean = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      let file = join(root, clean);
      for (const candidate of [file, `${file}.html`, join(file, "index.html")]) {
        try {
          const stat = await readFile(candidate);
          res.writeHead(200, { "content-type": MIME[extname(candidate)] ?? "application/octet-stream" });
          res.end(stat);
          return;
        } catch { void 0; }
      }
      file = join(root, "index.html");
      const html = await readFile(file);
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { void 0; }
    await wait(500);
  }
  throw new Error(`timed out waiting for ${url}`);
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    } else if (message.method) {
      events.push(message);
    }
  });
  return {
    events,
    send(method, params = {}) {
      id += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForBody(client, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const ready = await evaluate(client, `!!document.body && document.readyState === 'complete'`);
    if (ready) return;
    await wait(300);
  }
  throw new Error("page body did not load");
}

async function waitForText(client, text, timeout = 30000) {
  const end = Date.now() + timeout;
  const escaped = text.replace(/'/g, "\\'");
  while (Date.now() < end) {
    const found = await evaluate(client, `document.body && document.body.innerText.includes('${escaped}')`);
    if (found) return;
    await wait(300);
  }
  throw new Error(`did not find text: ${text}`);
}

async function openPage(url, native = false, local = false) {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const client = cdp(ws);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");
  if (native || local) {
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `${native ? "window.androidBridge = {};" : ""}${local ? "localStorage.setItem('desk-pos-local-shop-v1','1');" : ""}`,
    });
  }
  await client.send("Page.navigate", { url });
  await waitForBody(client);
  await wait(3000);
  return { ws, client, target };
}

async function smokeMobile() {
  const { ws, client } = await openPage(`http://127.0.0.1:${MOBILE_PORT}/inventory`, true);
  try {
    console.log("mobile initial:", await evaluate(client, `JSON.stringify({path: location.pathname, text: document.body && document.body.innerText})`));
    await waitForText(client, "catalogue", 30000);
    await evaluate(
      client,
      `(() => { const el = document.querySelector('[aria-label="Import products"]'); if (!el) return false; el.click(); return true; })()`,
    ).then((clicked) => {
      if (!clicked) throw new Error("mobile import button not found");
    });
    await waitForText(client, "Import a product file");
    await waitForText(client, "Scan");
    await waitForText(client, "Invoice");
    return "mobile import entry opened";
  } finally {
    ws.close();
  }
}

async function smokeDesktop() {
  const { ws, client } = await openPage(`http://127.0.0.1:${DESKTOP_PORT}/dashboard/products`, false, true);
  try {
    console.log("desktop initial:", await evaluate(client, `JSON.stringify({path: location.pathname, text: document.body && document.body.innerText})`));
    await waitForText(client, "Products");
    const clicked = await evaluate(
      client,
      `(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Import'); if (!b) return false; b.click(); return true; })()`,
    );
    if (!clicked) throw new Error("desktop import button not found");
    await waitForText(client, "CSV, XLSX, barcode scan, or invoice OCR");
    await waitForText(client, "Scan barcodes");
    await waitForText(client, "Invoice OCR");
    return "desktop import dialog opened";
  } finally {
    ws.close();
  }
}

await mkdir(PROFILE, { recursive: true });
const mobileServer = await serveStatic(join(ROOT, "out"), MOBILE_PORT);
const desktop = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(DESKTOP_PORT)], {
  cwd: join(ROOT, "apps/desktop"),
  stdio: "ignore",
});
const chromium = spawn("chromium-browser", [
  "--headless=new",
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${PROFILE}`,
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "about:blank",
], { stdio: "ignore" });

try {
  await waitForHttp(`http://127.0.0.1:${MOBILE_PORT}/inventory`);
  await waitForHttp(`http://127.0.0.1:${DESKTOP_PORT}/dashboard/products`);
  await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/version`);
  console.log(await smokeMobile());
  console.log(await smokeDesktop());
} finally {
  chromium.kill("SIGTERM");
  desktop.kill("SIGTERM");
  mobileServer.close();
  await rm(PROFILE, { recursive: true, force: true }).catch(() => {});
}
