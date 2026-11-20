import { useEffect } from "react"
import type { DemoJob } from "../services/demoJobs"
import { formatDemoDistance, formatDemoSalary } from "../services/demoJobs"

type Props = {
  job: DemoJob
  distance?: number | null
  saved?: boolean
  applied?: boolean
  matchReasons?: string[]
  onClose: () => void
  onViewMap?: () => void
  onToggleSaved?: (jobId: string) => void
  onApply?: (jobId: string) => void
}

export default function DemoJobDetailsModal({ job, distance, saved = false, applied = false, matchReasons = [], onClose, onViewMap, onToggleSaved, onApply }: Props) {
  const beginnerBadge = matchReasons.find((reason) => /suitable for beginners/i.test(reason))
  const workplaceAddress = formatWorkplaceAddress(job.address, job.location, job.city)
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
      <section role="dialog" aria-modal="true" aria-labelledby="demo-job-title" className="job-detail-modal flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-stone-200 bg-[#fffefa] shadow-[0_32px_100px_-36px_rgba(0,0,0,.65)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-stone-700 hover:text-[#70472F]"><span aria-hidden="true">←</span> Back</button><span aria-hidden="true" className="h-4 w-px shrink-0 bg-stone-300" /><span className="truncate text-[13px] font-semibold uppercase tracking-[0.06em] text-[#2E6F56]">{job.category}</span></div>
          <button type="button" onClick={onClose} aria-label="Close job details" className="flex h-9 w-9 shrink-0 items-center justify-center text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
          <div>
            <h2 id="demo-job-title" className="job-detail-title mt-0.5 text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-[#141715]">{job.title}</h2>
            <p className="mt-1 text-sm font-medium text-stone-700">{job.company}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="job-detail-salary text-sm font-semibold tabular-nums">{formatDemoSalary(job)}</p>
              {beginnerBadge && <span className="text-xs font-semibold text-[#1E4D3B]">{beginnerBadge}</span>}
            </div>
          </div>

          <section className="rounded-lg border border-[#dedbd2] bg-[#f4f1e9] p-3">
            <h3 className="job-detail-section-title text-sm font-semibold text-[#1E4D3B]">Job overview</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              <Detail label="Employment" value={job.job_type} />
              <Detail label="Experience" value={job.experience} />
              <Detail label="Openings & deadline" value={`${job.vacancies} ${job.vacancies === 1 ? "vacancy" : "vacancies"} · ${formatDate(job.deadline)}`} />
              <Detail label="Payment frequency" value={paymentFrequency(job.salary_type)} />
            </div>
          </section>

          <section className="border-b border-stone-200 pb-4">
            <h3 className="job-detail-section-title text-sm font-semibold text-[#1E4D3B]">About this job</h3>
            <p className="mt-1.5 max-w-[60ch] whitespace-pre-line text-sm leading-relaxed text-[#3D4440]">{job.description}</p>
          </section>

          <section className="border-b border-stone-200 pb-4">
            <h3 className="job-detail-section-title text-sm font-semibold text-[#1E4D3B]">Skills and requirements</h3>
            <div className="mt-2.5">
              <p className="text-[11px] font-medium text-stone-600">Skills</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-[#3D4440]">{job.skills.map((skill, index) => <li key={`${skill}-${index}`} className="font-semibold">{cleanTag(skill)}</li>)}</ul>
            </div>
            <div className="mt-2">
              <p className="text-[11px] font-medium text-stone-600">Requirements</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed text-[#3D4440]">{job.requirements.map((requirement, index) => <li key={`${requirement}-${index}`} className="font-semibold">{cleanTag(requirement)}</li>)}</ul>
            </div>
          </section>

          <section aria-label="Workplace" className="flex flex-wrap items-center gap-3 rounded-lg bg-[#F8F7F4] px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#265D4C]" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium text-stone-800">{workplaceAddress}{distance != null && <span className="font-normal tabular-nums text-stone-500"> · {formatDemoDistance(distance)}</span>}</p></div>
            {onViewMap && <button type="button" onClick={onViewMap} className="shrink-0 text-xs font-semibold text-[#265D4C] hover:underline">View on map →</button>}
          </section>
        </div>

        {(onToggleSaved || onApply) && <footer className="sticky bottom-0 flex shrink-0 flex-wrap items-center gap-2 border-t border-[#EAE7E0] bg-white px-4 py-3 shadow-[0_-6px_16px_-16px_rgba(25,35,30,.35)] sm:px-5">
          <p className="mb-0.5 w-full text-[11px] leading-relaxed text-stone-500">Saved locally on this device only.</p>
          {onToggleSaved && <button type="button" aria-pressed={saved} onClick={() => onToggleSaved(job.id)} className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">{saved ? "Saved job" : "Save job"}</button>}
          {onApply && <button type="button" disabled={applied} onClick={() => onApply(job.id)} className={`rounded-md px-4 py-1.5 text-xs font-semibold text-white transition-colors ${applied ? "cursor-default bg-[#80502F]" : "bg-[#1E4D3B] hover:bg-[#173C2E]"}`}>{applied ? "Applied" : "Apply now"}</button>}
        </footer>}
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-stone-900">{value}</p></div>
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-NP", { year: "numeric", month: "short", day: "numeric" }).format(date)
}

function paymentFrequency(value: string) {
  if (value === "daily") return "Daily"
  if (value === "hourly") return "Hourly"
  if (value === "monthly") return "Monthly"
  return value
}

function formatWorkplaceAddress(address: string, location: string, city: string) {
  let cleanAddress = address
    .replace(/\s*\(approx(?:imate|\.)?\)\s*/gi, "")
    .replace(new RegExp(`,?\\s*${escapeRegExp(city)}\\s*$`, "i"), "")
    .trim()
    .replace(/,$/, "")
  if (!cleanAddress) return location
  const hasLocalityComponent = cleanAddress.split(",").some((part) => part.trim().toLocaleLowerCase() === location.trim().toLocaleLowerCase())
  if (!hasLocalityComponent) cleanAddress = `${cleanAddress}, ${location}`
  return cleanAddress
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function cleanTag(value: string) {
  return value.replace(/^[\s•\-–—]+/, "")
}
