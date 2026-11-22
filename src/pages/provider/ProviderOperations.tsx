import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { formatNepalDate, nepalDateString } from "../../utils/dates"
import { apiRequest } from "../../services/backendApi"
import type { WorkerServiceListing } from "../../types"
import TeamOperationsAnimation from "../../components/TeamOperationsAnimation"

type Tab = "discover" | "schedule" | "workers" | "payments" | "reviews" | "messages"
type WorkerStatusFilter = "all" | "pending" | "accepted" | "in-progress" | "completion-pending" | "completed" | "cancelled"
type PaymentRecord = { id: number; engagementId: number; workerName: string; workTitle: string; amount: number; method: string; paymentDate: string; transactionReference?: string; note?: string }
type LocalOps = { completed: string[]; recordedPayments: string[] }
function serviceAvailabilitySummary(service: WorkerServiceListing) {
  const today = nepalDateString()
  const slots = service.availability || []
  const next = slots
    .filter((slot) => slot.dayOfWeek || (slot.endDate || slot.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime))[0]
  if (!next) return "No upcoming dates posted"
  const dateLabel = next.dayOfWeek
    ? `Weekly ${next.dayOfWeek.toLowerCase()}`
    : formatNepalDate(next.startDate, { weekday: "short", month: "short", day: "numeric" })
  return `${dateLabel} · ${next.startTime.slice(0, 5)}–${next.endTime.slice(0, 5)}`
}
const storageKey = (providerId: string) => `shram-provider-ops-v1:${providerId}`
function readOps(providerId: string): LocalOps {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(providerId)) || "{}")
    return { completed: Array.isArray(parsed.completed) ? parsed.completed : [], recordedPayments: Array.isArray(parsed.recordedPayments) ? parsed.recordedPayments : [] }
  } catch { return { completed: [], recordedPayments: [] } }
}

const tabs: { id: Tab; label: string; summary: string }[] = [
  { id: "workers", label: "Hired workers", summary: "" },
  { id: "schedule", label: "Work schedule", summary: "See accepted workers and scheduled jobs by date and shift." },
  { id: "payments", label: "Payment records", summary: "Record the agreed amount and payment status. This does not transfer money." },
  { id: "reviews", label: "Reviews", summary: "Leave a worker review after recording the job as completed." },
  { id: "messages", label: "Messages", summary: "Send a message to a worker on an active application." },
]

