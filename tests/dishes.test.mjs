import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../lib/dishes.mjs';

function memoryStore() {
  const m = new Map();
  return {
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => (m.has(key) ? JSON.parse(m.get(key)) : null),
    setJSON: async (key, v) => { m.set(key, JSON.stringify(v)); }
  };
}
const base = { orzo: { title: 'Orzo', ease: 4, speed: 3, love: 0, lastHad: null } };
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, base, store, () => 'new-id'
);
const dishes = async store => (await (await call('GET', '', store)).json()).dishes;

test('the last save wins and untouched fields keep their values', async () => {
  const store = memoryStore();
  assert.equal((await call('PATCH', '/orzo', store, { ease: 2 })).status, 200);
  assert.equal((await call('PATCH', '/orzo', store, { love: 5 })).status, 200);
  assert.equal((await call('PATCH', '/orzo', store, { ease: 5 })).status, 200);
  const d = (await dishes(store)).orzo;
  assert.deepEqual([d.ease, d.love, d.speed, d.title], [5, 5, 3, 'Orzo']);
});

test('bad scores, unknown fields and unknown dishes are refused', async () => {
  const store = memoryStore();
  assert.equal((await call('PATCH', '/orzo', store, { ease: 9 })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { ease: 1.5 })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { title: 'Hacked' })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { lastHad: 'soon' })).status, 400);
  assert.equal((await call('PATCH', '/nope', store, { ease: 1 })).status, 404);
  assert.equal((await dishes(store)).orzo.ease, 4);
});

test('an added dish appears, can be rated and ignores made-up fields', async () => {
  const store = memoryStore();
  const res = await call('POST', '', store, { title: ' Fajitas ', core: ['Chicken'], shopping: ['a', 'b'], admin: true, ease: 5 });
  assert.equal(res.status, 201);
  assert.equal((await call('PATCH', '/new-id', store, { ease: 3 })).status, 200);
  const d = (await dishes(store))['new-id'];
  assert.deepEqual([d.title, d.core[0], d.ingredientCount, d.ease, d.admin], ['Fajitas', 'chicken', 2, 3, undefined]);
  assert.equal((await call('POST', '', store, { title: '  ' })).status, 400);
});
