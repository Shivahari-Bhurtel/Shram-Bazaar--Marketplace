import { useEffect, useRef } from "react"
import lottie from "lottie-web"

export default function SearchInOutAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let disposed = false
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined

    void import("../assets/animations/search-in-out.json")
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

  return <span ref={containerRef} className="pointer-events-none absolute left-3 top-1/2 h-7 w-7 -translate-y-1/2" aria-hidden="true" />
}
