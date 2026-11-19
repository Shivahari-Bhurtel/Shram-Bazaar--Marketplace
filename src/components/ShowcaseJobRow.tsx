import type { ShowcaseJob } from "../services/showcaseJobs"

function salaryLabel(job: ShowcaseJob) {
  if (job.salaryText?.trim()) return job.salaryText
  if (job.salaryMin != null && job.salaryMax != null) return `${job.salaryCurrency || ""} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`.trim()
  if (job.salaryMin != null || job.salaryMax != null) return `${job.salaryCurrency || ""} ${(job.salaryMin ?? job.salaryMax)!.toLocaleString()}`.trim()
  return "Salary not specified"
}

export default function ShowcaseJobRow({ job, onOpen }: { job: ShowcaseJob; onOpen?: (job: ShowcaseJob) => void }) {
  return (
    <article className="border-b border-stone-200 px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold leading-snug text-stone-900"><button type="button" onClick={() => onOpen?.(job)} className="text-left underline decoration-stone-400 decoration-1 underline-offset-4 transition-colors hover:text-primary-ink hover:decoration-primary-ink focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{job.title}</button></h3>
          <p className="mt-1 text-sm font-medium text-stone-700">{job.company || "Company not specified"}</p>
        </div>
        {job.source && <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-stone-600">{job.source}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
        <span>{job.location || "Location not specified"}</span>
        <span className="font-semibold text-stone-800">{salaryLabel(job)}</span>
      </div>
    </article>
  )
}
