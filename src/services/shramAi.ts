import type { WorkerProfile } from "../types"

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

export type ResumeExtraction = {
  fullName: string | null
  email: string | null
  phone: string | null
  location: string | null
  bio: string | null
  skills: string[]
  qualifications: Array<{ name: string; institution: string; field: string; year: number | null }>
  experience: Array<{ title: string; company: string; description: string; startDate: string | null; endDate: string | null; currentlyWorking: boolean | null }>
  languages: string[]
  certifications: string[]
  employmentPreferences: string[]
  preferredShifts: string[]
  weekendsAvailable: boolean | null
  availableStart: string | null
  preferredWorkLocation: string | null
  referenceNote: string | null
}

export function formatResumeExtraction(resume: ResumeExtraction): string {
  const lines = [
    `### Resume details extracted${resume.fullName ? ` for ${resume.fullName}` : ""}`,
    "Please review these details in Worker Profile. Resume information is not verified.",
  ]
  if (resume.bio) lines.push(`**Summary:** ${resume.bio}`)
  if (resume.skills.length) lines.push(`**Skills:** ${resume.skills.join(", ")}`)
  if (resume.qualifications.length) lines.push(`**Education and training:** ${resume.qualifications.map((item) => [item.name, item.field, item.institution, item.year].filter(Boolean).join(" · ")).join("; ")}`)
  if (resume.experience.length) lines.push(`**Work experience:** ${resume.experience.map((item) => [item.title, item.company, item.startDate, item.endDate || (item.currentlyWorking ? "Present" : "")].filter(Boolean).join(" · ")).join("; ")}`)
  if (resume.languages.length) lines.push(`**Languages:** ${resume.languages.join(", ")}`)
  if (resume.certifications.length) lines.push(`**Certifications:** ${resume.certifications.join(", ")}`)
  return lines.join("\n\n")
}

export type ChatLanguage = "en" | "ne"
export type AssistantRole = "general" | "provider"

export function serializeWorkerProfileContext(profile?: WorkerProfile | null) {
  if (!profile) return ""
  const shortList = (values: Array<string | undefined>, count = 20) =>
    values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)).slice(0, count).map((value) => value.slice(0, 180))
  return JSON.stringify({
    professionalTitle: profile.professionalTitle?.slice(0, 180) || "",
    skills: shortList(profile.skills || []),
    preferredCategories: shortList(profile.preferredCategories || []),
    qualifications: shortList((profile.qualifications || []).map((item) => [item.degree, item.field, item.institution].filter(Boolean).join(" "))),
    experience: shortList((profile.experience || []).map((item) => [item.title, item.company, item.description].filter(Boolean).join(" "))),
    experienceTitles: shortList((profile.experience || []).map((item) => item.title)),
    employmentPreferences: shortList(profile.employmentPreferences || []),
    preferredShifts: shortList(profile.preferredShifts || []),
    languages: shortList(profile.languages || []),
    certifications: shortList(profile.certifications || []),
    location: profile.location?.slice(0, 120) || "",
    district: profile.district?.slice(0, 120) || "",
    preferredWorkLocation: profile.preferredWorkLocation?.slice(0, 120) || "",
    availability: profile.availability || "",
    weekendsAvailable: profile.weekendsAvailable ?? null,
    acceptingWork: profile.acceptingWork ?? null,
    bio: profile.bio?.slice(0, 1200) || "",
  })
}

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
  workerContext = "",
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
      worker_context: workerContext,
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
  signal?: AbortSignal,
): Promise<ResumeExtraction> {
  const form = new FormData()
  form.set("file", file)

  const response = await fetchAiService("/api/v1/resume-analysis", {
    method: "POST",
    body: form,
    signal,
  }, 180_000)
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
  return response.json() as Promise<ResumeExtraction>
}
