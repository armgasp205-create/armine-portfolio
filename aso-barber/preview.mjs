import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/script.js': ['script.js', 'text/javascript'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
createServer(async (request, response) => {
  const route = new URL(request.url, 'http://localhost').pathname;
  const entry = files[route];
  if (!entry) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const body = await readFile(new URL(entry[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': `${entry[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(500); response.end('Unable to read page'); }
}).listen(5180, '127.0.0.1', () => console.log('Barber preview: http://127.0.0.1:5180/'));
