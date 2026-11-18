import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import type { Report } from "../../types"
import { apiFileRequest, apiRequest } from "../../services/backendApi"

type AdminTab = "overview" | "users" | "providers" | "identity" | "jobs" | "hiring" | "reports" | "categories" | "announcements" | "ai-monitor" | "staff" | "security"

const adminLocalKey = "shram-admin-workspace-v1"
const initialCategories = ["qualified", "skill-based", "beginner-friendly"]
const categoryLabels: Record<string, string> = { qualified: "Qualified / Professional", "skill-based": "Skill Based", "beginner-friendly": "Beginner Friendly" }
const staffRoles = ["Super Admin", "Verification Officer", "Moderator", "Support Staff", "Analyst"]
type AdminLocalData = { categories: string[]; skills: string[]; staff: Array<{ name: string; email: string; role: string }>; announcements: string[]; audit: string[]; reportAssignments: Record<string, string>; securitySettings: { manualVerification: boolean; mfaPolicy: boolean; retentionDays: number } }
type AdminMetrics = { totalWorkers: number; totalProviders: number; activeJobListings: number; pendingKycRequests: number; openComplaints: number; totalApplications: number; successfulHiring: number }
function readAdminLocal(): AdminLocalData {
  try {
    const value = JSON.parse(localStorage.getItem(adminLocalKey) || "{}")
    return { categories: Array.isArray(value.categories) ? value.categories : initialCategories, skills: Array.isArray(value.skills) ? value.skills : ["Cooking", "Cleaning", "Driving", "Plumbing", "Electrical work", "Customer service"], staff: Array.isArray(value.staff) ? value.staff : [], announcements: Array.isArray(value.announcements) ? value.announcements : [], audit: Array.isArray(value.audit) ? value.audit : [], reportAssignments: value.reportAssignments && typeof value.reportAssignments === "object" ? value.reportAssignments : {}, securitySettings: value.securitySettings || { manualVerification: true, mfaPolicy: false, retentionDays: 365 } }
  } catch { return { categories: initialCategories, skills: ["Cooking", "Cleaning", "Driving", "Plumbing", "Electrical work", "Customer service"], staff: [], announcements: [], audit: [], reportAssignments: {}, securitySettings: { manualVerification: true, mfaPolicy: false, retentionDays: 365 } } }
}

const reportStatusLabel: Record<Report["status"], string> = {
  submitted: "New",
  reviewing: "In review",
  resolved: "Resolved",
  dismissed: "Dismissed",
}

