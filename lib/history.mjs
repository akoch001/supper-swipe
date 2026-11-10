// What each group has matched, chosen and cooked, so the History page can show the hits, the gaps
// between times and what never gets made. Each event is its own small blob in the group's store,
// history/<day>/<kind>/<dish>, so deleting one is deleting that blob. "Chosen" is pressing "We're
// cooking this tonight"; "cooked" is answering "How was it?" afterwards, with a rating.
// Swipes are far too many to log one by one, so they are only counted per dish, in one blob per group
// (swipes/per-dish): { orzo: { right: 9, left: 2, lastRight: '2026-11-10' } }.
import { dayOf } from './usage.mjs';

export const KINDS = ['matched', 'chosen', 'cooked'];
const PREFIX = 'history/', SWIPES = 'swipes/per-dish', SEEDED = 'history-seeded';
const DISH = /^[A-Za-z0-9_-]{1,100}$/, DAY = /^\d{4}-\d{2}-\d{2}$/;

export const eventKey = (day, kind, dish) => PREFIX + day + '/' + kind + '/' + dish;

export function parseKey(key) {
  const [, day, kind, dish] = key.split('/');
  return DAY.test(day) && KINDS.includes(kind) && DISH.test(dish || '') ? { day, kind, dish } : null;
}

export async function addEvent(store, kind, dish, who, extra = {}, date = new Date()) {
  const key = eventKey(dayOf(date), kind, dish);
  await store.setJSON(key, { who: who || null, at: date.toISOString(), ...extra });
  return key;
}

// Newest first. Each event: { key, day, kind, dish, who, at, rating? }.
export async function readHistory(store) {
  const { blobs } = await store.list({ prefix: PREFIX });
  const found = blobs.map(({ key }) => ({ key, ...parseKey(key) })).filter(e => e.kind);
  const data = await Promise.all(found.map(e => store.get(e.key, { type: 'json' })));
  return found.map((e, i) => ({ ...(data[i] || {}), ...e }))
    .sort((a, b) => (a.day !== b.day ? (a.day < b.day ? 1 : -1)
      : String(b.at).localeCompare(String(a.at)) || KINDS.indexOf(b.kind) - KINDS.indexOf(a.kind)));
}

// The last day a dish was chosen or cooked, from what is left in the history, or null.
export const lastMadeFrom = (events, dish) => events.filter(e => e.dish === dish && e.kind !== 'matched').map(e => e.day).sort().pop() || null;

// The dates already saved as "last cooked" become the first history, once, so the page doesn't start empty.
export async function seedFromLastHad(store, dishes) {
  if (await store.get(SEEDED, { type: 'json' })) return;
  await Promise.all(Object.entries(dishes).filter(([, d]) => d.lastHad && DAY.test(d.lastHad))
    .map(([id, d]) => store.setJSON(eventKey(d.lastHad, 'cooked', id), { who: null, at: d.lastHad + 'T19:00:00.000Z', fromBefore: true })));
  await store.setJSON(SEEDED, { at: new Date().toISOString() });
}

export async function readSwipes(store) {
  return (await store.get(SWIPES, { type: 'json' })) || {};
}

// Adds a phone's batch of swipes, { orzo: { right: 1, left: 0 } }, with the same write-if-unchanged
// retry as the usage counts. Never throws.
export async function addSwipes(store, batch, date = new Date()) {
  const clean = {};
  for (const [id, c] of Object.entries(batch || {}).slice(0, 200)) {
    if (!DISH.test(id) || id === '__proto__' || !c || typeof c !== 'object') continue;
    const n = v => (Number.isInteger(v) && v > 0 ? Math.min(v, 100) : 0);
    if (n(c.right) || n(c.left)) clean[id] = { right: n(c.right), left: n(c.left) };
  }
  if (!Object.keys(clean).length) return;
  const today = dayOf(date);
  const merged = all => {
    const out = { ...all };
    for (const [id, c] of Object.entries(clean)) {
      const was = out[id] || { right: 0, left: 0, lastRight: null };
      out[id] = { right: was.right + c.right, left: was.left + c.left, lastRight: c.right ? today : was.lastRight };
    }
    return out;
  };
  try {
    if (typeof store.getWithMetadata === 'function') {
      for (let attempt = 0; attempt < 6; attempt++) {
        const now = await store.getWithMetadata(SWIPES, { type: 'json' });
        const done = await store.setJSON(SWIPES, merged(now ? now.data || {} : {}), now && now.etag ? { onlyIfMatch: now.etag } : { onlyIfNew: true });
        if (!done || done.modified !== false) return;
      }
      return;
    }
    await store.setJSON(SWIPES, merged(await readSwipes(store)));
  } catch (err) {
    console.error('Swipes could not be counted:', err.message);
  }
}
