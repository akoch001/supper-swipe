import assert from 'node:assert/strict';
import { test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { handle } from '../lib/dishes.mjs';
import { pageText } from '../lib/import.mjs';
import { runRead } from '../lib/reader.mjs';

function memoryStore() {
  const m = new Map();
  return {
    m,
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => (m.has(key) ? JSON.parse(m.get(key)) : null),
    setJSON: async (key, v) => { m.set(key, JSON.stringify(v)); }
  };
}
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, {}, store, () => 'job-1'
);
// The real SDK, with only the network swapped out.
function modelSaying(answer, stopReason = 'end_turn') {
  const sent = [];
  const client = new Anthropic({
    apiKey: 'test',
    fetch: async (url, init) => {
      sent.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(init.body) });
      return new Response(JSON.stringify({
        id: 'm', type: 'message', role: 'assistant', model: 'x', stop_reason: stopReason, usage: { input_tokens: 1, output_tokens: 1 },
        content: [{ type: 'thinking', thinking: '', signature: '' }, { type: 'text', text: JSON.stringify(answer) }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  return { client, sent };
}
const recipe = { title: 'Soup', blurb: '', minutes: 30, handsOn: 10, serves: '4', kit: '1 pot', shopping: ['1 onion'], steps: ['Cook.'], tags: ['soup'], source: 'NYT Cooking' };
const PDF = { type: 'application/pdf', data: 'JVBERi0xLjQ=' };

async function started(store) {
  process.env.ANTHROPIC_API_KEY = 'test';
  const res = await call('POST', '/read', store, PDF);
  assert.equal(res.status, 202);
  return (await res.json()).id;
}
const statusOf = async store => (await call('GET', '/read/job-1', store)).json();

test('a PDF goes to the model as a document and comes back as a recipe, and the file is not kept', async () => {
  const store = memoryStore(), { client, sent } = modelSaying({ found: true, ...recipe });
  const id = await started(store);
  assert.deepEqual(await statusOf(store), { status: 'reading' });
  await runRead(id, store, client);
  assert.deepEqual(await statusOf(store), { status: 'done', recipe });
  assert.ok(!store.m.get('reads/job-1').includes(PDF.data));
  const { body, headers } = sent[0];
  assert.equal(body.model, 'claude-opus-5-5');
  assert.equal(body.fallbacks, 'default');
  assert.match(headers.get('anthropic-beta'), /server-side-fallback-2026-07-01/);
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.equal(body.tools, undefined);
  assert.deepEqual(body.messages[0].content[0], { type: 'document', source: { type: 'base64', media_type: PDF.type, data: PDF.data } });
});

test('a reading runs once, however many times it is started', async () => {
  const store = memoryStore(), { client, sent } = modelSaying({ found: true, ...recipe });
  const id = await started(store);
  await runRead(id, store, client);
  await runRead(id, store, client);
  await runRead('nope', store, client);
  assert.equal(sent.length, 1);
});

test('says so when there is no recipe, or the model stops short', async () => {
  for (const [model, status] of [[modelSaying({ found: false, ...recipe, title: '' }), 'none'], [modelSaying({ found: true, ...recipe }, 'refusal'), 'failed'], [modelSaying({ found: true, ...recipe }, 'max_tokens'), 'failed']]) {
    const store = memoryStore();
    await runRead(await started(store), store, model.client);
    assert.deepEqual(await statusOf(store), { status });
  }
});

test('refuses what it should not read, and says when AI reading is off', async () => {
  const store = memoryStore();
  process.env.ANTHROPIC_API_KEY = 'test';
  assert.equal((await call('POST', '/read', store, { type: 'text/html', data: 'AAAA' })).status, 400);
  assert.equal((await call('POST', '/read', store, { type: PDF.type, data: 'not base64!' })).status, 400);
  assert.equal((await call('POST', '/read', store, { url: 'file:///etc/passwd' })).status, 400);
  assert.equal((await call('POST', '/read', store, { type: PDF.type, data: 'A'.repeat(5400004) })).status, 413);
  assert.equal((await call('GET', '/read/nope', store)).status, 404);
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal((await call('POST', '/read', store, PDF)).status, 503);
  assert.equal(store.m.size, 0);
});

test('a page is reduced to its words', () => {
  assert.equal(pageText('<nav>Home</nav><script>x()</script><h1>Soup &amp; bread</h1><p>Chop.</p><footer>Bye</footer>'), 'Soup & bread Chop.');
});
