import type { NextApiRequest, NextApiResponse } from 'next';
import list from './list';
import resources from './resources';
import upsert from './upsert';




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = new URL(req.url ?? '', 'http://localhost');

  if (url.pathname.endsWith('/resources')) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return resources(req, res);
  }

  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST' || req.method === 'PATCH') return upsert(req, res);

  return res.status(405).json({ error: 'Method not allowed' });
}



