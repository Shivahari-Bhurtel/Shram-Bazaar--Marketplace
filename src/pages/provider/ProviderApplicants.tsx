import { useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import ConfirmDialog from "../../components/ConfirmDialog"
import { ApplicationStatusBadge } from "../../components/StatusBadge"
import type { Application, ApplicationStatus, Job } from "../../types"
import { formatNepalDate } from "../../utils/dates"

type CandidateRow = { application: Application; job: Job }
type PendingChange = { application: Application; job: Job; status: "accepted" | "rejected" } | null

const statusFilters: Array<{ key: "all" | ApplicationStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Not selected" },
  { key: "withdrawn", label: "Withdrawn" },
]

function ApplicantIcon({ kind }: { kind: "search" | "pin" | "calendar" | "briefcase" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    {kind === "search" && <><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></>}
    {kind === "pin" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    {kind === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>}
    {kind === "briefcase" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>}
  </svg>
}

export default function ProviderApplicants() {
  const { state, myJobs, navigate, updateApplicationStatus, setApplicationShortlisted } = useApp()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all")
  const [jobFilter, setJobFilter] = useState("all")
  const [pendingChange, setPendingChange] = useState<PendingChange>(null)
  const [shortlistBusy, setShortlistBusy] = useState<string | null>(null)
  const [shortlistError, setShortlistError] = useState("")

  const rows = useMemo<CandidateRow[]>(() => {
    const ownJobs = new Map(myJobs.map((job) => [job.id, job]))
    return state.applications
      .flatMap((application) => {
        const job = ownJobs.get(application.jobId)
        return job ? [{ application, job }] : []
      })
      .sort((a, b) => b.application.appliedDate.localeCompare(a.application.appliedDate))
  }, [myJobs, state.applications])

  const visibleRows = rows.filter(({ application, job }) => {
    if (statusFilter !== "all" && application.status !== statusFilter) return false
    if (jobFilter !== "all" && job.id !== jobFilter) return false
    const query = search.trim().toLocaleLowerCase()
    if (!query) return true
    const worker = state.allWorkerProfiles.find((profile) => profile.id === application.workerId)
    return `${application.workerName} ${application.workerLocation} ${application.workerSkills.join(" ")} ${application.jobTitle} ${job.category} ${worker?.professionalTitle || ""}`.toLocaleLowerCase().includes(query)
  })

  const counts = statusFilters.reduce<Record<string, number>>((result, filter) => {
    result[filter.key] = filter.key === "all" ? rows.length : rows.filter((row) => row.application.status === filter.key).length
    return result
  }, {})

  return (
    <section className="provider-page mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.04em] text-[#261C14]">Applicants</h1>
          <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-[#62584F]">Review workers who applied to your job postings and manage each application.</p>
        </div>
        <div className="flex h-12 min-w-36 items-center gap-3 rounded-xl border border-[#E8E2D5] bg-white px-4 shadow-sm">
          <span className="text-2xl font-semibold tabular-nums text-[#553421]">{rows.length}</span>
          <span className="text-xs font-medium leading-4 text-[#766B61]">total<br/>applicants</span>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search applicants</span>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[#92877E]"><ApplicantIcon kind="search" /></span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, skill, job, or location" className="h-11 w-full rounded-lg border border-[#E8E2D5] bg-white pl-10 pr-4 text-sm text-[#261C14] outline-none transition focus:border-[#70472F] focus:ring-2 focus:ring-[#70472F]/10" />
        </label>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-[#E8E2D5] bg-white px-3.5 text-sm text-[#766B61] lg:w-64">
          <span className="sr-only">Filter by job</span>
          <ApplicantIcon kind="briefcase" />
          <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[#261C14] outline-none">
            <option value="all">All job postings</option>
            {myJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-[#E8E2D5]" role="tablist" aria-label="Filter applicants by status">
        {statusFilters.map((filter) => (
          <button key={filter.key} type="button" role="tab" aria-selected={statusFilter === filter.key} onClick={() => setStatusFilter(filter.key)} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${statusFilter === filter.key ? "border-[#553421] text-[#553421]" : "border-transparent text-[#766B61] hover:text-[#261C14]"}`}>
            {filter.label}<span className={`text-xs tabular-nums ${statusFilter === filter.key ? "text-[#70472F]" : "text-[#9A9086]"}`}>{counts[filter.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#E8E2D5] bg-white px-6 py-16 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7F1EB] text-[#70472F]"><ApplicantIcon kind="briefcase" /></span>
          <h2 className="mt-4 text-lg font-semibold text-[#261C14]">Applicants will appear here</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#766B61]">When workers apply to your job postings, their profiles and application details will be available in this workspace.</p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-[#E8E2D5] bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-[#261C14]">No matching applicants</h2>
          <p className="mt-2 text-sm text-[#766B61]">Try changing the search or filters.</p>
          <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setJobFilter("all") }} className="mt-4 text-sm font-semibold text-[#70472F] hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {visibleRows.map(({ application, job }) => {
            const worker = state.allWorkerProfiles.find((profile) => profile.id === application.workerId)
            const acceptedCount = rows.filter((row) => row.application.jobId === job.id && row.application.status === "accepted").length
            const noSpots = acceptedCount >= job.workersNeeded
            const title = worker?.professionalTitle || worker?.services?.[0]?.title
            return (
              <article key={application.id} className="grid gap-5 rounded-xl border border-[#E8E2D5] bg-white p-4 shadow-[0_1px_2px_rgba(25,44,34,0.03)] transition hover:border-[#E4D3C3] hover:shadow-[0_8px_24px_rgba(20,57,39,0.06)] sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.72fr)_12.5rem] lg:items-center">
                <div className="flex min-w-0 items-start gap-4">
                  {application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-[#F5F2EE] object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F7F1EB] text-lg font-semibold text-[#553421]">{application.workerName.trim().charAt(0).toUpperCase() || "W"}</span>}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-[#261C14]">{application.workerName}</h2>
                      {worker?.verified && <span className="rounded-md bg-[#F7F1EB] px-2 py-0.5 text-[10px] font-semibold text-[#70472F]">Verified worker</span>}
                    </div>
                    {title && <p className="mt-0.5 truncate text-sm text-[#766B61]">{title}</p>}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[#766B61]"><ApplicantIcon kind="pin" />{application.workerLocation || "Location not provided"}</p>
                    <button type="button" onClick={() => navigate("applicant-management", job.id)} className="mt-2 text-xs font-semibold text-[#70472F] hover:underline">Review full application</button>
                  </div>
                </div>

                <div className="min-w-0 border-t border-[#F0EBE6] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <p className="truncate text-sm font-medium text-[#261C14]">{job.title}</p>
                  <p className="mt-1 text-xs text-[#766B61]">{job.category} · {job.district}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {application.workerSkills.slice(0, 4).map((skill) => <span key={skill} className="rounded-md border border-[#E8E2D5] bg-[#FAF8F5] px-2 py-1 text-[11px] font-medium text-[#65564A]">{skill}</span>)}
                    {!application.workerSkills.length && <span className="text-xs text-[#9A9086]">No skills listed</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#766B61]">
                    {application.experienceLevel && <span>{application.experienceLevel}</span>}
                    {worker?.acceptingWork != null && <span>{worker.acceptingWork ? "Open to work" : "Not accepting work"}</span>}
                    {(worker?.rating || 0) > 0 && <span>★ {worker?.rating.toFixed(1)} rating</span>}
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-3 border-t border-[#F0EBE6] pt-4 sm:flex-row lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="flex flex-col gap-2 lg:items-end">
                    <ApplicationStatusBadge status={application.status} />
                    <span className="flex items-center gap-1.5 text-[11px] text-[#92877E]"><ApplicantIcon kind="calendar" />{formatNepalDate(application.appliedDate, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  {application.status === "pending" && <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" disabled={shortlistBusy === application.id} onClick={async () => { setShortlistError(""); setShortlistBusy(application.id); const error = await setApplicationShortlisted(application.id, !application.shortlisted); setShortlistBusy(null); if (error) setShortlistError(error) }} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition ${application.shortlisted ? "border-[#E4D3C3] bg-[#F7F1EB] text-[#553421]" : "border-[#E8E2D5] text-[#65564A] hover:bg-[#FAF8F5]"}`}>{shortlistBusy === application.id ? "Saving…" : application.shortlisted ? "Shortlisted" : "Shortlist"}</button>
                    <button type="button" disabled={noSpots || job.status !== "active"} title={noSpots ? "All positions are filled" : undefined} onClick={() => setPendingChange({ application, job, status: "accepted" })} className="min-h-9 rounded-lg bg-[#553421] px-3 text-xs font-semibold text-white transition hover:bg-[#4F3020] disabled:cursor-not-allowed disabled:opacity-50">Accept</button>
                    <button type="button" onClick={() => setPendingChange({ application, job, status: "rejected" })} className="min-h-9 rounded-lg border border-[#E8E2D5] px-3 text-xs font-semibold text-[#65564A] transition hover:border-[#E6C9C7] hover:bg-[#FBF5F4] hover:text-[#8B3933]">Reject</button>
                  </div>}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {pendingChange?.status === "accepted" && <ConfirmDialog title="Accept this applicant?" message={`Send ${pendingChange.application.workerName} a booking request for “${pendingChange.job.title}”. The task is booked after they confirm availability.`} confirmLabel="Send booking request" onConfirm={() => { updateApplicationStatus(pendingChange.application.id, "accepted"); setPendingChange(null) }} onCancel={() => setPendingChange(null)} />}
      {pendingChange?.status === "rejected" && <ConfirmDialog title="Reject this application?" message={`${pendingChange.application.workerName} will be marked as not selected for “${pendingChange.job.title}”.`} confirmLabel="Reject application" danger onConfirm={() => { updateApplicationStatus(pendingChange.application.id, "rejected"); setPendingChange(null) }} onCancel={() => setPendingChange(null)} />}
      {shortlistError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{shortlistError}</p>}
    </section>
  )
}
