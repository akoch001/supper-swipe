import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../lib/dishes.mjs';
import { freshDeck, groupFrom, GROUPS } from '../lib/groups.mjs';

function memoryStore() {
  const m = new Map();
  return {
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => (m.has(key) ? JSON.parse(m.get(key)) : null),
    setJSON: async (key, v) => { m.set(key, JSON.stringify(v)); },
    delete: async key => { m.delete(key); }
  };
}
const base = { orzo: { title: 'Orzo', ease: 4, speed: 3, love: 5, lastHad: '2026-10-01' } };
const ludoEva = GROUPS['ludo-eva'].people;
const call = (method, path, store, people) => handle(new Request('https://x.test/api/dishes' + path, { method }), path, base, store, () => 'id', people);
const withCookie = cookie => new Request('https://x.test/api/dishes', { headers: cookie ? { cookie } : {} });

test('phones from before groups, which send none, stay in Adam and Laura\'s group', () => {
  assert.equal(groupFrom(withCookie()), 'adam-laura');
  assert.equal(groupFrom(withCookie('other=1; supper-group=ludo-eva')), 'ludo-eva');
});

test('a group that is not on the list gets nothing, rather than someone else\'s dishes', () => {
  assert.equal(groupFrom(withCookie('supper-group=strangers')), null);
});

test('each group has its own store, so no group can see or change another\'s', () => {
  const stores = Object.values(GROUPS).map(g => g.store);
  assert.equal(new Set(stores).size, stores.length);
  assert.equal(GROUPS['adam-laura'].store, 'supper-swipe'); // where Adam and Laura's data already is
});

test('no name is in two groups, because a phone without its link picks its group by picking a name', () => {
  const keys = Object.values(GROUPS).flatMap(g => Object.keys(g.people));
  assert.equal(new Set(keys).size, keys.length);
});

test('a new group starts with the dishes and their ease, but none of Adam and Laura\'s ratings', () => {
  const deck = freshDeck(base);
  assert.equal(deck.orzo.ease, 4);
  assert.equal(deck.orzo.love, 0);
  assert.equal(deck.orzo.lastHad, null);
  assert.equal(base.orzo.love, 5, 'the starter deck itself is untouched');
});

test('only the group\'s own people can like, and the page is told who they are', async () => {
  const store = memoryStore();
  assert.equal((await call('PUT', '/likes/eva/orzo', store, ludoEva)).status, 200);
  assert.equal((await call('PUT', '/likes/adam/orzo', store, ludoEva)).status, 404);
  const answer = await (await call('GET', '', store, ludoEva)).json();
  assert.deepEqual(answer.people, { ludo: 'Ludo', eva: 'Eva' });
  assert.deepEqual(answer.likes, { ludo: [], eva: ['orzo'] });
});
