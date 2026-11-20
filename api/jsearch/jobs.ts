import type { IncomingMessage, ServerResponse } from "node:http"

const JSEARCH_URL = "https://api.openwebninja.com/realtime-jobs-data/google-jobs/search"
const DEFAULT_QUERY = "remote AI engineer OR artificial intelligence engineer OR machine learning engineer OR backend developer OR frontend developer OR full stack developer OR data scientist OR data analyst OR DevOps engineer OR API engineer OR cybersecurity analyst OR QA engineer"

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== "GET") {
    response.statusCode = 405
    response.setHeader("Allow", "GET")
    response.setHeader("Content-Type", "application/json")
    response.end(JSON.stringify({ error: "Method not allowed." }))
    return
  }

  const apiKey = process.env.OPENWEBNINJA_API_KEY
  if (!apiKey) {
    response.statusCode = 503
    response.setHeader("Content-Type", "application/json")
    response.setHeader("Cache-Control", "no-store")
    response.end(JSON.stringify({ error: "OpenWebNinja jobs are not configured. Set OPENWEBNINJA_API_KEY in the server environment." }))
    return
  }

  try {
    const incoming = new URL(request.url || "/", "https://shram-bazar.local")
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
    response.statusCode = upstream.status
    response.setHeader("Content-Type", "application/json")
    response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
    response.end(await upstream.text())
  } catch {
    response.statusCode = 502
    response.setHeader("Content-Type", "application/json")
    response.setHeader("Cache-Control", "no-store")
    response.end(JSON.stringify({ error: "Remote job listings are temporarily unavailable." }))
  }
}
