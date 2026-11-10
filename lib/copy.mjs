// Agreed with Adam, November 2026: the dishes he and Laura added in the app, with their photos, are
// copied once into each new group, without their "how much we like it" or last-cooked date, the same
// way the starter dishes are. From then on each copy is the group's own: what they change or rate
// stays with them. Dishes added later aren't copied. It happens on the group's first load, so it runs
// on the live site without anyone doing anything, and a marker stops it happening twice.

const MARKER = 'copied/first-group';
const done = new Set(); // stores already checked by this running function, to skip even the marker read

const unrated = dish => ({ ...dish, love: 0, lastHad: null });

async function copyDish(from, to, id) {
  // Never overwrite: if the group already has this dish, what it has is theirs.
  if (await to.get('added/' + id, { type: 'json' })) return;
  const [dish, edits] = await Promise.all([from.get('added/' + id, { type: 'json' }), from.get('saved/' + id, { type: 'json' })]);
  if (!dish) return;
  const photos = await Promise.all(['', '-thumb'].map(end => from.get('photos/' + id + end, { type: 'arrayBuffer' })));
  if (photos[0] && photos[1]) await Promise.all(photos.map((bytes, i) => to.set('photos/' + id + (i ? '-thumb' : ''), bytes)));
  // The dish as it is now, with its edits and photo folded in. The photo address still works, because
  // the group's photos are served from its own store under the same name.
  const whole = unrated({ ...dish, ...(edits || {}) });
  if (whole.photo && whole.photo.startsWith('/api/') && !(photos[0] && photos[1])) whole.photo = '';
  await to.setJSON('added/' + id, whole);
}

export async function copyFirstGroupDishes(from, to, name) {
  if (done.has(name)) return;
  if (!(await to.get(MARKER, { type: 'json' }))) {
    const { blobs } = await from.list({ prefix: 'added/' });
    await Promise.all(blobs.map(({ key }) => copyDish(from, to, key.slice('added/'.length))));
    await to.setJSON(MARKER, { at: new Date().toISOString(), dishes: blobs.length });
  }
  done.add(name);
}
