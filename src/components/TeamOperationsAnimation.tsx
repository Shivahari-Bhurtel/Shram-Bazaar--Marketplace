import { useEffect, useRef } from "react"
import lottie from "lottie-web"

export default function TeamOperationsAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let disposed = false
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined
    void import("../assets/animations/team-operations.json")
      .then(({ default: animationData }) => {
        if (disposed) return
        animation = lottie.loadAnimation({
          container,
          renderer: "svg",
          animationData,
          loop: !prefersReducedMotion,
          autoplay: !prefersReducedMotion,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
        })
        if (prefersReducedMotion) animation.goToAndStop(0, true)
      })
      .catch(() => undefined)
    return () => {
      disposed = true
      animation?.destroy()
    }
  }, [])

  return <div ref={containerRef} className="h-24 w-24 shrink-0 sm:h-32 sm:w-32" role="img" aria-label="Animated Team and Operations illustration" />
}
