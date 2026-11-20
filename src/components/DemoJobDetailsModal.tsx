import { useEffect } from "react"
import { createPortal } from "react-dom"
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
  portal?: boolean
}

export default function DemoJobDetailsModal({ job, distance, saved = false, applied = false, matchReasons = [], onClose, onViewMap, onToggleSaved, onApply, portal = false }: Props) {
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

  const modal = (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-stone-950/55 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="demo-job-title" className="job-detail-modal flex max-h-[min(92dvh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-[#fffefa] shadow-[0_32px_100px_-36px_rgba(0,0,0,.65)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-stone-700 hover:text-[#70472F]"><span aria-hidden="true">←</span> Back</button><span aria-hidden="true" className="h-4 w-px shrink-0 bg-stone-300" /><span className="job-detail-category truncate text-base font-semibold text-[#2E6F56]">{job.category}</span></div>
          <button type="button" onClick={onClose} aria-label="Close job details" className="flex h-9 w-9 shrink-0 items-center justify-center text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></button>
        </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7">
          <div>
            <h2 id="demo-job-title" className="job-detail-title mt-0.5 text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-[#141715] sm:text-[30px]">{job.title}</h2>
            <p className="mt-1.5 text-base font-medium text-stone-700">{job.company}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="job-detail-salary text-base font-semibold tabular-nums sm:text-lg">{formatDemoSalary(job)}</p>
              {beginnerBadge && <span className="rounded-full bg-[#EAF2EE] px-3 py-1.5 text-sm font-semibold text-[#1E4D3B]">{beginnerBadge}</span>}
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-[#dedbd2] bg-white">
            <h3 className="job-detail-section-title px-5 pt-5 text-[25px] font-semibold text-[#1E4D3B] sm:px-6 sm:pt-6">Job overview</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-7 p-5 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-8 sm:p-6">
              <OverviewItem icon="employment" label="Employment" value={job.job_type} />
              <OverviewItem icon="experience" label="Experience" value={formatExperience(job.experience)} />
              <OverviewItem icon="deadline" label="Deadline" value={formatDate(job.deadline)} />
              <OverviewItem icon="payment" label="Payment frequency" value={paymentFrequency(job.salary_type)} />
              <OverviewItem icon="openings" label="Openings" value={`${job.vacancies} ${job.vacancies === 1 ? "position available" : "positions available"}`} />
            </div>
          </section>

          <section className="border-b border-stone-200 pb-4">
            <h3 className="job-detail-section-title text-[22px] font-semibold text-[#1E4D3B]">About this job</h3>
            <p className="mt-3 max-w-[65ch] whitespace-pre-line text-base leading-[1.75] text-[#3D4440]">{job.description}</p>
          </section>

          <section className="border-b border-stone-200 pb-4">
            <h3 className="job-detail-section-title text-[22px] font-semibold text-[#1E4D3B]">Skills and requirements</h3>
            <div className="mt-3">
              <p className="text-base font-semibold text-stone-700">Skills</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-[#3D4440]">{job.skills.map((skill, index) => <li key={`${skill}-${index}`} className="font-semibold">{cleanTag(skill)}</li>)}</ul>
            </div>
            <div className="mt-3">
              <p className="text-base font-semibold text-stone-700">Requirements</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-[#3D4440]">{job.requirements.map((requirement, index) => <li key={`${requirement}-${index}`} className="font-semibold">{cleanTag(requirement)}</li>)}</ul>
            </div>
          </section>

          <section aria-label="Workplace" className="flex flex-wrap items-center gap-3 rounded-lg bg-[#F8F7F4] px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#265D4C]" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/></svg></span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1"><p className="text-lg font-semibold text-stone-800">{workplaceAddress}</p>{distance != null && <p className="whitespace-nowrap text-base font-medium tabular-nums text-stone-500">· {formatDemoDistance(distance)}</p>}</div>
            {onViewMap && <button type="button" onClick={onViewMap} className="shrink-0 text-base font-semibold text-[#265D4C] hover:underline">View on map →</button>}
          </section>
        </div>

        {(onToggleSaved || onApply) && <footer className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#EAE7E0] bg-white px-4 py-3 shadow-[0_-6px_16px_-16px_rgba(25,35,30,.35)] sm:px-7">
          {onToggleSaved && <button type="button" aria-pressed={saved} onClick={() => onToggleSaved(job.id)} className="rounded-[10px] border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">{saved ? "Saved job" : "Save job"}</button>}
          {onApply && <button type="button" disabled={applied} onClick={() => onApply(job.id)} className={`demo-job-apply-button rounded-[10px] px-5 py-2.5 text-sm font-semibold text-white transition-colors ${applied ? "cursor-default bg-[#80502F]" : "bg-[#1E4D3B] hover:bg-[#173C2E]"}`}>{applied ? "Applied" : "Apply now"}</button>}
        </footer>}
      </section>
    </div>
  )
  return portal ? createPortal(modal, document.body) : modal
}

function OverviewItem({ icon, label, value }: { icon: "employment" | "experience" | "deadline" | "payment" | "openings"; label: string; value: string }) {
  return <div className="min-w-0">
    <OverviewIcon icon={icon} />
    <p className="mt-2 text-[15px] font-semibold text-stone-600">{label}</p>
    <p className="mt-1 break-words text-lg font-semibold leading-snug text-[#181B19]">{value}</p>
  </div>
}

function OverviewIcon({ icon }: { icon: "employment" | "experience" | "deadline" | "payment" | "openings" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 text-[#66766D]" {...common}>
    {icon === "employment" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>}
    {icon === "experience" && <><path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v5c3 2 7 2 10 0v-5M21 9v6"/><path d="m19 4 .5 1.2L21 6l-1.5.8L19 8l-.5-1.2L17 6l1.5-.8L19 4Z"/></>}
    {icon === "deadline" && <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>}
    {icon === "payment" && <><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 10v4c0 1.7 3.6 3 8 3M4 14v4c0 1.7 3.6 3 8 3"/><path d="M16 15v6M19 16.5h-4.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H13"/></>}
    {icon === "openings" && <><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M18 8v6M15 11h6"/></>}
  </svg>
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-NP", { year: "numeric", month: "short", day: "numeric" }).format(date)
}

function formatExperience(value: string) {
  return /no experience required|fresh workers welcome|training provided/i.test(value) ? "Entry-level" : value
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
