import type { Plugin } from "vite"

const JSEARCH_URL = "https://api.openwebninja.com/realtime-jobs-data/google-jobs/search"
const DEFAULT_QUERY = "remote AI engineer OR artificial intelligence engineer OR machine learning engineer OR backend developer OR frontend developer OR full stack developer OR data scientist OR data analyst OR DevOps engineer OR API engineer OR cybersecurity analyst OR QA engineer"

export function jsearchProxy(apiKey?: string): Plugin {
  return {
    name: "jsearch-jobs-proxy",
    configureServer(server) {
      server.middlewares.use("/api/jsearch/jobs", async (request, response) => {
        if (request.method !== "GET") {
          response.statusCode = 405
          response.setHeader("Allow", "GET")
          response.setHeader("Content-Type", "application/json")
          response.end(JSON.stringify({ error: "Method not allowed." }))
          return
        }
        if (!apiKey) {
          response.statusCode = 503
          response.setHeader("Content-Type", "application/json")
          response.end(JSON.stringify({ error: "OpenWebNinja jobs are not configured. Add OPENWEBNINJA_API_KEY to frontend/.env.local." }))
          return
        }

        try {
          const incoming = new URL(request.url || "/", "http://localhost")
          const outgoing = new URL(JSEARCH_URL)
          outgoing.searchParams.set("query", incoming.searchParams.get("query")?.slice(0, 300) || DEFAULT_QUERY)
          const requestedPage = Number(incoming.searchParams.get("page"))
          outgoing.searchParams.set("page", String(Number.isInteger(requestedPage) ? Math.max(1, Math.min(10, requestedPage)) : 1))
          const upstream = await fetch(outgoing, {
            headers: {
              Accept: "application/json",
              "X-API-Key": apiKey,
            },
          })
          const body = await upstream.text()
          response.statusCode = upstream.status
          response.setHeader("Content-Type", "application/json")
          response.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
          response.end(body)
        } catch {
          response.statusCode = 502
          response.setHeader("Content-Type", "application/json")
          response.setHeader("Cache-Control", "no-store")
          response.end(JSON.stringify({ error: "Remote job listings are temporarily unavailable." }))
        }
      })
    },
  }
}
