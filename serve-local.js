// Zero-dependency static server for the pre-built React app.
// Serves ./build with SPA fallback so client-side routes work.
// Run:  node serve-local.js   ->   http://localhost:4173
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'build');
const PORT = process.env.PORT || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  // Prevent path traversal outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) return send(filePath, res);
    // SPA fallback: anything not a real file -> index.html
    send(path.join(ROOT, 'index.html'), res);
  });
});

function send(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`Serving build/ at http://localhost:${PORT}`);
});
