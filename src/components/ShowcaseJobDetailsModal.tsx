import { useEffect } from "react"
import type { ShowcaseJob } from "../services/showcaseJobs"

function salaryLabel(job: ShowcaseJob) {
  if (job.salaryText?.trim()) return job.salaryText
  if (job.salaryMin != null && job.salaryMax != null) return `${job.salaryCurrency || ""} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`.trim()
  if (job.salaryMin != null || job.salaryMax != null) return `${job.salaryCurrency || ""} ${(job.salaryMin ?? job.salaryMax)!.toLocaleString()}`.trim()
  return "Salary not specified"
}

function displayValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not specified" : String(value)
}

function formatDate(value: string | null) {
  if (!value) return "Not specified"
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-NP", { year: "numeric", month: "short", day: "numeric" }).format(date)
}

export default function ShowcaseJobDetailsModal({ job, onClose }: { job: ShowcaseJob; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-stone-950/55 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="showcase-job-title" className="showcase-job-modal flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_32px_100px_-36px_rgba(0,0,0,.65)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-8 sm:py-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-ink">Job details</p><p className="mt-1 text-xs text-stone-500">Source listing information</p></div>
          <button type="button" onClick={onClose} aria-label="Close job details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="showcase-job-title" className="font-heading text-2xl font-bold leading-tight text-stone-900 sm:text-3xl">{job.title}</h2>
              <p className="mt-2 text-base font-semibold text-stone-700">{job.company || "Company not specified"}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-500">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true">⌖</span>{job.location || "Location not specified"}</span>
                <span className="capitalize">Source: {job.source}</span>
                {job.postedDate && <span>Posted {formatDate(job.postedDate)}</span>}
              </div>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold capitalize text-stone-700">{job.source}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
            <DetailItem label="Salary" value={salaryLabel(job)} />
            <DetailItem label="Employment type" value={job.jobTypes.length ? job.jobTypes.join(" · ") : "Not specified"} />
            <DetailItem label="Experience" value={displayValue(job.experience)} />
            <DetailItem label="Experience level" value={displayValue(job.jobLevel)} />
            <DetailItem label="Vacancies" value={displayValue(job.vacancies)} />
            <DetailItem label="Application deadline" value={formatDate(job.deadline)} />
          </div>

          <section className="mt-7">
            <h3 className="text-base font-bold text-stone-900">Category</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{job.category || "Not specified"}</p>
          </section>

          <section className="mt-6">
            <h3 className="text-base font-bold text-stone-900">Required skills</h3>
            {job.skills.length ? <div className="mt-3 flex flex-wrap gap-2">{job.skills.map((skill) => <span key={skill} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700">{skill}</span>)}</div> : <p className="mt-2 text-sm text-stone-500">No skills were listed in the source.</p>}
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 p-4 sm:p-5">
            <h3 className="text-base font-bold text-stone-900">About this listing</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">The source dataset does not include a full job description. This view only shows details recorded in the collected listing.</p>
          </section>

          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">Historical dataset listing · availability is not verified. This listing is shown for demonstration and is not confirmed as an active vacancy.</p>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-5 py-4 sm:px-8">
          <p className="text-xs text-stone-500">Original source: <span className="font-semibold capitalize text-stone-700">{job.source}</span></p>
          {job.sourceUrl ? <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">View original listing</a> : <span className="text-xs text-stone-500">No original listing link was provided.</span>}
        </footer>
      </section>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-stone-900">{value}</p></div>
}
