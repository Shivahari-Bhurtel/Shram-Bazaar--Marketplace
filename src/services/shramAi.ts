export type ChatTurn = { role: "user" | "assistant" text: string }

export type ChatResponse = {
  answer: string
  conversation_id: string
  source_files: string[]
}

export type ResumeAnalysisResponse = {
  answer: string
  conversation_id: string
}

export type ChatLanguage = "en" | "ne"

async function fetchAiService(
  path: string,
  options: RequestInit,
): Promise<Response> {
  const configured = (import.meta.env.VITE_SHRAM_AI_API_URL || "").replace(
    /\/$/,
    "",
  )
  const candidateUrls = configured
    ? [`${configured}${path}`]
    : [path, `http://localhost:8000${path}`, `http://127.0.0.1:8000${path}`]

  let lastError: unknown
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, options)
      return response
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Unable to reach the AI chat service. Please ensure the backend is running on port 8000.",
      )
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  history: ChatTurn[],
  language: ChatLanguage = "en",
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const response = await fetchAiService("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      history,
      language,
    }),
    signal,
  })

  if (!response.ok) {
    let detail = `Chat service returned ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === "string") detail = body.detail
    } catch {
      /* use status message */
    }
    throw new Error(detail)
  }
  return response.json() as Promise<ChatResponse>
}

export async function sendResumeAnalysis(
  file: File,
  message: string,
  conversationId: string | null,
  history: ChatTurn[],
  language: ChatLanguage = "en",
  signal?: AbortSignal,
): Promise<ResumeAnalysisResponse> {
  const form = new FormData()
  form.set("file", file)
  form.set("message", message)
  if (conversationId) form.set("conversation_id", conversationId)
  form.set("history", JSON.stringify(history))
  form.set("language", language)

  const response = await fetchAiService("/api/v1/resume-analysis", {
    method: "POST",
    body: form,
    signal,
  })
  if (!response.ok) {
    let detail = `Resume analysis failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body.detail === "string") detail = body.detail
    } catch {
      /* use status message */
    }
    throw new Error(detail)
  }
  return response.json() as Promise<ResumeAnalysisResponse>
}
