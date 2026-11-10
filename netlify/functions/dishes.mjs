import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { copyFirstGroupDishes } from '../../lib/copy.mjs';
import { handle } from '../../lib/dishes.mjs';
import { FIRST_GROUP, freshDeck, groupFrom, GROUPS } from '../../lib/groups.mjs';
import { explicitGroup, statsFor } from '../../lib/stats.mjs';
import base from '../../data/recipes.json';

const fresh = freshDeck(base);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async req => {
  const path = new URL(req.url).pathname.replace(/^\/api\/dishes/, '').replace(/\/$/, '');
  // Who is in each group, for a phone that opened the app without its link.
  if (path === '/groups' && req.method === 'GET') return json(200, Object.fromEntries(Object.entries(GROUPS).map(([name, g]) => [name, g.people])));
  if (path === '/stats' && req.method === 'GET') {
    const viewer = explicitGroup(req);
    if (!viewer) return json(403, { error: 'Open the app once on this phone first, from your group's link' });
    return json(200, await statsFor(viewer, g => getStore({ name: GROUPS[g].store, consistency: 'strong' })));
  }
  const name = groupFrom(req);
  if (!name) return json(404, { error: 'No such group' });
  const group = GROUPS[name];
  const store = getStore({ name: group.store, consistency: 'strong' });
  // A new group's first load copies in the dishes Adam and Laura added (see lib/copy.mjs).
  if (group.fresh && path === '' && req.method === 'GET') {
    try {
      await copyFirstGroupDishes(getStore({ name: GROUPS[FIRST_GROUP].store, consistency: 'strong' }), store, name);
    } catch (err) {
      console.error('Copying dishes failed, will try again on the next load:', err.message);
    }
  }
  return handle(req, path, group.fresh ? fresh : base, store, randomUUID, group.people);
};

export const config = { path: ['/api/dishes', '/api/dishes/*'] };
