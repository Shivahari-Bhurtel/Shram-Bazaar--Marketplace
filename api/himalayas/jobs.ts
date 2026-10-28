import type { IncomingMessage, ServerResponse } from 'node:http';

const BROWSE_API = 'https://himalayas.app/jobs/api';
const SEARCH_API = 'https://himalayas.app/jobs/api/search';
const BROWSE_PARAMS = ['limit', 'cursor'];
const SEARCH_PARAMS = [
  'q', 'country', 'worldwide', 'exclude_worldwide', 'seniority',
  'employment_type', 'company', 'timezone', 'sort', 'page',
];

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.setHeader('Allow', 'GET');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ errors: 'Method not allowed.' }));
    return;
  }

  try {
    const incoming = new URL(request.url || '/', 'https://shram-bazar.local');
    const isBrowseFeed = incoming.searchParams.get('feed') === 'browse';
    const outgoing = new URL(isBrowseFeed ? BROWSE_API : SEARCH_API);
    (isBrowseFeed ? BROWSE_PARAMS : SEARCH_PARAMS).forEach(key => {
      const value = incoming.searchParams.get(key);
      if (value) outgoing.searchParams.set(key, value);
    });

    const upstream = await fetch(outgoing, { headers: { Accept: 'application/json' } });
    response.statusCode = upstream.status;
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    response.setHeader('Cache-Control', upstream.headers.get('cache-control') || 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.end(await upstream.text());
  } catch {
    response.statusCode = 502;
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ errors: 'Himalayas jobs are temporarily unavailable.' }));
  }
}
