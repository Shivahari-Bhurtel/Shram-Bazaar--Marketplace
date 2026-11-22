export function getAiStatusPresentation(status, unavailable = false) {
  if (unavailable) return { label: "Local AI unavailable", tone: "bg-amber-500" }
  if (!status) return { label: "Connecting", tone: "bg-amber-400" }
  if (status.fallback_active) return { label: "Fallback mode", tone: "bg-amber-500" }
  if (status.model_loading || status.state === "model_loading") {
    return { label: "Model loading", tone: "bg-amber-400" }
  }
  if (status.ai_ready && status.state === "ready") {
    return { label: "AI Ready", tone: "bg-emerald-500" }
  }
  return { label: "Local AI unavailable", tone: "bg-amber-500" }
}
