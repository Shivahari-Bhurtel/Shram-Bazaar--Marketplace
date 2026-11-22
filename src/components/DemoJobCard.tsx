import type { DemoJob } from "../services/demoJobs"
import { formatDemoSalary } from "../services/demoJobs"

type Props = {
  job: DemoJob
  selected?: boolean
  saved?: boolean
  applied?: boolean
  homeStyle?: boolean
  inlineSaveAction?: boolean
  matchReasons?: string[]
  onOpen: (job: DemoJob) => void
  onToggleSaved?: (jobId: string) => void
  onApply?: (jobId: string) => void
}

export default function DemoJobCard({ job, selected = false, saved = false, applied = false, homeStyle = false, inlineSaveAction = false, matchReasons = [], onOpen, onToggleSaved, onApply }: Props) {
  return (
    <article className={`job-listing-card border bg-white p-3 transition-colors ${homeStyle ? "flex h-full min-h-[232px] flex-col rounded-xl p-4" : ""} ${selected ? "border-[#265D4C] ring-1 ring-[#265D4C]/25" : "border-stone-200 hover:border-stone-300"}`}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h3 className={`job-listing-title text-base font-semibold leading-snug text-stone-900 ${homeStyle ? "line-clamp-2" : ""}`}>
            <button type="button" onClick={() => onOpen(job)} className="text-left hover:text-primary-ink focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{job.title}</button>
          </h3>
          <p className="mt-0.5 truncate text-sm text-stone-600">{job.company}</p>
        </div>
        {(homeStyle || inlineSaveAction) && onToggleSaved ? <button type="button" aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} title={saved ? "Remove saved job" : "Save job"} aria-pressed={saved} onClick={() => onToggleSaved(job.id)} className={`flex h-8 w-9 shrink-0 items-center justify-center rounded-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80502F] ${saved ? "text-[#70472F]" : "text-stone-500 hover:text-[#70472F]"}`}><svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.75L6 21V4.75Z" /></svg></button> : !homeStyle && <span className="job-card-type shrink-0">{job.job_type}</span>}
      </div>

      {homeStyle && <div className="mt-2 min-h-5 overflow-hidden">{matchReasons.length > 0 && <ul className="flex h-5 flex-wrap gap-x-3 gap-y-1 overflow-hidden text-xs text-stone-600" aria-label="Why this job may suit you">{matchReasons.slice(0, 1).map((reason) => <li key={reason} className="truncate">{reason}</li>)}</ul>}</div>}
      {!homeStyle && <p className="job-card-salary mt-2 inline-flex w-fit max-w-full self-start px-2 py-1 text-[13px] font-semibold">{formatDemoSalary(job)}</p>}
      {!homeStyle && matchReasons.length > 0 && <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600" aria-label="Why this job may suit you">{matchReasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      {homeStyle && <><p className="job-card-salary mt-auto inline-flex min-h-8 w-fit max-w-full self-start items-center whitespace-nowrap px-2 py-1 text-[13px] font-semibold">{formatDemoSalary(job)}</p><p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-stone-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 shrink-0" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg><span className="truncate">{job.location}, {job.city}</span></p></>}
      <div className={`flex flex-wrap items-center gap-2 border-t border-stone-100 ${homeStyle ? "mt-1 pt-3" : "mt-2.5 pt-2.5"}`}>
        <button type="button" onClick={() => onOpen(job)} className={`mr-auto px-3 py-1 text-sm font-semibold transition-colors ${homeStyle ? "min-h-9 rounded-md border border-[#5B8D7D] bg-[#5B8D7D] text-white hover:bg-[#477767]" : "rounded-[2px] border border-[#265D4C]/50 font-medium text-[#265D4C] hover:bg-[#265D4C]/5"}`}>Details</button>
        {onToggleSaved && !homeStyle && !inlineSaveAction && <button type="button" aria-pressed={saved} onClick={() => onToggleSaved(job.id)} className="rounded-md border border-stone-300 px-3 py-1 text-sm font-medium text-stone-700 hover:bg-stone-50">{saved ? "Saved" : "Save"}</button>}
        {onApply && <button type="button" disabled={applied} onClick={() => onApply(job.id)} className={`job-card-apply rounded-md bg-[#265D4C] px-3 py-1 text-sm font-semibold text-white hover:bg-[#1D493B] disabled:cursor-default disabled:bg-stone-300 ${homeStyle ? "min-h-9" : ""}`}>{applied ? "Applied" : "Apply"}</button>}
      </div>
    </article>
  )
}
