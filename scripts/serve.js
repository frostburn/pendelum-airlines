import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, renderHTML } from './build.js';

const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};

/** Local-only development/preview server. Production needs only dist/index.html. */
export function createAppServer({preview = false} = {}) {
  const root = preview ? join(ROOT, 'dist') : ROOT;
  return createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, {Allow: 'GET, HEAD'}).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      // Development deliberately serves only the entry document and source tree.
      const allowed = path === join(root, 'index.html') ||
        (!preview && path.startsWith(join(ROOT, 'src') + sep));
      if (!allowed || !MIME[extname(path)]) {
        res.writeHead(404).end('Not found');
        return;
      }
      const body = !preview && path === join(root, 'index.html')
        ? await renderHTML() : await readFile(path);
      res.writeHead(200, {'Content-Type': `${MIME[extname(path)]}; charset=utf-8`, 'Cache-Control': 'no-store'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      const status = error instanceof URIError ? 400 : error.code === 'ENOENT' ? 404 : 500;
      if (status === 500) console.error(error);
      res.writeHead(status).end(status === 500 ? 'Server error' : 'Not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portIndex = process.argv.indexOf('--port');
  const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  const server = createAppServer({preview: process.argv.includes('--dist')});
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Pendulum Airlines: http://127.0.0.1:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
