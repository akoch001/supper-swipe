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
// Like the real store: slow, and able to refuse a write when the blob has changed since it was read.
function slowStore(ms) {
  const m = new Map(), pause = () => new Promise(r => setTimeout(r, ms * (.5 + Math.random())));
  let version = 0;
  return {
    list: async ({ prefix }) => ({ blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }),
    get: async key => { await pause(); return m.has(key) ? JSON.parse(m.get(key).body) : null; },
    getWithMetadata: async key => { await pause(); return m.has(key) ? { data: JSON.parse(m.get(key).body), etag: m.get(key).etag } : null; },
    setJSON: async (key, v, opts = {}) => {
      await pause();
      const had = m.get(key);
      if ((opts.onlyIfNew && had) || (opts.onlyIfMatch && (!had || had.etag !== opts.onlyIfMatch))) return { modified: false };
      m.set(key, { body: JSON.stringify(v), etag: 'v' + ++version });
      return { modified: true, etag: 'v' + version };
    }
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

test('saves that arrive together all land', async () => {
  const store = slowStore(8);
  const sent = await Promise.all([{ ease: 5 }, { speed: 5 }, { love: 5 }, { lexi: true }].map(body => call('PATCH', '/orzo', store, body)));
  assert.deepEqual(sent.map(r => r.status), [200, 200, 200, 200]);
  const d = (await dishes(store)).orzo;
  assert.deepEqual([d.ease, d.speed, d.love, d.lexi], [5, 5, 5, true]);
});

test('names every object has, such as __proto__, are not dishes', async () => {
  const store = memoryStore();
  for (const id of ['__proto__', 'constructor', 'toString']) assert.equal((await call('PATCH', '/' + id, store, { title: 'Polluted' })).status, 404);
  await store.setJSON('saved/__proto__', { title: 'Polluted' });
  assert.deepEqual(Object.keys(await dishes(store)), ['orzo']);
  assert.equal({}.title, undefined);
});

test('an unchanged deck reads the same every time', async () => {
  const store = slowStore(4);
  for (const id of ['c', 'a', 'd', 'b']) await store.setJSON('added/' + id, { title: id });
  const reads = new Set();
  for (let i = 0; i < 6; i++) reads.add(await (await call('GET', '', store)).text());
  assert.equal(reads.size, 1);
});

test('long recipes are kept whole', async () => {
  const store = memoryStore(), step = 'Stir. '.repeat(500).trim();
  const made = await (await call('POST', '', store, { title: 'Stew', steps: [step], note: step, shopping: Array.from({ length: 70 }, (_, i) => 'item ' + i) })).json();
  assert.deepEqual([made.dish.steps[0].length, made.dish.note.length, made.dish.shopping.length], [step.length, step.length, 70]);
  await call('PATCH', '/orzo', store, { steps: [step] });
  assert.equal((await dishes(store)).orzo.steps[0], step);
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
  assert.deepEqual([d.title, d.shopping.length, d.ease, d.love, d.admin, d.tried, d.lexi], ['Fajitas', 2, 3, 0, undefined, false, true]);
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
  const gas = recipeFromHtml(page({ '@type': 'Recipe', name: 'Roast', recipeInstructions: [{ text: 'Heat oven to 200C/gas 6. Put the chicken in a tin.' }, { text: '1.5 litres of stock go in.' }, 'Divide into 12. Roll each piece.'] }), 'https://example.com/r');
  assert.deepEqual(gas.steps, ['Heat oven to 200C/gas 6. Put the chicken in a tin.', '1.5 litres of stock go in.', 'Divide into 12. Roll each piece.']);
  assert.equal(recipeFromHtml('<html>Nothing here</html>', 'https://example.com'), null);
});

test('imports refuse private addresses and anything that is not a web page', async () => {
  const urls = ['http://127.0.0.1/', 'http://localhost/', 'http://[::1]/', 'http://169.254.169.254/latest', 'file:///etc/passwd', 'http://example.com:8080/', 'not a link',
    'http://[::ffff:127.0.0.1]/', 'http://[::ffff:169.254.169.254]/', 'http://user:secret@127.0.0.1/'];
  for (const url of urls) await assert.rejects(readRecipe(url), /Not a public address|Not a web page|Invalid URL/, url);
  assert.deepEqual(['10.0.0.1', '172.16.0.1', '192.168.1.1', '100.64.0.1', 'fd00::1', 'fe80::1', '::1', '::', '::ffff:127.0.0.1', '::ffff:7f00:1', '64:ff9b::7f00:1', 'garbage'].filter(a => !isPrivateAddress(a)), []);
  assert.deepEqual(['8.8.8.8', '172.32.0.1', '2606:4700::1'].filter(isPrivateAddress), []);
  const refused = await call('POST', '/import', memoryStore(), { url: 'http://127.0.0.1/' });
  assert.equal(refused.status, 422);
});
