import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { handle } from '../lib/dishes.mjs';
import { photoFromHtml, recipeFromHtml } from '../lib/import.mjs';
import { readWithModel } from '../lib/reader.mjs';

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
const BASE = { orzo: { title: 'Orzo', photo: '/photos/orzo.jpg' }, soup: { title: 'Soup' } };
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, BASE, store, () => 'id'
);
const dishes = async store => (await (await call('GET', '', store)).json()).dishes;
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64'), PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1]).toString('base64');
const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });

test('an uploaded photo is kept, served, and shown on the dish', async () => {
  const store = memoryStore();
  const res = await call('PUT', '/photos/soup', store, { big: JPEG, thumb: JPEG });
  assert.equal(res.status, 200);
  const { photo } = await res.json();
  assert.match(photo, /^\/api\/dishes\/photos\/soup\.jpg\?v=\d+$/);
  assert.equal((await dishes(store)).soup.photo, photo);
  for (const path of ['/photos/soup.jpg', '/photos/soup-thumb.jpg']) {
    const served = await call('GET', path, store);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/jpeg');
    assert.equal(Buffer.from(await served.arrayBuffer()).toString('base64'), JPEG);
  }
  assert.equal((await call('GET', '/photos/nope.jpg', store)).status, 404);
});

test('only real JPEGs for real dishes are stored', async () => {
  const store = memoryStore();
  assert.equal((await call('PUT', '/photos/nope', store, { big: JPEG, thumb: JPEG })).status, 404);
  assert.equal((await call('PUT', '/photos/soup', store, { big: PNG, thumb: JPEG })).status, 400);
  assert.equal((await call('PUT', '/photos/soup', store, { big: 'not base64!', thumb: JPEG })).status, 400);
  assert.equal((await call('PUT', '/photos/soup', store, { big: JPEG })).status, 400);
  assert.equal((await call('PUT', '/photos/soup', store, { big: 'A'.repeat(2000004), thumb: JPEG })).status, 400);
  assert.equal(store.m.size, 0);
});

test('the photo field cannot be set through an ordinary save', async () => {
  const store = memoryStore();
  assert.equal((await call('PATCH', '/soup', store, { photo: 'https://evil.test/x.jpg' })).status, 400);
  assert.equal((await dishes(store)).soup.photo, undefined);
});

test('removing a photo also hides a starter dish\'s own one', async () => {
  const store = memoryStore();
  await call('PUT', '/photos/orzo', store, { big: JPEG, thumb: JPEG });
  assert.equal((await call('DELETE', '/photos/orzo', store)).status, 200);
  assert.equal((await dishes(store)).orzo.photo, '');
  assert.equal((await call('GET', '/photos/orzo.jpg', store)).status, 404);
  assert.equal((await call('DELETE', '/photos/nope', store)).status, 404);
});

test('a photo from another site comes through only if it really is an image', async () => {
  const store = memoryStore();
  const answer = (bytes, type) => { globalThis.fetch = async () => new Response(bytes, { status: 200, headers: { 'content-type': type } }); };
  // Jumbo serves its photos as a generic file, so the bytes decide, not the label.
  answer(Buffer.from(JPEG, 'base64'), 'application/octet-stream');
  const ok = await call('POST', '/fetch-photo', store, { url: 'https://example.com/a.jpg' });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'image/jpeg');
  answer('<svg onload="alert(1)"></svg>', 'image/svg+xml');
  assert.equal((await call('POST', '/fetch-photo', store, { url: 'https://example.com/a.svg' })).status, 422);
  assert.equal((await call('POST', '/fetch-photo', store, { url: 'http://127.0.0.1/a.jpg' })).status, 422);
});

test('finds a page\'s photo, preferring the biggest in the recipe data', () => {
  const page = o => '<script type="application/ld+json">' + JSON.stringify(o) + '</script>';
  const sized = recipeFromHtml(page({ '@type': 'Recipe', name: 'Soup', image: ['https://e.com/s-225x225.jpg', 'https://e.com/s-1200x800.jpg', 'https://e.com/s-500x500.jpg'] }), 'https://e.com/r');
  assert.equal(sized.photoUrl, 'https://e.com/s-1200x800.jpg');
  assert.equal(recipeFromHtml(page({ '@type': 'Recipe', name: 'Soup', image: { url: '/s.jpg' } }), 'https://e.com/r').photoUrl, 'https://e.com/s.jpg');
  const shared = '<meta property="og:image" content="https://e.com/o.jpg?a=1&amp;b=2">';
  assert.equal(recipeFromHtml(shared + page({ '@type': 'Recipe', name: 'Soup' }), 'https://e.com/r').photoUrl, 'https://e.com/o.jpg?a=1&b=2');
  assert.equal(photoFromHtml(shared, 'https://e.com/r'), 'https://e.com/o.jpg?a=1&b=2');
  assert.equal(photoFromHtml('<p>Nothing</p>', 'https://e.com/r'), null);
});

test('the AI reader is asked where the photo is, and passes the answer on', async () => {
  let asked;
  const client = { beta: { messages: { create: async body => {
    asked = body;
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ found: true, title: 'Soup', photoPage: 2, photoBox: [0.1, 0.2, 0.9, 0.6] }) }] };
  } } } };
  const recipe = await readWithModel(client, { type: 'application/pdf', data: 'AAAA' });
  assert.deepEqual([recipe.photoPage, recipe.photoBox], [2, [0.1, 0.2, 0.9, 0.6]]);
  const { properties, required } = asked.output_config.format.schema;
  assert.ok(properties.photoPage && properties.photoBox && required.includes('photoBox'));
});
