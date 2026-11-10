import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { READS_PER_MONTH } from '../lib/allowance.mjs';
import { handle } from '../lib/dishes.mjs';
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
// The real SDK, with only the network swapped out, always finding a recipe.
const model = new Anthropic({
  apiKey: 'test',
  fetch: async () => new Response(JSON.stringify({
    id: 'm', type: 'message', role: 'assistant', model: 'x', stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 },
    content: [{ type: 'text', text: JSON.stringify({ found: true, title: 'Soup', blurb: '', minutes: 30, handsOn: 10, serves: '4', kit: '', shopping: [], steps: [], tags: [], source: '', photoPage: null, photoBox: [] }) }]
  }), { status: 200, headers: { 'content-type': 'application/json' } })
});
let n = 0;
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, {}, store, () => 'job-' + ++n
);
const PDF = { type: 'application/pdf', data: 'JVBERi0xLjQ=' };
const ask = (store, who) => call('POST', '/read', store, { ...PDF, who });
// Asks for a read and starts it, the way the page does. Returns the answer to asking.
async function read(store, who) {
  const res = await ask(store, who);
  if (res.status === 202) await runRead((await res.clone().json()).id, store, model);
  return res;
}
const usedBy = async (store, who) => (await (await call('GET', '', store)).json()).reads.used[who];
// Runs `work` with the clock set to `when`.
async function at(when, work) {
  mock.timers.enable({ apis: ['Date'], now: new Date(when) });
  try { await work(); } finally { mock.timers.reset(); }
}
const MID_NOVEMBER = '2026-11-10T12:00:00Z';
process.env.ANTHROPIC_API_KEY = 'test';

test('the sixth read in a month is refused with a clear message', () => at(MID_NOVEMBER, async () => {
  const store = memoryStore();
  for (let i = 0; i < READS_PER_MONTH; i++) assert.equal((await read(store, 'adam')).status, 202);
  assert.equal(await usedBy(store, 'adam'), 5);
  const sixth = await read(store, 'adam');
  assert.equal(sixth.status, 429);
  assert.equal((await sixth.json()).error, "You've used your 5 AI reads this month");
}));

test('a read counts when it starts, not when it is only asked for', () => at(MID_NOVEMBER, async () => {
  const store = memoryStore();
  assert.equal((await ask(store, 'adam')).status, 202);
  assert.equal(await usedBy(store, 'adam'), 0);
}));

test('reads asked for together and started later still stop at five', () => at(MID_NOVEMBER, async () => {
  const store = memoryStore(), ids = [];
  for (let i = 0; i < 7; i++) ids.push((await (await ask(store, 'adam')).json()).id);
  for (const id of ids) await runRead(id, store, model);
  const statuses = await Promise.all(ids.map(async id => (await (await call('GET', '/read/' + id, store)).json()).status));
  assert.deepEqual(statuses, ['done', 'done', 'done', 'done', 'done', 'used-up', 'used-up']);
  assert.equal(await usedBy(store, 'adam'), 5);
}));

test('a new month starts the count again, by the Dutch calendar', async () => {
  const store = memoryStore();
  await at('2026-11-30T12:00:00Z', async () => {
    for (let i = 0; i < READS_PER_MONTH; i++) await read(store, 'adam');
    assert.equal((await read(store, 'adam')).status, 429);
  });
  await at('2026-11-30T23:30:00Z', async () => { // already 1 December in Amsterdam
    assert.equal(await usedBy(store, 'adam'), 0);
    assert.equal((await read(store, 'adam')).status, 202);
  });
});

test("one person's reads don't use up another's", () => at(MID_NOVEMBER, async () => {
  const store = memoryStore();
  for (let i = 0; i < READS_PER_MONTH; i++) await read(store, 'adam');
  assert.equal((await read(store, 'adam')).status, 429);
  assert.equal((await read(store, 'laura')).status, 202);
  assert.equal(await usedBy(store, 'laura'), 1);
}));

test("one group's reads don't count against another group", () => at(MID_NOVEMBER, async () => {
  // Each group's handler is given its own store (netlify/functions/dishes.mjs), so this is the whole of it.
  const ours = memoryStore(), theirs = memoryStore();
  for (let i = 0; i < READS_PER_MONTH; i++) await read(ours, 'adam');
  assert.equal((await read(ours, 'adam')).status, 429);
  assert.equal((await read(theirs, 'adam')).status, 202);
}));

test('a read has to say who it is for, from the group', async () => {
  const store = memoryStore();
  assert.equal((await ask(store, undefined)).status, 400);
  assert.equal((await ask(store, 'ludo')).status, 400); // in another group, not this one
  assert.equal(store.m.size, 0);
});

test('importing a link never looks at the count', () => at(MID_NOVEMBER, async () => {
  const store = memoryStore();
  for (let i = 0; i < READS_PER_MONTH; i++) await read(store, 'adam');
  const res = await call('POST', '/import', store, { url: 'not a link' });
  assert.equal(res.status, 422); // a bad link, not "used up"
}));

test('a link whose page cannot be fetched does not use a read', () => at(MID_NOVEMBER, async () => {
  const store = memoryStore();
  const res = await call('POST', '/read', store, { url: 'https://nowhere.invalid/soup', who: 'adam' });
  await runRead((await res.json()).id, store, model);
  assert.equal(await usedBy(store, 'adam'), 0);
}));
