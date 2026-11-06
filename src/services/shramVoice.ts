export type VoiceLanguage = "en" | "ne"

export type VoiceSessionToken = {
  token: string
  model: string
  expires_in_seconds: number
  input_sample_rate: number
  output_sample_rate: number
  system_instruction: string
}

export async function requestVoiceSessionToken(
  language: VoiceLanguage,
  signal?: AbortSignal,
): Promise<VoiceSessionToken> {
  const configured = (import.meta.env.VITE_SHRAM_AI_API_URL || "").replace(
    /\/$/,
    "",
  )
  const baseUrls = configured
    ? [configured]
    : ["", "http://localhost:8000", "http://127.0.0.1:8000"]
  let lastError: unknown

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/voice/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
        signal,
      })
      if (!response.ok) {
        let detail = `Voice service returned ${response.status}`
        try {
          const body = await response.json()
          if (typeof body.detail === "string") detail = body.detail
        } catch {
          /* Keep the status message when the server response is not JSON. */
        }
        throw new Error(detail)
      }
      return (await response.json()) as VoiceSessionToken
    } catch (error) {
      if (error instanceof Error && !error.message.includes("Failed to fetch"))
        throw error
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to reach the Shram Bazar voice service.")
}
