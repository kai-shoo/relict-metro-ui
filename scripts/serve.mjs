import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleDraftsRequest } from '../examples/drafts/server-endpoint.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const servedDirectories = ['dist', 'examples', 'tests/fixtures'].map(path => resolve(root, path) + sep);
const port = Number(process.env.PORT || 4173);
const mediaTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (await handleDraftsRequest(request, response, url)) return;
    if (url.pathname === '/') {
      response.writeHead(302, { Location: '/examples/start/' }).end();
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    let path = resolve(root, `.${pathname}`);
    if (!servedDirectories.some(directory => path.startsWith(directory))) {
      response.writeHead(404).end('Not found');
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const content = await readFile(path);
    response.writeHead(200, {
      'Content-Type': mediaTypes[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', function () {
  console.log(`Metro examples at http://127.0.0.1:${this.address().port}`);
});
