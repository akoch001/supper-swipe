import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { handle } from '../lib/dishes.mjs';
import { addSwipes, readSwipes } from '../lib/history.mjs';

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
const BASE = { orzo: { title: 'Orzo', lastHad: '2026-10-01' }, soup: { title: 'Soup', lastHad: null } };
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, BASE, store, () => 'id'
);
const history = async store => (await (await call('GET', '/history', store)).json());
const at = async (when, work) => {
  mock.timers.enable({ apis: ['Date'], now: new Date(when) });
  try { await work(); } finally { mock.timers.reset(); }
};

test('the dates already saved as last cooked become the first history, once', async () => {
  const store = memoryStore();
  const first = await history(store);
  assert.deepEqual(first.events.map(e => [e.day, e.kind, e.dish]), [['2026-10-01', 'cooked', 'orzo']]);
  await call('DELETE', '/history/2026-10-01/cooked/orzo', store);
  assert.equal((await history(store)).events.length, 0, 'deleting it is not undone by seeding again');
});

test('a match, choosing a dish and cooking it with a rating all land in the history, newest first', () => at('2026-11-10T18:00:00Z', async () => {
  const store = memoryStore();
  await call('PUT', '/likes/adam/soup', store);
  await call('PUT', '/likes/laura/soup', store);
  assert.equal((await call('POST', '/history', store, { kind: 'chosen', id: 'soup', who: 'laura' })).status, 201);
  mock.timers.setTime(new Date('2026-11-11T08:00:00Z').getTime()); // the next morning
  await call('POST', '/history', store, { kind: 'cooked', id: 'soup', who: 'adam', rating: 4 });
  const { events } = await history(store);
  assert.deepEqual(events.map(e => [e.day, e.kind, e.dish, e.who, e.rating]), [
    ['2026-11-11', 'cooked', 'soup', 'adam', 4],
    ['2026-11-10', 'chosen', 'soup', 'laura', undefined],
    ['2026-11-10', 'matched', 'soup', 'laura', undefined],
    ['2026-10-01', 'cooked', 'orzo', null, undefined]
  ]);
}));

test('deleting an entry puts the dish\'s last cooked date back to what is left', () => at('2026-11-10T18:00:00Z', async () => {
  const store = memoryStore();
  await history(store); // seeds orzo on 1 October
  await call('POST', '/history', store, { kind: 'chosen', id: 'orzo', who: 'adam' });
  await call('PATCH', '/orzo', store, { lastHad: '2026-11-10' });
  const res = await (await call('DELETE', '/history/2026-11-10/chosen/orzo', store)).json();
  assert.equal(res.lastHad, '2026-10-01');
  const dishes = (await (await call('GET', '', store)).json()).dishes;
  assert.equal(dishes.orzo.lastHad, '2026-10-01');
  await call('DELETE', '/history/2026-10-01/cooked/orzo', store);
  assert.equal((await (await call('GET', '', store)).json()).dishes.orzo.lastHad, null);
}));

test('only chosen and cooked can be added, by the group\'s own people, for real dishes', async () => {
  const store = memoryStore();
  assert.equal((await call('POST', '/history', store, { kind: 'matched', id: 'orzo', who: 'adam' })).status, 400);
  assert.equal((await call('POST', '/history', store, { kind: 'chosen', id: 'orzo', who: 'ludo' })).status, 400);
  assert.equal((await call('POST', '/history', store, { kind: 'chosen', id: 'nope', who: 'adam' })).status, 404);
  assert.equal((await call('DELETE', '/history/2026-11-10/eaten/orzo', store)).status, 404);
  const rated = await call('POST', '/history', store, { kind: 'cooked', id: 'orzo', who: 'adam', rating: 9 });
  assert.equal(rated.status, 201);
  assert.equal((await history(store)).events.find(e => e.kind === 'cooked' && e.who === 'adam').rating, undefined, 'a rating out of range is dropped');
});

test('swipes are counted per dish from the phone\'s batch, not logged one by one', () => at('2026-11-10T18:00:00Z', async () => {
  const store = memoryStore();
  await call('POST', '/usage', store, { who: 'adam', counts: { swipes: 3 }, dishes: { orzo: { right: 2 }, soup: { left: 1 } } });
  await call('POST', '/usage', store, { who: 'laura', counts: { swipes: 1 }, dishes: { soup: { left: 1 }, 'not a dish!': { right: 1 }, orzo: { right: 'lots' } } });
  assert.deepEqual((await history(store)).swipes, { orzo: { right: 2, left: 0, lastRight: '2026-11-10' }, soup: { right: 0, left: 2, lastRight: null } });
  assert.equal([...store.m.keys()].filter(k => k.startsWith('history/') && k.includes('swipe')).length, 0);
}));

test('a broken store never breaks a swipe batch', async () => {
  const broken = { get: async () => { throw new Error('down'); }, setJSON: async () => { throw new Error('down'); } };
  await addSwipes(broken, { orzo: { right: 1 } });
  assert.deepEqual(await readSwipes(memoryStore()), {});
});
