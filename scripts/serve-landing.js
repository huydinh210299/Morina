const fs = require("fs");
const http = require("http");
const path = require("path");

const landingRoot = path.resolve(__dirname, "..", "landing");
const port = Number(process.env.LANDING_PORT || 4173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

http.createServer((request, response) => {
  const requestPath = new URL(request.url, "http://localhost").pathname;
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.resolve(landingRoot, relativePath);

  if (!filePath.startsWith(`${landingRoot}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Không tìm thấy trang.");
    return;
  }

  response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Landing page đang chạy tại http://localhost:${port}`);
});
