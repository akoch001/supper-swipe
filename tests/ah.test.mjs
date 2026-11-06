import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { handle } from '../lib/dishes.mjs';

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
const call = (method, path, store, body) => handle(
  new Request('https://x.test/api/dishes' + path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
  path, {}, store, () => 'id'
);
const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });
// A stand-in for AH. `answers` maps the end of an address to a status and body.
function fakeAH(answers) {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url: String(url), method: init.method, headers: init.headers, body: JSON.parse(init.body) });
    const [status, body] = answers[String(url).split('api.ah.nl')[1]] || [404, {}];
    return new Response(JSON.stringify(body), { status });
  };
  return sent;
}
const TOKEN = '/mobile-auth/v1/auth/token', REFRESH = TOKEN + '/refresh', LIST = '/mobile-services/shoppinglist/v2/items';
const grant = (access, seconds = 3600) => [200, { access_token: access, refresh_token: 'refresh-' + access, expires_in: seconds, token_type: 'Bearer' }];

test('connecting keeps the tokens on the server and never hands them out', async () => {
  const store = memoryStore(), sent = fakeAH({ [TOKEN]: grant('secret') });
  assert.equal((await (await call('GET', '', store)).json()).ah, false);
  const res = await call('POST', '/ah/connect', store, { code: 'abc' });
  assert.equal(res.status, 200);
  assert.ok(!(await res.text()).includes('secret'));
  assert.deepEqual(sent[0].body, { clientId: 'appie-ios', code: 'abc' });
  const page = await (await call('GET', '', store)).text();
  assert.equal(JSON.parse(page).ah, true);
  assert.ok(!page.includes('secret'));
});

test('items go on the AH list as plain text', async () => {
  const store = memoryStore(), sent = fakeAH({ [TOKEN]: grant('secret'), [LIST]: [200, { items: [] }] });
  await call('POST', '/ah/connect', store, { code: 'abc' });
  const res = await call('POST', '/ah/send', store, { items: ['uien (3)', ' ', 'knoflook (5 cloves)'] });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { sent: 2 });
  const { method, headers, body } = sent[1];
  assert.equal(method, 'PATCH');
  assert.equal(headers.authorization, 'Bearer secret');
  assert.deepEqual(body.items[1], { description: 'knoflook (5 cloves)', quantity: 1, type: 'SHOPPABLE', originCode: 'TXT' });
});

test('an old token is refreshed first, and the new ones are kept', async () => {
  const store = memoryStore(), sent = fakeAH({ [TOKEN]: grant('old', 10), [REFRESH]: grant('new'), [LIST]: [200, {}] });
  await call('POST', '/ah/connect', store, { code: 'abc' });
  assert.equal((await call('POST', '/ah/send', store, { items: ['uien'] })).status, 200);
  assert.deepEqual(sent[1].body, { clientId: 'appie-ios', refreshToken: 'refresh-old' });
  assert.equal(sent[2].headers.authorization, 'Bearer new');
  assert.equal((await store.get('ah/tokens')).refresh, 'refresh-new');
});

test('says when the login has run out, or AH is having problems, without giving details away', async () => {
  const store = memoryStore();
  fakeAH({ [TOKEN]: grant('old', 10), [REFRESH]: [401, { secret: 'x' }] });
  await call('POST', '/ah/connect', store, { code: 'abc' });
  let res = await call('POST', '/ah/send', store, { items: ['uien'] });
  assert.equal(res.status, 409);
  assert.deepEqual(await res.json(), { error: 'login' });
  fakeAH({ [TOKEN]: grant('fine'), [LIST]: [500, {}] });
  await call('POST', '/ah/connect', store, { code: 'abc' });
  res = await call('POST', '/ah/send', store, { items: ['uien'] });
  assert.equal(res.status, 502);
  fakeAH({ [TOKEN]: [400, {}] });
  assert.equal((await call('POST', '/ah/connect', memoryStore(), { code: 'bad' })).status, 409);
});

test('refuses empty sends and sends with no connection, and can be disconnected', async () => {
  const store = memoryStore(), sent = fakeAH({ [TOKEN]: grant('secret') });
  assert.equal((await call('POST', '/ah/connect', store, {})).status, 400);
  assert.equal((await call('POST', '/ah/send', store, { items: ['uien'] })).status, 409);
  await call('POST', '/ah/connect', store, { code: 'abc' });
  assert.equal((await call('POST', '/ah/send', store, { items: [] })).status, 400);
  assert.equal(sent.length, 1);
  assert.equal((await call('DELETE', '/ah', store)).status, 200);
  assert.equal(store.m.size, 0);
  assert.equal((await (await call('GET', '', store)).json()).ah, false);
});

test('a failed login is remembered with AH\'s status and no code, until one works', async () => {
  const store = memoryStore();
  fakeAH({ [TOKEN]: [403, {}] });
  assert.equal((await call('POST', '/ah/connect', store, { code: 'secret-code' })).status, 409);
  const after = await (await call('GET', '', store)).text();
  assert.ok(after.includes('AH refused the login: 403'));
  assert.ok(!after.includes('secret-code'));
  fakeAH({ [TOKEN]: grant('x') });
  assert.equal((await call('POST', '/ah/connect', store, { code: 'abc' })).status, 200);
  assert.equal((await (await call('GET', '', store)).json()).ahLast, null);
});
