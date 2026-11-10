import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { handle } from '../../lib/dishes.mjs';
import { freshDeck, groupFrom, GROUPS } from '../../lib/groups.mjs';
import base from '../../data/recipes.json';

const fresh = freshDeck(base);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async req => {
  const path = new URL(req.url).pathname.replace(/^\/api\/dishes/, '').replace(/\/$/, '');
  // Who is in each group, for a phone that opened the app without its link.
  if (path === '/groups' && req.method === 'GET') return json(200, Object.fromEntries(Object.entries(GROUPS).map(([name, g]) => [name, g.people])));
  const name = groupFrom(req);
  if (!name) return json(404, { error: 'No such group' });
  const group = GROUPS[name];
  const store = getStore({ name: group.store, consistency: 'strong' });
  return handle(req, path, group.fresh ? fresh : base, store, randomUUID, group.people);
};

export const config = { path: ['/api/dishes', '/api/dishes/*'] };
