const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 4173);
const securityHeaders = Object.freeze({
  "Cache-Control": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; form-action 'self';",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
});
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

function parseByteRange(header, size) {
  const match = typeof header === "string" ? header.match(/^bytes=(\d*)-(\d*)$/) : null;
  if (!match || (!match[1] && !match[2]) || !Number.isFinite(size) || size < 1) return null;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[2] && match[1] ? Number(match[2]) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) return null;
  end = Math.min(end, size - 1);
  return { start, end };
}

function resolveRequestPath(rawUrl, rootDirectory = root) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname); }
  catch { return null; }
  if (pathname === "/") pathname = "/index.html";
  const resolvedRoot = path.resolve(rootDirectory);
  const candidate = path.resolve(resolvedRoot, `.${pathname}`);
  return candidate === resolvedRoot || candidate.startsWith(`${resolvedRoot}${path.sep}`) ? candidate : null;
}

function createServer(rootDirectory = root) {
  return http.createServer((request, response) => {
    if (!request.url || !["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { ...securityHeaders, Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Method not allowed");
    }

    const filePath = resolveRequestPath(request.url, rootDirectory);
    if (!filePath) {
      response.writeHead(403, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
      return response.end("Forbidden");
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        response.writeHead(404, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
        return response.end("Not found");
      }
      const headers = {
        "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Accept-Ranges": "bytes",
        ...securityHeaders,
      };
      const requestedRange = request.headers.range;
      const range = requestedRange ? parseByteRange(requestedRange, stats.size) : null;
      if (requestedRange && !range) {
        response.writeHead(416, { ...headers, "Content-Range": `bytes */${stats.size}` });
        return response.end();
      }
      if (range) {
        response.writeHead(206, { ...headers, "Content-Range": `bytes ${range.start}-${range.end}/${stats.size}`, "Content-Length": range.end - range.start + 1 });
        if (request.method === "HEAD") return response.end();
        return fs.createReadStream(filePath, range).pipe(response);
      }
      response.writeHead(200, { ...headers, "Content-Length": stats.size });
      if (request.method === "HEAD") return response.end();
      fs.createReadStream(filePath).pipe(response);
    });
  });
}

if (require.main === module) {
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`Pocket Potion Works is ready at http://127.0.0.1:${port}`);
  });
}

module.exports = { createServer, resolveRequestPath, securityHeaders, mime, parseByteRange };
