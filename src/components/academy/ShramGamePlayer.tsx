import { useEffect, useRef, useState } from "react"

type Props = {
  gameId: string
  title: string
  courseName: string
  embedUrl: string
  onBack: () => void
  onScoreUpdate?: (score: number) => void
}

type GameMessage = {
  type?: string
  gameId?: string
  score?: number
  finalScore?: number
}

export default function ShramGamePlayer({ gameId, title, courseName, embedUrl, onBack, onScoreUpdate }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [score, setScore] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenNotice, setFullscreenNotice] = useState("")

  useEffect(() => {
    const onMessage = (event: MessageEvent<GameMessage>) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      const data = event.data
      if (!data || data.gameId !== gameId) return
      if (data.type === "SHRAM_GAME_SCORE" && typeof data.score === "number" && Number.isFinite(data.score)) {
        setScore(data.score)
        onScoreUpdate?.(data.score)
      } else if (data.type === "SHRAM_GAME_OVER" && typeof data.finalScore === "number" && Number.isFinite(data.finalScore)) {
        setScore(data.finalScore)
        onScoreUpdate?.(data.finalScore)
      }
    }
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === iframeRef.current)
    window.addEventListener("message", onMessage)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      window.removeEventListener("message", onMessage)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [gameId, onScoreUpdate])

  const toggleFullscreen = async () => {
    const frame = iframeRef.current
    if (!frame) return
    setFullscreenNotice("")
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await frame.requestFullscreen()
    } catch {
      setFullscreenNotice("Fullscreen is unavailable in this browser.")
    }
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white" aria-label={`${title} game player`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#E5D9C9] bg-[#FBF5EF] px-3 py-2.5 sm:px-5">
        <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#4E342E] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4E342E]">
          <span aria-hidden="true">←</span> Back to course
        </button>
        <div className="order-3 min-w-0 flex-1 basis-full text-center sm:order-none sm:basis-auto sm:text-left">
          <h1 className="truncate text-sm font-bold text-[#4E342E] sm:text-base">{title}</h1>
          <p className="truncate text-xs text-[#735B49]">{courseName} · Optional practical module</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-[#E5D9C9] bg-white px-3 py-2 text-xs font-bold text-[#4E342E]" aria-live="polite">Score: {score}</span>
          <button type="button" onClick={toggleFullscreen} className="min-h-10 rounded-lg bg-[#4E342E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3D2924] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4E342E]" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>
      {fullscreenNotice && <p role="status" className="px-4 pt-3 text-xs text-amber-800">{fullscreenNotice}</p>}
      <iframe
        ref={iframeRef}
        title={`${title} — ${courseName}`}
        src={embedUrl}
        className="block min-h-0 w-full flex-1 border-0 bg-[#F8E4D4]"
        allow="autoplay; fullscreen"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin"
      />
    </section>
  )
}
