import { useEffect, useRef } from "react"
import lottie from "lottie-web"
import animationData from "../assets/animations/finding-tasker.json"

export default function FindingTaskerAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const animation = lottie.loadAnimation({
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

    return () => animation.destroy()
  }, [])

  return <div ref={containerRef} className="h-32 w-32 sm:h-44 sm:w-44 lg:h-48 lg:w-48" role="img" aria-label="Animated workers finding tasks" />
}
