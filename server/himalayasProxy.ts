import type { Plugin } from 'vite';

const HIMALAYAS_BROWSE_API = 'https://himalayas.app/jobs/api';
const HIMALAYAS_SEARCH_API = 'https://himalayas.app/jobs/api/search';
const browseParams = ['limit', 'cursor'];
const searchParams = [
  'q', 'country', 'worldwide', 'exclude_worldwide', 'seniority',
  'employment_type', 'company', 'timezone', 'sort', 'page',
];

export function himalayasProxy(): Plugin {
  return {
    name: 'himalayas-jobs-proxy',
    configureServer(server) {
      server.middlewares.use('/api/himalayas/jobs', async (request, response) => {
        try {
          const incoming = new URL(request.url || '/', 'http://localhost');
          const isBrowseFeed = incoming.searchParams.get('feed') === 'browse';
          const outgoing = new URL(isBrowseFeed ? HIMALAYAS_BROWSE_API : HIMALAYAS_SEARCH_API);
          (isBrowseFeed ? browseParams : searchParams).forEach(key => {
            const value = incoming.searchParams.get(key);
            if (value) outgoing.searchParams.set(key, value);
          });

          const upstream = await fetch(outgoing, { headers: { Accept: 'application/json' } });
          const body = await upstream.text();
          response.statusCode = upstream.status;
          response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
          response.setHeader('Cache-Control', upstream.headers.get('cache-control') || 'public, max-age=300');
          response.end(body);
        } catch {
          response.statusCode = 502;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Himalayas jobs are temporarily unavailable.' }));
        }
      });
    },
  };
}
