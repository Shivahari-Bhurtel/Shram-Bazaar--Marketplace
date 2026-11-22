import assert from "node:assert/strict"
import test from "node:test"
import { getAiStatusPresentation } from "../src/services/aiStatus.js"

test("status label is connecting before the API reports readiness", () => {
  assert.deepEqual(getAiStatusPresentation(null), {
    label: "Connecting",
    tone: "bg-amber-400",
  })
})

test("status label is green only for a ready, non-fallback provider", () => {
  assert.deepEqual(getAiStatusPresentation({ ai_ready: true, state: "ready", fallback_active: false }), {
    label: "AI Ready",
    tone: "bg-emerald-500",
  })
})

test("fallback, model loading, and unavailable states are not green", () => {
  assert.equal(getAiStatusPresentation({ ai_ready: true, state: "fallback_mode", fallback_active: true }).label, "Fallback mode")
  assert.equal(getAiStatusPresentation({ ai_ready: false, state: "model_loading", model_loading: true }).label, "Model loading")
  assert.equal(getAiStatusPresentation({ ai_ready: false, state: "model_missing", fallback_active: false }).label, "Local AI unavailable")
  assert.equal(getAiStatusPresentation({ ai_ready: true, state: "ready", fallback_active: false }, true).label, "Local AI unavailable")
})
