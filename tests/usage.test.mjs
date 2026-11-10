import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { handle } from '../lib/dishes.mjs';
import { runRead } from '../lib/reader.mjs';
import { addUsage, dayOf, readUsage } from '../lib/usage.mjs';

function memoryStore() {
  const m = new Map();
  return {
    m,
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => (m.has(key) ? JSON.parse(m.get(key)) : null),
    setJSON: async (key, v) => { m.set(key, JSON.stringify(v)); },
    delete: async key => { m.delete(key); }
  };
}
// Like Netlify Blobs: conditional writes, so two at once can't drop each other's counts.
function blobsLikeStore() {
  const m = new Map();
  let version = 0;
  return {
    m,
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => (m.has(key) ? JSON.parse(m.get(key).value) : null),
    getWithMetadata: async key => {
      await new Promise(done => setImmediate(done)); // let the other writer read too
      return m.has(key) ? { data: JSON.parse(m.get(key).value), etag: m.get(key).etag } : null;
    },
    setJSON: async (key, v, o = {}) => {
      const now = m.get(key);
      if ((o.onlyIfNew && now) || (o.onlyIfMatch && (!now || now.etag !== o.onlyIfMatch))) return { modified: false };
      m.set(key, { value: JSON.stringify(v), etag: String(++version) });
      return { modified: true };
    }
  };
}
const BASE = { orzo: { title: 'Orzo' }, soup: { title: 'Soup' } };
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, BASE, store, () => 'job-1'
);
const today = async store => (await readUsage(store)).at(-1).people;
const at = async (when, work) => {
  mock.timers.enable({ apis: ['Date'], now: new Date(when) });
  try { await work(); } finally { mock.timers.reset(); }
};

test('likes and matches are counted where they happen, once each', () => at('2026-11-10T12:00:00Z', async () => {
  const store = memoryStore();
  await call('PUT', '/likes/adam/orzo', store);
  await call('PUT', '/likes/adam/orzo', store); // sent again: not a second like
  await call('PUT', '/likes/laura/orzo', store); // makes a match
  await call('PUT', '/likes/laura/soup', store);
  assert.deepEqual(await today(store), { adam: { likes: 1 }, laura: { likes: 2, matches: 1 } });
}));

test('swipes and cooking come from the phone in batches, only for the group\'s own people', () => at('2026-11-10T12:00:00Z', async () => {
  const store = memoryStore();
  assert.equal((await call('POST', '/usage', store, { who: 'adam', counts: { swipes: 12 } })).status, 200);
  await call('POST', '/usage', store, { who: 'adam', counts: { swipes: 3, cooked: 1, likes: 50 } }); // likes are the server's to count
  assert.equal((await call('POST', '/usage', store, { who: 'ludo', counts: { swipes: 5 } })).status, 400);
  await call('POST', '/usage', store, { who: 'laura', counts: { swipes: -4, cooked: 'lots' } });
  assert.deepEqual(await today(store), { adam: { swipes: 15, cooked: 1 } });
}));

test('an AI read is counted when it starts', () => at('2026-11-10T12:00:00Z', async () => {
  process.env.ANTHROPIC_API_KEY = 'test';
  const store = memoryStore();
  const model = new Anthropic({ apiKey: 'test', fetch: async () => new Response('{}', { status: 500 }), maxRetries: 0 });
  await call('POST', '/read', store, { type: 'application/pdf', data: 'JVBERi0xLjQ=', who: 'laura' });
  await runRead('job-1', store, model);
  assert.deepEqual(await today(store), { laura: { reads: 1 } });
}));

test('each day has its own counts, by the Dutch calendar', async () => {
  const store = memoryStore();
  await at('2026-11-10T22:30:00Z', () => addUsage(store, 'adam', { swipes: 1 })); // 23:30 in Amsterdam
  await at('2026-11-10T23:30:00Z', () => addUsage(store, 'adam', { swipes: 2 })); // 00:30 the next day
  assert.deepEqual((await readUsage(store)).map(d => [d.day, d.people.adam.swipes]), [['2026-11-10', 1], ['2026-11-11', 2]]);
  assert.equal(dayOf(new Date('2026-07-01T22:30:00Z')), '2026-07-02'); // summer time too
});

test('two phones counting at the same moment both land', async () => {
  const store = blobsLikeStore();
  await Promise.all([addUsage(store, 'adam', { swipes: 5 }), addUsage(store, 'laura', { swipes: 7 }), addUsage(store, 'adam', { likes: 1 })]);
  assert.deepEqual(await today(store), { adam: { swipes: 5, likes: 1 }, laura: { swipes: 7 } });
});

test('a store that fails never breaks what was being done', async () => {
  const broken = { getWithMetadata: async () => { throw new Error('down'); }, get: async () => { throw new Error('down'); }, setJSON: async () => { throw new Error('down'); } };
  await addUsage(broken, 'adam', { swipes: 1 }); // does not throw
});
