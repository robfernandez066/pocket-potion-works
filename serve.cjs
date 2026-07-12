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
};

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
        ...securityHeaders,
      };
      response.writeHead(200, headers);
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

module.exports = { createServer, resolveRequestPath, securityHeaders };
