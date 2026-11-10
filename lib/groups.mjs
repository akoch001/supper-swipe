// Each group has its own store, so one group's likes, scores, added dishes and photos never reach
// another. Adam and Laura keep the store they always had, so nothing of theirs moved. To add a group,
// add a line here: the key is what goes in its link (/?g=ludo-eva), and each person's key must be
// unique across all groups, because a phone with no link picks its group by picking a name.

export const GROUPS = {
  'adam-laura': { store: 'supper-swipe', people: { adam: 'Adam', laura: 'Laura' } },
  'ludo-eva': { store: 'supper-swipe-ludo-eva', people: { ludo: 'Ludo', eva: 'Eva' }, fresh: true },
  'marius-marinke': { store: 'supper-swipe-marius-marinke', people: { marius: 'Marius', marinke: 'Marinke' }, fresh: true }
};

// Pages from before groups existed send no group, and they were all Adam and Laura's.
export const FIRST_GROUP = 'adam-laura';

// The page keeps the group in a cookie, so it also reaches photo requests, which can't carry headers.
export function groupFrom(req) {
  const found = /(?:^|;\s*)supper-group=([a-z-]{1,40})(?:;|$)/.exec(req.headers.get('cookie') || '');
  const name = found ? found[1] : FIRST_GROUP;
  return Object.hasOwn(GROUPS, name) ? name : null;
}

// A new group gets the starter dishes with their starting ease and speed, but no one's "how much we
// like it" or last-cooked date, so its ratings are its own.
export const freshDeck = base => Object.fromEntries(Object.entries(base).map(([id, d]) => [id, { ...d, love: 0, lastHad: null }]));
