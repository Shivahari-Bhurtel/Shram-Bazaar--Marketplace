import type { DemoJob } from "../services/demoJobs"
import { formatDemoSalary } from "../services/demoJobs"

type Props = {
  job: DemoJob
  selected?: boolean
  saved?: boolean
  applied?: boolean
  matchReasons?: string[]
  onOpen: (job: DemoJob) => void
  onToggleSaved?: (jobId: string) => void
  onApply?: (jobId: string) => void
}

export default function DemoJobCard({ job, selected = false, saved = false, applied = false, matchReasons = [], onOpen, onToggleSaved, onApply }: Props) {
  return (
    <article className={`job-listing-card border bg-white p-3 transition-colors ${selected ? "border-[#265D4C] ring-1 ring-[#265D4C]/25" : "border-stone-200 hover:border-stone-300"}`}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h3 className="job-listing-title text-base font-semibold leading-snug text-stone-900">
            <button type="button" onClick={() => onOpen(job)} className="text-left hover:text-primary-ink focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{job.title}</button>
          </h3>
          <p className="mt-0.5 truncate text-sm text-stone-600">{job.company}</p>
        </div>
        <span className="job-card-type shrink-0">{job.job_type}</span>
      </div>

      <p className="job-card-salary mt-2 inline-flex max-w-full px-2 py-1 text-[13px] font-semibold">{formatDemoSalary(job)}</p>
      {matchReasons.length > 0 && <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600" aria-label="Why this job may suit you">{matchReasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2.5">
        <button type="button" onClick={() => onOpen(job)} className="mr-auto rounded-full border border-[#265D4C]/50 px-3 py-1 text-sm font-medium text-[#265D4C] hover:bg-[#265D4C]/5">Details</button>
        {onToggleSaved && <button type="button" aria-pressed={saved} onClick={() => onToggleSaved(job.id)} className="rounded-md border border-stone-300 px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50">{saved ? "Saved" : "Save"}</button>}
        {onApply && <button type="button" disabled={applied} onClick={() => onApply(job.id)} className="rounded-md bg-[#265D4C] px-3 py-1 text-sm font-semibold text-white hover:bg-[#1D493B] disabled:cursor-default disabled:bg-stone-300">{applied ? "Saved" : "Apply"}</button>}
      </div>
    </article>
  )
}
