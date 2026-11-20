import type { LearnCourse } from "../../data/courses"

type Props = {
  course: LearnCourse
  learnerName: string
  completedAt: string
}

export default function CertificateCard({ course, learnerName, completedAt }: Props) {
  const date = new Date(completedAt)
  const validDate = !Number.isNaN(date.getTime())
  const dateLabel = Number.isNaN(date.getTime())
    ? "Completion date unavailable"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  const dateId = validDate ? date.toISOString().slice(0, 10).replace(/-/g, "") : "UNKNOWN"
  const certificateId = `SB-${course.id.toUpperCase()}-${dateId}`

  const download = () => {
    const certificate = [
      "Shram Bazaar Learn — Course Completion Record",
      "",
      `Learner: ${learnerName}`,
      `Course: ${course.title}`,
      `Completed: ${dateLabel}`,
      `Certificate ID: ${certificateId}`,
      "",
      "This record recognizes completion of a learning course. It is not an accredited professional qualification.",
    ].join("\n")
    const url = URL.createObjectURL(new Blob([certificate], { type: "text/plain;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${course.slug}-completion.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article className="learn-certificate flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6"><path d="M6 3.75h8l4 4v12.5H6z" /><path d="M14 3.75v4h4M9 12h6M9 15h4" /><circle cx="16.5" cy="17" r="2.5" /><path d="m15.3 19.2-.5 2 1.7-.9 1.7.9-.5-2" /></svg>
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Course completion</p>
          <h3 className="mt-1 font-semibold text-slate-900">{course.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{learnerName} · {dateLabel}</p>
          <p className="mt-1 text-xs text-slate-500">ID {certificateId}</p>
        </div>
      </div>
      <button type="button" onClick={download} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">
        Download record
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" /></svg>
      </button>
    </article>
  )
}
