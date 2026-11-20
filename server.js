// Optional: eigener kleiner Server (z. B. auf einem Mac, Raspberry Pi oder Render).
// Auf Vercel wird diese Datei nicht gebraucht.
const http = require('http');
const fs = require('fs');
const path = require('path');

const routes = {
  '/api/login': require('./api/login'),
  '/api/accounts': require('./api/accounts'),
  '/api/messages': require('./api/messages'),
  '/api/folders': require('./api/folders'),
  '/api/move': require('./api/move'),
  '/api/create-folder': require('./api/create-folder'),
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (routes[p]) return routes[p](req, res);
  const file = path.join(__dirname, 'public', p === '/' ? 'index.html' : path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Nicht gefunden'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
}).listen(process.env.PORT || 3000, () => console.log('Läuft auf http://localhost:' + (process.env.PORT || 3000)));
