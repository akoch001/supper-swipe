// Shared-storage logic for the deck. Recipe text lives in data/recipes.json; scores and
// dates saved from the app, plus dishes added in the app, live in the store. Each dish has
// its own key, so two people saving different dishes can't overwrite each other, and on the
// same dish the last save wins, field by field.

import { readRecipe } from './import.mjs';
import { FILE_TYPES, MAX_FILE_CHARS } from './reader.mjs';

const SCORES = ['ease', 'speed', 'love'];
const MAX_ADDED = 500;
const PEOPLE = ['adam', 'laura'];
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const textList = (v, maxItems, max) => (Array.isArray(v) ? v : []).slice(0, maxItems).map(s => text(s, max)).filter(Boolean);
const wholeNumber = v => (Number.isInteger(v) && v > 0 && v < 10000 ? v : null);
const webLink = v => (/^https?:\/\//.test(text(v, 500)) ? text(v, 500) : null);
// Generous enough that a real recipe is never cut short.
const TEXT_LIMITS = { blurb: 240, kit: 200, note: 4000, serves: 40, source: 120 };
const LIST_LIMITS = { shopping: [100, 300], steps: [60, 4000], tags: [12, 40] };

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
  const words = key => text(body[key], TEXT_LIMITS[key]), lines = key => textList(body[key], ...LIST_LIMITS[key]);
  return {
    title,
    blurb: words('blurb'),
    minutes: wholeNumber(body.minutes),
    handsOn: wholeNumber(body.handsOn),
    kit: words('kit'),
    serves: words('serves'),
    note: words('note'),
    source: words('source'),
    sourceUrl: webLink(body.sourceUrl),
    tags: lines('tags').map(s => s.toLowerCase()),
    shopping: lines('shopping'),
    steps: lines('steps'),
    tried: body.tried === true, lexi: body.lexi === true,
    ease: score(body.ease), speed: score(body.speed), love: score(body.love), lastHad: null, sample: false, hard: []
  };
}

async function readAll(base, store) {
  const dishes = Object.fromEntries(Object.entries(base).map(([id, d]) => [id, { ...d }]));
  const [{ blobs: added }, { blobs: saved }] = await Promise.all([store.list({ prefix: 'added/' }), store.list({ prefix: 'saved/' })]);
  const read = blobs => Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
  const [addedDishes, savedChanges] = await Promise.all([read(added), read(saved)]);
  // Insert in list order, not in the order the reads happen to finish, so an unchanged deck reads the same every time.
  added.forEach(({ key }, i) => {
    const id = key.slice('added/'.length);
    if (addedDishes[i] && !Object.hasOwn(dishes, id)) dishes[id] = addedDishes[i];
  });
  saved.forEach(({ key }, i) => {
    const id = key.slice('saved/'.length);
    if (savedChanges[i] && Object.hasOwn(dishes, id)) Object.assign(dishes[id], savedChanges[i]);
  });
  return dishes;
}

// Who has swiped right on what. Each like is its own key, so two phones can't overwrite each other.
async function readLikes(store) {
  const likes = Object.fromEntries(PEOPLE.map(p => [p, []]));
  const { blobs } = await store.list({ prefix: 'likes/' });
  for (const { key } of blobs) {
    const [, person, id] = key.split('/');
    if (likes[person]) likes[person].push(id);
  }
  return likes;
}

// Two saves to one dish can arrive together. Each writes only if the blob is still the one it read,
// so neither can drop the other's field. A store without conditional writes just writes.
async function mergeSaved(store, id, changes) {
  const key = 'saved/' + id;
  if (typeof store.getWithMetadata === 'function') {
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const now = await store.getWithMetadata(key, { type: 'json' });
        const done = await store.setJSON(key, { ...(now ? now.data : {}), ...changes }, now && now.etag ? { onlyIfMatch: now.etag } : { onlyIfNew: true });
        if (!done || done.modified !== false) return;
      }
    } catch { /* fall back to the plain write below */ }
  }
  const current = (await store.get(key, { type: 'json' })) || {};
  await store.setJSON(key, { ...current, ...changes });
}

// `path` is what follows /api/dishes, e.g. "" or "/orzo".
export async function handle(req, path, base, store, newId) {
  if (path === '' && req.method === 'GET') {
    const [dishes, likes] = await Promise.all([readAll(base, store), readLikes(store)]);
    return reply(200, { dishes, likes });
  }

  const liked = /^\/likes\/(adam|laura)\/([A-Za-z0-9_-]{1,100})$/.exec(path);
  if (liked && req.method === 'PUT') {
    const known = Object.hasOwn(base, liked[2]) || (await store.get('added/' + liked[2], { type: 'json' }));
    if (!known) return reply(404, { error: 'No such dish' });
    await store.setJSON('likes/' + liked[1] + '/' + liked[2], { at: new Date().toISOString() });
    return reply(200, { ok: true });
  }
  if (liked && req.method === 'DELETE') {
    await store.delete('likes/' + liked[1] + '/' + liked[2]);
    return reply(200, { ok: true });
  }

  const reading = /^\/read\/([A-Za-z0-9_-]{1,100})$/.exec(path);
  if (reading && req.method === 'GET') {
    const job = await store.get('reads/' + reading[1], { type: 'json' });
    if (!job) return reply(404, { error: 'No such reading' });
    return reply(200, { status: ['done', 'none', 'failed'].includes(job.status) ? job.status : 'reading', recipe: job.recipe });
  }

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

  // The AI reader takes longer than a request may last, so this only stores the work. The page then starts it and asks how it went.
  if (path === '/read' && req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) return reply(503, { error: 'AI reading is not switched on' });
    const url = webLink(body.url);
    const hasFile = FILE_TYPES.includes(body.type) && typeof body.data === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(body.data);
    if (!url && !hasFile) return reply(400, { error: 'Send a link, a PDF or a photo' });
    if (!url && body.data.length > MAX_FILE_CHARS) return reply(413, { error: 'That file is too big' });
    const id = newId();
    await store.setJSON('reads/' + id, url ? { status: 'waiting', url } : { status: 'waiting', type: body.type, data: body.data });
    return reply(202, { id });
  }

  const match = /^\/([A-Za-z0-9_-]{1,100})$/.exec(path);
  if (match && req.method === 'PATCH') {
    const id = match[1];
    const known = Object.hasOwn(base, id) || (await store.get('added/' + id, { type: 'json' }));
    if (!known) return reply(404, { error: 'No such dish' });
    const changes = cleanChanges(body);
    if (!changes) return reply(400, { error: 'Nothing valid to save' });
    await mergeSaved(store, id, changes);
    return reply(200, { id, changes });
  }

  return reply(405, { error: 'Not allowed' });
}
