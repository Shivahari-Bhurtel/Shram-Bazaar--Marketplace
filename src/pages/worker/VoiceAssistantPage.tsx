import { useEffect, useRef, type CSSProperties } from "react"
import { useApp, type Page } from "../../store/AppContext"
import { useLanguage } from "../../i18n/LanguageContext"
import { useGeminiLiveVoice } from "../../hooks/useGeminiLiveVoice"
import type { VoiceStatus } from "../../hooks/useGeminiLiveVoice"

const returnPages: Page[] = [
  "worker-dashboard",
  "worker-profile",
  "job-discovery",
  "my-applications",
  "saved-jobs",
  "chat",
  "shram-ai",
  "provider-dashboard",
  "provider-profile",
  "my-jobs",
  "create-job",
  "edit-job",
  "applicant-management",
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

const statusText: Record<VoiceStatus, string> = {
  idle: "Ready when you are",
  connecting: "Connecting to Shram Bazar AI…",
  listening: "Listening…",
  processing: "Thinking…",
  speaking: "Shram Bazar AI is speaking",
  disconnected: "Voice session disconnected",
  error: "Voice assistant needs attention",
}

export default function VoiceAssistantPage() {
  const { navigate } = useApp()
  const { language } = useLanguage()
  const voice = useGeminiLiveVoice(language)
  const active = ["listening", "processing", "speaking"].includes(voice.status)
  const canStart = ["idle", "error", "disconnected"].includes(voice.status)
  const introRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLElement>(null)
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const sessionActive = active || voice.status === "connecting" || voice.turns.length > 0

  useEffect(() => {
    if (!sessionActive) return
    const frame = window.requestAnimationFrame(() => {
      introRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sessionActive])

  useEffect(() => {
    const transcript = transcriptScrollRef.current
    if (!transcript) return
    const frame = window.requestAnimationFrame(() => {
      transcript.scrollTo({
        top: transcript.scrollHeight,
        behavior: "smooth",
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [voice.turns])

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

  const startLabel =
    voice.status === "disconnected" ? "Reconnect" : "Tap to speak"

  return (
    <div className={`voice-assistant-page voice-state-${voice.status}${sessionActive ? " voice-session-active" : ""}`}>
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
          <div ref={introRef} className="voice-intro">
            <h1>YOUR WORK COMPANION</h1>
            <p className="voice-description">Echo</p>
          </div>

          <div className={`voice-orb-stage voice-orb-stage-${voice.status}`}>
            <div className="voice-orb-halo voice-orb-halo-one" />
            <div className="voice-orb-halo voice-orb-halo-two" />
            <button
              type="button"
              onClick={() => {
                if (canStart) void voice.start()
                else if (voice.status === "speaking") voice.stopAudio()
              }}
              disabled={
                voice.status === "connecting" || voice.status === "processing"
              }
              aria-label={
                canStart
                  ? startLabel
                  : voice.status === "speaking"
                    ? "Stop audio response"
                    : statusText[voice.status]
              }
              className="voice-orb"
            >
              <span className="voice-orb-inner" />
              {voice.status === "connecting" ||
              voice.status === "processing" ? (
                <span className="voice-thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : voice.status === "speaking" ? (
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
            <p className="voice-status">{statusText[voice.status]}</p>
            <p className="voice-helper">
              {voice.status === "connecting" &&
                "Preparing a secure, temporary voice session."}
              {voice.status === "listening" &&
                (voice.speechDetected
                  ? "I hear you. Tap Get answer when you finish speaking."
                  : "Microphone is on. Speak near your device; English and Nepali are supported.")}
              {voice.status === "processing" &&
                "Shram Bazar AI is preparing a reply."}
              {voice.status === "speaking" &&
                "Listen to the spoken reply or stop playback."}
              {voice.status === "disconnected" &&
                "Reconnect to continue your conversation."}
              {voice.status === "error" &&
                "Check microphone permission and voice service configuration."}
            </p>
          </div>

          {voice.error && (
            <div className="voice-error-message" role="alert">
              {voice.error}
            </div>
          )}

          {canStart && (
            <button
              type="button"
              onClick={() => void voice.start()}
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
                {voice.status === "disconnected" ? (
                  <path d="M20 7v5h-5M4 17v-5h5m-4-1a7 7 0 0 1 12-4l3 3M4 13l3 3a7 7 0 0 0 12-4" />
                ) : (
                  <>
                    <rect x="9" y="3" width="6" height="12" rx="3" />
                    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" />
                  </>
                )}
              </svg>
              {startLabel}
            </button>
          )}

          {voice.status === "connecting" && (
            <div className="voice-connecting-controls">
              <div className="voice-processing-note">
                <span className="voice-small-spinner" />
                Connecting securely…
              </div>
              <button
                type="button"
                onClick={voice.disconnect}
                className="voice-secondary-action"
              >
                Cancel connection
              </button>
            </div>
          )}

          {active && (
            <div className="voice-session-controls" aria-label="Voice controls">
              {voice.status === "listening" && (
                <div
                  className={`voice-mic-indicator${voice.speechDetected ? " voice-mic-detected" : ""}${voice.muted ? " voice-mic-muted" : ""}`}
                  role="status"
                >
                  <span aria-hidden="true" />
                  {voice.muted
                    ? "Microphone muted"
                    : voice.speechDetected
                      ? "Voice detected"
                      : "Microphone on · waiting for speech"}
                </div>
              )}
              <button
                type="button"
                onClick={voice.toggleMute}
                className="voice-secondary-action"
                aria-pressed={voice.muted}
              >
                {voice.muted ? "Unmute microphone" : "Mute microphone"}
              </button>
              {voice.status === "listening" && voice.speechDetected && (
                <button
                  type="button"
                  onClick={voice.finishTurn}
                  className="voice-primary-action voice-answer-action"
                >
                  Get answer
                </button>
              )}
              {voice.status === "speaking" && (
                <button
                  type="button"
                  onClick={voice.stopAudio}
                  className="voice-secondary-action"
                >
                  Stop audio
                </button>
              )}
              <button
                type="button"
                onClick={voice.disconnect}
                className="voice-primary-action voice-stop-action"
              >
                <span className="voice-stop-square" />
                Disconnect
              </button>
            </div>
          )}

          {sessionActive && (
            <section
              ref={transcriptRef}
              className="voice-transcript"
              aria-label="Conversation transcript"
            >
              <div className="voice-transcript-heading">
                <div>
                  <h2>Stream</h2>
                </div>
                <button
                  type="button"
                  onClick={voice.clearTranscript}
                  aria-label="Clear conversation transcript"
                  title="Clear conversation transcript"
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
              <div ref={transcriptScrollRef} className="voice-transcript-scroll">
                {voice.turns.length === 0 && (
                  <div className="voice-transcript-empty">
                    <span className="voice-transcript-empty-wave" aria-hidden="true">
                      <i /><i /><i /><i /><i />
                    </span>
                    <p>Start speaking to begin the conversation.</p>
                  </div>
                )}
                {voice.turns.map((turn, index) => (
                  <div className="voice-transcript-turn" key={index}>
                    {turn.user && (
                      <article className="voice-transcript-message voice-user-message">
                        <span>You</span>
                        <p>{turn.user}</p>
                      </article>
                    )}
                    {turn.assistant && (
                      <article className="voice-transcript-message voice-ai-message">
                        <div className="voice-ai-message-heading">
                          <span className="voice-ai-speaker" aria-label="Echo">
                            <i /><i /><i /><i />
                          </span>
                          <span>Echo</span>
                        </div>
                        <p>{turn.assistant}</p>
                      </article>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  )
}
