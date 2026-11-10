// Shared-storage logic for the deck. Recipe text lives in data/recipes.json; scores and
// dates saved from the app, plus dishes added in the app, live in the store. Each dish has
// its own key, so two people saving different dishes can't overwrite each other, and on the
// same dish the last save wins, field by field.

import { addToList, connect, disconnect, isConnected, lastTry, LoginExpired } from './ah.mjs';
import { fetchPage, MAX_BYTES, readRecipe } from './import.mjs';
import { monthOf, OUT_OF_READS, READS_PER_MONTH, readsUsed, readsUsedBy } from './allowance.mjs';
import { FILE_TYPES, MAX_FILE_CHARS } from './reader.mjs';
import { addUsage } from './usage.mjs';

const SCORES = ['ease', 'speed', 'love'];
const MAX_ADDED = 500;
const JSON_HEADERS = { 'content-type': 'application/json', 'cache-control': 'no-store' };

const MAX_PHOTO_CHARS = 2000000;
const IS_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const IMAGE_STARTS = [['image/jpeg', 'ffd8ff'], ['image/png', '89504e47'], ['image/gif', '47494638'], ['image/webp', '52494646']];
const imageType = bytes => (IMAGE_STARTS.find(([, start]) => bytes.toString('hex', 0, 4).startsWith(start)) || [])[0];
const jpegFrom = v => {
  if (typeof v !== 'string' || v.length > MAX_PHOTO_CHARS || !IS_BASE64.test(v)) return null;
  const bytes = Buffer.from(v, 'base64');
  return imageType(bytes) === 'image/jpeg' ? bytes : null;
};
const asArrayBuffer = bytes => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);

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
async function readLikes(store, people) {
  const likes = Object.fromEntries(Object.keys(people).map(p => [p, []]));
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

async function talkToAH(work) {
  try {
    return reply(200, await work());
  } catch (err) {
    console.error('AH:', err.message);
    return err instanceof LoginExpired ? reply(409, { error: 'login' }) : reply(502, { error: 'AH did not answer' });
  }
}

// `path` is what follows /api/dishes, e.g. "" or "/orzo". `people` is the group's, as { key: name }.
export async function handle(req, path, base, store, newId, people = { adam: 'Adam', laura: 'Laura' }) {
  if (path === '' && req.method === 'GET') {
    const [dishes, likes, ah, ahLast, used] = await Promise.all([readAll(base, store), readLikes(store, people), isConnected(store), lastTry(store), readsUsedBy(store, people, monthOf(new Date()))]);
    return reply(200, { dishes, likes, people, ah, ahLast, reads: { limit: READS_PER_MONTH, used } });
  }

  const servedPhoto = /^\/photos\/([A-Za-z0-9_-]{1,100}?(?:-thumb)?)\.jpg$/.exec(path);
  if (servedPhoto && req.method === 'GET') {
    const bytes = await store.get('photos/' + servedPhoto[1], { type: 'arrayBuffer' });
    if (!bytes) return new Response('No such photo', { status: 404 });
    // The address changes with each new photo, so this one never needs asking for again.
    return new Response(bytes, { status: 200, headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  }

  const photo = /^\/photos\/([A-Za-z0-9_-]{1,100})$/.exec(path);
  if (photo && req.method === 'DELETE') {
    const known = Object.hasOwn(base, photo[1]) || (await store.get('added/' + photo[1], { type: 'json' }));
    if (!known) return reply(404, { error: 'No such dish' });
    await mergeSaved(store, photo[1], { photo: '' }); // blank, so a starter dish doesn't go back to its own photo
    await Promise.all([store.delete('photos/' + photo[1]), store.delete('photos/' + photo[1] + '-thumb')]);
    return reply(200, { ok: true });
  }

  const liked = /^\/likes\/([a-z]{1,30})\/([A-Za-z0-9_-]{1,100})$/.exec(path);
  if (liked && !Object.hasOwn(people, liked[1])) return reply(404, { error: 'No such person' });
  if (liked && req.method === 'PUT') {
    const known = Object.hasOwn(base, liked[2]) || (await store.get('added/' + liked[2], { type: 'json' }));
    if (!known) return reply(404, { error: 'No such dish' });
    const others = Object.keys(people).filter(p => p !== liked[1]);
    const [already, ...theirs] = await Promise.all([liked[1], ...others].map(p => store.get('likes/' + p + '/' + liked[2], { type: 'json' })));
    await store.setJSON('likes/' + liked[1] + '/' + liked[2], { at: new Date().toISOString() });
    // A like sent again (a phone retrying, say) isn't a new one. This like makes a match if anyone else already liked it.
    if (!already) await addUsage(store, liked[1], { likes: 1, matches: theirs.some(Boolean) ? 1 : 0 });
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
    return reply(200, { status: ['done', 'none', 'failed', 'used-up'].includes(job.status) ? job.status : 'reading', recipe: job.recipe });
  }

  if (path === '/ah' && req.method === 'DELETE') {
    await disconnect(store);
    return reply(200, { ok: true });
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

  // The page can't read a photo from another site itself, so it comes through here to be shrunk there.
  if (path === '/fetch-photo' && req.method === 'POST') {
    try {
      const { body: bytes } = await fetchPage(text(body.url, 2000));
      const type = imageType(bytes);
      if (!type || bytes.length >= MAX_BYTES) return reply(422, { error: 'That is not a usable photo' });
      return new Response(bytes, { status: 200, headers: { 'content-type': type, 'cache-control': 'no-store' } });
    } catch {
      return reply(422, { error: 'That photo could not be fetched' });
    }
  }

  if (photo && req.method === 'PUT') {
    const known = Object.hasOwn(base, photo[1]) || (await store.get('added/' + photo[1], { type: 'json' }));
    if (!known) return reply(404, { error: 'No such dish' });
    const big = jpegFrom(body.big), thumb = jpegFrom(body.thumb);
    if (!big || !thumb) return reply(400, { error: 'That is not a usable photo' });
    await Promise.all([store.set('photos/' + photo[1], asArrayBuffer(big)), store.set('photos/' + photo[1] + '-thumb', asArrayBuffer(thumb))]);
    const address = '/api/dishes/photos/' + photo[1] + '.jpg?v=' + Date.now();
    await mergeSaved(store, photo[1], { photo: address });
    return reply(200, { photo: address });
  }

  if (path === '/ah/connect' && req.method === 'POST') {
    const code = text(body.code, 4000);
    if (!code) return reply(400, { error: 'No login code' });
    return talkToAH(async () => {
      await connect(store, code);
      return { connected: true };
    });
  }
  if (path === '/ah/send' && req.method === 'POST') {
    const items = textList(body.items, 100, 160);
    if (!items.length) return reply(400, { error: 'Nothing to send' });
    return talkToAH(async () => {
      await addToList(store, items);
      return { sent: items.length };
    });
  }

  // Swipes and cooking, counted on the phone and sent in batches (see lib/usage.mjs).
  if (path === '/usage' && req.method === 'POST') {
    const person = text(body.who, 30), counts = body.counts && typeof body.counts === 'object' ? body.counts : {};
    if (!Object.hasOwn(people, person)) return reply(400, { error: 'Say who you are first' });
    const capped = n => (Number.isInteger(n) && n > 0 ? Math.min(n, 1000) : 0); // no phone swipes a thousand times between two sends
    await addUsage(store, person, { swipes: capped(counts.swipes), cooked: Math.min(capped(counts.cooked), 20) });
    return reply(200, { ok: true });
  }

  // The AI reader takes longer than a request may last, so this only stores the work. The page then starts it and asks how it went.
  if (path === '/read' && req.method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) return reply(503, { error: 'AI reading is not switched on' });
    // Reads are counted per person, so the page says who is asking. The count goes up only when the read starts (see runRead).
    const who = text(body.who, 30);
    if (!Object.hasOwn(people, who)) return reply(400, { error: 'Say who you are first' });
    if ((await readsUsed(store, who, monthOf(new Date()))) >= READS_PER_MONTH) return reply(429, { error: OUT_OF_READS, usedUp: true });
    const url = webLink(body.url);
    const hasFile = FILE_TYPES.includes(body.type) && typeof body.data === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(body.data);
    if (!url && !hasFile) return reply(400, { error: 'Send a link, a PDF or a photo' });
    if (!url && body.data.length > MAX_FILE_CHARS) return reply(413, { error: 'That file is too big' });
    const id = newId();
    await store.setJSON('reads/' + id, url ? { status: 'waiting', who, url } : { status: 'waiting', who, type: body.type, data: body.data });
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
