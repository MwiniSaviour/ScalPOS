// tiny static server with SPA-ish fallback for the exported app
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "out");
const PORT = 4173;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(ROOT, p);
    if (p.endsWith("/")) file = path.join(file, "index.html");
    else if (!path.extname(file)) file = path.join(file, "index.html");
    fs.readFile(file, (err, buf) => {
      if (err) {
        // fallback to root index (SPA behaviour)
        fs.readFile(path.join(ROOT, "index.html"), (e2, buf2) => {
          if (e2) { res.writeHead(404); res.end("nf"); return; }
          res.writeHead(200, { "content-type": "text/html" });
          res.end(buf2);
        });
        return;
      }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(buf);
    });
  })
  .listen(PORT, () => console.log(`serving out/ on :${PORT}`));
