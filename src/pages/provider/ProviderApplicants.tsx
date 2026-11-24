import { useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import ConfirmDialog from "../../components/ConfirmDialog"
import { ApplicationStatusBadge } from "../../components/StatusBadge"
import SearchInOutAnimation from "../../components/SearchInOutAnimation"
import type { Application, ApplicationStatus, Job } from "../../types"
import { formatNepalDate } from "../../utils/dates"
import applicantsDemo from "../../data/provider-applicants-demo.json"
import { openConversation, resolveDemoMessagingIdentity, shouldUseLocalDemoMessaging } from "../../services/messaging"

type CandidateRow = { application: Application; job: Job; demo: boolean }
type StatusFilter = "all" | "pending" | "shortlisted" | "accepted" | "rejected" | "withdrawn"
type PendingChange = { application: Application; job: Job; status: "accepted" | "rejected"; demo: boolean } | null
type DemoOverrides = { statuses?: Record<string, ApplicationStatus>; shortlisted?: Record<string, boolean> }

const statusFilters: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All applicants" },
  { key: "pending", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Not selected" },
  { key: "withdrawn", label: "Withdrawn" },
]

function Icon({ kind }: { kind: "pin" | "calendar" | "briefcase" | "person" | "message" | "check" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    {kind === "pin" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    {kind === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>}
    {kind === "briefcase" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>}
    {kind === "person" && <><circle cx="12" cy="8" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/></>}
    {kind === "message" && <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.7-.8L4 20l1.3-3.5A7.2 7.2 0 0 1 4 12c0-4.1 3.6-7.5 8-7.5s8 2.9 8 7Z"/><path d="M8 11h8m-8 3h5"/></>}
    {kind === "check" && <path d="m5 12 4 4L19 6"/>}
  </svg>
}

export default function ProviderApplicants() {
  const { state, myJobs, navigate, updateApplicationStatus, setApplicationShortlisted } = useApp()
  const currentProviderId = state.providerProfile?.id || state.currentUser?.id || "provider"
  const overridesKey = `shram-provider-applicant-demo-${currentProviderId}`
  const [demoOverrides, setDemoOverrides] = useState<DemoOverrides>(() => {
    try { return JSON.parse(localStorage.getItem(overridesKey) || "{}") as DemoOverrides } catch { return {} }
  })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [jobFilter, setJobFilter] = useState("all")
  const [selectedId, setSelectedId] = useState("")
  const [pendingChange, setPendingChange] = useState<PendingChange>(null)
  const [shortlistBusy, setShortlistBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState("")
  const [messageOpening, setMessageOpening] = useState<string | null>(null)

  const rows = useMemo<CandidateRow[]>(() => {
    const liveJobs = new Map(myJobs.map((job) => [job.id, job]))
    const liveRows = state.applications.flatMap((application) => {
      const job = liveJobs.get(application.jobId)
      return job ? [{ application, job, demo: false }] : []
    })
    const demoJobs = new Map(applicantsDemo.jobs.map((job) => [job.id, job as unknown as Job]))
    const demoRows = applicantsDemo.applications.flatMap((raw) => {
      const job = demoJobs.get(raw.jobId)
      if (!job) return []
      const application = {
        ...raw,
        status: demoOverrides.statuses?.[raw.id] || raw.status,
        shortlisted: demoOverrides.shortlisted?.[raw.id] ?? raw.shortlisted,
      } as unknown as Application
      return [{ application, job, demo: true }]
    })
    return [...demoRows, ...liveRows].sort((a, b) => b.application.appliedDate.localeCompare(a.application.appliedDate))
  }, [myJobs, state.applications, demoOverrides])

  const visibleRows = rows.filter(({ application, job }) => {
    if (statusFilter === "pending" && (application.status !== "pending" || application.shortlisted)) return false
    if (statusFilter === "shortlisted" && !(application.status === "pending" && application.shortlisted)) return false
    if (statusFilter === "accepted" && !["accepted", "completed"].includes(application.status)) return false
    if (statusFilter === "rejected" && !["rejected", "declined"].includes(application.status)) return false
    if (statusFilter === "withdrawn" && application.status !== "withdrawn") return false
    if (jobFilter !== "all" && job.id !== jobFilter) return false
    const query = search.trim().toLocaleLowerCase()
    if (!query) return true
    const demoWorker = applicantsDemo.workers.find((worker) => worker.id === application.workerId)
    const liveWorker = state.allWorkerProfiles.find((worker) => worker.id === application.workerId)
    return `${application.workerName} ${application.workerLocation} ${application.workerSkills.join(" ")} ${application.jobTitle} ${job.category} ${demoWorker?.professionalTitle || liveWorker?.professionalTitle || ""}`.toLocaleLowerCase().includes(query)
  })
  const selected = visibleRows.find((row) => row.application.id === selectedId) || visibleRows[0] || null

  const filterCount = (key: StatusFilter) => {
    if (key === "all") return rows.length
    if (key === "pending") return rows.filter(({ application }) => application.status === "pending" && !application.shortlisted).length
    if (key === "shortlisted") return rows.filter(({ application }) => application.status === "pending" && application.shortlisted).length
    if (key === "accepted") return rows.filter(({ application }) => ["accepted", "completed"].includes(application.status)).length
    if (key === "rejected") return rows.filter(({ application }) => ["rejected", "declined"].includes(application.status)).length
    return rows.filter(({ application }) => application.status === "withdrawn").length
  }

  const updateDemo = (applicationId: string, update: { status?: ApplicationStatus; shortlisted?: boolean }) => {
    setDemoOverrides((old) => {
      const next: DemoOverrides = {
        statuses: { ...old.statuses, ...(update.status ? { [applicationId]: update.status } : {}) },
        shortlisted: { ...old.shortlisted, ...(update.shortlisted !== undefined ? { [applicationId]: update.shortlisted } : {}) },
      }
      try { localStorage.setItem(overridesKey, JSON.stringify(next)) } catch { /* Keep the current session usable. */ }
      return next
    })
  }

  const toggleShortlist = async (row: CandidateRow) => {
    setActionError("")
    const shortlisted = !row.application.shortlisted
    if (row.demo) {
      updateDemo(row.application.id, { shortlisted })
      return
    }
    setShortlistBusy(row.application.id)
    const error = await setApplicationShortlisted(row.application.id, shortlisted)
    setShortlistBusy(null)
    if (error) setActionError(error)
  }

  const setShortlisted = async (row: CandidateRow, shortlisted: boolean) => {
    if (row.application.shortlisted === shortlisted) return
    setActionError("")
    if (row.demo) {
      updateDemo(row.application.id, { shortlisted })
      return
    }
    setShortlistBusy(row.application.id)
    const error = await setApplicationShortlisted(row.application.id, shortlisted)
    setShortlistBusy(null)
    if (error) setActionError(error)
  }

  const messageApplicant = async (row: CandidateRow) => {
    const currentUser = state.currentUser
    if (!currentUser) return
    setActionError("")
    setMessageOpening(row.application.id)
    const providerName = state.providerProfile?.orgName || currentUser.name
    const demo = row.demo || shouldUseLocalDemoMessaging(false, "provider", currentUser.profileId, currentUser.name, state.providerProfile?.orgName)
    const identity = resolveDemoMessagingIdentity(demo, "provider", currentUser.profileId, currentUser.name, state.providerProfile?.orgName)
    try {
      const conversation = await openConversation(demo, row.application.id, identity, currentUser.name, {
        actorRole: "provider",
        workerId: row.application.workerId,
        workerName: row.application.workerName,
        workerPhoto: row.application.workerPhoto,
        providerId: state.providerProfile?.id || currentUser.profileId,
        providerName,
        jobId: row.job.id,
        jobTitle: row.job.title,
      })
      sessionStorage.setItem("shram-open-conversation-id", conversation.id)
      navigate("messages")
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not open this conversation.")
    } finally {
      setMessageOpening(null)
    }
  }

  const selectedWorker = selected
    ? applicantsDemo.workers.find((worker) => worker.id === selected.application.workerId) || state.allWorkerProfiles.find((worker) => worker.id === selected.application.workerId)
    : null

  return <section className="provider-page mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="font-display text-3xl font-semibold tracking-[-0.035em] text-[#261C14]">Applicants</h1><p className="mt-1 text-sm text-[#766B61]">Review candidates and move them through your hiring process.</p></div>
      <div className="flex gap-2"><button onClick={() => navigate("my-jobs")} className="rounded-lg border border-[#E8E2D5] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#553421] hover:bg-[#FAF8F5]">My Jobs</button><button onClick={() => navigate("create-job")} className="rounded-lg bg-[#164E38] px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-[#103B2C]">+ Post a job</button></div>
    </header>

    <div className="mt-6 flex gap-1 overflow-x-auto border-b border-[#E8E2D5]" role="tablist" aria-label="Applicant stages">
      {statusFilters.map((filter) => <button key={filter.key} type="button" role="tab" aria-selected={statusFilter === filter.key} onClick={() => setStatusFilter(filter.key)} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${statusFilter === filter.key ? "border-[#286B50] text-[#286B50]" : "border-transparent text-[#766B61] hover:text-[#261C14]"}`}><span>{filter.label}</span><span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${statusFilter === filter.key ? "bg-[#E7F5EA] text-[#286B50]" : "bg-[#F5F2EE] text-[#766B61]"}`}>{filterCount(filter.key)}</span></button>)}
    </div>

    <div className="mt-5 grid gap-4 xl:h-[min(760px,calc(100vh-250px))] xl:min-h-[560px] xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.8fr)]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8E2D5] bg-white xl:h-full">
        <div className="space-y-3 border-b border-[#F0EBE6] p-4">
          <div className="relative"><SearchInOutAnimation/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by name, skill or job" className="h-10 w-full rounded-lg border border-[#E8E2D5] bg-white pl-12 pr-3 text-sm outline-none focus:border-[#286B50]"/></div>
          <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="h-10 w-full rounded-lg border border-[#E8E2D5] bg-white px-3 text-sm text-[#51483F] outline-none focus:border-[#286B50]"><option value="all">All job postings</option>{[...new Map(rows.map(({ job }) => [job.id, job])).values()].map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select>
          <label className="flex items-center gap-2 px-1 text-xs text-[#766B61]"><input type="checkbox" className="accent-[#286B50]" checked={visibleRows.length > 0 && visibleRows.every((row) => row.application.id === selected?.application.id)} readOnly/>Showing {visibleRows.length} of {rows.length} applicants</label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-[#F0EBE6]">
          {visibleRows.map(({ application, job, demo }) => {
            const active = selected?.application.id === application.id
            const title = applicantsDemo.workers.find((worker) => worker.id === application.workerId)?.professionalTitle || state.allWorkerProfiles.find((worker) => worker.id === application.workerId)?.professionalTitle
            return <button key={application.id} type="button" onClick={() => setSelectedId(application.id)} className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${active ? "bg-[#F9F1DC]" : "hover:bg-[#FAF8F5]"}`}>
              {application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-11 w-11 shrink-0 rounded-full bg-[#F5F2EE] object-cover"/> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E9F0EA] text-sm font-semibold text-[#286B50]">{application.workerName.trim().charAt(0).toUpperCase()}</span>}
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-[#261C14]">{application.workerName}</strong></span><span className="mt-0.5 block truncate text-xs text-[#51483F]">{title || application.experienceLevel || "Applicant"}</span><span className="mt-1 block truncate text-[11px] text-[#766B61]">{job.title}</span><span className="mt-1 block truncate text-[11px] text-[#92877E]">{application.workerLocation || job.district} · {formatNepalDate(application.appliedDate, { month: "short", day: "numeric" })}</span></span>
            </button>
          })}
          {visibleRows.length === 0 && <div className="p-8 text-center"><p className="text-sm font-semibold text-[#261C14]">No matching applicants</p><p className="mt-1 text-xs text-[#766B61]">Change the search or filters to see candidates.</p><button onClick={() => { setSearch(""); setStatusFilter("all"); setJobFilter("all") }} className="mt-3 text-xs font-semibold text-[#70472F] hover:underline">Clear filters</button></div>}
        </div>
      </aside>

      <main className="min-w-0 overflow-hidden rounded-xl border border-[#E8E2D5] bg-white xl:h-full xl:overflow-y-auto xl:overscroll-contain">
        {selected ? <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EBE6] px-5 py-4">
            <div className="flex items-center gap-2"><span className="text-[#92877E]"><Icon kind="message"/></span></div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={messageOpening === selected.application.id} onClick={() => void messageApplicant(selected)} className="rounded-md border border-[#E8E2D5] bg-[#261C14] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#553421] disabled:opacity-50">{messageOpening === selected.application.id ? "Opening…" : "Message"}</button>
              <select value="" disabled={shortlistBusy === selected.application.id} onChange={(event) => { const action = event.target.value; if (action === "shortlisted") { void setShortlisted(selected, true); return } const status: ApplicationStatus | null = action === "hired" ? "accepted" : action === "rejected" ? "rejected" : action === "withdrawn" ? "withdrawn" : action === "completed" ? "completed" : null; if (!status) return; if (status === "accepted" || status === "rejected") setPendingChange({ application: selected.application, job: selected.job, status, demo: selected.demo }); else if (selected.demo) updateDemo(selected.application.id, { status }); else void updateApplicationStatus(selected.application.id, status) }} className="min-h-8 rounded-md bg-[#286B50] px-2.5 text-[11px] font-semibold text-white outline-none disabled:opacity-60"><option value="" disabled>Move to…</option><option value="hired">Move to Hired</option><option value="shortlisted">Move to Shortlisted</option><option value="rejected">Move to Not selected</option><option value="withdrawn">Move to Withdrawn</option><option value="completed">Mark completed</option></select>
            </div>
          </div>
          <div className="border-b border-[#F0EBE6] px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-center gap-4">
              {selected.application.workerPhoto ? <img src={selected.application.workerPhoto} alt="" className="h-16 w-16 rounded-full bg-[#F5F2EE] object-cover"/> : <span className="grid h-16 w-16 place-items-center rounded-full bg-[#E9F0EA] text-xl font-semibold text-[#286B50]">{selected.application.workerName.charAt(0).toUpperCase()}</span>}
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold tracking-tight text-[#261C14]">{selected.application.workerName}</h2>{(selected.application.workerVerified || selectedWorker?.verified) && <span className="rounded-full bg-[#E7F5EA] px-2.5 py-1 text-[10px] font-semibold text-[#286B50]">Verified worker</span>}</div><p className="mt-1 text-sm text-[#51483F]">{selectedWorker?.professionalTitle || selected.application.experienceLevel || "Worker applicant"}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-[#766B61]"><Icon kind="pin"/>{selected.application.workerLocation || "Location not provided"}</p></div>
              <ApplicationStatusBadge status={selected.application.status}/>
            </div>
            <div className="mt-5 rounded-lg bg-[#FAF8F5] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#92877E]">Applied for</p><p className="mt-1 text-sm font-semibold text-[#261C14]">{selected.job.title}</p><p className="mt-1 text-xs text-[#766B61]">{selected.job.category.replace(/-/g, " ")} · {selected.job.district} · NPR {selected.application.offeredAmount?.toLocaleString() || selected.job.payment.toLocaleString()}</p></div>
            <div className="mt-5 flex flex-wrap gap-2">{selected.application.workerSkills.map((skill) => <span key={skill} className="rounded-full border border-[#E8E2D5] bg-white px-3 py-1.5 text-xs font-medium text-[#65564A]">{skill}</span>)}{!selected.application.workerSkills.length && <span className="text-sm text-[#92877E]">No skills listed</span>}</div>
          </div>
          <div className="px-5 py-5 sm:px-7">
            <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3"><h3 className="text-sm font-semibold text-[#261C14]">Application timeline</h3><button type="button" className="text-xs font-semibold text-[#286B50]">Timeline</button></div>
            <div className="mt-5 space-y-5">
              <article className="flex gap-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E9F0EA] text-[#286B50]"><Icon kind="person"/></span><div><p className="text-sm text-[#261C14]"><strong>{selected.application.workerName}</strong> applied to <strong>{selected.job.title}</strong></p><p className="mt-1 text-xs text-[#92877E]">{formatNepalDate(selected.application.appliedDate, { month: "long", day: "numeric", year: "numeric" })}</p>{selected.application.coverNote && <p className="mt-3 rounded-r-lg border-l-2 border-[#C5A05A] bg-[#FCFBF9] px-4 py-3 text-sm leading-6 text-[#51483F]">{selected.application.coverNote}</p>}</div></article>
              {selected.application.providerNote && <article className="ml-4 flex gap-3 border-l border-[#E8E2D5] pl-4"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F7F1EB] text-[#70472F]"><Icon kind="check"/></span><div><p className="text-sm text-[#261C14]"><strong>Provider note</strong> added</p><p className="mt-2 text-sm leading-6 text-[#51483F]">{selected.application.providerNote}</p></div></article>}
              <div className="ml-4 border-l border-[#E8E2D5] pl-4"><p className="text-xs text-[#92877E]">Current status: <span className="font-semibold capitalize text-[#51483F]">{selected.application.status}</span>{selected.application.shortlisted ? " · Shortlisted" : ""}</p></div>
            </div>
          </div>
          <section className="border-t border-[#F0EBE6] bg-[#FCFBF9] px-5 py-5 sm:px-7"><h3 className="text-sm font-semibold text-[#261C14]">Candidate profile</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-[#E8E2D5] bg-white p-3"><p className="text-[11px] text-[#92877E]">Experience</p><p className="mt-1 text-sm font-medium text-[#51483F]">{selected.application.experienceLevel || "Not provided"}</p></div><div className="rounded-lg border border-[#E8E2D5] bg-white p-3"><p className="text-[11px] text-[#92877E]">Previous jobs</p><p className="mt-1 text-sm font-medium text-[#51483F]">{selected.application.workerTotalJobs || selectedWorker?.totalJobs || 0}</p></div><div className="rounded-lg border border-[#E8E2D5] bg-white p-3"><p className="text-[11px] text-[#92877E]">Rating</p><p className="mt-1 text-sm font-medium text-[#51483F]">{selected.application.workerRating || selectedWorker?.rating || "No rating yet"}</p></div><div className="rounded-lg border border-[#E8E2D5] bg-white p-3"><p className="text-[11px] text-[#92877E]">Availability</p><p className="mt-1 text-sm font-medium capitalize text-[#51483F]">{selectedWorker?.availability || "Check with worker"}</p></div></div></section>
        </> : <div className="grid min-h-[600px] place-content-center px-8 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#F7F1EB] text-[#70472F]"><Icon kind="briefcase"/></span><h2 className="mt-4 text-lg font-semibold text-[#261C14]">No matching applicants</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#766B61]">Try another stage or search term to find a candidate.</p></div>}
      </main>
    </div>
    {pendingChange && <ConfirmDialog title={pendingChange.status === "accepted" ? "Accept this applicant?" : "Reject this application?"} message={pendingChange.status === "accepted" ? `Send ${pendingChange.application.workerName} a booking request for “${pendingChange.job.title}”.` : `${pendingChange.application.workerName} will be marked as not selected for “${pendingChange.job.title}”.`} confirmLabel={pendingChange.status === "accepted" ? "Send booking request" : "Reject application"} danger={pendingChange.status === "rejected"} onConfirm={() => { if (pendingChange.demo) updateDemo(pendingChange.application.id, { status: pendingChange.status }); else void updateApplicationStatus(pendingChange.application.id, pendingChange.status); setPendingChange(null) }} onCancel={() => setPendingChange(null)} />}
    {actionError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}
  </section>
}
