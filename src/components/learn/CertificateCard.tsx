import type { CertificateRecord, LearnCourse } from "../../data/courses"
import { createCertificateId } from "../../services/learnProgress"

type Props = {
  course: LearnCourse
  learnerName: string
  learnerId: string
  completedAt: string
  record?: CertificateRecord
  onView: () => void
}

export default function CertificateCard({ course, learnerName, learnerId, completedAt, record, onView }: Props) {
  const resolvedName = record?.learnerName || learnerName
  const resolvedTitle = record?.courseName || course.title
  const resolvedDate = record?.completedAt || completedAt
  const date = new Date(resolvedDate)
  const validDate = !Number.isNaN(date.getTime())
  const dateLabel = Number.isNaN(date.getTime())
    ? "Completion date unavailable"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
  const certificateId = record?.certificateId || createCertificateId(course.id, learnerId, resolvedDate)

  return (
    <article className="learn-certificate flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3E9DF] text-[#80502F]" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6"><path d="M6 3.75h8l4 4v12.5H6z" /><path d="M14 3.75v4h4M9 12h6M9 15h4" /><circle cx="16.5" cy="17" r="2.5" /><path d="m15.3 19.2-.5 2 1.7-.9 1.7.9-.5-2" /></svg>
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#80502F]">Course completion</p>
          <h3 className="mt-1 font-semibold text-slate-900">{resolvedTitle}</h3>
          <p className="mt-1 text-sm text-slate-600">{resolvedName} · {dateLabel}</p>
          <p className="mt-1 text-xs text-slate-500">ID {certificateId}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onView} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4E342E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B2722]">View certificate</button>
      <button type="button" onClick={onView} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#D7BFA4] px-4 py-2 text-sm font-semibold text-[#4E342E] hover:bg-[#F7F0E8]">
        Download / Print
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" /></svg>
      </button>
      </div>
    </article>
  )
}
