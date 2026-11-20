import { useEffect, useRef } from "react"
import lottie from "lottie-web"
import graduationHat from "../../assets/animations/graduation-hat.json"

export default function GraduationHatAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      animationData: graduationHat,
      loop: !prefersReducedMotion,
      autoplay: !prefersReducedMotion,
      rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
    })

    if (prefersReducedMotion) animation.goToAndStop(0, true)
    return () => animation.destroy()
  }, [])

  return <div ref={containerRef} className="mr-3 h-24 w-24 shrink-0 sm:mr-5 sm:h-48 sm:w-48" role="img" aria-label="Animated graduation cap" />
}
