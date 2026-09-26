const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.YGO_PORT || 8080;

function mime(p) {
  const ext = path.extname(p).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon"
  };
  return map[ext] || "application/octet-stream";
}

function send(res, codigo, cuerpo, tipo) {
  res.writeHead(codigo, {
    "Content-Type": tipo,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(cuerpo);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (p === "/obra") {
    const target = url.searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target)) {
      return send(res, 400, "url invalida", "text/plain");
    }
    try {
      const r = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 (generador-de-cartas research)" }
      });
      if (!r.ok) {
        return send(res, 502, "orig " + r.status, "text/plain");
      }
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": r.headers.get("content-type") || "image/png",
        "Access-Control-Allow-Origin": "*",
        "Content-Length": buf.length
      });
      return res.end(buf);
    } catch (e) {
      return send(res, 502, "proxy error", "text/plain");
    }
  }

  if (p === "/api") {
    const target = url.searchParams.get("url");
    if (!target || !/^https?:\/\//i.test(target)) {
      return send(res, 400, "url invalida", "text/plain");
    }
    try {
      const ua = req.headers["user-agent"] || "Mozilla/5.0 (generador-de-cartas research)";
      const r = await fetch(target, {
        headers: { "User-Agent": ua }
      });
      const data = await r.text();
      // Forward the actual status code from upstream
      res.writeHead(r.ok ? 200 : r.status, {
        "Content-Type": r.headers.get("content-type") || "application/json",
        "Access-Control-Allow-Origin": "*"
      });
      return res.end(data);
    } catch (e) {
      console.error("Proxy error:", e.message);
      return send(res, 502, "proxy error: " + e.message, "text/plain");
    }
  }

  if (p === "/guardar" && req.method === "POST") {
    let cuerpo = "";
    req.on("data", (c) => (cuerpo += c.toString()));
    req.on("end", () => {
      try {
        const data = JSON.parse(cuerpo);
        let nombre = String(data.nombre || "carta").trim();
        const b64 = String(data.png || "");
        if (!/^data:image\/png;base64,/i.test(b64)) {
          return send(res, 400, "png invalido", "text/plain");
        }
        const buf = Buffer.from(b64.split(",")[1], "base64");
        const dir = path.join(ROOT, "cartas");
        fs.mkdirSync(dir, { recursive: true });
        const seguro = nombre.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_") || "carta";
        const archivo = seguro + ".png";
        fs.writeFileSync(path.join(dir, archivo), buf);
        send(res, 200, JSON.stringify({ ok: true, archivo: archivo }), "application/json");
      } catch (e) {
        send(res, 500, "error: " + e.message, "text/plain");
      }
    });
    return;
  }

  const rel = p === "/" ? "index.html" : p.slice(1);
  const archivo = path.normalize(path.join(ROOT, rel));
  if (!archivo.startsWith(ROOT)) {
    return send(res, 403, "no", "text/plain");
  }
  fs.readFile(archivo, (err, buf) => {
    if (err) {
      return send(res, 404, "no existe", "text/plain");
    }
    send(res, 200, buf, mime(archivo));
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("  Generador de cartas listo.");
  console.log("  Editor:      http://localhost:" + PORT + "/index.html");
  console.log("  Armar cartas:http://localhost:" + PORT + "/armar.html");
  console.log("");
});