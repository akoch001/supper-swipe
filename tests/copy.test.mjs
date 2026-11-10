import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFirstGroupDishes } from '../lib/copy.mjs';
import { handle } from '../lib/dishes.mjs';

function memoryStore() {
  const m = new Map();
  return {
    m,
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async (key, o) => (!m.has(key) ? null : o && o.type === 'arrayBuffer' ? m.get(key) : JSON.parse(m.get(key))),
    set: async (key, v) => { m.set(key, v); },
    setJSON: async (key, v) => { m.set(key, JSON.stringify(v)); },
    delete: async key => { m.delete(key); }
  };
}
const ours = () => {
  const s = memoryStore();
  s.m.set('added/fajitas', JSON.stringify({ title: 'Fajitas', ease: 4, speed: 3, love: 5, lastHad: '2026-11-01', lexi: true, tried: true }));
  s.m.set('saved/fajitas', JSON.stringify({ title: 'Chicken fajitas', love: 4, photo: '/api/dishes/photos/fajitas.jpg?v=1' }));
  s.m.set('photos/fajitas', new Uint8Array([1, 2]).buffer);
  s.m.set('photos/fajitas-thumb', new Uint8Array([3]).buffer);
  s.m.set('added/curry', JSON.stringify({ title: 'Curry', ease: 2, love: 3, lastHad: null, photo: '/api/dishes/photos/curry.jpg?v=1' })); // its photo blob is missing
  s.m.set('likes/adam/fajitas', JSON.stringify({ at: 'x' }));
  return s;
};
const dishesOf = async store => (await (await handle(new Request('https://x.test/api/dishes'), '', {}, store, () => 'id', { ludo: 'Ludo', eva: 'Eva' })).json()).dishes;

test("a new group gets Adam and Laura's added dishes with their edits and photos, but not their ratings or likes", async () => {
  const from = ours(), to = memoryStore();
  await copyFirstGroupDishes(from, to, 'test-a');
  const dishes = await dishesOf(to);
  assert.deepEqual(Object.keys(dishes).sort(), ['curry', 'fajitas']);
  assert.equal(dishes.fajitas.title, 'Chicken fajitas');
  assert.equal(dishes.fajitas.ease, 4);
  assert.equal(dishes.fajitas.lexi, true);
  assert.equal(dishes.fajitas.love, 0);
  assert.equal(dishes.fajitas.lastHad, null);
  assert.equal(dishes.fajitas.photo, '/api/dishes/photos/fajitas.jpg?v=1');
  assert.deepEqual(new Uint8Array(to.m.get('photos/fajitas')), new Uint8Array([1, 2]));
  assert.equal(dishes.curry.photo, '', 'a photo that is not there is dropped rather than shown broken');
  assert.ok(![...to.m.keys()].some(k => k.startsWith('likes/')));
});

test("Adam and Laura's own dishes are left exactly as they were", async () => {
  const from = ours(), before = new Map(from.m);
  await copyFirstGroupDishes(from, memoryStore(), 'test-b');
  assert.deepEqual(from.m, before);
});

test('the copy happens once, and never overwrites what the group has made its own', async () => {
  const from = ours(), to = memoryStore();
  await copyFirstGroupDishes(from, to, 'test-c');
  to.m.set('added/fajitas', JSON.stringify({ title: 'Our fajitas', love: 5 }));
  from.m.set('added/new-one', JSON.stringify({ title: 'Added later' }));
  await copyFirstGroupDishes(from, to, 'test-c');
  await copyFirstGroupDishes(from, to, 'test-c-again'); // a new function instance, which only has the marker to go on
  const dishes = await dishesOf(to);
  assert.equal(dishes.fajitas.title, 'Our fajitas');
  assert.equal(dishes['new-one'], undefined);
});
