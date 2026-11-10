// Local preview: serves the page and /api/dishes with an in-memory store. Nothing is kept.
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { handle } from '../lib/dishes.mjs';
import { runRead } from '../lib/reader.mjs';
import { summarise } from '../lib/stats.mjs';
import { readUsage } from '../lib/usage.mjs';

const root = join(import.meta.dirname, '..');
const base = JSON.parse(await readFile(join(root, 'data/recipes.json'), 'utf8'));
const memory = new Map();
const store = {
  list: async ({ prefix }) => ({ blobs: [...memory.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
  get: async key => (memory.has(key) ? JSON.parse(memory.get(key)) : null),
  setJSON: async (key, value) => { memory.set(key, JSON.stringify(value)); },
  delete: async key => { memory.delete(key); }
};
// A stand-in for the AI reader, so the whole read flow, and the monthly cap, can be tried for free.
process.env.ANTHROPIC_API_KEY ||= 'dev';
const fakeModel = { beta: { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({
  found: true, title: 'Stand-in soup', blurb: 'Read by the pretend AI reader', minutes: 30, handsOn: 10, serves: '4', kit: '1 pot',
  shopping: ['1 onion', '1 litre stock'], steps: ['Chop the onion.', 'Simmer in the stock.'], tags: ['soup'], source: 'Dev', photoPage: null, photoBox: [] }) }] }) } } };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const PUBLIC = new Set(['/index.html', '/stats.html', '/stats.js', '/history.html', '/history.js', '/app.js', '/shopping.js', '/styles.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // One store here, so the stats show Adam and Laura's group only.
  if (url.pathname === '/api/dishes/stats') {
    const body = JSON.stringify({ kinds: ['swipes', 'likes', 'matches', 'cooked', 'reads'], everyone: true, groups: [summarise('adam-laura', await readUsage(store))] });
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(body);
    return;
  }
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
  if (url.pathname === '/api/read-recipe') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const { id } = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    res.writeHead(202); res.end();
    setTimeout(() => runRead(id, store, fakeModel), 1500);
    return;
  }
  const file = url.pathname === '/' ? '/index.html' : ['/stats', '/status'].includes(url.pathname) ? '/stats.html' : url.pathname === '/history' ? '/history.html' : url.pathname;
  if (!PUBLIC.has(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] });
  res.end(await readFile(join(root, file)));
}).listen(8776);
