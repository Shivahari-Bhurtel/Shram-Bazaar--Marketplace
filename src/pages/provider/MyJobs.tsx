import { useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { JobStatusBadge, CategoryBadge } from "../../components/StatusBadge"
import ConfirmDialog from "../../components/ConfirmDialog"
import type { JobStatus } from "../../types"
import { daysUntilNepalDate, formatNepalDate, isDateOnlyString, nepalDateString } from "../../utils/dates"
import { formatJobBudget } from "../../utils/jobBudget"

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export default function MyJobs() {
  const { myJobs, jobApplications, navigate, deleteJob, updateJob, postJob } = useApp()
  const [activeTab, setActiveTab] = useState<JobStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = useMemo(() => myJobs.filter((job) =>
    (activeTab === "all" || job.status === activeTab) &&
    `${job.title} ${job.category} ${job.district} ${job.location}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [activeTab, myJobs, search])

  const tabs: { key: JobStatus | "all"; label: string }[] = [
    { key: "all", label: `All (${myJobs.length})` },
    {
      key: "active",
      label: `Active (${myJobs.filter((j) => j.status === "active").length})`,
    },
    {
      key: "filled",
      label: `Filled (${myJobs.filter((j) => j.status === "filled").length})`,
    },
    {
      key: "closed",
      label: `Closed (${myJobs.filter((j) => j.status === "closed").length})`,
    },
  ]

  return (
    <div className="provider-page mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-stone-900 mb-1">
            My Jobs
          </h1>
          <p className="text-stone-500">
          Manage your job postings, track hiring progress and review applicants.
          </p>
        </div>
        <button
          onClick={() => navigate("create-job")}
          className="provider-post-job-action min-h-11 rounded-lg bg-[#164E38] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#103B2C]"
        >
          + Post Job
        </button>
      </div>

      <label className="relative mb-4 block max-w-xl">
        <span className="sr-only">Search jobs</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs by title, category or location" className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-primary-light focus:ring-2 focus:ring-primary-light/10" />
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
              <thead className="bg-stone-50 text-sm font-bold uppercase tracking-[0.08em] text-stone-700">
                <tr>
                  <th scope="col" className="px-5 py-5">Job title</th>
                  <th scope="col" className="px-5 py-5">Category</th>
                  <th scope="col" className="px-5 py-5">Location</th>
                  <th scope="col" className="px-5 py-5">Applicants</th>
                  <th scope="col" className="px-5 py-5">Status</th>
                  <th scope="col" className="px-5 py-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((job) => {
                  const apps = jobApplications(job.id)
                  const pendingCount = apps.filter((application) => application.status === "pending").length
                  const acceptedCount = apps.filter((application) => application.status === "accepted").length
                  return (
                    <tr key={job.id} className="align-middle transition-colors hover:bg-[#FCFBF9]">
                      <td className="px-5 py-6">
                        <div className="max-w-[250px] text-base font-bold leading-snug text-stone-900">{job.title}</div>
                        <div className="mt-1.5 text-sm font-medium text-stone-600">Posted {formatNepalDate(job.postedDate || job.date, { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div className="mt-2 text-base font-bold text-stone-900">{formatJobBudget(job)}</div>
                      </td>
                      <td className="px-5 py-6 text-base font-medium capitalize text-stone-800">{job.category.replace(/-/g, " ")}</td>
                      <td className="max-w-[320px] px-5 py-6 text-base font-medium leading-6 text-stone-700" title={job.location || job.district}>{job.location || job.district}</td>
                      <td className="px-5 py-6">
                        <button onClick={() => navigate("applicant-management", job.id)} className="text-base font-bold tabular-nums text-stone-900 underline-offset-4 hover:text-primary-ink hover:underline">{apps.length}</button>
                        {pendingCount > 0 && <div className="mt-1 whitespace-nowrap text-sm font-medium text-amber-700">{pendingCount} awaiting review</div>}
                        {acceptedCount > 0 && <div className="mt-1 whitespace-nowrap text-sm font-medium text-green-700">{acceptedCount} accepted</div>}
                      </td>
                      <td className="px-5 py-5"><JobStatusBadge status={job.status} /></td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          {job.status === "active" && <button onClick={() => navigate("edit-job", job.id)} className="rounded-md border border-stone-300 px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50">Edit</button>}
                          <button onClick={() => navigate("applicant-management", job.id)} className="whitespace-nowrap rounded-md bg-[#164E38] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#103B2C]">{pendingCount ? `Review ${pendingCount}` : "Applicants"}</button>
                          {job.status === "active" && <button onClick={() => updateJob(job.id, { status: "closed" })} className="rounded-md border border-stone-300 px-3 py-2.5 text-sm font-semibold text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800" title="Close job">Close</button>}
                          <button onClick={() => setConfirmDelete(job.id)} className="rounded-md p-2.5 text-stone-500 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${job.title}`} title="Delete job"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg></button>
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
