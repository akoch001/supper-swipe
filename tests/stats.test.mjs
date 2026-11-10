import assert from 'node:assert/strict';
import { test } from 'node:test';
import { explicitGroup, statsFor } from '../lib/stats.mjs';

function storeWith(days) {
  const m = new Map(Object.entries(days).map(([day, v]) => ['usage/day/' + day, JSON.stringify(v)]));
  return {
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => (m.has(key) ? JSON.parse(m.get(key)) : null)
  };
}
const stores = {
  'adam-laura': storeWith({ '2026-11-09': { adam: { swipes: 10, likes: 2 } }, '2026-11-10': { adam: { swipes: 5 }, laura: { swipes: 8, matches: 1, cooked: 1 } } }),
  'ludo-eva': storeWith({ '2026-11-10': { eva: { swipes: 3, reads: 1 } } }),
  'marius-marinke': storeWith({})
};
const cookie = c => new Request('https://x.test/api/dishes/stats', { headers: c ? { cookie: c } : {} });

test('Adam and Laura see every group, with totals per person and the newest day first', async () => {
  const stats = await statsFor('adam-laura', g => stores[g]);
  assert.equal(stats.everyone, true);
  assert.deepEqual(stats.groups.map(g => g.name), ['adam-laura', 'ludo-eva', 'marius-marinke']);
  const ours = stats.groups[0];
  assert.equal(ours.totals.adam.swipes, 15);
  assert.equal(ours.all.swipes, 23);
  assert.equal(ours.all.matches, 1);
  assert.deepEqual(ours.daily.map(d => [d.day, d.swipes]), [['2026-11-10', 13], ['2026-11-09', 10]]);
  assert.deepEqual(ours.lastSeen, { adam: '2026-11-10', laura: '2026-11-10' });
  assert.deepEqual(stats.groups[2].lastSeen, { marius: null, marinke: null });
});

test('any other group sees only its own', async () => {
  const stats = await statsFor('ludo-eva', g => stores[g]);
  assert.equal(stats.everyone, false);
  assert.deepEqual(stats.groups.map(g => g.name), ['ludo-eva']);
  assert.equal(stats.groups[0].totals.eva.reads, 1);
});

test('only a phone that says its group gets stats, so a new browser is not taken for Adam and Laura', () => {
  assert.equal(explicitGroup(cookie()), null);
  assert.equal(explicitGroup(cookie('supper-group=strangers')), null);
  assert.equal(explicitGroup(cookie('a=1; supper-group=adam-laura')), 'adam-laura');
});
