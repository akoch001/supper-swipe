import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { handle } from '../../lib/dishes.mjs';
import base from '../../data/recipes.json';

export default async req => {
  const store = getStore({ name: 'supper-swipe', consistency: 'strong' });
  const path = new URL(req.url).pathname.replace(/^\/api\/dishes/, '').replace(/\/$/, '');
  return handle(req, path, base, store, randomUUID);
};

export const config = { path: ['/api/dishes', '/api/dishes/*'] };
