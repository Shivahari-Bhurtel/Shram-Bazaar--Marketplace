import { useEffect, useRef } from "react"
import lottie from "lottie-web"

export default function LoginIllustration() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let disposed = false
    let animation: ReturnType<typeof lottie.loadAnimation> | undefined
    void import("../assets/animations/login.json")
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
      className="mx-auto mt-8 h-72 w-full max-w-[28rem] sm:h-80 lg:mt-10 lg:h-96"
      role="img"
      aria-label="Illustration of a person signing in with a one-time password"
    />
  )
}