export default function ProviderOperations() {
  const { state, navigate, sendUserNotification, reviewWorker, updateEngagementWork, requestWorkerForJob } = useApp()
  const provider = state.providerProfile
  const [tab, setTab] = useState<Tab>("workers")
  const [workerStatusFilter, setWorkerStatusFilter] = useState<WorkerStatusFilter>("all")
  const [search, setSearch] = useState("")
  const [district, setDistrict] = useState("all")
  const [serviceCategory, setServiceCategory] = useState("all")
  const [minimumRating, setMinimumRating] = useState("0")
  const [maximumRate, setMaximumRate] = useState("")
  const [jobId, setJobId] = useState("")
  const [targetId, setTargetId] = useState("")
  const [message, setMessage] = useState("")
  const [notice, setNotice] = useState("")
  const [requestingWorker, setRequestingWorker] = useState<string | null>(null)
  const [viewingWorker, setViewingWorker] = useState<(typeof state.allWorkerProfiles)[number] | null>(null)
  const [offeringWorker, setOfferingWorker] = useState<(typeof state.allWorkerProfiles)[number] | null>(null)
  const [ratings, setRatings] = useState<Record<string, { rating: number; review: string }>>({})
  const [ops, setOps] = useState<LocalOps>(() => readOps(provider?.id || "none"))
  const [apiWorkers, setApiWorkers] = useState<Array<(typeof state.allWorkerProfiles)[number]>>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { method: string; paymentDate: string; transactionReference: string; note: string }>>({})
  const jobs = useMemo(() => state.jobs.filter((job) => job.providerId === provider?.id), [state.jobs, provider?.id])
  const openJobs = useMemo(() => jobs.filter((job) => job.status === "active"), [jobs])
  const applications = useMemo(() => state.applications.filter((application) => jobs.some((job) => job.id === application.jobId)), [state.applications, jobs])
  const accepted = applications.filter((application) => application.status === "accepted" && application.engagementStatus !== "AWAITING_RESPONSE")
  const hiringRecords = applications.filter((application) => Boolean(application.engagementId))
  const statusOf = (application: (typeof hiringRecords)[number]): WorkerStatusFilter => {
    const status = application.engagementStatus || ""
    if (status === "AWAITING_RESPONSE") return "pending"
    if (status === "CANCELLED" || status === "DECLINED") return "cancelled"
    if (status === "COMPLETED") return "completed"
    if (status === "IN_PROGRESS" && (application.providerCompletionConfirmed || application.seekerCompletionConfirmed)) return "completion-pending"
    if (status === "IN_PROGRESS") return "in-progress"
    return "accepted"
  }
  const hiringStatusTabs: { id: WorkerStatusFilter; label: string }[] = [
    { id: "all", label: "All" }, { id: "pending", label: "Pending offers" }, { id: "accepted", label: "Accepted" },
    { id: "in-progress", label: "In progress" }, { id: "completion-pending", label: "Completion pending" },
    { id: "completed", label: "Completed" }, { id: "cancelled", label: "Cancelled" },
  ]
  const visibleHiringRecords = hiringRecords.filter((application) => workerStatusFilter === "all" || statusOf(application) === workerStatusFilter)
  const activeHiringCount = hiringRecords.filter((application) => ["pending", "accepted", "in-progress", "completion-pending"].includes(statusOf(application))).length
  const completedWorkEligible = (application: (typeof accepted)[number]) => {
    const job = jobs.find((item) => item.id === application.jobId)
    return !!job && (job.endDate || job.date) <= nepalDateString()
  }
  const contacted = applications.filter((application) => application.status === "accepted" || application.status === "pending")
  const selectedJob = openJobs.find((job) => job.id === jobId) || openJobs[0]
  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true" || tab !== "discover" || !provider) return
    let active = true
    void (async () => {
      try {
        const params = new URLSearchParams()
        const catalog = await apiRequest<Array<{ id: number; name: string }>>("/api/skills")
        const skillIds = selectedJob?.skillsRequired.flatMap((name) => {
          const skill = catalog.find((item) => item.name.toLowerCase() === name.toLowerCase())
          return skill ? [String(skill.id)] : []
        }) || []
        skillIds.forEach((id) => params.append("skillIds", id))
        const location = district !== "all" ? district : selectedJob?.district
        if (location) params.set("location", location)
        if (selectedJob?.date && selectedJob.startTime && selectedJob.endTime) {
          params.set("availabilityDate", selectedJob.date)
          params.set("startTime", selectedJob.startTime)
          params.set("endTime", selectedJob.endTime)
        }
        const result = await apiRequest<Array<{
          seekerProfileId: number; userId: number; fullName: string; profilePictureUrl?: string; bio?: string; address?: string;
          skills?: string[]; qualifications?: string[]; workExperiences?: string[]; totalExperienceYears?: number; verified: boolean;
          acceptingWork?: boolean; averageRating?: number; reviewCount: number; services?: Array<{ id: number; category: string; title: string; description: string; price?: number; pricingType: "PER_HOUR" | "PER_DAY" | "FIXED" | "STARTING_AT" | "NEGOTIABLE"; minimumDurationHours?: number; serviceArea?: string }>;
        }>>(`/api/provider/workers/search${params.size ? `?${params}` : ""}`)
        if (!active) return
        setApiWorkers(result.map((worker) => {
          const address = worker.address || ""
          const experience = worker.workExperiences || []
          return {
            id: String(worker.userId), name: worker.fullName, photo: worker.profilePictureUrl || "", phone: "", email: "",
            address, location: address, district: address.split(",").at(-1)?.trim() || "", skills: worker.skills || [],
            qualifications: (worker.qualifications || []).map((degree, index) => ({ id: `${worker.seekerProfileId}-q${index}`, degree, institution: "", year: 0, field: "" })),
            experience: experience.map((description, index) => ({ id: `${worker.seekerProfileId}-e${index}`, title: description, company: "", duration: `${worker.totalExperienceYears || 0} years`, description })),
            availableDates: [], availability: "flexible", bio: worker.bio || "", workHistory: [], rating: worker.averageRating || 0,
            totalJobs: worker.reviewCount || 0, verified: worker.verified, kycStatus: worker.verified ? "verified" : "not-verified",
            acceptingWork: worker.acceptingWork !== false,
            services: (worker.services || []).map((service) => ({ ...service, id: String(service.id), skills: [], active: true })),
          }
        }))
        setNotice("")
      } catch (error) {
        if (!active) return
        setApiWorkers([])
        setNotice(error instanceof Error ? error.message : "Could not load worker search results.")
      }
    })()
    return () => { active = false }
  }, [tab, provider?.id, selectedJob?.id, district])
  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true" || tab !== "payments" || !provider) return
    let active = true
    void apiRequest<PaymentRecord[]>("/api/provider/engagement-payments")
      .then((result) => { if (active) setPayments(result) })
      .catch((error: unknown) => { if (active) setNotice(error instanceof Error ? error.message : "Could not load payment records.") })
    return () => { active = false }
  }, [tab, provider?.id])
  useEffect(() => {
    if (!viewingWorker) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setViewingWorker(null) }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [viewingWorker])
  const workerPool = import.meta.env.VITE_DEMO_MODE === "true" ? state.allWorkerProfiles : apiWorkers
  const districts = [...new Set(workerPool.map((profile) => profile.district).filter(Boolean))].sort()
  const categories = [...new Set(workerPool.flatMap((profile) => profile.services?.map((service) => service.category) || []))].sort()
  const workers = useMemo(() => workerPool
    .filter((profile) => district === "all" || profile.district === district)
    .filter((profile) => !search.trim() || `${profile.name} ${profile.professionalTitle || ""} ${profile.skills.join(" ")} ${profile.location} ${profile.district} ${(profile.services || []).map((service) => `${service.title} ${service.category} ${service.skills.join(" ")}`).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((profile) => serviceCategory === "all" || profile.services?.some((service) => service.category === serviceCategory))
    .filter((profile) => profile.rating >= Number(minimumRating))
    .filter((profile) => !maximumRate || profile.services?.some((service) => service.price != null && service.price <= Number(maximumRate)))
    .map((profile) => {
      const skillMatches = selectedJob?.skillsRequired.filter((skill) => profile.skills.some((item) => item.toLowerCase() === skill.toLowerCase())).length || 0
      const jobWeekday = selectedJob ? new Date(`${selectedJob.date}T12:00:00.000Z`).getUTCDay() : -1
      const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      const dateAvailable = !!selectedJob && (
        profile.availableDates.includes(selectedJob.date)
        || profile.weeklyAvailability?.some((slot) => slot.day === weekdayNames[jobWeekday] && slot.startTime <= selectedJob.startTime && slot.endTime >= selectedJob.endTime)
      )
      const score = Math.min(100, (selectedJob?.skillsRequired.length ? Math.round(skillMatches / selectedJob.skillsRequired.length * 55) : 25) + (selectedJob && profile.district === selectedJob.district ? 20 : 0) + (dateAvailable ? 15 : 0) + (profile.experience.length ? 10 : 0))
      return { profile, score, skillMatches }
    })
    .sort((a, b) => b.score - a.score), [workerPool, district, search, selectedJob, serviceCategory, minimumRating, maximumRate])
  const saveOps = (next: LocalOps) => {
    setOps(next)
    try { localStorage.setItem(storageKey(provider?.id || "none"), JSON.stringify(next)) } catch { setNotice("Browser storage is unavailable; this update may not persist after refresh.") }
  }
  const notify = async (workerId: string, title: string, body: string) => {
    const error = await sendUserNotification(workerId, title, body)
    setNotice(error || (import.meta.env.VITE_DEMO_MODE === "true" ? "Notification sent in demo mode." : "Message sent to the worker."))
  }
  const completedHiringRecords = hiringRecords.filter((application) => statusOf(application) === "completed")
  const agreedAmount = (application: (typeof hiringRecords)[number]) => application.offeredAmount ?? jobs.find((job) => job.id === application.jobId)?.payment ?? 0
  const recordedPaymentTotal = import.meta.env.VITE_DEMO_MODE === "true"
    ? completedHiringRecords.filter((application) => ops.recordedPayments.includes(application.id)).reduce((total, application) => total + agreedAmount(application), 0)
    : payments.reduce((total, payment) => total + payment.amount, 0)
  const completedWorkValue = completedHiringRecords.reduce((total, application) => total + agreedAmount(application), 0)
  const recordPayment = async (application: (typeof hiringRecords)[number]) => {
    if (import.meta.env.VITE_DEMO_MODE === "true") {
      saveOps({ ...ops, recordedPayments: [...new Set([...ops.recordedPayments, application.id])] })
      setNotice("Payment marked as recorded in this demo browser.")
      return
    }
    const draft = paymentDrafts[application.id] || { method: "CASH", paymentDate: nepalDateString(), transactionReference: "", note: "" }
    try {
      const record = await apiRequest<PaymentRecord>(`/api/provider/engagements/${application.engagementId}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount: agreedAmount(application), ...draft, transactionReference: draft.transactionReference.trim() || null, note: draft.note.trim() || null }),
      })
      setPayments((existing) => [...existing, record])
      setNotice("Payment record saved.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this payment record.")
    }
  }
  const requestWorker = async (profile: (typeof state.allWorkerProfiles)[number]) => {
    if (!selectedJob) { setNotice("Post a task before requesting a worker."); return }
    if (selectedJob.budgetNegotiable || selectedJob.paymentMax != null) {
      navigate("applicant-management", selectedJob.id)
      return
    }
    setRequestingWorker(profile.id)
    setNotice("")
    const error = await requestWorkerForJob(selectedJob.id, profile)
    setRequestingWorker(null)
    setNotice(error || `${profile.name} has been asked to confirm “${selectedJob.title}”. Their calendar is booked only after they confirm.`)
  }

  if (!provider) return null
  const currentTab = tabs.find((item) => item.id === tab)!

  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="mb-6 flex items-center justify-between gap-4 border-b border-[#57351F] bg-[#70472F] px-5 py-5 text-white shadow-[0_1px_3px_rgba(20,45,31,0.08)] sm:px-7">
      <div className="min-w-0 py-1">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-[-0.035em] text-white sm:text-4xl">Team &amp; Operations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">Coordinate your team, track scheduled work, and keep payment and review records organized.</p>
      </div>
      <TeamOperationsAnimation />
    </header>
    <nav aria-label="Provider operation modules" className="mb-5 flex gap-1 overflow-x-auto border-b border-[#DCE5DE] bg-white px-2 pt-2">
      {tabs.map((item) => <button key={item.id} type="button" onClick={() => { setTab(item.id); setNotice("") }} aria-current={tab === item.id ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${tab === item.id ? "border-[#236B4B] text-[#164E38]" : "border-transparent text-[#657168] hover:text-[#164E38]"}`}>{item.label}</button>)}
    </nav>
    {currentTab.summary && <p className="mb-5 text-sm text-[#657168]">{currentTab.summary}</p>}
    {notice && <p role="status" className="mb-4 border border-[#CDE1D2] bg-[#EAF3ED] px-4 py-3 text-sm text-[#164E38]">{notice}</p>}

    {tab === "discover" && <section className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-stone-600">Search skills, name or location<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. cooking, Pokhara" className="input-style mt-1.5 w-full" /></label>
        <label className="text-xs font-semibold text-stone-600">District<select value={district} onChange={(event) => setDistrict(event.target.value)} className="input-style mt-1.5 w-full"><option value="all">All districts</option>{districts.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-600">Service category<select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} className="input-style mt-1.5 w-full"><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-600">Minimum rating<select value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)} className="input-style mt-1.5 w-full"><option value="0">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="5">5 stars</option></select></label>
        <label className="text-xs font-semibold text-stone-600">Maximum indicative rate (NPR)<input type="number" min="0" value={maximumRate} onChange={(event) => setMaximumRate(event.target.value)} placeholder="Any rate" className="input-style mt-1.5 w-full" /></label>
        <label className="text-xs font-semibold text-stone-600 sm:col-span-2 xl:col-span-1">Match against task<select value={selectedJob?.id || ""} onChange={(event) => setJobId(event.target.value)} className="input-style mt-1.5 w-full"><option value="">General profile match</option>{openJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
      </div>
      {workers.length ? workers.slice(0, 30).map(({ profile, score, skillMatches }) => <article key={profile.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-stone-900">{profile.name}</h2>{profile.verified && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">Verified</span>}<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${profile.acceptingWork === false ? "bg-stone-100 text-stone-600" : "bg-emerald-50 text-emerald-800"}`}>{profile.acceptingWork === false ? "Not accepting work" : "Accepting work"}</span><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">{score}% profile fit</span></div><p className="mt-1 text-sm text-stone-500">{profile.professionalTitle || "Worker"} · {profile.district} · {profile.rating ? `${profile.rating} ★` : "New profile"}</p><p className="mt-2 text-sm text-stone-700">{profile.skills.join(", ") || "No skills listed"}</p>{profile.services?.length ? <div className="mt-2 flex flex-wrap gap-2">{profile.services.slice(0, 3).map((service) => <span key={service.id} className="rounded-lg border border-[#E8E2D5] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#38291F]"><strong>{service.title}</strong> · {service.pricingType === "NEGOTIABLE" ? "Quote" : `NPR ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hr" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : "+"}`}{service.negotiable ? " · negotiable" : ""}{service.serviceArea ? ` · ${service.serviceArea}` : ""}<span className="mt-1 block text-[#766B61]">{serviceAvailabilitySummary(service)}</span></span>)}</div> : <p className="mt-1 text-xs text-stone-500">No active service listings yet.</p>}<p className="mt-1 text-xs text-stone-500">{skillMatches} required skills match · {profile.experience.length} experience entries · task availability is checked again when the worker confirms.</p></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={() => setViewingWorker(profile)} className="rounded-xl border border-[#E8E2D5] px-3 py-2.5 text-sm font-semibold text-[#70472F] hover:bg-[#FAF8F5]">View profile</button><button type="button" disabled={!selectedJob || (selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? false : profile.acceptingWork === false || requestingWorker === profile.id || state.applications.some((app) => app.jobId === selectedJob?.id && app.workerId === profile.id && ["pending", "accepted"].includes(app.status)))} title={profile.acceptingWork === false && !selectedJob?.budgetNegotiable && selectedJob?.paymentMax == null ? "This worker has paused new work." : !selectedJob ? "Post a task before requesting a worker." : selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? "Review worker offers and agree on a task price." : undefined} onClick={() => selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? void requestWorker(profile) : setOfferingWorker(profile)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{profile.acceptingWork === false && !selectedJob?.budgetNegotiable && selectedJob?.paymentMax == null ? "Not accepting" : selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? "Compare offers" : requestingWorker === profile.id ? "Sending…" : state.applications.some((app) => app.jobId === selectedJob?.id && app.workerId === profile.id && ["pending", "accepted"].includes(app.status)) ? "Request sent" : "Review offer"}</button></div>
      </article>) : <Empty message="No workers match those filters." />}
      <p className="text-xs text-stone-500">Profile fit is a transparent frontend score from job skills, location, shared availability and experience. It is not a hiring decision.</p>
    </section>}

    {tab === "schedule" && <section className="space-y-3">
      {accepted.length ? accepted.map((application) => { const job = jobs.find((item) => item.id === application.jobId)!; return <article key={application.id} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-[1fr_12rem_12rem] sm:items-center"><div><h2 className="font-semibold text-stone-900">{job.title}</h2><p className="mt-1 text-sm text-stone-600">{application.workerName} · {job.location}, {job.district}</p></div><p className="text-sm text-stone-700">{formatNepalDate(job.date, { month: "short", day: "numeric", year: "numeric" })}{job.endDate && job.endDate !== job.date ? ` – ${formatNepalDate(job.endDate, { month: "short", day: "numeric" })}` : ""}</p><p className="text-sm font-semibold text-stone-700">{job.startTime}–{job.endTime}</p></article> }) : <Empty message="Accepted workers and scheduled shifts will appear here." />}
      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Schedule dates and shifts come from your job listing. Edit the listing to change the schedule; this prototype does not send calendar invitations.</p>
    </section>}

    {tab === "workers" && <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-[#1A2420]">Hired Workers</h2><p className="mt-1 text-sm text-[#657168]">Manage hiring offers, ongoing work and completed assignments.</p></div><p className="text-sm font-semibold text-[#164E38]">{activeHiringCount} active record{activeHiringCount === 1 ? "" : "s"}</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Active hires", count: activeHiringCount, detail: "Offers and active work" }, { label: "Pending offers", count: hiringRecords.filter((item) => statusOf(item) === "pending").length, detail: "Waiting for worker response" }, { label: "In progress", count: hiringRecords.filter((item) => ["in-progress", "completion-pending"].includes(statusOf(item))).length, detail: "Assignments underway" }, { label: "Completed", count: hiringRecords.filter((item) => statusOf(item) === "completed").length, detail: "Both sides confirmed" }].map((metric) => <article key={metric.label} className="border border-[#DCE5DE] bg-white p-4"><p className="text-sm font-medium text-[#657168]">{metric.label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-[#164E38]">{metric.count}</p><p className="mt-1 text-xs text-[#7A857D]">{metric.detail}</p></article>)}
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#DCE5DE] bg-white px-2" role="tablist" aria-label="Filter hiring records">
        {hiringStatusTabs.map((item) => { const count = item.id === "all" ? hiringRecords.length : hiringRecords.filter((application) => statusOf(application) === item.id).length; return <button key={item.id} type="button" role="tab" aria-selected={workerStatusFilter === item.id} onClick={() => setWorkerStatusFilter(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${workerStatusFilter === item.id ? "border-[#236B4B] text-[#164E38]" : "border-transparent text-[#657168] hover:text-[#164E38]"}`}>{item.label}<span className="ml-1.5 text-xs tabular-nums text-[#7A857D]">{count}</span></button> })}
      </div>
      {visibleHiringRecords.length ? <div className="space-y-2">{visibleHiringRecords.map((application) => {
        const job = jobs.find((item) => item.id === application.jobId)
        if (!job) return null
        const status = statusOf(application)
        const isCompleted = status === "completed"
        const canConfirmCompletion = status === "in-progress" || status === "completion-pending"
        const pillClass = status === "pending" ? "bg-amber-50 text-amber-800" : status === "completed" ? "bg-[#EAF3ED] text-[#164E38]" : status === "cancelled" ? "bg-stone-100 text-stone-600" : "bg-blue-50 text-blue-800"
        const label = hiringStatusTabs.find((item) => item.id === status)?.label || status
        return <article key={application.id} className="grid gap-4 border border-[#DCE5DE] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
          <div className="flex min-w-0 items-start gap-3">{application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#EAF3ED] text-sm font-bold text-[#164E38]">{application.workerName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#1A2420]">{application.workerName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass}`}>{label}</span></div><p className="mt-1 text-sm font-medium text-[#34443A]">{job.title}</p><p className="mt-1 text-xs text-[#657168]">{job.location}, {job.district} · {formatNepalDate(job.date, { month: "short", day: "numeric", year: "numeric" })}{job.endDate && job.endDate !== job.date ? ` – ${formatNepalDate(job.endDate, { month: "short", day: "numeric" })}` : ""} · {job.startTime}–{job.endTime}</p><p className="mt-1 text-xs text-[#7A857D]">{application.offeredAmount != null ? `NPR ${application.offeredAmount.toLocaleString()} offered total` : `NPR ${job.payment.toLocaleString()} ${job.paymentType.replace("per-", "per ")}`} · {application.engagementStatus === "AWAITING_RESPONSE" ? "Waiting for worker to respond to the offer" : application.engagementStatus === "IN_PROGRESS" && (application.providerCompletionConfirmed || application.seekerCompletionConfirmed) ? "Completion confirmed by one side · awaiting the other" : application.engagementStatus === "COMPLETED" ? "Completion confirmed by both sides" : application.engagementStatus === "IN_PROGRESS" ? "Work is underway" : "Worker accepted this assignment"}</p></div></div>
          <div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" onClick={() => { setTargetId(application.workerId); setTab("messages") }} className="border border-[#C9D6CC] px-3 py-2 text-sm font-semibold text-[#164E38] hover:bg-[#F5F8F5]">Contact</button>
            {application.engagementStatus === "CONFIRMED" && <button type="button" onClick={() => updateEngagementWork(application.id, "start")} className="bg-[#164E38] px-3 py-2 text-sm font-semibold text-white hover:bg-[#236B4B]">Mark started</button>}
            {canConfirmCompletion && !application.providerCompletionConfirmed && <button type="button" disabled={!completedWorkEligible(application)} title={!completedWorkEligible(application) ? "This assignment can be confirmed after its scheduled end date." : undefined} onClick={() => updateEngagementWork(application.id, "confirm-completion")} className="bg-[#164E38] px-3 py-2 text-sm font-semibold text-white hover:bg-[#236B4B] disabled:cursor-not-allowed disabled:opacity-50">Confirm completion</button>}
            {application.engagementStatus === "IN_PROGRESS" && application.providerCompletionConfirmed && !application.seekerCompletionConfirmed && <span className="self-center text-xs font-medium text-[#657168]">Waiting for worker</span>}
            {isCompleted && <button type="button" onClick={() => setTab("payments")} className="border border-[#C9D6CC] px-3 py-2 text-sm font-semibold text-[#164E38] hover:bg-[#F5F8F5]">Record payment</button>}
          </div>
        </article>
      })}</div> : <Empty message={hiringRecords.length ? "No hiring records match this status." : "No workers hired yet. Find skilled workers and send your first hiring offer."} />}
      {hiringRecords.length === 0 && <button type="button" onClick={() => navigate("provider-hire")} className="bg-[#164E38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#236B4B]">Find Workers</button>}
    </section>}

    {tab === "payments" && <section className="space-y-5">
      <div className="border border-[#E7D9B7] bg-[#FFF9E9] p-4 text-sm leading-relaxed text-[#705A2E]">Payments are recorded manually. Shram Bazaar does not process payments through this feature.</div>
      <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Completed work value", value: completedWorkValue }, { label: "Total paid", value: recordedPaymentTotal }, { label: "Outstanding", value: Math.max(0, completedWorkValue - recordedPaymentTotal) }].map((metric) => <article key={metric.label} className="border border-[#DCE5DE] bg-white p-4"><p className="text-sm font-medium text-[#657168]">{metric.label}</p><p className="mt-2 text-xl font-bold tabular-nums text-[#164E38]">NPR {metric.value.toLocaleString()}</p></article>)}</div>
      {completedHiringRecords.length ? completedHiringRecords.map((application) => {
        const job = jobs.find((item) => item.id === application.jobId)
        if (!job) return null
        const savedPayment = payments.find((payment) => payment.engagementId === Number(application.engagementId))
        const demoRecorded = import.meta.env.VITE_DEMO_MODE === "true" && ops.recordedPayments.includes(application.id)
        const draft = paymentDrafts[application.id] || { method: "CASH", paymentDate: nepalDateString(), transactionReference: "", note: "" }
        return <article key={application.id} className="space-y-4 border border-[#DCE5DE] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#1A2420]">{application.workerName}</h2><p className="mt-1 text-sm text-[#657168]">{job.title} · Agreed amount: NPR {agreedAmount(application).toLocaleString()}</p><p className="mt-1 text-xs text-[#7A857D]">{savedPayment ? `Paid ${formatNepalDate(savedPayment.paymentDate, { month: "short", day: "numeric", year: "numeric" })} · ${savedPayment.method.replace(/_/g, " ")}` : demoRecorded ? "Marked paid in this demo browser" : "Completed · payment outstanding"}</p>{savedPayment?.transactionReference && <p className="mt-1 text-xs text-[#657168]">Reference: {savedPayment.transactionReference}</p>}</div>{(savedPayment || demoRecorded) && <span className="rounded-full bg-[#EAF3ED] px-3 py-1 text-xs font-semibold text-[#164E38]">Paid</span>}</div>
          {!savedPayment && !demoRecorded && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-[#657168]">Payment method<select value={draft.method} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, method: event.target.value } }))} className="input-style mt-1 w-full"><option value="CASH">Cash</option><option value="ESEWA">eSewa</option><option value="KHALTI">Khalti</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label>
            <label className="text-xs font-semibold text-[#657168]">Payment date<input type="date" max={nepalDateString()} value={draft.paymentDate} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, paymentDate: event.target.value } }))} className="input-style mt-1 w-full" /></label>
            <label className="text-xs font-semibold text-[#657168]">Transaction reference <span className="font-normal">(optional)</span><input maxLength={120} value={draft.transactionReference} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, transactionReference: event.target.value } }))} className="input-style mt-1 w-full" /></label>
            <label className="text-xs font-semibold text-[#657168]">Note <span className="font-normal">(optional)</span><input maxLength={1000} value={draft.note} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, note: event.target.value } }))} className="input-style mt-1 w-full" /></label>
            <div className="sm:col-span-2 lg:col-span-4"><button type="button" disabled={!draft.paymentDate} onClick={() => void recordPayment(application)} className="bg-[#164E38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#236B4B] disabled:opacity-50">Record payment · NPR {agreedAmount(application).toLocaleString()}</button></div>
          </div>}
        </article>
      }) : <Empty message="No payment records yet. Payments you record for completed work will appear here." />}
    </section>}

    {tab === "reviews" && <section className="space-y-3">
      {accepted.filter((application) => (import.meta.env.VITE_DEMO_MODE === "true" ? ops.completed.includes(application.id) && completedWorkEligible(application) : application.engagementStatus === "COMPLETED")).length ? accepted.filter((application) => (import.meta.env.VITE_DEMO_MODE === "true" ? ops.completed.includes(application.id) && completedWorkEligible(application) : application.engagementStatus === "COMPLETED")).map((application) => <article key={application.id} className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold text-stone-900">Review {application.workerName}</h2>{application.workerReviewDate ? <p className="mt-3 text-sm text-stone-600"><strong className="text-stone-800">Your review ({application.workerReviewRating}/5):</strong> {application.workerReview || "Review submitted"}</p> : <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><label className="text-xs font-semibold text-stone-600">Rating<select value={ratings[application.id]?.rating ?? 5} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { rating: Number(event.target.value), review: current[application.id]?.review || "" } }))} className="input-style mt-1 w-full">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-xs font-semibold text-stone-600">Review<textarea rows={2} maxLength={500} value={ratings[application.id]?.review || ""} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { rating: current[application.id]?.rating ?? 5, review: event.target.value } }))} placeholder="Share brief, fair feedback" className="input-style mt-1 w-full" /></label><button type="button" disabled={!ratings[application.id]?.review.trim()} onClick={() => { const draft = ratings[application.id] || { rating: 5, review: "" }; void reviewWorker(application.id, draft.rating, draft.review).then((error) => setNotice(error || "Review submitted to Shram Bazar.")) }} className="self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save review</button></div>}</article>) : <Empty message="After both parties confirm completion, leave a review here." />}
      <p className="text-xs text-stone-500">Workers can also review providers after scheduled work is complete from My Applications.</p>
    </section>}

    {tab === "messages" && <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="border border-[#DCE5DE] bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#236B4B]">Direct update</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1A2420]">Contact a worker</h2>
        <p className="mt-1 text-sm leading-6 text-[#657168]">Send a note about an application, interview, or work schedule.</p>
        {contacted.length ? <>
          <label className="mt-5 block text-sm font-semibold text-[#34443A]">Worker and application
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="input-style mt-1.5 w-full"><option value="">Choose a worker</option>{contacted.map((application) => <option key={application.id} value={application.workerId}>{application.workerName} · {application.jobTitle}</option>)}</select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-[#34443A]">Message
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={1000} placeholder="Write your message…" className="input-style mt-1.5 w-full resize-y leading-6" />
            <span className="mt-1 block text-right text-xs font-normal text-[#7A857D]">{message.length}/1000</span>
          </label>
          <button type="button" disabled={!targetId || !message.trim()} onClick={() => { void notify(targetId, "Message from provider", message.trim()); setMessage("") }} className="mt-4 min-h-11 bg-[#164E38] px-5 text-sm font-semibold text-white transition hover:bg-[#236B4B] disabled:cursor-not-allowed disabled:opacity-50">Send message</button>
        </> : <div className="mt-5 border border-dashed border-[#CCD8CE] bg-[#F7F9F7] px-4 py-6"><p className="text-sm font-semibold text-[#34443A]">No applicants to contact yet</p><p className="mt-1 text-sm leading-6 text-[#657168]">Workers from your applications will be available here.</p></div>}
      </div>
      <div className="flex min-h-64 flex-col border border-[#DCE5DE] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[#E7ECE8] pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#236B4B]">Notifications</p><h2 className="mt-1 text-lg font-bold text-[#1A2420]">Message updates</h2></div><span className="bg-[#EAF3ED] px-2.5 py-1 text-xs font-semibold text-[#164E38]">{contacted.length} {contacted.length === 1 ? "worker" : "workers"}</span></div>
        <div className="flex flex-1 flex-col justify-center py-5">
          <p className="text-sm font-semibold text-[#34443A]">{contacted.length ? "Stay in touch about active work" : "No conversations yet"}</p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#657168]">Updates are delivered through in-app notifications. Workers can reply from their application, and their replies appear in your notifications.</p>
        </div>
        <p className="border-t border-[#E7ECE8] pt-3 text-xs leading-5 text-[#7A857D]">Messages are linked to applications and delivered to the selected worker.</p>
      </div>
    </section>}
        {viewingWorker && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#38291F]/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingWorker(null) }}><section role="dialog" aria-modal="true" aria-labelledby="worker-preview-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{viewingWorker.photo ? <img src={viewingWorker.photo} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F7F1EB] text-lg font-bold text-[#70472F]">{viewingWorker.name.slice(0, 1).toUpperCase()}</span>}<div className="min-w-0"><h2 id="worker-preview-title" className="truncate text-xl font-bold text-[#38291F]">{viewingWorker.name}</h2><p className="mt-0.5 text-sm text-[#766B61]">{viewingWorker.professionalTitle || "Worker"} · {viewingWorker.district || viewingWorker.location}</p></div></div><button type="button" aria-label="Close worker profile" onClick={() => setViewingWorker(null)} className="rounded-md px-2 py-1 text-xl text-[#766B61] hover:bg-[#F2F5F1]">×</button></div><div className="mt-4 flex flex-wrap gap-2">{viewingWorker.verified && <span className="rounded-full bg-[#F7F1EB] px-2.5 py-1 text-xs font-semibold text-[#70472F]">Verified</span>}<span className="rounded-full bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#65564A]">{viewingWorker.rating ? `${viewingWorker.rating.toFixed(1)} ★ · ${viewingWorker.totalJobs} reviews` : "New profile · no reviews yet"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${viewingWorker.acceptingWork === false ? "bg-stone-100 text-stone-600" : "bg-[#F7F1EB] text-[#70472F]"}`}>{viewingWorker.acceptingWork === false ? "Paused new requests" : "Accepting work"}</span></div><p className="mt-4 text-sm leading-relaxed text-[#65564A]">{viewingWorker.bio || "This worker has not added an introduction yet."}</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#766B61]">Skills</h3><p className="mt-2 text-sm leading-relaxed text-[#38291F]">{viewingWorker.skills.join(" · ") || "No skills listed"}</p><h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-[#766B61]">Experience</h3>{viewingWorker.experience.length ? <ul className="mt-2 space-y-2">{viewingWorker.experience.slice(0, 4).map((item) => <li key={item.id} className="text-sm text-[#38291F]"><strong>{item.title}</strong><span className="block text-xs text-[#766B61]">{item.company}{item.duration ? ` · ${item.duration}` : ""}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#766B61]">No experience entries listed.</p>}</div><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#766B61]">Services and indicative rates</h3>{viewingWorker.services?.length ? <ul className="mt-2 space-y-2">{viewingWorker.services.map((service) => <li key={service.id} className="rounded-lg border border-[#E8E2D5] p-3"><p className="text-sm font-semibold text-[#38291F]">{service.title}</p><p className="mt-0.5 text-xs text-[#766B61]">{service.pricingType === "NEGOTIABLE" ? "Quote on request" : `NPR ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : " starting"}`}{service.negotiable ? " · negotiable" : ""}{service.serviceArea ? ` · ${service.serviceArea}` : ""}</p><p className="mt-1 text-xs font-medium text-[#70472F]">{serviceAvailabilitySummary(service)}</p><p className="mt-1 text-xs text-[#65564A]">{service.description}</p></li>)}</ul> : <p className="mt-2 text-sm text-[#766B61]">No active services listed.</p>}<p className="mt-4 text-xs leading-relaxed text-[#766B61]">{selectedJob ? "This worker was matched against the selected task. Availability is rechecked before booking." : "Choose a task to match workers against their published schedule. Confirmed work always uses the live calendar."}</p></div></div><div className="mt-5 flex justify-end border-t border-[#E8E2D5] pt-4"><button type="button" onClick={() => { setViewingWorker(null); selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? void requestWorker(viewingWorker) : setOfferingWorker(viewingWorker) }} disabled={!selectedJob || (viewingWorker.acceptingWork === false && !selectedJob?.budgetNegotiable && selectedJob?.paymentMax == null)} className="rounded-lg bg-[#70472F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? "Compare task offers" : viewingWorker.acceptingWork === false ? "Not accepting work" : "Review and send offer"}</button></div></section></div>}
        {offeringWorker && selectedJob && <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#14251B]/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOfferingWorker(null) }}><section role="dialog" aria-modal="true" aria-labelledby="worker-offer-title" className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-[#236B4B]">Review hiring offer</p><h2 id="worker-offer-title" className="mt-1 text-xl font-bold text-[#1A2420]">Send offer to {offeringWorker.name}</h2></div><button type="button" aria-label="Cancel offer" onClick={() => setOfferingWorker(null)} className="px-2 text-xl text-[#657168]">×</button></div><p className="mt-2 text-sm leading-relaxed text-[#657168]">Review the posted task details and agreed terms. The worker can accept or decline this offer from their account.</p><dl className="mt-5 divide-y divide-[#E7ECE8] border-y border-[#E7ECE8]">{[["Work title", selectedJob.title], ["Location", `${selectedJob.location}, ${selectedJob.district}`], ["Date", formatNepalDate(selectedJob.date, { month: "long", day: "numeric", year: "numeric" })], ["Schedule", `${selectedJob.startTime}–${selectedJob.endTime}`], ["Agreed payment", `NPR ${selectedJob.payment.toLocaleString()} ${selectedJob.paymentType.replace("per-", "per ")}`]].map(([label, value]) => <div key={label} className="grid grid-cols-[8rem_1fr] gap-3 py-3 text-sm"><dt className="font-medium text-[#657168]">{label}</dt><dd className="font-semibold text-[#1A2420]">{value}</dd></div>)}</dl><div className="mt-4 max-h-32 overflow-y-auto text-sm leading-relaxed text-[#657168]"><p className="font-semibold text-[#34443A]">Task description</p><p className="mt-1 whitespace-pre-wrap">{selectedJob.description || "No additional task description."}</p></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOfferingWorker(null)} className="border border-[#C9D6CC] px-4 py-2.5 text-sm font-semibold text-[#34443A]">Cancel</button><button type="button" disabled={requestingWorker === offeringWorker.id} onClick={() => { void requestWorker(offeringWorker).then(() => setOfferingWorker(null)) }} className="bg-[#164E38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#236B4B] disabled:opacity-50">{requestingWorker === offeringWorker.id ? "Sending offer…" : "Send offer"}</button></div></section></div>}
  </main>
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">{message}</div>
}
