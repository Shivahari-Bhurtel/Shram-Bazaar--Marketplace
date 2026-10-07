import type { Plugin } from 'vite';

const HIMALAYAS_API = 'https://himalayas.app/jobs/api/search';
const allowedParams = ['q', 'employmentType', 'country', 'seniority', 'sort', 'offset', 'limit'];

export function himalayasProxy(): Plugin {
  return {
    name: 'himalayas-jobs-proxy',
    configureServer(server) {
      server.middlewares.use('/api/himalayas/jobs', async (request, response) => {
        try {
          const incoming = new URL(request.url || '/', 'http://localhost');
          const outgoing = new URL(HIMALAYAS_API);
          allowedParams.forEach(key => {
            const value = incoming.searchParams.get(key);
            if (value) outgoing.searchParams.set(key, value);
          });

          const upstream = await fetch(outgoing);
          const body = await upstream.text();
          response.statusCode = upstream.status;
          response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
          response.setHeader('Cache-Control', 'public, max-age=120');
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