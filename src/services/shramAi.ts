export type ChatTurn = { role: "user" | "assistant"; text: string }

export type ChatResponse = {
  answer: string
  conversation_id: string
  source_files: string[]
  jobs?: Array<import("./demoJobs").DemoJob & { match_reasons?: string[] }>
  mode?: "ai" | "job_search" | "local_guidance" | "fallback"
  fallback_active?: boolean
}

export type AiStatus = {
  provider: string
  chat_provider: string
  model: string
  ollama_installed: boolean | null
  ollama_running: boolean | null
  model_available: boolean
  model_loading: boolean
  ai_ready: boolean
  state: string
  last_health_check: string | null
  last_error: string | null
  fallback_active: boolean
}

export type ResumeAnalysisResponse = {
  answer: string
  conversation_id: string
}

export type ChatLanguage = "en" | "ne"
export type AssistantRole = "general" | "provider"

export async function fetchAiService(
  path: string,
  options: RequestInit,
  timeoutMs = 75_000,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const requestSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal
  const requestOptions = { ...options, signal: requestSignal }
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
      const response = await fetch(url, requestOptions)
      return response
    } catch (err) {
      lastError = err
    }
  }
  if (timeoutSignal.aborted && !options.signal?.aborted) {
    throw new Error("Shram AI took too long to respond. Please try again.")
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Unable to reach the AI chat service. Please ensure the backend is running on port 8000.",
      )
}

export async function fetchAiStatus(signal?: AbortSignal): Promise<AiStatus> {
  const response = await fetchAiService("/api/v1/ai/status", { method: "GET", signal }, 8_000)
  if (!response.ok) throw new Error(`AI status returned ${response.status}`)
  return response.json() as Promise<AiStatus>
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  history: ChatTurn[],
  language: ChatLanguage = "en",
  signal?: AbortSignal,
  contextJobIds: string[] = [],
  assistantRole: AssistantRole = "general",
  providerContext = "",
): Promise<ChatResponse> {
  const response = await fetchAiService("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      history,
      context_job_ids: contextJobIds,
      language,
      assistant_role: assistantRole,
      provider_context: providerContext,
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
