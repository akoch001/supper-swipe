// Each AI read is paid for, so each person gets a few a month. The count lives in the group's own
// store, one small blob per person per month (usage/reads/2026-11/adam), so a new month simply starts
// at nothing and one group's reads never touch another's.

export const READS_PER_MONTH = 5;
export const OUT_OF_READS = `You've used your ${READS_PER_MONTH} AI reads this month`;

// The calendar month in the Netherlands, where everyone using this lives, so a read just after
// midnight on the 1st counts in the new month.
const monthFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit' });
export const monthOf = date => monthFormat.format(date).slice(0, 7);

const keyFor = (person, month) => 'usage/reads/' + month + '/' + person;

export async function readsUsed(store, person, month) {
  const saved = await store.get(keyFor(person, month), { type: 'json' });
  return saved && Number.isInteger(saved.count) ? saved.count : 0;
}

export async function readsUsedBy(store, people, month) {
  const used = await Promise.all(Object.keys(people).map(p => readsUsed(store, p, month)));
  return Object.fromEntries(Object.keys(people).map((p, i) => [p, used[i]]));
}

// Counts one read, unless the person has none left, in which case it returns false. Two reads started
// together each write only if the count is still the one they saw, so neither can be lost.
export async function takeRead(store, person, month) {
  const key = keyFor(person, month);
  if (typeof store.getWithMetadata === 'function') {
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const now = await store.getWithMetadata(key, { type: 'json' });
        const count = now && Number.isInteger(now.data && now.data.count) ? now.data.count : 0;
        if (count >= READS_PER_MONTH) return false;
        const done = await store.setJSON(key, { count: count + 1 }, now && now.etag ? { onlyIfMatch: now.etag } : { onlyIfNew: true });
        if (!done || done.modified !== false) return true;
      }
    } catch { /* fall back to the plain write below */ }
  }
  const count = await readsUsed(store, person, month);
  if (count >= READS_PER_MONTH) return false;
  await store.setJSON(key, { count: count + 1 });
  return true;
}