export default function AdminDashboard() {
  const {
    state,
    logout,
    reviewKyc,
    updateReport,
    moderateJob,
    verifyProvider,
    reviewProviderVerification,
    updateUserStatus,
  } = useApp()
  const [tab, setTab] = useState<AdminTab>("overview")
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({})
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({})
  const [providerNotes, setProviderNotes] = useState<Record<string, string>>({})
  const [userSearch, setUserSearch] = useState("")
  const [jobSearch, setJobSearch] = useState("")
  const [providerSearch, setProviderSearch] = useState("")
  const [localData, setLocalData] = useState<AdminLocalData>(readAdminLocal)
  const [categoryDraft, setCategoryDraft] = useState("")
  const [skillDraft, setSkillDraft] = useState("")
  const [staffName, setStaffName] = useState("")
  const [staffEmail, setStaffEmail] = useState("")
  const [staffRole, setStaffRole] = useState(staffRoles[1])
  const [announcement, setAnnouncement] = useState("")
  const [announcementAudience, setAnnouncementAudience] = useState<"all" | "worker" | "provider">("all")
  const [announcementNotice, setAnnouncementNotice] = useState("")
  const [apiDocumentUrls, setApiDocumentUrls] = useState<Record<string, string>>({})
  const [apiMetrics, setApiMetrics] = useState<AdminMetrics | null>(null)
  const { sendUserNotification } = useApp()

  const pendingKyc = useMemo(
    () => state.adminWorkerProfiles.filter((profile) => profile.kycStatus === "pending"),
    [state.adminWorkerProfiles],
  )
  const openReports = state.reports.filter(
    (report) => report.status === "submitted" || report.status === "reviewing",
  )
  const reportedJobIds = new Set(state.reports.map((report) => report.jobId))

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true") return
    let active = true
    void apiRequest<AdminMetrics>("/api/admin/dashboard")
      .then((metrics) => { if (active) setApiMetrics(metrics) })
      .catch(() => { if (active) setApiMetrics(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true") return
    let active = true
    const urls: Record<string, string> = {}
    void Promise.all(pendingKyc.map(async (worker) => {
      if (!worker.kycRequestId || !worker.kycDocumentId) return
      try {
        const blob = await apiFileRequest(`/api/admin/verifications/${worker.kycRequestId}/documents/${worker.kycDocumentId}`)
        if (!active) return
        const url = URL.createObjectURL(blob)
        urls[worker.id] = url
      } catch {
        // Keep the review controls available if a protected document cannot load.
      }
    })).then(() => { if (active) setApiDocumentUrls(urls) })
    return () => {
      active = false
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [pendingKyc])

  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: "overview", label: "A · Dashboard" },
    { id: "users", label: "B · Workers", count: apiMetrics?.totalWorkers ?? state.adminUsers.filter((user) => user.role === "worker").length },
    { id: "providers", label: "C · Providers" },
    { id: "identity", label: "D · KYC review", count: pendingKyc.length },
    { id: "jobs", label: "E · Job moderation" },
    { id: "hiring", label: "F · Hiring monitor" },
    { id: "reports", label: "G · Reports", count: openReports.length },
    { id: "categories", label: "H · Categories" },
    { id: "announcements", label: "I · Announcements" },
    { id: "ai-monitor", label: "J · AI monitor" },
    { id: "staff", label: "K · Staff" },
    { id: "security", label: "L · Audit & settings" },
  ]

  const saveAdminLocal = (next: AdminLocalData) => {
    setLocalData(next)
    try { localStorage.setItem(adminLocalKey, JSON.stringify(next)) } catch { setAnnouncementNotice("Browser storage is unavailable. Admin prototype data may not persist.") }
  }
  const audit = (description: string) => { const latest = readAdminLocal(); saveAdminLocal({ ...latest, audit: [`${new Date().toLocaleString()} · ${description}`, ...latest.audit].slice(0, 100) }) }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7 flex flex-col gap-4 rounded-3xl bg-[#282522] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Shram Bazaar · Admin</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Marketplace operations</h1>
          <p className="mt-2 text-sm text-white/70">Review worker identity submissions, respond to safety reports, and manage listings.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1.5 text-xs font-medium text-amber-100">{import.meta.env.VITE_DEMO_MODE === "true" ? "Local prototype admin" : "Authenticated administrator"}</span>
          <button type="button" onClick={logout} className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Sign out</button>
        </div>
      </header>

      <nav aria-label="Admin sections" className="mb-6 flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
        {tabs.map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${tab === item.id ? "bg-primary text-white" : "text-stone-600 hover:bg-stone-100"}`}>
            {item.label}{item.count ? <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{item.count}</span> : null}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Workers" value={apiMetrics?.totalWorkers ?? state.adminWorkerProfiles.length} detail={apiMetrics ? "Registered worker accounts" : "Worker profiles available here"} />
            <Metric label="Providers" value={apiMetrics?.totalProviders ?? state.allProviderProfiles.length} detail={apiMetrics ? "Registered provider accounts" : "Provider profiles available here"} />
            <Metric label="Active listings" value={apiMetrics?.activeJobListings ?? state.jobs.filter((job) => job.status === "active").length} detail={apiMetrics ? "Open marketplace listings" : "Open job posts"} />
            <Metric label="Needs attention" value={apiMetrics ? apiMetrics.pendingKycRequests + apiMetrics.openComplaints : pendingKyc.length + openReports.length} detail={apiMetrics ? `${apiMetrics.pendingKycRequests} identity reviews · ${apiMetrics.openComplaints} reports` : `${pendingKyc.length} identity reviews · ${openReports.length} reports`} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <QueueCard title="Identity reviews" count={pendingKyc.length} action={() => setTab("identity")} empty="No identity documents are waiting for review." />
            <QueueCard title="Safety reports" count={openReports.length} action={() => setTab("reports")} empty="No new or in-review safety reports." />
          </div>
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Jobs by category</h2>{localData.categories.map((category) => { const count = state.jobs.filter((job) => job.category === category).length; const width = state.jobs.length ? Math.max(4, count / state.jobs.length * 100) : 4; return <div key={category} className="mt-4"><div className="flex justify-between text-sm"><span className="text-stone-600">{categoryLabels[category] || category}</span><span className="font-semibold text-stone-800">{count}</span></div><div className="mt-1 h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} /></div></div> })}</article>
            <article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Hiring funnel</h2>{(["pending", "shortlisted", "accepted", "rejected"] as const).map((status) => <div key={status} className="mt-3 flex items-center justify-between border-b border-stone-100 pb-2 text-sm"><span className="capitalize text-stone-600">{status}</span><strong className="text-stone-900">{state.applications.filter((application) => application.status === status).length}</strong></div>)}<p className="mt-3 text-xs text-stone-500">Local prototype totals; not a live production analytics feed.</p></article>
          </section>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{import.meta.env.VITE_DEMO_MODE === "true" ? "This is a local admin demonstration; its records and decisions are stored in this browser." : "KYC review and safety-report actions are connected to the backend. Staff roles, audit history, AI usage telemetry, announcements, and full marketplace moderation still need server endpoints."}</p>
        </section>
      )}

      {tab === "identity" && (
        <section className="space-y-4">
          <SectionHeading title="Worker identity review" description="Only the admin view receives identity document data. Review the document before changing a worker’s verification status." />
          {pendingKyc.length === 0 ? <EmptyState message="No identity documents are waiting for review." /> : pendingKyc.map((worker) => {
            const isPdf = worker.kycDocumentData?.startsWith("data:application/pdf")
            return (
              <article key={worker.id} className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-display text-xl font-bold text-stone-900">{worker.name}</h3><p className="mt-1 text-sm text-stone-500">{worker.email} · {worker.phone}</p></div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Submitted {worker.kycSubmittedDate || "recently"}</span>
                  </div>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Data label="Document type" value={worker.kycDocumentType?.replace(/-/g, " ") || "Not available"} />
                    <Data label="Document number" value={worker.kycDocumentNumber ? `••••${worker.kycDocumentNumber.slice(-4)}` : "Not available"} />
                    <Data label="File" value={worker.kycDocumentFileName || "Not available"} />
                    <Data label="Phone / email" value={`${worker.phoneVerified ? "Phone verified" : "Phone unverified"} · ${worker.emailVerified ? "Email verified" : "Email unverified"}`} />
                  </dl>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => { reviewKyc(worker.id, "verified"); audit(`Approved worker identity ${worker.id}`) }} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Approve identity</button>
                    <div className="flex min-w-0 flex-1 gap-2">
                      <input value={rejectionNotes[worker.id] || ""} onChange={(event) => setRejectionNotes((current) => ({ ...current, [worker.id]: event.target.value }))} placeholder="Reason to send to worker" className="input-style min-w-0" aria-label={`Reason for rejecting ${worker.name}`} />
                      <button type="button" onClick={() => { reviewKyc(worker.id, "rejected", rejectionNotes[worker.id] || "Please upload a clear, valid document."); audit(`Requested worker identity update ${worker.id}`) }} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">Request update</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="min-h-48 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Identity document</p>
                    {(worker.kycDocumentData || apiDocumentUrls[worker.id]) ? isPdf || (apiDocumentUrls[worker.id] && worker.kycDocumentFileName?.toLowerCase().endsWith(".pdf")) ? (
                      <a href={worker.kycDocumentData || apiDocumentUrls[worker.id]} target="_blank" rel="noreferrer" className="flex h-44 items-center justify-center rounded-lg bg-white text-sm font-semibold text-primary-ink underline">Open submitted PDF ↗</a>
                    ) : (
                      <img src={worker.kycDocumentData || apiDocumentUrls[worker.id]} alt={`Identity document submitted by ${worker.name}`} className="mx-auto max-h-64 rounded-lg object-contain" />
                    ) : <p className="flex h-44 items-center justify-center text-sm text-stone-500">No document preview available.</p>}
                  </div>
                  {worker.kycSelfieData && (
                    <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Optional identity selfie</p>
                      <img src={worker.kycSelfieData} alt={`Identity selfie submitted by ${worker.name}`} className="mx-auto max-h-52 rounded-lg object-contain" />
                    </div>
                  )}
                </div>
              </article>
            )
          })}
          <article className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="font-display text-lg font-bold text-stone-900">Recent verification decisions</h3>
            <p className="mt-1 text-sm text-stone-500">Latest status and reviewer note retained on each worker profile.</p>
            <div className="mt-4 space-y-2">
              {state.adminWorkerProfiles.filter((worker) => worker.kycStatus === "verified" || worker.kycStatus === "rejected").length ? state.adminWorkerProfiles.filter((worker) => worker.kycStatus === "verified" || worker.kycStatus === "rejected").map((worker) => <div key={worker.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-stone-50 p-3"><div><strong className="text-sm text-stone-900">{worker.name}</strong><p className="mt-1 text-xs text-stone-500">{worker.kycDocumentType?.replace(/-/g, " ") || "Identity document"} · {worker.kycDocumentFileName || "file unavailable"}</p>{worker.kycReviewNote && <p className="mt-1 text-xs text-red-700">Reviewer note: {worker.kycReviewNote}</p>}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${worker.kycStatus === "verified" ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-800"}`}>{worker.kycStatus === "verified" ? `Verified · ${worker.kycVerifiedDate || "date unavailable"}` : "Update requested"}</span></div>) : <p className="text-sm text-stone-500">No completed identity decisions yet.</p>}
            </div>
          </article>
        </section>
      )}

      {tab === "reports" && (
        <section className="space-y-4">
          <SectionHeading title="Safety reports" description="Track reports about inaccurate listings, unsafe work, and suspicious payment requests." />
          {state.reports.length === 0 ? <EmptyState message="No reports have been submitted." /> : [...state.reports].sort((a, b) => b.date.localeCompare(a.date)).map((report) => {
            const job = state.jobs.find((item) => item.id === report.jobId)
            return (
              <article key={report.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-stone-900">{job?.title || "Job listing removed"}</h3><p className="mt-1 text-sm text-stone-600">{report.reason}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${report.status === "resolved" ? "bg-teal-50 text-teal-800" : report.status === "dismissed" ? "bg-stone-100 text-stone-600" : "bg-amber-50 text-amber-800"}`}>{reportStatusLabel[report.status]}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone-600">{report.details || "No additional details provided."}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input value={reportNotes[report.id] ?? report.adminNote ?? ""} onChange={(event) => setReportNotes((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="Internal action note" className="input-style min-w-0 flex-1" aria-label={`Admin note for report ${report.id}`} />
                  <select value={localData.reportAssignments[report.id] || ""} onChange={(event) => { const assignedTo = event.target.value; saveAdminLocal({ ...localData, reportAssignments: { ...localData.reportAssignments, [report.id]: assignedTo } }); audit(`Assigned report ${report.id} to ${assignedTo || "unassigned"}`) }} className="input-style sm:w-44" aria-label={`Moderator for report ${report.id}`}><option value="">Unassigned</option>{localData.staff.map((member) => <option key={member.email} value={member.email}>{member.name}</option>)}</select>
                  <button type="button" disabled={import.meta.env.VITE_DEMO_MODE !== "true"} onClick={() => sendUserNotification(report.reporterId, "More information requested", reportNotes[report.id] || "Please provide any supporting details for your report.", "message")} className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">{import.meta.env.VITE_DEMO_MODE === "true" ? "Request evidence" : "Evidence request unavailable"}</button>
                  <select value={report.status} onChange={(event) => { updateReport(report.id, event.target.value as Report["status"], reportNotes[report.id] ?? report.adminNote); audit(`Changed report ${report.id} to ${event.target.value}`) }} className="input-style sm:w-44" aria-label={`Status for report ${report.id}`}>
                    <option value="submitted">New</option><option value="reviewing">In review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
                  </select>
                  {job && <button type="button" onClick={() => moderateJob(job.id, job.status === "closed" ? "active" : "closed")} className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">{job.status === "closed" ? "Reopen listing" : "Close listing"}</button>}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === "jobs" && (
        <section className="space-y-4">
          <SectionHeading title="Job listings" description="Review marketplace listings and pause posts that need attention." />
          <label className="block text-sm font-semibold text-stone-700">Search listings<input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Job title, provider or location" className="input-style mt-1.5 w-full max-w-xl" /></label>
          {state.jobs.filter((job) => `${job.title} ${job.providerName} ${job.location} ${job.district}`.toLowerCase().includes(jobSearch.trim().toLowerCase())).length === 0 ? <EmptyState message="No local job listings match this search." /> : state.jobs.filter((job) => `${job.title} ${job.providerName} ${job.location} ${job.district}`.toLowerCase().includes(jobSearch.trim().toLowerCase())).map((job) => (
            <article key={job.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="font-semibold text-stone-900">{job.title}</h3><p className="mt-1 text-sm text-stone-500">{job.providerName} · {job.location} · {job.district} · {job.applicantCount} applicants</p>{reportedJobIds.has(job.id) && <p className="mt-1 text-xs font-semibold text-amber-800">Has a safety report</p>}</div>
              <select value={job.status} onChange={(event) => { moderateJob(job.id, event.target.value as typeof job.status); audit(`Changed listing status for ${job.title} to ${event.target.value}`) }} className="input-style sm:w-44" aria-label={`Listing status for ${job.title}`}><option value="active">Active</option><option value="closed">Closed / paused</option><option value="filled">Filled</option><option value="draft">Draft / removed</option></select>
            </article>
          ))}
        </section>
      )}

      {tab === "providers" && (
        <section className="space-y-4">
          <SectionHeading title="Provider management" description="Review provider profiles, verification submissions, and marketplace activity." />
          <label className="block text-sm font-semibold text-stone-700">Search providers<input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder="Organisation, contact or district" className="input-style mt-1.5 w-full max-w-xl" /></label>
          {state.allProviderProfiles.filter((provider) => `${provider.orgName} ${provider.contactName} ${provider.email} ${provider.district}`.toLowerCase().includes(providerSearch.trim().toLowerCase())).length === 0 ? <EmptyState message="No providers match this search." /> : state.allProviderProfiles.filter((provider) => `${provider.orgName} ${provider.contactName} ${provider.email} ${provider.district}`.toLowerCase().includes(providerSearch.trim().toLowerCase())).map((provider) => (
            <article key={provider.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">{provider.logo && <img src={provider.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />}<div><h3 className="font-semibold text-stone-900">{provider.orgName}</h3><p className="mt-1 text-sm text-stone-500">{provider.contactName} · {provider.email} · {provider.providerType || "business"} · PAN {provider.pan || "not provided"}</p><p className="mt-1 text-xs text-stone-500">{provider.location}, {provider.district} · {provider.industry}</p><p className="mt-1 text-xs font-semibold text-stone-600">{provider.verificationStatus || (provider.verified ? "verified" : "not submitted")}</p></div></div>
                {provider.verificationStatus === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { reviewProviderVerification(provider.id, true); audit(`Approved provider verification ${provider.orgName}`) }} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Approve provider</button>
                    <button type="button" onClick={() => { reviewProviderVerification(provider.id, false, providerNotes[provider.id] || "Please upload a clear identity or organisation verification document."); audit(`Requested provider verification update ${provider.orgName}`) }} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50">Request update</button>
                  </div>
                )}
                {provider.verified && <button type="button" onClick={() => { verifyProvider(provider.id, false); audit(`Revoked provider badge ${provider.orgName}`) }} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Revoke badge</button>}
              </div>
              {provider.verificationStatus === "pending" && <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                <label className="text-sm font-semibold text-stone-700">Review note for provider<input value={providerNotes[provider.id] || ""} onChange={(event) => setProviderNotes((current) => ({ ...current, [provider.id]: event.target.value }))} placeholder="Explain what needs correction" className="input-style mt-2 w-full" /></label>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Submitted document</p>{provider.verificationDocumentData?.startsWith("data:application/pdf") ? <a href={provider.verificationDocumentData} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary-ink underline">Open {provider.verificationDocumentName || "PDF"}</a> : provider.verificationDocumentData ? <img src={provider.verificationDocumentData} alt={`Verification document submitted by ${provider.orgName}`} className="max-h-56 rounded-lg object-contain" /> : <p className="text-sm text-stone-500">No document attached.</p>}</div>
              </div>}
            </article>
          ))}
        </section>
      )}

      {tab === "users" && (
        <section className="space-y-4">
          <SectionHeading title="Worker management" description="Search registered workers, inspect their public profile and KYC status, and suspend or restore accounts." />
          <label className="block text-sm font-semibold text-stone-700">Search workers<input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Name or email" className="input-style mt-1.5 w-full max-w-xl" /></label>
          {state.adminUsers.filter((user) => user.role === "worker" && `${user.name} ${user.email}`.toLowerCase().includes(userSearch.trim().toLowerCase())).map((user) => {
            const profile = user.role === "worker"
              ? state.adminWorkerProfiles.find((item) => item.id === user.profileId)
              : state.allProviderProfiles.find((item) => item.id === user.profileId)
            const suspended = user.accountStatus === "suspended"
            return (
              <article key={user.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900">{user.name}</h3>
                  <p className="mt-1 text-sm text-stone-500">{user.email} · <span className="capitalize">{user.role}</span></p>
                  {profile && "skills" in profile && <p className="mt-1 text-xs text-stone-500">{profile.location}, {profile.district} · {profile.skills.join(", ") || "No skills listed"}</p>}
                  {profile && "kycStatus" in profile && <p className="mt-1 text-xs text-stone-500">KYC: {profile.kycStatus || "not submitted"} · {profile.totalJobs} completed jobs · {profile.rating ? `${profile.rating} ★` : "No rating"}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${suspended ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"}`}>{suspended ? "Suspended" : "Active"}</span>
                  <button type="button" onClick={() => { updateUserStatus(user.id, suspended ? "active" : "suspended"); audit(`${suspended ? "Restored" : "Suspended"} worker account ${user.email}`) }} className={`rounded-xl px-3 py-2 text-sm font-semibold ${suspended ? "bg-primary text-white hover:bg-primary-dark" : "border border-stone-200 text-stone-700 hover:bg-stone-50"}`}>{suspended ? "Restore access" : "Suspend access"}</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {tab === "hiring" && <section className="space-y-5">
        <SectionHeading title="Application and hiring monitor" description="Track application states, hiring progress and jobs with unusually high or low applicant activity." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Applications" value={state.applications.length} detail="All local applications" /><Metric label="Shortlisted" value={state.applications.filter((item) => item.status === "shortlisted").length} detail="Awaiting final decision" /><Metric label="Hires" value={state.applications.filter((item) => item.status === "accepted").length} detail="Accepted applications" /><Metric label="Hire conversion" value={state.applications.length ? Math.round(state.applications.filter((item) => item.status === "accepted").length / state.applications.length * 100) : 0} detail="Accepted / all applications (%)" /></div>
        <div className="space-y-3">{state.jobs.map((job) => { const apps = state.applications.filter((item) => item.jobId === job.id); const accepted = apps.filter((item) => item.status === "accepted").length; return <article key={job.id} className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-stone-900">{job.title}</h3><p className="mt-1 text-sm text-stone-500">{job.providerName} · {job.district}</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">{apps.length} applicants</span></div><div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">{(["pending", "shortlisted", "accepted", "rejected"] as const).map((status) => <div key={status} className="rounded-lg bg-stone-50 p-2"><span className="block capitalize text-stone-500">{status}</span><strong className="mt-1 block text-sm text-stone-900">{apps.filter((item) => item.status === status).length}</strong></div>)}</div><p className="mt-3 text-xs text-stone-500">{accepted > job.workersNeeded ? "Review: accepted applicants exceed requested worker count." : `${accepted} of ${job.workersNeeded} requested positions accepted.`}</p></article> })}{!state.jobs.length && <EmptyState message="Job and application activity will appear here." />}</div>
      </section>}

      {tab === "categories" && <section className="space-y-5">
        <SectionHeading title="Category and skills management" description="Maintain the prototype taxonomy list for consistent profile and job vocabulary." />
        <div className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-stone-900">Job categories</h3><form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = categoryDraft.trim(); if (value && !localData.categories.some((item) => item.toLowerCase() === value.toLowerCase())) { saveAdminLocal({ ...localData, categories: [...localData.categories, value] }); setCategoryDraft(""); audit(`Added job category ${value}`) } }}><input value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} placeholder="Add a category" className="input-style min-w-0 flex-1" /><button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Add</button></form><div className="mt-4 space-y-2">{localData.categories.map((item) => <div key={item} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"><span>{categoryLabels[item] || item}</span><button type="button" onClick={() => { saveAdminLocal({ ...localData, categories: localData.categories.filter((category) => category !== item) }); audit(`Removed category ${item}`) }} className="text-xs font-semibold text-red-700">Remove</button></div>)}</div></article><article className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold text-stone-900">Skills taxonomy</h3><form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = skillDraft.trim(); if (value && !localData.skills.some((item) => item.toLowerCase() === value.toLowerCase())) { saveAdminLocal({ ...localData, skills: [...localData.skills, value] }); setSkillDraft(""); audit(`Added skill ${value}`) } }}><input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} placeholder="Add a suggested skill" className="input-style min-w-0 flex-1" /><button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Add</button></form><div className="mt-4 flex flex-wrap gap-2">{localData.skills.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900">{item}<button type="button" aria-label={`Remove ${item}`} onClick={() => saveAdminLocal({ ...localData, skills: localData.skills.filter((skill) => skill !== item) })}>×</button></span>)}</div></article></div>
        <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">These taxonomy changes are saved in this browser prototype. A production category API and migration of existing listings are not connected yet.</p>
      </section>}

      {tab === "announcements" && <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <article className="rounded-2xl border border-stone-200 bg-white p-5"><SectionHeading title="Platform announcements" description="Send an in-app notice to workers, providers or everyone." /><label className="block text-sm font-semibold text-stone-700">Audience<select value={announcementAudience} onChange={(event) => setAnnouncementAudience(event.target.value as typeof announcementAudience)} className="input-style mt-1.5 w-full"><option value="all">Workers and providers</option><option value="worker">Workers only</option><option value="provider">Providers only</option></select></label><label className="mt-4 block text-sm font-semibold text-stone-700">Announcement<textarea value={announcement} onChange={(event) => setAnnouncement(event.target.value)} rows={4} maxLength={1000} placeholder="Platform update or maintenance notice" className="input-style mt-1.5 w-full" /></label><button type="button" disabled={!announcement.trim() || import.meta.env.VITE_DEMO_MODE !== "true"} onClick={() => { const recipients = state.adminUsers.filter((user) => user.role !== "admin" && (announcementAudience === "all" || user.role === announcementAudience)); recipients.forEach((user) => sendUserNotification(user.id, "Shram Bazaar announcement", announcement.trim(), "announcement")); const next = { ...localData, announcements: [`${new Date().toLocaleString()} · ${announcementAudience} · ${announcement.trim()}`, ...localData.announcements].slice(0, 30) }; saveAdminLocal(next); audit(`Sent ${announcementAudience} announcement to ${recipients.length} accounts`); setAnnouncement(""); setAnnouncementNotice(`Announcement sent to ${recipients.length} accounts in this prototype.`) }} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{import.meta.env.VITE_DEMO_MODE === "true" ? "Send announcement" : "Announcements unavailable"}</button>{announcementNotice && <p role="status" className="mt-3 text-sm text-teal-800">{announcementNotice}</p>}<p className="mt-3 text-xs text-stone-500">Email, SMS, templates and delivery receipts are not connected.</p></article>
        <article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Recent announcements</h2>{localData.announcements.length ? <ul className="mt-3 space-y-2">{localData.announcements.map((item, index) => <li key={`${index}-${item}`} className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">{item}</li>)}</ul> : <p className="mt-3 text-sm text-stone-500">No announcements sent from this browser yet.</p>}</article>
      </section>}

      {tab === "ai-monitor" && <section className="space-y-5"><SectionHeading title="Shram AI monitoring" description="Monitor chat and voice service health without exposing conversation content." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Chat interactions" value={0} detail="Telemetry source not connected" /><Metric label="Voice sessions" value={0} detail="Telemetry source not connected" /><Metric label="Failed requests" value={0} detail="Telemetry source not connected" /><Metric label="Average latency" value={0} detail="Telemetry source not connected" /></div><article className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-amber-950">Usage telemetry is not connected</h2><p className="mt-2 text-sm leading-relaxed text-amber-900">The frontend can show these monitoring controls, but the AI service currently does not provide request counts, cost, errors, latency or abuse metrics to this admin view. No user conversations are displayed here.</p><ul className="mt-3 grid gap-2 text-sm text-amber-900 sm:grid-cols-2"><li>• API usage and estimated costs</li><li>• Failed requests and error logs</li><li>• Response latency and voice usage</li><li>• User feedback and abuse reports</li></ul></article></section>}

      {tab === "staff" && <section className="space-y-5"><SectionHeading title="Admin and staff management" description="Maintain a staff directory and assign least-privilege role labels for the prototype." /><article className="rounded-2xl border border-stone-200 bg-white p-5"><form className="grid gap-3 sm:grid-cols-[1fr_1fr_14rem_auto]" onSubmit={(event) => { event.preventDefault(); if (!staffName.trim() || !staffEmail.trim()) return; const nextStaff = [...localData.staff, { name: staffName.trim(), email: staffEmail.trim(), role: staffRole }]; saveAdminLocal({ ...localData, staff: nextStaff }); audit(`Added staff member ${staffEmail.trim()} as ${staffRole}`); setStaffName(""); setStaffEmail("") }}><input value={staffName} onChange={(event) => setStaffName(event.target.value)} placeholder="Staff name" className="input-style" /><input value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} type="email" placeholder="Staff email" className="input-style" /><select value={staffRole} onChange={(event) => setStaffRole(event.target.value)} className="input-style">{staffRoles.map((role) => <option key={role}>{role}</option>)}</select><button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Add</button></form><div className="mt-5 space-y-2">{localData.staff.map((member) => <div key={member.email} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3"><div><strong className="text-sm text-stone-900">{member.name}</strong><p className="text-xs text-stone-500">{member.email} · {member.role}</p></div><button type="button" onClick={() => { saveAdminLocal({ ...localData, staff: localData.staff.filter((item) => item.email !== member.email) }); audit(`Removed staff member ${member.email}`) }} className="text-xs font-semibold text-red-700">Remove</button></div>)}{!localData.staff.length && <p className="text-sm text-stone-500">No staff entries yet. Add role assignments to use the local report assignment selector.</p>}</div></article><p className="rounded-xl bg-red-50 p-4 text-sm leading-relaxed text-red-900">Role labels here do not create accounts or enforce permissions. Real staff access control must be implemented and checked by the backend before launch.</p></section>}

      {tab === "security" && <section className="space-y-5"><SectionHeading title="Security, audit logs and settings" description="Review actions performed in this browser and document production security requirements." /><div className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Prototype policy settings</h2><label className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-stone-50 p-3 text-sm"><span>Require manual verification review</span><input type="checkbox" checked={localData.securitySettings.manualVerification} onChange={(event) => { const next = { ...localData, securitySettings: { ...localData.securitySettings, manualVerification: event.target.checked } }; saveAdminLocal(next); audit(`Changed manual verification policy to ${event.target.checked}`) }} /></label><label className="mt-2 flex items-center justify-between gap-4 rounded-lg bg-stone-50 p-3 text-sm"><span>Require MFA for staff (policy record only)</span><input type="checkbox" checked={localData.securitySettings.mfaPolicy} onChange={(event) => { const next = { ...localData, securitySettings: { ...localData.securitySettings, mfaPolicy: event.target.checked } }; saveAdminLocal(next); audit(`Changed MFA policy record to ${event.target.checked}`) }} /></label><label className="mt-3 block text-sm font-semibold text-stone-700">Prototype audit retention<select value={localData.securitySettings.retentionDays} onChange={(event) => { const next = { ...localData, securitySettings: { ...localData.securitySettings, retentionDays: Number(event.target.value) } }; saveAdminLocal(next); audit(`Changed audit retention setting to ${event.target.value} days`) }} className="input-style mt-1 w-full"><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option></select></label><p className="mt-3 text-xs leading-relaxed text-red-800">These browser settings do not enforce authentication, MFA, session security, backups, retention or database health.</p></article><article className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Recent admin activity</h2>{localData.audit.length ? <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">{localData.audit.map((item, index) => <li key={`${index}-${item}`} className="rounded-lg bg-stone-50 p-3 text-xs text-stone-700">{item}</li>)}</ol> : <p className="mt-3 text-sm text-stone-500">No tracked admin actions in this browser yet.</p>}</article></div></section>}
    </main>
  )
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm font-medium text-stone-500">{label}</p><p className="mt-2 font-display text-3xl font-bold text-stone-900">{value}</p><p className="mt-1 text-xs text-stone-500">{detail}</p></article>
}

function QueueCard({ title, count, action, empty }: { title: string; count: number; action: () => void; empty: string }) {
  return <article className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold text-stone-900">{title}</h2><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{count} waiting</span></div><p className="mt-3 text-sm text-stone-500">{count ? "Review items awaiting an administrator decision." : empty}</p><button type="button" onClick={action} className="mt-4 text-sm font-semibold text-primary-ink hover:underline">Open queue →</button></article>
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <header className="mb-5"><h2 className="font-display text-2xl font-bold text-stone-900">{title}</h2><p className="mt-1 text-sm text-stone-500">{description}</p></header>
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">{message}</div>
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</dt><dd className="mt-1 text-sm font-medium capitalize text-stone-800">{value}</dd></div>
}
