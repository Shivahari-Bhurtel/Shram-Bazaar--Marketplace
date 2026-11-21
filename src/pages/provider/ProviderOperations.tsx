import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { formatNepalDate, nepalDateString } from "../../utils/dates"
import { apiRequest } from "../../services/backendApi"
import type { WorkerServiceListing } from "../../types"

type Tab = "discover" | "schedule" | "workers" | "payments" | "reviews" | "messages"
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
  { id: "discover", label: "Find workers", summary: "Search public profiles and invite a suitable worker to one of your jobs." },
  { id: "schedule", label: "Work schedule", summary: "See accepted workers and scheduled jobs by date and shift." },
  { id: "workers", label: "Hired workers", summary: "Track confirmed workers and mark work as completed in this prototype." },
  { id: "payments", label: "Payment records", summary: "Record the agreed amount and payment status. This does not transfer money." },
  { id: "reviews", label: "Reviews", summary: "Leave a worker review after recording the job as completed." },
  { id: "messages", label: "Messages", summary: "Send an in-app message notification to a shortlisted or hired worker." },
]

export default function ProviderOperations() {
  const { state, navigate, sendUserNotification, reviewWorker, updateEngagementWork, requestWorkerForJob } = useApp()
  const provider = state.providerProfile
  const [tab, setTab] = useState<Tab>("discover")
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
  const [ratings, setRatings] = useState<Record<string, { rating: number; review: string }>>({})
  const [ops, setOps] = useState<LocalOps>(() => readOps(provider?.id || "none"))
  const [apiWorkers, setApiWorkers] = useState<Array<(typeof state.allWorkerProfiles)[number]>>([])
  const jobs = useMemo(() => state.jobs.filter((job) => job.providerId === provider?.id), [state.jobs, provider?.id])
  const openJobs = useMemo(() => jobs.filter((job) => job.status === "active"), [jobs])
  const applications = useMemo(() => state.applications.filter((application) => jobs.some((job) => job.id === application.jobId)), [state.applications, jobs])
  const accepted = applications.filter((application) => application.status === "accepted" && application.engagementStatus !== "AWAITING_RESPONSE")
  const completedWorkEligible = (application: (typeof accepted)[number]) => {
    const job = jobs.find((item) => item.id === application.jobId)
    return !!job && (job.endDate || job.date) <= nepalDateString()
  }
  const contacted = applications.filter((application) => application.status === "accepted")
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
    <header className="mb-6 rounded-3xl bg-gradient-to-br from-[#4b3023] to-[#825334] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Provider operations</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Your team and work</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">Find workers, coordinate confirmed jobs, keep local payment records, review completed work and contact applicants.</p>
    </header>
    <nav aria-label="Provider operation modules" className="mb-6 flex gap-2 overflow-x-auto border-b border-stone-200 pb-2">
      {tabs.map((item) => <button key={item.id} type="button" onClick={() => { setTab(item.id); setNotice("") }} aria-current={tab === item.id ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${tab === item.id ? "bg-primary text-white" : "text-stone-600 hover:bg-stone-100"}`}>{item.label}</button>)}
    </nav>
    <p className="mb-5 text-sm text-stone-600">{currentTab.summary}</p>
    {notice && <p role="status" className="mb-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{notice}</p>}

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
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-stone-900">{profile.name}</h2>{profile.verified && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">Verified</span>}<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${profile.acceptingWork === false ? "bg-stone-100 text-stone-600" : "bg-emerald-50 text-emerald-800"}`}>{profile.acceptingWork === false ? "Not accepting work" : "Accepting work"}</span><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">{score}% profile fit</span></div><p className="mt-1 text-sm text-stone-500">{profile.professionalTitle || "Worker"} · {profile.district} · {profile.rating ? `${profile.rating} ★` : "New profile"}</p><p className="mt-2 text-sm text-stone-700">{profile.skills.join(", ") || "No skills listed"}</p>{profile.services?.length ? <div className="mt-2 flex flex-wrap gap-2">{profile.services.slice(0, 3).map((service) => <span key={service.id} className="rounded-lg border border-[#E4E9E3] bg-[#F7F8F5] px-2.5 py-1.5 text-xs text-[#202923]"><strong>{service.title}</strong> · {service.pricingType === "NEGOTIABLE" ? "Quote" : `NPR ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hr" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : "+"}`}{service.negotiable ? " · negotiable" : ""}{service.serviceArea ? ` · ${service.serviceArea}` : ""}<span className="mt-1 block text-[#68736B]">{serviceAvailabilitySummary(service)}</span></span>)}</div> : <p className="mt-1 text-xs text-stone-500">No active service listings yet.</p>}<p className="mt-1 text-xs text-stone-500">{skillMatches} required skills match · {profile.experience.length} experience entries · task availability is checked again when the worker confirms.</p></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={() => setViewingWorker(profile)} className="rounded-xl border border-[#E4E9E3] px-3 py-2.5 text-sm font-semibold text-[#286B50] hover:bg-[#F7F8F5]">View profile</button><button type="button" disabled={!selectedJob || (selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? false : profile.acceptingWork === false || requestingWorker === profile.id || state.applications.some((app) => app.jobId === selectedJob?.id && app.workerId === profile.id && ["pending", "accepted"].includes(app.status)))} title={profile.acceptingWork === false && !selectedJob?.budgetNegotiable && selectedJob?.paymentMax == null ? "This worker has paused new work." : !selectedJob ? "Post a task before requesting a worker." : selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? "Review worker offers and agree on a task price." : undefined} onClick={() => void requestWorker(profile)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{profile.acceptingWork === false && !selectedJob?.budgetNegotiable && selectedJob?.paymentMax == null ? "Not accepting" : selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? "Compare offers" : requestingWorker === profile.id ? "Sending…" : state.applications.some((app) => app.jobId === selectedJob?.id && app.workerId === profile.id && ["pending", "accepted"].includes(app.status)) ? "Request sent" : "Request worker"}</button></div>
      </article>) : <Empty message="No workers match those filters." />}
      <p className="text-xs text-stone-500">Profile fit is a transparent frontend score from job skills, location, shared availability and experience. It is not a hiring decision.</p>
    </section>}

    {tab === "schedule" && <section className="space-y-3">
      {accepted.length ? accepted.map((application) => { const job = jobs.find((item) => item.id === application.jobId)!; return <article key={application.id} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-[1fr_12rem_12rem] sm:items-center"><div><h2 className="font-semibold text-stone-900">{job.title}</h2><p className="mt-1 text-sm text-stone-600">{application.workerName} · {job.location}, {job.district}</p></div><p className="text-sm text-stone-700">{formatNepalDate(job.date, { month: "short", day: "numeric", year: "numeric" })}{job.endDate && job.endDate !== job.date ? ` – ${formatNepalDate(job.endDate, { month: "short", day: "numeric" })}` : ""}</p><p className="text-sm font-semibold text-stone-700">{job.startTime}–{job.endTime}</p></article> }) : <Empty message="Accepted workers and scheduled shifts will appear here." />}
      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Schedule dates and shifts come from your job listing. Edit the listing to change the schedule; this prototype does not send calendar invitations.</p>
    </section>}

    {tab === "workers" && <section className="space-y-3">
      {accepted.length ? accepted.map((application) => { const job = jobs.find((item) => item.id === application.jobId)!; const apiMode = import.meta.env.VITE_DEMO_MODE !== "true"; const done = apiMode ? application.engagementStatus === "COMPLETED" : ops.completed.includes(application.id); const eligible = completedWorkEligible(application); return <article key={application.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-stone-900">{application.workerName}</h2><p className="mt-1 text-sm text-stone-600">{job.title} · {formatNepalDate(job.date, { month: "short", day: "numeric" })} · {job.location}</p><p className="mt-1 text-xs text-stone-500">{done ? "Both parties confirmed the work is complete" : application.engagementStatus === "AWAITING_RESPONSE" ? "Waiting for the worker to confirm selection" : application.engagementStatus === "IN_PROGRESS" ? "Work in progress · confirm after scheduled date" : eligible ? "Confirmed worker · work date has passed" : "Confirmed worker · complete after the scheduled work date"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => notify(application.workerId, "Work schedule update", `Please check the schedule for “${job.title}”.`)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">Contact worker</button>{application.engagementStatus !== "AWAITING_RESPONSE" && <button type="button" disabled={!done && (!eligible || !["CONFIRMED", "IN_PROGRESS"].includes(application.engagementStatus || ""))} onClick={() => apiMode ? updateEngagementWork(application.id, "confirm-completion") : saveOps({ ...ops, completed: done ? ops.completed.filter((id) => id !== application.id) : [...ops.completed, application.id] })} className={`rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${done ? "border border-teal-300 text-teal-800" : "bg-teal-700 text-white"}`}>{done ? "Completed" : application.engagementStatus === "IN_PROGRESS" ? "Confirm completion" : "Mark work complete"}</button>}</div></article> }) : <Empty message="Workers you accept for a job will appear here." />}
    </section>}

    {tab === "payments" && <section className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">Record keeping only: no money is collected, held, or transferred by this screen.</div>
      {accepted.length ? accepted.map((application) => { const job = jobs.find((item) => item.id === application.jobId)!; const recorded = ops.recordedPayments.includes(application.id); const agreedAmount = application.offeredAmount ?? job.payment; return <article key={application.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-stone-900">{application.workerName}</h2><p className="mt-1 text-sm text-stone-600">{job.title} · Agreed rate: NPR {agreedAmount.toLocaleString()} {application.offeredAmount != null ? "offered total" : job.paymentType === "fixed" ? "fixed" : job.paymentType.replace("per-", "per ")}</p><p className="mt-1 text-xs text-stone-500">{recorded ? "Marked paid in local records" : "Pending record"}</p></div><button type="button" onClick={() => saveOps({ ...ops, recordedPayments: recorded ? ops.recordedPayments.filter((id) => id !== application.id) : [...ops.recordedPayments, application.id] })} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700">{recorded ? "Undo record" : "Mark as paid"}</button></article> }) : <Empty message="Agreed payment records for hired workers will appear here." />}
    </section>}

    {tab === "reviews" && <section className="space-y-3">
      {accepted.filter((application) => (import.meta.env.VITE_DEMO_MODE === "true" ? ops.completed.includes(application.id) && completedWorkEligible(application) : application.engagementStatus === "COMPLETED")).length ? accepted.filter((application) => (import.meta.env.VITE_DEMO_MODE === "true" ? ops.completed.includes(application.id) && completedWorkEligible(application) : application.engagementStatus === "COMPLETED")).map((application) => <article key={application.id} className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold text-stone-900">Review {application.workerName}</h2>{application.workerReviewDate ? <p className="mt-3 text-sm text-stone-600"><strong className="text-stone-800">Your review ({application.workerReviewRating}/5):</strong> {application.workerReview || "Review submitted"}</p> : <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><label className="text-xs font-semibold text-stone-600">Rating<select value={ratings[application.id]?.rating ?? 5} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { rating: Number(event.target.value), review: current[application.id]?.review || "" } }))} className="input-style mt-1 w-full">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-xs font-semibold text-stone-600">Review<textarea rows={2} maxLength={500} value={ratings[application.id]?.review || ""} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { rating: current[application.id]?.rating ?? 5, review: event.target.value } }))} placeholder="Share brief, fair feedback" className="input-style mt-1 w-full" /></label><button type="button" disabled={!ratings[application.id]?.review.trim()} onClick={() => { const draft = ratings[application.id] || { rating: 5, review: "" }; void reviewWorker(application.id, draft.rating, draft.review).then((error) => setNotice(error || "Review submitted to Shram Bazar.")) }} className="self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save review</button></div>}</article>) : <Empty message="After both parties confirm completion, leave a review here." />}
      <p className="text-xs text-stone-500">Workers can also review providers after scheduled work is complete from My Applications.</p>
    </section>}

    {tab === "messages" && <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Contact an applicant</h2><label className="mt-4 block text-sm font-semibold text-stone-700">Worker<select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="input-style mt-1.5 w-full"><option value="">Choose a worker</option>{contacted.map((application) => <option key={application.id} value={application.workerId}>{application.workerName} · {application.jobTitle}</option>)}</select></label><label className="mt-4 block text-sm font-semibold text-stone-700">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={1000} placeholder="Write an interview or schedule update" className="input-style mt-1.5 w-full" /></label><button type="button" disabled={!targetId || !message.trim()} onClick={() => { notify(targetId, "Message from provider", message.trim()); setMessage("") }} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Send message</button></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Communication options</h2><p className="mt-2 text-sm leading-relaxed text-stone-600">Messages are delivered to the worker’s in-app notification centre. Replies and persistent conversation threads are not included in this frontend prototype.</p><p className="mt-4 text-xs text-stone-500">{contacted.length} shortlisted or hired worker{contacted.length === 1 ? "" : "s"} available to contact.</p></div></section>}
        {viewingWorker && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#202923]/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingWorker(null) }}><section role="dialog" aria-modal="true" aria-labelledby="worker-preview-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{viewingWorker.photo ? <img src={viewingWorker.photo} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#E2F0E7] text-lg font-bold text-[#286B50]">{viewingWorker.name.slice(0, 1).toUpperCase()}</span>}<div className="min-w-0"><h2 id="worker-preview-title" className="truncate text-xl font-bold text-[#202923]">{viewingWorker.name}</h2><p className="mt-0.5 text-sm text-[#68736B]">{viewingWorker.professionalTitle || "Worker"} · {viewingWorker.district || viewingWorker.location}</p></div></div><button type="button" aria-label="Close worker profile" onClick={() => setViewingWorker(null)} className="rounded-md px-2 py-1 text-xl text-[#68736B] hover:bg-[#F2F5F1]">×</button></div><div className="mt-4 flex flex-wrap gap-2">{viewingWorker.verified && <span className="rounded-full bg-[#E2F0E7] px-2.5 py-1 text-xs font-semibold text-[#286B50]">Verified</span>}<span className="rounded-full bg-[#F7F8F5] px-2.5 py-1 text-xs font-semibold text-[#405047]">{viewingWorker.rating ? `${viewingWorker.rating.toFixed(1)} ★ · ${viewingWorker.totalJobs} reviews` : "New profile · no reviews yet"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${viewingWorker.acceptingWork === false ? "bg-stone-100 text-stone-600" : "bg-[#E2F0E7] text-[#286B50]"}`}>{viewingWorker.acceptingWork === false ? "Paused new requests" : "Accepting work"}</span></div><p className="mt-4 text-sm leading-relaxed text-[#405047]">{viewingWorker.bio || "This worker has not added an introduction yet."}</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#68736B]">Skills</h3><p className="mt-2 text-sm leading-relaxed text-[#202923]">{viewingWorker.skills.join(" · ") || "No skills listed"}</p><h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-[#68736B]">Experience</h3>{viewingWorker.experience.length ? <ul className="mt-2 space-y-2">{viewingWorker.experience.slice(0, 4).map((item) => <li key={item.id} className="text-sm text-[#202923]"><strong>{item.title}</strong><span className="block text-xs text-[#68736B]">{item.company}{item.duration ? ` · ${item.duration}` : ""}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#68736B]">No experience entries listed.</p>}</div><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#68736B]">Services and indicative rates</h3>{viewingWorker.services?.length ? <ul className="mt-2 space-y-2">{viewingWorker.services.map((service) => <li key={service.id} className="rounded-lg border border-[#E4E9E3] p-3"><p className="text-sm font-semibold text-[#202923]">{service.title}</p><p className="mt-0.5 text-xs text-[#68736B]">{service.pricingType === "NEGOTIABLE" ? "Quote on request" : `NPR ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : " starting"}`}{service.negotiable ? " · negotiable" : ""}{service.serviceArea ? ` · ${service.serviceArea}` : ""}</p><p className="mt-1 text-xs font-medium text-[#286B50]">{serviceAvailabilitySummary(service)}</p><p className="mt-1 text-xs text-[#405047]">{service.description}</p></li>)}</ul> : <p className="mt-2 text-sm text-[#68736B]">No active services listed.</p>}<p className="mt-4 text-xs leading-relaxed text-[#68736B]">{selectedJob ? "This worker was matched against the selected task. Availability is rechecked before booking." : "Choose a task to match workers against their published schedule. Confirmed work always uses the live calendar."}</p></div></div><div className="mt-5 flex justify-end border-t border-[#E4E9E3] pt-4"><button type="button" onClick={() => { setViewingWorker(null); void requestWorker(viewingWorker) }} disabled={!selectedJob || (viewingWorker.acceptingWork === false && !selectedJob?.budgetNegotiable && selectedJob?.paymentMax == null)} className="rounded-lg bg-[#286B50] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{selectedJob?.budgetNegotiable || selectedJob?.paymentMax != null ? "Compare task offers" : viewingWorker.acceptingWork === false ? "Not accepting work" : "Request this worker"}</button></div></section></div>}
  </main>
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">{message}</div>
}
