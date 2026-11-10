// The stats page: how each group uses the app. Adam and Laura's group sees every group; any other
// group sees only its own. The group must come from the phone's cookie, not from the fallback that
// treats a phone with no group as Adam and Laura's, or any new browser would see everyone's stats.
import { FIRST_GROUP, GROUPS } from './groups.mjs';
import { KINDS, readUsage } from './usage.mjs';

export function explicitGroup(req) {
  const found = /(?:^|;\s*)supper-group=([a-z-]{1,40})(?:;|$)/.exec(req.headers.get('cookie') || '');
  return found && Object.hasOwn(GROUPS, found[1]) ? found[1] : null;
}

const zero = () => Object.fromEntries(KINDS.map(k => [k, 0]));
const add = (into, counts) => { for (const k of KINDS) into[k] += counts[k] || 0; return into; };

export function summarise(name, days) {
  const people = GROUPS[name].people;
  const totals = Object.fromEntries(Object.keys(people).map(p => [p, zero()]));
  const lastSeen = Object.fromEntries(Object.keys(people).map(p => [p, null]));
  const daily = days.map(({ day, people: counts }) => {
    const all = zero();
    for (const [p, c] of Object.entries(counts)) {
      if (!totals[p]) continue; // someone no longer in the group
      add(totals[p], c);
      add(all, c);
      if (KINDS.some(k => c[k])) lastSeen[p] = day;
    }
    return { day, ...all, people: counts };
  }).reverse(); // newest first
  return { name, people, totals, lastSeen, all: Object.values(totals).reduce(add, zero()), daily };
}

// `storeOf(name)` opens a group's store.
export async function statsFor(viewer, storeOf) {
  const names = viewer === FIRST_GROUP ? Object.keys(GROUPS) : [viewer];
  const groups = await Promise.all(names.map(async name => summarise(name, await readUsage(storeOf(name)))));
  return { kinds: KINDS, everyone: viewer === FIRST_GROUP, groups };
}
