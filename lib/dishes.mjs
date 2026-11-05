// Shared-storage logic for the deck. Recipe text lives in data/recipes.json; scores and
// dates saved from the app, plus dishes added in the app, live in the store. Each dish has
// its own key, so two people saving different dishes can't overwrite each other, and on the
// same dish the last save wins, field by field.

import { readRecipe } from './import.mjs';

const SCORES = ['ease', 'speed', 'love'];
const MAX_ADDED = 500;
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const textList = (v, maxItems, max) => (Array.isArray(v) ? v : []).slice(0, maxItems).map(s => text(s, max)).filter(Boolean);
const wholeNumber = v => (Number.isInteger(v) && v > 0 && v < 10000 ? v : null);
const webLink = v => (/^https?:\/\//.test(text(v, 500)) ? text(v, 500) : null);
const TEXT_LIMITS = { blurb: 240, kit: 200, note: 1000, serves: 40, source: 120 };
const LIST_LIMITS = { shopping: [60, 200], steps: [40, 1000], tags: [12, 40] };

function cleanChanges(body) {
  const out = {};
  if ('title' in body) {
    out.title = text(body.title, 120);
    if (!out.title) return null;
  }
  for (const key of Object.keys(TEXT_LIMITS)) if (key in body) out[key] = text(body[key], TEXT_LIMITS[key]);
  for (const key of Object.keys(LIST_LIMITS)) if (key in body) out[key] = textList(body[key], ...LIST_LIMITS[key]);
  if (out.tags) out.tags = out.tags.map(s => s.toLowerCase());
  for (const key of ['minutes', 'handsOn']) if (key in body) out[key] = wholeNumber(body[key]);
  for (const key of ['tried', 'lexi']) {
    if (key in body) {
      if (typeof body[key] !== 'boolean') return null;
      out[key] = body[key];
    }
  }
  if ('sourceUrl' in body) {
    out.sourceUrl = webLink(body.sourceUrl);
    if (!out.sourceUrl && text(body.sourceUrl, 500)) return null;
  }
  for (const key of SCORES) {
    if (key in body) {
      if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > 5) return null;
      out[key] = body[key];
    }
  }
  if ('lastHad' in body) {
    if (body.lastHad !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.lastHad))) return null;
    out.lastHad = body.lastHad;
  }
  return Object.keys(out).length ? out : null;
}

const score = v => (Number.isInteger(v) && v >= 0 && v <= 5 ? v : 0);

function cleanDish(body) {
  const title = text(body.title, 120);
  if (!title) return null;
  const shopping = textList(body.shopping, 60, 200);
  return {
    title,
    blurb: text(body.blurb, 240),
    minutes: wholeNumber(body.minutes),
    handsOn: wholeNumber(body.handsOn),
    kit: text(body.kit, 200),
    serves: text(body.serves, 40),
    note: text(body.note, 1000),
    source: text(body.source, 120),
    sourceUrl: webLink(body.sourceUrl),
    tags: textList(body.tags, 12, 40).map(s => s.toLowerCase()),
    shopping,
    ingredientCount: shopping.length,
    steps: textList(body.steps, 40, 1000),
    tried: body.tried === true, lexi: body.lexi === true,
    ease: score(body.ease), speed: score(body.speed), love: score(body.love), lastHad: null, sample: false, hard: []
  };
}

async function readAll(base, store) {
  const dishes = Object.fromEntries(Object.entries(base).map(([id, d]) => [id, { ...d }]));
  const [{ blobs: added }, { blobs: saved }] = await Promise.all([store.list({ prefix: 'added/' }), store.list({ prefix: 'saved/' })]);
  await Promise.all(added.map(async ({ key }) => {
    const dish = await store.get(key, { type: 'json' });
    if (dish) dishes[key.slice('added/'.length)] = { ...dish, ...(dishes[key.slice('added/'.length)] || {}) };
  }));
  await Promise.all(saved.map(async ({ key }) => {
    const id = key.slice('saved/'.length);
    const changes = await store.get(key, { type: 'json' });
    if (changes && dishes[id]) Object.assign(dishes[id], changes);
  }));
  return dishes;
}

// `path` is what follows /api/dishes, e.g. "" or "/orzo".
export async function handle(req, path, base, store, newId) {
  if (path === '' && req.method === 'GET') return reply(200, { dishes: await readAll(base, store) });

  let body;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'Not valid JSON' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Not valid JSON' });

  if (path === '' && req.method === 'POST') {
    const dish = cleanDish(body);
    if (!dish) return reply(400, { error: 'A dish needs a name' });
    const { blobs } = await store.list({ prefix: 'added/' });
    if (blobs.length >= MAX_ADDED) return reply(409, { error: 'The deck is full' });
    const id = newId();
    await store.setJSON('added/' + id, dish);
    return reply(201, { id, dish });
  }

  if (path === '/import' && req.method === 'POST') {
    try {
      const recipe = await readRecipe(text(body.url, 500));
      return recipe ? reply(200, { recipe }) : reply(422, { error: 'No recipe found on that page' });
    } catch {
      return reply(422, { error: 'That page could not be read' });
    }
  }

  const match = /^\/([A-Za-z0-9_-]{1,100})$/.exec(path);
  if (match && req.method === 'PATCH') {
    const id = match[1];
    const known = id in base || (await store.get('added/' + id, { type: 'json' }));
    if (!known) return reply(404, { error: 'No such dish' });
    const changes = cleanChanges(body);
    if (!changes) return reply(400, { error: 'Nothing valid to save' });
    const current = (await store.get('saved/' + id, { type: 'json' })) || {};
    await store.setJSON('saved/' + id, { ...current, ...changes });
    return reply(200, { id, changes });
  }

  return reply(405, { error: 'Not allowed' });
}
