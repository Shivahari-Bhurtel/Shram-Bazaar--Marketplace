import { useEffect, useRef } from "react"
import lottie from "lottie-web"

export default function WorkerSignupIllustration() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let disposed = false
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined
    void import("../assets/animations/worker-team-hello.json")
      .then(({ default: animationData }) => {
        if (disposed) return
        animation = lottie.loadAnimation({
          container,
          renderer: "svg",
          animationData,
          loop: !prefersReducedMotion,
          autoplay: !prefersReducedMotion,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: true,
          },
        })
        if (prefersReducedMotion) animation.goToAndStop(0, true)
      })
      .catch(() => undefined)

    return () => {
      disposed = true
      animation?.destroy()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="mx-auto mt-8 h-64 w-full max-w-2xl sm:h-72 lg:mt-10 lg:h-80"
      role="img"
      aria-label="Animated team of workers greeting the visitor"
    />
  )
}
