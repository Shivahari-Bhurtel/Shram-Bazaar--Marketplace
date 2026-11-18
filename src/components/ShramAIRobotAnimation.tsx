import { useEffect, useRef } from "react"
import lottie from "lottie-web"
import robotAnimation from "../assets/animations/shram-ai-robot.json"

export default function ShramAIRobotAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      animationData: robotAnimation,
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

  return <div ref={containerRef} className="ai-robot-animation" role="img" aria-label="Friendly animated Shram AI robot" />
}
