import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(process.env.PREVIEW_DIR || ".site-dist");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".svg":"image/svg+xml", ".txt":"text/plain", ".json":"application/json" };
createServer(async (req,res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const prefix = process.env.TEST_PAGES_BASE || "";
    if (prefix && (pathname === prefix || pathname.startsWith(prefix + "/"))) pathname = pathname.slice(prefix.length) || "/";
    let path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    const body = await readFile(path); res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" }); res.end(body);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(4173, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:4173"));
