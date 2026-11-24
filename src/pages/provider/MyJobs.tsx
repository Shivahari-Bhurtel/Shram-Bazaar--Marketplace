import { useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import ConfirmDialog from "../../components/ConfirmDialog"
import SearchInOutAnimation from "../../components/SearchInOutAnimation"
import type { Job, JobStatus } from "../../types"
import { daysUntilNepalDate, formatNepalDate, isDateOnlyString, nepalDateString } from "../../utils/dates"
import showcaseJobsData from "../../data/provider-my-jobs-demo.json"

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export default function MyJobs() {
  const { state, myJobs, jobApplications, navigate, deleteJob, updateJob } = useApp()
  const [activeTab, setActiveTab] = useState<JobStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const visibilityKey = `shram-demo-job-visibility-${state.providerProfile?.id || state.currentUser?.id || "provider"}`
  const [showcaseStatuses, setShowcaseStatuses] = useState<Record<string, JobStatus>>(() => {
    try {
      return JSON.parse(localStorage.getItem(visibilityKey) || "{}") as Record<string, JobStatus>
    } catch {
      return {}
    }
  })

  const ownJobIds = new Set(myJobs.map((job) => job.id))
  const showcaseJobs = showcaseJobsData.jobs
    .filter((job) => !ownJobIds.has(job.id))
    .map((job) => ({ ...job, status: showcaseStatuses[job.id] || job.status, isShowcaseDemo: true }) as Job & { isShowcaseDemo: boolean })
  const allJobs = [...myJobs, ...showcaseJobs]

  const setJobVisibility = (job: Job & { isShowcaseDemo?: boolean }, visible: boolean) => {
    const status: JobStatus = visible ? "active" : "closed"
    if (job.isShowcaseDemo) {
      setShowcaseStatuses((current) => {
        const next = { ...current, [job.id]: status }
        try {
          localStorage.setItem(visibilityKey, JSON.stringify(next))
        } catch {
          // Keep this page session usable when browser storage is unavailable.
        }
        return next
      })
      return
    }
    void updateJob(job.id, { status })
  }

  const filtered = useMemo(() => allJobs.filter((job) =>
    (activeTab === "all" || job.status === activeTab) &&
    `${job.title} ${job.category} ${job.district} ${job.location}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [activeTab, allJobs, search])

  const tabs: { key: JobStatus | "all"; label: string }[] = [
    { key: "all", label: `All (${allJobs.length})` },
    {
      key: "active",
      label: `Active (${allJobs.filter((j) => j.status === "active").length})`,
    },
    {
      key: "filled",
      label: `Filled (${allJobs.filter((j) => j.status === "filled").length})`,
    },
    {
      key: "closed",
      label: `Closed (${allJobs.filter((j) => j.status === "closed").length})`,
    },
  ]

  return (
    <div className="provider-page mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[#261C14] mb-1">
            My Jobs
          </h1>
          <p className="text-[#766B61]">
          Manage your job postings and view applications
          </p>
        </div>
        <button
          onClick={() => navigate("create-job")}
          className="provider-post-job-action min-h-11 rounded-lg bg-[#164E38] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#103B2C]"
        >
          + Post New Job
        </button>
      </div>

      <label className="relative mb-4 block max-w-xl">
        <span className="sr-only">Search jobs</span>
        <SearchInOutAnimation />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs by title, category or location" className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-12 pr-4 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/10" />
      </label>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-stone-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px flex-shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary-ink"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-ink"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg></div>
          <h3 className="mb-2 font-semibold text-stone-900">No jobs here</h3>
          <p className="mb-6 text-sm text-stone-500">{activeTab === "all" ? "You haven't posted any jobs yet." : `No ${activeTab} jobs.`}</p>
          <button onClick={() => navigate("create-job")} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Post Your First Job</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(25,44,34,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead className="bg-[#FCFBF9] text-xs font-semibold uppercase tracking-[0.08em] text-[#766B61]">
                <tr>
                  <th scope="col" className="px-5 py-5">Job title</th>
                  <th scope="col" className="px-5 py-5">Department</th>
                  <th scope="col" className="px-5 py-5">Location</th>
                  <th scope="col" className="px-5 py-5">Applicants</th>
                  <th scope="col" className="px-5 py-5">Status</th>
                  <th scope="col" className="px-5 py-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((job) => {
                  const isShowcaseDemo = "isShowcaseDemo" in job && job.isShowcaseDemo === true
                  const apps = isShowcaseDemo
                    ? showcaseJobsData.applications.filter((application) => application.jobId === job.id)
                    : jobApplications(job.id)
                  const pendingCount = apps.filter((application) => application.status === "pending").length
                  const acceptedCount = apps.filter((application) => application.status === "accepted").length
                  return (
                    <tr key={job.id} className="align-middle transition-colors hover:bg-[#FCFBF9]">
                      <td className="px-5 py-6">
                        <div className="max-w-[250px] text-base font-semibold leading-snug text-[#261C14]">{job.title}</div>
                        <div className="mt-1.5 text-sm text-[#766B61]">Posted {formatNepalDate(job.postedDate || job.date, { month: "numeric", day: "numeric", year: "numeric" })}</div>
                      </td>
                      <td className="px-5 py-6 text-sm font-medium capitalize text-[#51483F]">{job.category.replace(/-/g, " ")}</td>
                      <td className="max-w-[320px] px-5 py-6 text-sm font-medium leading-6 text-[#51483F]" title={job.location || job.district}><span className="inline-flex items-start gap-2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-4 w-4 shrink-0 text-[#92877E]" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>{job.location || job.district}</span></td>
                      <td className="px-5 py-6">
                        {isShowcaseDemo ? <span className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-[#261C14]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#92877E]" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 8a3 3 0 0 1 0 6m2 2a4 4 0 0 1 2 4"/></svg>{apps.length}</span> : <button onClick={() => navigate("applicant-management", job.id)} className="inline-flex items-center gap-2 text-sm font-semibold tabular-nums text-[#261C14] underline-offset-4 hover:text-[#286B50] hover:underline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#92877E]" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 8a3 3 0 0 1 0 6m2 2a4 4 0 0 1 2 4"/></svg>{apps.length}</button>}
                        {(pendingCount > 0 || acceptedCount > 0) && <div className="mt-1 whitespace-nowrap text-xs text-[#766B61]">{pendingCount > 0 ? `${pendingCount} awaiting review` : `${acceptedCount} accepted`}</div>}
                      </td>
                      <td className="px-5 py-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${job.status === "active" ? "bg-[#E7F5EA] text-[#286B50]" : job.status === "filled" ? "bg-[#F8F0D9] text-[#806527]" : "bg-[#F3F1EE] text-[#766B61]"}`}>{job.status === "active" ? "Published" : job.status === "filled" ? "Filled" : "Unpublished"}</span></td>
                      <td className="px-5 py-5">
                        <div className="flex min-w-[170px] flex-col items-start gap-2">
                          <button type="button" role="switch" aria-checked={job.status === "active"} aria-label={`${job.status === "active" ? "Hide" : "Make visible"} ${job.title}`} disabled={job.status === "filled"} onClick={() => setJobVisibility(job, job.status !== "active")} className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-sm font-medium text-[#51483F] disabled:cursor-not-allowed disabled:opacity-60">
                            <span className={`relative block h-7 w-12 shrink-0 rounded-full transition-colors ${job.status === "active" ? "bg-[#286B50]" : "bg-[#D6D3D1]"}`}>
                              <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${job.status === "active" ? "translate-x-5" : "translate-x-0"}`}/>
                            </span>
                            <span>{job.status === "active" ? "Published" : job.status === "filled" ? "Filled" : "Unpublished"}</span>
                          </button>
                          {isShowcaseDemo && <span className="pl-[3.35rem] text-[11px] text-[#92877E]">Showcase sample</span>}
                          {!isShowcaseDemo && <div className="flex items-center gap-3 pl-1 text-xs font-medium text-[#70472F]">
                            <button onClick={() => navigate("edit-job", job.id)} className="hover:underline">Edit</button>
                            <button onClick={() => navigate("applicant-management", job.id)} className="hover:underline">Applicants</button>
                            <button onClick={() => setConfirmDelete(job.id)} className="text-[#8B4035] hover:underline" aria-label={`Delete ${job.title}`}>Delete</button>
                          </div>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Cancel this job?"
          message="This will cancel the job posting. Applicants will remain in the system, and this action cannot be undone."
          confirmLabel="Cancel Job"
          danger
          onConfirm={() => {
            deleteJob(confirmDelete)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
