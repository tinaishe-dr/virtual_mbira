'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part.startsWith('.')) || !types[path.extname(file)]) { response.writeHead(404).end('Not found'); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end('Not found'); return; }
    const headers = { 'Content-Type': types[path.extname(file)] + (['.js', '.html', '.css'].includes(path.extname(file)) ? '; charset=utf-8' : ''), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    let start = 0, end = stat.size - 1, status = 200;
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!match || (!match[1] && !match[2])) { response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
      if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= stat.size) { response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    response.writeHead(status, headers);
    if (request.method === 'HEAD' || stat.size === 0) { response.end(); return; }
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => response.destroy()); response.on('close', () => stream.destroy()); stream.pipe(response);
  });
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`Mbira is ready at http://localhost:${server.address().port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
