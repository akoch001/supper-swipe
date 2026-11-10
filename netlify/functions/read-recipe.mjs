import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import { groupFrom, GROUPS } from '../../lib/groups.mjs';
import { runRead } from '../../lib/reader.mjs';

// Runs in the background because reading a recipe can outlast a normal request. The page asks /api/dishes/read/<id> how it went.
export default async req => {
  const { id } = await req.json().catch(() => ({}));
  const group = GROUPS[groupFrom(req)];
  if (!group || !/^[A-Za-z0-9_-]{1,100}$/.test(String(id))) return;
  await runRead(id, getStore({ name: group.store, consistency: 'strong' }), new Anthropic());
};

export const config = { background: true, path: '/api/read-recipe' };
