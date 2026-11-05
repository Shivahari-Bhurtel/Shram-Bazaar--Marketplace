import { useEffect, useState, type CSSProperties } from "react"
import { useApp, type Page } from "../../store/AppContext"

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "finished"

const sampleQuestion = "Can you help me find work near Pokhara?"
const sampleAnswer =
  "Of course! I can help you explore local opportunities based on your skills, location and availability."
const returnPages: Page[] = [
  "worker-dashboard",
  "worker-profile",
  "job-discovery",
  "my-applications",
  "saved-jobs",
  "chat",
]

function Waveform({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`voice-waveform ${active ? "voice-waveform-active" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 32 }, (_, index) => (
        <span key={index} style={{ "--bar-index": index } as CSSProperties} />
      ))}
    </div>
  )
}

export default function VoiceAssistantPage() {
  const { navigate } = useApp()
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [replayActive, setReplayActive] = useState(false)

  useEffect(() => {
    if (voiceState === "processing") {
      const timer = window.setTimeout(() => setVoiceState("speaking"), 1500)
      return () => window.clearTimeout(timer)
    }
    if (voiceState === "speaking") {
      const timer = window.setTimeout(() => {
        setVoiceState("finished")
        setReplayActive(false)
      }, 4200)
      return () => window.clearTimeout(timer)
    }
  }, [voiceState])

  const goBack = () => {
    let destination: Page = "worker-dashboard"
    try {
      const previousPage = sessionStorage.getItem(
        "voice-assistant-return-page",
      ) as Page | null
      if (previousPage && returnPages.includes(previousPage))
        destination = previousPage
      sessionStorage.removeItem("voice-assistant-return-page")
    } catch {
      /* Fall back to the worker dashboard when storage is unavailable. */
    }
    navigate(destination)
  }

  const startConversation = () => setVoiceState("listening")
  const stopListening = () => setVoiceState("processing")
  const stopSpeaking = () => {
    setVoiceState("finished")
    setReplayActive(false)
  }
  const startNewConversation = () => {
    setVoiceState("idle")
    setReplayActive(false)
  }
  const replayResponse = () => {
    setReplayActive(true)
    setVoiceState("speaking")
  }

  const statusText: Record<VoiceState, string> = {
    idle: "Ready when you are",
    listening: "Listening…",
    processing: "Thinking…",
    speaking: "Shram Bazar AI is speaking",
    finished: "Conversation complete",
  }

  return (
    <div className={`voice-assistant-page voice-state-${voiceState}`}>
      <header className="voice-assistant-header">
        <button
          type="button"
          onClick={goBack}
          className="voice-back-button"
          aria-label="Go back"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
            <path d="M9 12h11" />
          </svg>
          <span>Back</span>
        </button>
        <div className="voice-brand">
          <span>
            Voice Assistant <span className="voice-brand-nepali">श्रम</span>
          </span>
        </div>
      </header>

      <section
        className="voice-workspace"
        aria-label="Shram Bazar voice assistant"
      >
        <div className="voice-content">
          <div className="voice-intro">
            <p className="voice-eyebrow">YOUR WORK COMPANION</p>
            <h1>
              Work, skills and opportunities.
              <br className="hidden sm:block" /> Just say the word.
            </h1>
            <p className="voice-description">Echo</p>
          </div>

          <div className={`voice-orb-stage voice-orb-stage-${voiceState}`}>
            <div className="voice-orb-halo voice-orb-halo-one" />
            <div className="voice-orb-halo voice-orb-halo-two" />
            <button
              type="button"
              onClick={
                voiceState === "idle"
                  ? startConversation
                  : voiceState === "listening"
                    ? stopListening
                    : voiceState === "speaking"
                      ? stopSpeaking
                      : undefined
              }
              disabled={
                voiceState === "processing" || voiceState === "finished"
              }
              aria-label={
                voiceState === "idle"
                  ? "Start voice assistant demo"
                  : voiceState === "listening"
                    ? "Stop listening"
                    : voiceState === "speaking"
                      ? "Stop response"
                      : statusText[voiceState]
              }
              className="voice-orb"
            >
              <span className="voice-orb-inner" />
              {voiceState === "processing" ? (
                <span className="voice-thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : voiceState === "speaking" ? (
                <Waveform active />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" />
                </svg>
              )}
            </button>
          </div>

          <div className="voice-state-copy" aria-live="polite">
            <p className="voice-status">{statusText[voiceState]}</p>
            <p className="voice-helper">
              {voiceState === "idle" &&
                "Ask about jobs, skills, applications or opportunities."}
              {voiceState === "listening" &&
                "Demo mode — microphone connection will be added later."}
              {voiceState === "processing" && "Preparing a sample response."}
              {voiceState === "speaking" && sampleAnswer}
              {voiceState === "finished" &&
                "Your conversation is ready to review below."}
            </p>
          </div>

          {voiceState === "idle" && (
            <button
              type="button"
              onClick={startConversation}
              className="voice-primary-action"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" />
              </svg>
              Tap to speak
            </button>
          )}
          {voiceState === "listening" && (
            <button
              type="button"
              onClick={stopListening}
              className="voice-primary-action voice-stop-action"
            >
              <span className="voice-stop-square" />
              Stop listening
            </button>
          )}
          {voiceState === "processing" && (
            <div className="voice-processing-note">
              <span className="voice-small-spinner" />
              Preparing a sample response
            </div>
          )}
          {voiceState === "speaking" && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="voice-secondary-action"
            >
              Stop response
            </button>
          )}
          {voiceState === "finished" && (
            <button
              type="button"
              onClick={startNewConversation}
              className="voice-primary-action"
            >
              Start a new conversation
            </button>
          )}

          {(voiceState === "finished" || replayActive) && (
            <section
              className="voice-transcript"
              aria-label="Conversation transcript"
            >
              <div className="voice-transcript-heading">
                <div>
                  <p className="voice-eyebrow">TRANSCRIPT</p>
                  <h2>Your conversation</h2>
                </div>
                <button
                  type="button"
                  onClick={startNewConversation}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="voice-transcript-clear"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16m-10 4v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
              <article className="voice-transcript-message voice-user-message">
                <span>You</span>
                <p>{sampleQuestion}</p>
                <time>Just now</time>
              </article>
              <article className="voice-transcript-message voice-ai-message">
                <span>Shram Bazar AI</span>
                <p>{sampleAnswer}</p>
                <div className="voice-ai-message-footer">
                  <time>Just now</time>
                  <button
                    type="button"
                    onClick={replayResponse}
                    aria-label="Replay response"
                    title="Replay response"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="m10 9 5 3-5 3V9Z" />
                    </svg>
                    Replay response
                  </button>
                </div>
              </article>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}
