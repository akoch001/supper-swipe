// Local preview: serves the page and /api/dishes with an in-memory store. Nothing is kept.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { handle } from '../lib/dishes.mjs';

const root = join(import.meta.dirname, '..');
const base = JSON.parse(await readFile(join(root, 'data/recipes.json'), 'utf8'));
const memory = new Map();
const store = {
  list: async ({ prefix }) => ({ blobs: [...memory.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
  get: async key => (memory.has(key) ? JSON.parse(memory.get(key)) : null),
  setJSON: async (key, value) => { memory.set(key, JSON.stringify(value)); }
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PUBLIC = new Set(['/index.html', '/app.js', '/shopping.js', '/styles.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/dishes')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const path = url.pathname.replace(/^\/api\/dishes/, '').replace(/\/$/, '');
    const out = await handle(new Request(url, { method: req.method, body }), path, base, store, randomUUID);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(await out.text());
    return;
  }
  const file = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!PUBLIC.has(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] });
  res.end(await readFile(join(root, file)));
}).listen(8776);
