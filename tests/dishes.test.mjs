import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../lib/dishes.mjs';
import { isPrivateAddress, readRecipe, recipeFromHtml } from '../lib/import.mjs';

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
  assert.equal((await call('PATCH', '/orzo', store, { admin: true })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { title: '  ' })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { tried: 'yes' })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { sourceUrl: 'javascript:alert(1)' })).status, 400);
  assert.equal((await call('PATCH', '/orzo', store, { lastHad: 'soon' })).status, 400);
  assert.equal((await call('PATCH', '/nope', store, { ease: 1 })).status, 404);
  assert.equal((await dishes(store)).orzo.ease, 4);
});

test('a dish can be edited and the fields not sent stay as they were', async () => {
  const store = memoryStore();
  const res = await call('PATCH', '/orzo', store, { title: ' Better orzo ', shopping: ['a', ' ', 'b'], minutes: 20, tried: true, lexi: true, sourceUrl: '', admin: true });
  assert.equal(res.status, 200);
  const d = (await dishes(store)).orzo;
  assert.deepEqual([d.title, d.shopping, d.minutes, d.tried, d.lexi, d.sourceUrl, d.speed, d.admin], ['Better orzo', ['a', 'b'], 20, true, true, null, 3, undefined]);
});

test('an added dish appears, can be rated and ignores made-up fields', async () => {
  const store = memoryStore();
  const res = await call('POST', '', store, { title: ' Fajitas ', shopping: ['a', 'b'], admin: true, ease: 5, love: 9, lexi: true });
  assert.equal(res.status, 201);
  assert.equal((await call('PATCH', '/new-id', store, { ease: 3 })).status, 200);
  const d = (await dishes(store))['new-id'];
  assert.deepEqual([d.title, d.ingredientCount, d.ease, d.love, d.admin, d.tried, d.lexi], ['Fajitas', 2, 3, 0, undefined, false, true]);
  assert.equal((await call('POST', '', store, { title: '  ' })).status, 400);
  const unsafe = await (await call('POST', '', store, { title: 'Soup', sourceUrl: 'javascript:alert(1)' })).json();
  assert.equal(unsafe.dish.sourceUrl, null);
  const linked = await (await call('POST', '', store, { title: 'Stew', sourceUrl: 'https://example.com/stew' })).json();
  assert.equal(linked.dish.sourceUrl, 'https://example.com/stew');
});

const page = data => '<html><script type="application/ld+json">{bad json</script><script type="application/ld+json">' + JSON.stringify(data) + '</script></html>';

test('reads a recipe from the structured data on a page', () => {
  const r = recipeFromHtml(page({ '@graph': [{ '@type': 'WebPage' }, {
    '@type': ['Recipe'], name: 'Chilli &amp; rice', description: '<p>Hot</p>', totalTime: 'PT1H15M', recipeYield: ['4 servings'],
    recipeIngredient: ['1 onion', ' ', '200g rice'],
    recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [{ text: 'Chop.' }, { text: 'Cook.' }] }, 'Eat.']
  }] }), 'https://www.example.com/chilli');
  assert.deepEqual(r, { title: 'Chilli & rice', blurb: 'Hot', minutes: 75, serves: '4', shopping: ['1 onion', '200g rice'], steps: ['Chop.', 'Cook.', 'Eat.'], source: 'example.com' });
  const numbered = recipeFromHtml(page({ '@type': 'Recipe', name: 'Soup | My Site', recipeInstructions: '1. Chop 2 onions. 2. Cook them.' }), 'https://s.example.com/x');
  assert.deepEqual([numbered.title, numbered.steps, numbered.source], ['Soup', ['Chop 2 onions.', 'Cook them.'], 'example.com']);
  assert.equal(recipeFromHtml('<html>Nothing here</html>', 'https://example.com'), null);
});

test('imports refuse private addresses and anything that is not a web page', async () => {
  for (const url of ['http://127.0.0.1/', 'http://localhost/', 'http://[::1]/', 'http://169.254.169.254/latest', 'file:///etc/passwd', 'http://example.com:8080/', 'not a link']) {
    await assert.rejects(readRecipe(url), url);
  }
  assert.deepEqual(['10.0.0.1', '172.16.0.1', '192.168.1.1', '100.64.0.1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'].filter(a => !isPrivateAddress(a)), []);
  assert.deepEqual(['8.8.8.8', '172.32.0.1', '2606:4700::1'].filter(isPrivateAddress), []);
  const refused = await call('POST', '/import', memoryStore(), { url: 'http://127.0.0.1/' });
  assert.equal(refused.status, 422);
});
