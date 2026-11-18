import { useEffect, useState } from "react"
import { useApp } from "../../store/AppContext"

const lessons = [
  {
    id: "workplace-safety",
    category: "Safety",
    title: "Stay safe on every job",
    time: "5 min",
    summary: "Simple steps to reduce risk before and during a shift.",
    points: [
      "Before starting, ask who supervises the work and where the first-aid kit and exits are.",
      "Use the protective equipment required for the task. Do not operate unfamiliar tools without instruction.",
      "Pause work and tell the supervisor if equipment, weather, or a work area feels unsafe.",
    ],
  },
  {
    id: "confirm-the-job",
    category: "Know your work",
    title: "Confirm the job before you accept",
    time: "4 min",
    summary: "Make sure the pay, hours, location, and duties are clear.",
    points: [
      "Confirm the exact tasks, start and end times, work address, and the person you will meet.",
      "Agree on the payment amount, payment method, and when payment will be made before the shift begins.",
      "Keep communication and agreed changes in the app so you can refer back to them.",
    ],
  },
  {
    id: "avoid-scams",
    category: "Trust",
    title: "Spot suspicious job requests",
    time: "4 min",
    summary: "Recognize common warning signs and report a listing.",
    points: [
      "Be cautious if someone asks you to pay a fee, share a password, or send a one-time code to get work.",
      "Check that the employer, job duties, location, and pay details are consistent and specific.",
      "Do not continue if a request feels unsafe. Use the report option on the job listing and keep the messages.",
    ],
  },
  {
    id: "strong-profile",
    category: "Get noticed",
    title: "Build a profile employers can understand",
    time: "6 min",
    summary: "Show your skills, experience, and availability clearly.",
    points: [
      "List the skills you can demonstrate and describe the kinds of tasks you have completed.",
      "Add accurate availability so suggested jobs fit your schedule.",
      "Use a clear profile photo and keep your contact details current. Never include identity document numbers in your public bio.",
    ],
  },
]

export default function Learn() {
  const { state } = useApp()
  const workerId = state.workerProfile?.id
  const storageKey = workerId ? `shram-bazar-learn-progress:${workerId}` : ""
  const [completed, setCompleted] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "[]")
      setCompleted(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [])
    } catch {
      setCompleted([])
    }
  }, [storageKey])

  const toggleComplete = (id: string) => {
    const next = completed.includes(id)
      ? completed.filter((item) => item !== id)
      : [...completed, id]
    setCompleted(next)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Keep lesson progress available for this session if storage is unavailable.
      }
    }
  }

  const progress = Math.round((completed.length / lessons.length) * 100)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8 rounded-3xl bg-[#553421] p-5 text-white shadow-sm sm:p-8 lg:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Shram Bazaar Learning</p>
        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem] md:items-center lg:gap-10">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Learn skills for safer work</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">Short, practical guides for finding work, confirming job details, and staying safe on the job.</p>
          </div>
          <div className="w-full rounded-2xl bg-white/10 p-4 sm:p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-sm">
              <span className="leading-5">Progress</span>
              <span className="justify-self-end rounded-full bg-white/10 px-2.5 py-1 font-semibold leading-none tabular-nums">{completed.length}/{lessons.length}</span>
              <div
                className="col-span-2 h-2 w-full overflow-hidden rounded-full bg-white/20"
                role="progressbar"
                aria-label="Learning guide completion"
                aria-valuemin={0}
                aria-valuemax={lessons.length}
                aria-valuenow={completed.length}
              >
              <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="col-span-2 mt-0 text-xs leading-4 text-white/70">Saved on this device</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-5 flex min-h-14 flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-900">Practical guides</h2>
          <p className="mt-1 text-sm text-stone-500">Open a guide to read it, then mark it complete.</p>
        </div>
        {completed.length === lessons.length && <span className="mb-0.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal">All guides complete</span>}
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2 lg:gap-5">
        {lessons.map((lesson, index) => {
          const isOpen = selected === lesson.id
          const isComplete = completed.includes(lesson.id)
          return (
            <article key={lesson.id} className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-shadow ${isOpen ? "border-primary/40 shadow-md" : "border-stone-200 shadow-sm"}`}>
              <button type="button" onClick={() => setSelected(isOpen ? null : lesson.id)} aria-expanded={isOpen} className="flex w-full flex-1 flex-col p-5 text-left sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-ink">{lesson.category}</span>
                  {isComplete && <span className="text-xs font-semibold text-teal">✓ Complete</span>}
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-stone-900">{index + 1}. {lesson.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{lesson.summary}</p>
                <div className="mt-auto flex w-full items-center justify-between gap-3 pt-5 text-xs text-stone-500">
                  <span>{lesson.time} read</span><span>{isOpen ? "Close guide ↑" : "Read guide ↓"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-stone-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  <ol className="space-y-3">
                    {lesson.points.map((point, pointIndex) => (
                      <li key={point} className="flex gap-3 text-sm leading-relaxed text-stone-700">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">{pointIndex + 1}</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                  <button type="button" onClick={() => toggleComplete(lesson.id)} className={`mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${isComplete ? "border border-stone-200 text-stone-700 hover:bg-stone-50" : "bg-primary text-white hover:bg-primary-dark"}`}>
                    {isComplete ? "Mark as not complete" : "Mark guide complete"}
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-stone-500">These guides are general information. Always follow the job site’s safety instructions and local requirements.</p>
    </main>
  )
}
