// How much each group uses the app: per person and per day, how many swipes, likes, matches, dishes
// cooked and AI reads. One small blob per group per day (usage/day/2026-11-10 in the group's own
// store) holds every count for that day, so it stays cheap however much anyone swipes:
// { adam: { swipes: 40, likes: 6, matches: 1, cooked: 0, reads: 1 }, laura: { ... } }
// Likes, matches and reads are counted on the server where they happen. Swipes and cooking are
// counted on the phone and sent in batches, so swiping never waits for this.

export const KINDS = ['swipes', 'likes', 'matches', 'cooked', 'reads'];
const PREFIX = 'usage/day/';

// The day in the Netherlands, as 2026-11-10.
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayOf = date => dayFormat.format(date);

const merged = (day, person, counts) => {
  const mine = { ...(day[person] || {}) };
  for (const [kind, n] of Object.entries(counts)) mine[kind] = (mine[kind] || 0) + n;
  return { ...day, [person]: mine };
};

// Adds to today's counts. Two phones can write at once, so each write only lands if the blob is still
// the one it read, and tries again if not. Never throws: a lost count must never break the app.
export async function addUsage(store, person, counts, date = new Date()) {
  const clean = Object.fromEntries(Object.entries(counts).filter(([kind, n]) => KINDS.includes(kind) && Number.isInteger(n) && n > 0));
  if (!person || !Object.keys(clean).length) return;
  const key = PREFIX + dayOf(date);
  try {
    if (typeof store.getWithMetadata === 'function') {
      for (let attempt = 0; attempt < 6; attempt++) {
        const now = await store.getWithMetadata(key, { type: 'json' });
        const done = await store.setJSON(key, merged(now ? now.data || {} : {}, person, clean), now && now.etag ? { onlyIfMatch: now.etag } : { onlyIfNew: true });
        if (!done || done.modified !== false) return;
      }
      console.error('Usage: gave up after six tries on', key);
      return;
    }
    await store.setJSON(key, merged((await store.get(key, { type: 'json' })) || {}, person, clean));
  } catch (err) {
    console.error('Usage could not be counted:', err.message);
  }
}

// Every day's counts for a group, oldest first: [{ day: '2026-11-10', people: { adam: {...} } }].
export async function readUsage(store) {
  const { blobs } = await store.list({ prefix: PREFIX });
  const days = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
  return blobs.map(({ key }, i) => ({ day: key.slice(PREFIX.length), people: days[i] || {} })).sort((a, b) => (a.day < b.day ? -1 : 1));
}
