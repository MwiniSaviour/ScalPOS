// CDP QA driver: navigate every route of the built app in headless chromium,
// capture console errors, and screenshot key screens.
const fs = require("fs");
const path = require("path");

const BASE = "http://127.0.0.1:4173";
const OUT = path.join(__dirname, "design", "qa");
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["home", "/", true],
  ["sell", "/sell/", true],
  ["sell-cart", "/sell/", false], // cart adds happen via clicks below if straightforward
  ["pay-empty", "/pay/", true],
  ["orders", "/orders/", true],
  ["inventory", "/inventory/", true],
  ["customers", "/customers/", true],
  ["reports", "/reports/", true],
  ["stock", "/stock/", true],
  ["categories", "/categories/", true],
  ["more", "/more/", true],
  ["settings", "/settings/", true],
  ["shop", "/settings/shop/", true],
];

(async () => {
  // find first tab target
  let tab;
  for (let i = 0; i < 20; i++) {
    try {
      const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
      tab = list.find((t) => t.type === "page");
      if (tab) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!tab) throw new Error("no chromium tab found");

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  const events = [];
  const results = { pages: [], errors: [] };

  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const type = msg.params.type;
      if (type === "error" || type === "assert") {
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ");
        results.errors.push(`[console:${type}] ${text}`);
      }
    }
    if (msg.method === "Runtime.exceptionThrown") {
      results.errors.push(`[exception] ${msg.params.exceptionDetails?.text ?? ""} ${msg.params.exceptionDetails?.exception?.description ?? ""}`);
    }
    if (msg.method === "Log.entryAdded") {
      if (msg.params.entry.level === "error") events.push(`[log:${msg.params.entry.source}] ${msg.params.entry.text}`);
    }
  };

  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable");

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const [name, route, shot] of ROUTES) {
    await send("Page.navigate", { url: BASE + route });
    await sleep(1600);
    const evalRes = await send("Runtime.evaluate", {
      expression:
        "(() => ({title: document.title, txt: (document.body.innerText||'').slice(0, 300).replace(/\\n+/g,' | ')}))()",
      returnByValue: true,
    });
    const info = evalRes.result?.result?.value ?? {};
    if (shot) {
      const pic = await send("Page.captureScreenshot", { format: "png" });
      if (pic.result?.data) fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(pic.result.data, "base64"));
    }
    results.pages.push(`${name}: ${info.txt}`);
  }

  // interaction probe: add items to cart on /sell and complete sale flow
  await send("Page.navigate", { url: BASE + "/sell/" });
  await sleep(1500);
  // tap first product tile twice
  const add = await send("Runtime.evaluate", {
    expression:
      "(() => { const t=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Exact')||[...b.classList].some(c=>c.includes('surface'))&&b.textContent.match(/[0-9]/)); const tiles=[...document.querySelectorAll('main button,div button')].filter(b=>!b.className.includes('rounded-full')&&b.textContent.trim().length>0); if(tiles.length){tiles[0].click();} return tiles.length})()",
    returnByValue: true,
  });
  await sleep(700);
  const cartBar = await send("Runtime.evaluate", {
    expression: "document.body.innerText.includes('Charge') || document.body.innerText.includes('Sale started')",
    returnByValue: true,
  });
  results.cartProbe = `tiles=${JSON.stringify(add.result?.result?.value)} cartVisible=${JSON.stringify(cartBar.result?.result?.value)}`;

  fs.writeFileSync(path.join(__dirname, "design", "qa-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2).slice(0, 8000));
  process.exit(0);
})().catch((e) => {
  console.error("QA failed:", e.message);
  process.exit(1);
});
