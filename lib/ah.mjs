// Puts shopping list items on the AH list of one account. AH has no public API, so this talks to the one its
// mobile app uses, and could stop working whenever AH changes it. Only the login and the list are ever touched.
// The tokens stay in the store: nothing here returns or logs them.
const API = 'https://api.ah.nl';
const KEY = 'ah/tokens';
const CLIENT = 'appie-ios';
const HEADERS = {
  'user-agent': 'Appie/9.28 (iPhone17,3; iPhone; CPU OS 26_1 like Mac OS X)',
  'x-client-name': CLIENT,
  'x-client-version': '9.28',
  'x-application': 'AHWEBSHOP',
  accept: 'application/json',
  'content-type': 'application/json'
};
const EARLY_MS = 60000;

export class LoginExpired extends Error {}

async function fetchTokens(store, path, body) {
  const res = await fetch(API + '/mobile-auth/v1/auth/' + path, { method: 'POST', headers: HEADERS, body: JSON.stringify({ clientId: CLIENT, ...body }) });
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new LoginExpired('AH refused the login: ' + res.status);
  if (!res.ok) throw new Error('AH login failed: ' + res.status);
  const t = await res.json();
  const tokens = { access: t.access_token, refresh: t.refresh_token, expiresAt: Date.now() + t.expires_in * 1000 };
  await store.setJSON(KEY, tokens);
  return tokens;
}

export const isConnected = async store => !!(await store.get(KEY, { type: 'json' }));
export const connect = (store, code) => fetchTokens(store, 'token', { code });
export const disconnect = store => store.delete(KEY);

export async function addToList(store, items) {
  let tokens = await store.get(KEY, { type: 'json' });
  if (!tokens) throw new LoginExpired('Not connected');
  if (tokens.expiresAt - EARLY_MS <= Date.now()) tokens = await fetchTokens(store, 'token/refresh', { refreshToken: tokens.refresh });
  const res = await fetch(API + '/mobile-services/shoppinglist/v2/items', {
    method: 'PATCH',
    headers: { ...HEADERS, authorization: 'Bearer ' + tokens.access },
    body: JSON.stringify({ items: items.map(description => ({ description, quantity: 1, type: 'SHOPPABLE', originCode: 'TXT' })) })
  });
  if (res.status === 401) throw new LoginExpired('AH refused the token');
  if (!res.ok) throw new Error('AH list failed: ' + res.status);
}
