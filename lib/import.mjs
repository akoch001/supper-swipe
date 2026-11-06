// Reads a recipe from a web page. Most recipe sites publish it as schema.org data for search
// engines, so no site-specific code is needed. Only the recipe fields are ever passed on.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const MAX_BYTES = 4000000;
const TIME_LIMIT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_PAGE_TEXT = 60000;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', frac12: '½', frac14: '¼', frac34: '¾', deg: '°' };

const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z0-9]+);/gi, (all, name) => ENTITIES[name] || all);
const clean = v => decode(String(v == null ? '' : v).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function minutesFrom(v) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(String(v || ''));
  if (!m) return null;
  return Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) || null;
}

function stepsFrom(v) {
  if (!v) return [];
  if (typeof v === 'string') {
    // Only a method written as "1. Chop. 2. Cook." on one line is split at its numbers. Otherwise "gas 6. Put..." would be.
    const numbered = /^\s*1[.)]\s/.test(clean(v));
    return v.split(numbered ? /\r?\n|<\/(?:p|li)>|\s(?=\d{1,2}\.\s+[A-Z])/ : /\r?\n|<\/(?:p|li)>/)
      .map(s => clean(s).replace(/^\d{1,2}[.)]\s+/, '')).filter(Boolean);
  }
  if (Array.isArray(v)) return v.flatMap(stepsFrom);
  if (v.itemListElement) return stepsFrom(v.itemListElement);
  return stepsFrom(v.text || v.name);
}

function findRecipe(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== 'object') return null;
  if ([].concat(node['@type'] || []).includes('Recipe')) return node;
  return findRecipe(node['@graph']) || findRecipe(node.mainEntity);
}

// Sites list one photo at several sizes, with the size in the address, so take the biggest. No size in the address usually means the original.
const areaIn = address => {
  const m = /-(\d+)x(\d+)\.\w+(?:\?|$)/.exec(address);
  return m ? m[1] * m[2] : Infinity;
};
function biggestImage(image) {
  const addresses = [].concat(image || []).map(i => (typeof i === 'string' ? i : i && (i.url || i.contentUrl))).filter(Boolean);
  return addresses.reduce((best, a) => (best === null || areaIn(a) > areaIn(best) ? a : best), null);
}

// The dish's photo: from the recipe data if there is any, otherwise the picture the page offers for sharing.
export function photoFromHtml(html, url, recipe) {
  const shared = /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)/i.exec(html) || /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i.exec(html);
  const found = biggestImage(recipe && recipe.image) || (shared && decode(shared[1]));
  if (!found) return null;
  try {
    return new URL(found, url).href;
  } catch {
    return null;
  }
}

export function recipeFromHtml(html, url) {
  for (const [, json] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r || !r.name) continue;
    const parts = minutesFrom(r.prepTime) + minutesFrom(r.cookTime);
    const serves = /\d+/.exec(String([].concat(r.recipeYield || [])[0] || ''));
    return {
      title: clean(r.name).split(' | ')[0],
      blurb: clean(r.description).slice(0, 240),
      minutes: minutesFrom(r.totalTime) || parts || null,
      serves: serves ? serves[0] : '',
      shopping: [].concat(r.recipeIngredient || r.ingredients || []).map(clean).filter(Boolean),
      steps: stepsFrom(r.recipeInstructions),
      source: new URL(url).hostname.replace(/^(www|s|app)\./, ''),
      photoUrl: photoFromHtml(html, url, r)
    };
  }
  return null;
}

export function isPrivateAddress(ip) {
  const lower = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(lower) === 6) return !/^[23][0-9a-f]{3}:/.test(lower); // only global unicast counts as public
  if (isIP(lower) !== 4) return true; // refuse what cannot be read
  const [a, b] = lower.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

// Even behind the site password, this must not be usable to reach private addresses.
async function assertPublic(url) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !['', '80', '443'].includes(url.port)) throw new Error('Not a web page');
  const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
  if (!addresses.length || addresses.some(a => isPrivateAddress(a.address))) throw new Error('Not a public address');
}

async function readPage(res) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel();
  return Buffer.concat(chunks);
}

// The page at a public address, checking every redirect on the way.
export async function fetchPage(address) {
  let url = new URL(address);
  const signal = AbortSignal.timeout(TIME_LIMIT_MS);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { redirect: 'manual', signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; SupperSwipe/1.0)', accept: 'text/html, application/pdf, image/*' } });
    const next = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    if (!res.ok) throw new Error('The page refused: ' + res.status);
    const isPdf = /application\/pdf/i.test(res.headers.get('content-type') || '');
    const body = await readPage(res);
    if (isPdf && body.length >= MAX_BYTES) throw new Error('That PDF is too big');
    return { isPdf, body };
  }
  throw new Error('Too many redirects');
}

export async function readRecipe(address) {
  const page = await fetchPage(address);
  return page.isPdf ? null : recipeFromHtml(page.body.toString('utf8'), address);
}

// The words on a page, for the AI reader. The recipe comes well before the end of any page this long.
export const pageText = html => clean(html.replace(/<(script|style|noscript|svg|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ')).slice(0, MAX_PAGE_TEXT);
