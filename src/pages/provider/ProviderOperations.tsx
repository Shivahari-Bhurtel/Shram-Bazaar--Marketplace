import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { formatNepalDate, nepalDateString } from "../../utils/dates"
import { apiRequest } from "../../services/backendApi"
import type { Application, Job, WorkerServiceListing } from "../../types"
import teamOperationsDemo from "../../data/provider-team-operations-demo.json"

type Tab = "discover" | "schedule" | "workers" | "payments" | "reviews"
type WorkerStatusFilter = "all" | "pending" | "accepted" | "in-progress" | "completion-pending" | "completed" | "cancelled"
type PaymentRecord = { id: number; engagementId: number; workerName: string; workTitle: string; amount: number; method: string; paymentDate: string; transactionReference?: string; note?: string; status: "UNPAID" | "PAID" }
type TeamDemoOverrides = { applications: Record<string, Partial<Application>> }
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
const tabs: { id: Tab; label: string; summary: string }[] = [
  { id: "workers", label: "Hired workers", summary: "" },
  { id: "reviews", label: "Reviews", summary: "Leave a worker review after recording the job as completed." },
]

export default function ProviderOperations() {
  const { state, navigate, reviewWorker, updateEngagementWork, requestWorkerForJob, recordEngagementPayment } = useApp()
  const provider = state.providerProfile
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const requested = sessionStorage.getItem("shram-provider-operations-tab")
      if (requested === "workers" || requested === "reviews" || requested === "payments") {
        sessionStorage.removeItem("shram-provider-operations-tab")
        return requested
      }
    } catch { /* Use the default tab when browser session storage is unavailable. */ }
    return "workers"
  })
  const [workerStatusFilter, setWorkerStatusFilter] = useState<WorkerStatusFilter>("all")
  const [search, setSearch] = useState("")
  const [district, setDistrict] = useState("all")
  const [serviceCategory, setServiceCategory] = useState("all")
  const [minimumRating, setMinimumRating] = useState("0")
  const [maximumRate, setMaximumRate] = useState("")
  const [jobId, setJobId] = useState("")
  const [notice, setNotice] = useState("")
  const [requestingWorker, setRequestingWorker] = useState<string | null>(null)
  const [offerMessage, setOfferMessage] = useState("")
  const [offerAmount, setOfferAmount] = useState("")
  const [viewingWorker, setViewingWorker] = useState<(typeof state.allWorkerProfiles)[number] | null>(null)
  const [offeringWorker, setOfferingWorker] = useState<(typeof state.allWorkerProfiles)[number] | null>(null)
  const [ratings, setRatings] = useState<Record<string, { rating: number; review: string; showWork: boolean }>>({})
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const [apiWorkers, setApiWorkers] = useState<Array<(typeof state.allWorkerProfiles)[number]>>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { method: string; paymentDate: string; transactionReference: string; note: string }>>({})
  const teamDemoKey = `shram-team-operations-demo-${provider?.id || state.currentUser?.profileId || "provider"}`
  const [teamDemoOverrides, setTeamDemoOverrides] = useState<TeamDemoOverrides>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(teamDemoKey) || "{}") as Partial<TeamDemoOverrides>
      return { applications: saved.applications || {} }
    }
    catch { return { applications: {} } }
  })
  const updateTeamDemoApplication = (applicationId: string, updates: Partial<Application>) => {
    setTeamDemoOverrides((current) => {
      const next = { applications: { ...current.applications, [applicationId]: { ...current.applications[applicationId], ...updates } } }
      try { localStorage.setItem(teamDemoKey, JSON.stringify(next)) } catch { /* Keep demo controls usable if storage is unavailable. */ }
      return next
    })
  }
  const openReview = (application: Application) => {
    setRatings((current) => ({
      ...current,
      [application.id]: current[application.id] || {
        rating: application.workerReviewRating || 0,
        review: application.workerReview || "",
        showWork: true,
      },
    }))
    setActiveReviewId(application.id)
    setTab("reviews")
  }
  const ownJobs = useMemo(() => state.jobs.filter((job) => job.providerId === provider?.id), [state.jobs, provider?.id])
  const showcaseJobs = teamOperationsDemo.jobs as unknown as Job[]
  const jobs = useMemo(() => [...ownJobs, ...showcaseJobs.filter((demoJob) => !ownJobs.some((job) => job.id === demoJob.id))], [ownJobs])
  const openJobs = useMemo(() => ownJobs.filter((job) => job.status === "active"), [ownJobs])
  const liveApplications = state.applications.filter((application) => ownJobs.some((job) => job.id === application.jobId))
  const showcaseApplications = (teamOperationsDemo.applications as unknown as Application[]).map((application) => ({ ...application, ...teamDemoOverrides.applications[application.id], showcaseHire: true }))
  const applications = [...liveApplications, ...showcaseApplications]
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
  const selectedJob = ownJobs.find((job) => job.id === jobId && job.status === "active") || ownJobs.find((job) => job.status === "active")
  const isTeamDemoApplication = (applicationId: string) => (teamOperationsDemo.applications as unknown as Application[]).some((application) => application.id === applicationId)
  const updateWorkStatus = (application: Application, action: "start" | "request-completion" | "confirm-completion" | "withdraw") => {
    if (!isTeamDemoApplication(application.id)) {
      updateEngagementWork(application.id, action)
      return
    }
    const nextStatus = action === "start" ? "IN_PROGRESS" : action === "withdraw" ? "CANCELLED" : "COMPLETED"
    updateTeamDemoApplication(application.id, {
      engagementStatus: nextStatus,
      ...(nextStatus === "COMPLETED" ? { providerCompletionConfirmed: true, seekerCompletionConfirmed: true } : {}),
    })
    setNotice(`Work status updated to ${nextStatus.toLowerCase().replace(/_/g, " ")}.`)
  }
  useEffect(() => {
    if (offeringWorker && selectedJob) {
      setOfferAmount(selectedJob.payment > 0 ? String(selectedJob.payment) : "")
      setOfferMessage("")
    }
  }, [offeringWorker?.id, selectedJob?.id])
  useEffect(() => {
    const selectTab = (event: Event) => {
      const requested = (event as CustomEvent<Tab>).detail
      if (["workers", "reviews", "payments"].includes(requested)) setTab(requested)
    }
    window.addEventListener("shram-provider-operations-tab", selectTab)
    return () => window.removeEventListener("shram-provider-operations-tab", selectTab)
  }, [])
  useEffect(() => {
    let selectedWorkerId = ""
    try { selectedWorkerId = sessionStorage.getItem("shram-provider-selected-worker") || "" } catch { /* Ignore unavailable session storage. */ }
    if (!selectedWorkerId || !provider) return
    setTab("discover")
    const profile = (import.meta.env.VITE_DEMO_MODE === "true" ? state.allWorkerProfiles : apiWorkers).find((worker) => worker.id === selectedWorkerId)
    if (profile && selectedJob) {
      setOfferingWorker(profile)
      try { sessionStorage.removeItem("shram-provider-selected-worker") } catch { /* Ignore unavailable session storage. */ }
    } else if (!selectedJob) {
      setNotice("Post an active task first, then choose a worker and send an offer.")
      try { sessionStorage.removeItem("shram-provider-selected-worker") } catch { /* Ignore unavailable session storage. */ }
    }
  }, [provider?.id, apiWorkers, state.allWorkerProfiles, selectedJob?.id])
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
  const completedHiringRecords = hiringRecords.filter((application) => statusOf(application) === "completed")
  const agreedAmount = (application: (typeof hiringRecords)[number]) => application.offeredAmount ?? jobs.find((job) => job.id === application.jobId)?.payment ?? 0
  const recordedPaymentTotal = completedHiringRecords.filter((application) => application.showcaseHire && application.paymentStatus === "PAID").reduce((total, application) => total + agreedAmount(application), 0)
    + (import.meta.env.VITE_DEMO_MODE === "true" ? completedHiringRecords.filter((application) => !application.showcaseHire && application.paymentStatus === "PAID").reduce((total, application) => total + agreedAmount(application), 0) : 0)
    + payments.filter((payment) => payment.status === "PAID").reduce((total, payment) => total + payment.amount, 0)
  const completedWorkValue = completedHiringRecords.reduce((total, application) => total + agreedAmount(application), 0)
  const outstandingPaymentTotal = Math.max(0, completedWorkValue - recordedPaymentTotal)
  const recordPayment = async (application: (typeof hiringRecords)[number]) => {
    if (!window.confirm(`Mark NPR ${agreedAmount(application).toLocaleString()} as paid to ${application.workerName}? This records payment without transferring funds.`)) return
    if (isTeamDemoApplication(application.id)) {
      const draft = paymentDrafts[application.id] || { method: "CASH", paymentDate: nepalDateString(), transactionReference: "", note: "" }
      updateTeamDemoApplication(application.id, { paymentStatus: "PAID", paymentMethod: draft.method, paymentDate: draft.paymentDate })
      setNotice("Payment marked as paid in this demo account.")
      return
    }
    if (import.meta.env.VITE_DEMO_MODE === "true" || application.showcaseHire) {
      const draft = paymentDrafts[application.id] || { method: "CASH", paymentDate: nepalDateString(), transactionReference: "", note: "" }
      const error = await recordEngagementPayment(application.id, draft.method, draft.paymentDate)
      setNotice(error || "Payment marked as paid. The worker has been notified.")
      return
    }
    const draft = paymentDrafts[application.id] || { method: "CASH", paymentDate: nepalDateString(), transactionReference: "", note: "" }
    try {
      const record = await apiRequest<PaymentRecord>(`/api/provider/engagements/${application.engagementId}/payment`, {
        method: "POST",
        body: JSON.stringify({ amount: agreedAmount(application), ...draft, transactionReference: draft.transactionReference.trim() || null, note: draft.note.trim() || null }),
      })
      setPayments((existing) => [...existing.filter((item) => item.engagementId !== record.engagementId), record])
      setNotice("Payment marked as paid. The worker has been notified.")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this payment record.")
    }
  }
  const requestWorker = async (profile: (typeof state.allWorkerProfiles)[number]) => {
    if (!selectedJob) { setNotice("Post a task before requesting a worker."); return }
    setRequestingWorker(profile.id)
    setNotice("")
    const amount = Number(offerAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setRequestingWorker(null)
      setNotice("Enter a valid agreed payment amount before sending the offer.")
      return
    }
    if (selectedJob.paymentMax != null && (amount < selectedJob.payment || amount > selectedJob.paymentMax)) {
      setRequestingWorker(null)
      setNotice(`Enter an agreed amount between NPR ${selectedJob.payment.toLocaleString()} and NPR ${selectedJob.paymentMax.toLocaleString()}.`)
      return
    }
    const error = await requestWorkerForJob(selectedJob.id, profile, offerMessage, amount)
    setRequestingWorker(null)
    if (error) {
      setNotice(error)
      return
    }
    setNotice(`${profile.name} received an offer for “${selectedJob.title}”. It is now in Pending Offers until they respond.`)
    setOfferMessage("")
    setTab("workers")
  }


  if (!provider) return null
  const currentTab = tabs.find((item) => item.id === tab) || { summary: "" }

  return <main className="mx-auto w-full max-w-7xl px-4 py-8 text-[#261C14] sm:px-6 lg:px-8">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#D4C9BF] pb-5">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-[-0.035em] text-[#261C14] sm:text-4xl">Team &amp; Operations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#766B61]">Manage worker assignments and follow each job from offer to completion.</p>
      </div>
      <button type="button" onClick={() => navigate("provider-hire")} className="min-h-10 bg-[#261C14] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#553421]">Find Workers</button>
    </header>
    <nav aria-label="Provider operation modules" className="mb-5 flex gap-1 overflow-x-auto border-b border-[#E7E0D9] bg-white px-2 pt-2">
      {tabs.map((item) => <button key={item.id} type="button" onClick={() => { setTab(item.id); setNotice("") }} aria-current={tab === item.id ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${tab === item.id ? "border-[#553421] text-[#261C14]" : "border-transparent text-[#766B61] hover:text-[#261C14]"}`}>{item.label}</button>)}
    </nav>
    {currentTab.summary && <p className="mb-5 text-sm text-[#766B61]">{currentTab.summary}</p>}
    {notice && <p role="status" className="mb-4 border border-[#E3D7CE] bg-[#F5F0EB] px-4 py-3 text-sm text-[#261C14]">{notice}</p>}

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
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-stone-900">{profile.name}</h2>{profile.verified && <span className="rounded-full bg-[#F5F0EB] px-2 py-0.5 text-xs font-semibold text-[#553421]">Verified</span>}<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${profile.acceptingWork === false ? "bg-stone-100 text-stone-600" : "bg-[#F5F0EB] text-[#553421]"}`}>{profile.acceptingWork === false ? "Not accepting work" : "Accepting work"}</span><span className="rounded-full bg-[#EEE8E2] px-2 py-0.5 text-xs font-bold text-[#3A2A20]">{score}% profile fit</span></div><p className="mt-1 text-sm text-stone-500">{profile.professionalTitle || "Worker"} · {profile.district} · {profile.rating ? `${profile.rating} ★` : "New profile"}</p><p className="mt-2 text-sm text-stone-700">{profile.skills.join(", ") || "No skills listed"}</p>{profile.services?.length ? <div className="mt-2 flex flex-wrap gap-2">{profile.services.slice(0, 3).map((service) => <span key={service.id} className="rounded-lg border border-[#E8E2D5] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#38291F]"><strong>{service.title}</strong> · {service.pricingType === "NEGOTIABLE" ? "Quote" : `NPR ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hr" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : "+"}`}{service.negotiable ? " · negotiable" : ""}{service.serviceArea ? ` · ${service.serviceArea}` : ""}<span className="mt-1 block text-[#766B61]">{serviceAvailabilitySummary(service)}</span></span>)}</div> : <p className="mt-1 text-xs text-stone-500">No active service listings yet.</p>}<p className="mt-1 text-xs text-stone-500">{skillMatches} required skills match · {profile.experience.length} experience entries · task availability is checked again when the worker confirms.</p></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={() => setViewingWorker(profile)} className="rounded-xl border border-[#E8E2D5] px-3 py-2.5 text-sm font-semibold text-[#70472F] hover:bg-[#FAF8F5]">View profile</button><button type="button" disabled={!selectedJob || profile.acceptingWork === false || requestingWorker === profile.id || state.applications.some((app) => app.jobId === selectedJob?.id && app.workerId === profile.id && ["pending", "accepted"].includes(app.status))} title={profile.acceptingWork === false ? "This worker has paused new work." : !selectedJob ? "Post a task before requesting a worker." : undefined} onClick={() => setOfferingWorker(profile)} className="rounded-xl bg-[#261C14] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#553421] disabled:opacity-50">{profile.acceptingWork === false ? "Not accepting" : requestingWorker === profile.id ? "Sending…" : state.applications.some((app) => app.jobId === selectedJob?.id && app.workerId === profile.id && ["pending", "accepted"].includes(app.status)) ? "Request sent" : "Review offer"}</button></div>
      </article>) : <Empty message="No workers match those filters." />}
      <p className="text-xs text-stone-500">Profile fit is a transparent frontend score from job skills, location, shared availability and experience. It is not a hiring decision.</p>
    </section>}

    {tab === "schedule" && <section className="space-y-3">
      {accepted.length ? <div className="divide-y divide-[#E7E0D9] border-y border-[#E7E0D9] bg-white">{accepted.map((application) => { const job = jobs.find((item) => item.id === application.jobId)!; return <article key={application.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_12rem_12rem] sm:items-center"><div><h2 className="font-semibold text-[#261C14]">{job.title}</h2><p className="mt-1 text-sm text-[#766B61]">{application.workerName} · {job.location}, {job.district}</p></div><p className="text-sm text-[#3A2A20]">{formatNepalDate(job.date, { month: "short", day: "numeric", year: "numeric" })}{job.endDate && job.endDate !== job.date ? ` – ${formatNepalDate(job.endDate, { month: "short", day: "numeric" })}` : ""}</p><p className="text-sm font-semibold text-[#3A2A20]">{job.startTime}–{job.endTime}</p></article> })}</div> : <Empty message="Accepted workers and scheduled shifts will appear here." />}
      <p className="border-l-2 border-[#70472F] bg-[#FAF8F5] p-4 text-xs leading-relaxed text-[#553421]">Schedule dates and shifts come from your job listing. Edit the listing to change the schedule; this prototype does not send calendar invitations.</p>
    </section>}

    {tab === "workers" && <section className="space-y-5">
      <div className="grid grid-cols-2 divide-x divide-[#E7E0D9] border-y border-[#E7E0D9] bg-white sm:grid-cols-4">
        {[{ label: "Active hires", count: activeHiringCount, detail: "Offers and active work" }, { label: "Pending offers", count: hiringRecords.filter((item) => statusOf(item) === "pending").length, detail: "Waiting for worker response" }, { label: "In progress", count: hiringRecords.filter((item) => ["in-progress", "completion-pending"].includes(statusOf(item))).length, detail: "Assignments underway" }, { label: "Completed", count: hiringRecords.filter((item) => statusOf(item) === "completed").length, detail: "Both sides confirmed" }].map((metric) => <article key={metric.label} className="px-4 py-4 sm:px-5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#766B61]">{metric.label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#261C14]">{metric.count}</p><p className="mt-1 text-xs text-[#92877E]">{metric.detail}</p></article>)}
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-[#E7E0D9] bg-white px-2" role="tablist" aria-label="Filter hiring records">
        {hiringStatusTabs.map((item) => { const count = item.id === "all" ? hiringRecords.length : hiringRecords.filter((application) => statusOf(application) === item.id).length; return <button key={item.id} type="button" role="tab" aria-selected={workerStatusFilter === item.id} onClick={() => setWorkerStatusFilter(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold ${workerStatusFilter === item.id ? "border-[#553421] text-[#261C14]" : "border-transparent text-[#766B61] hover:text-[#261C14]"}`}>{item.label}<span className="ml-1.5 text-xs tabular-nums text-[#92877E]">{count}</span></button> })}
      </div>
      {visibleHiringRecords.length ? <div className="space-y-2">{visibleHiringRecords.map((application) => {
        const job = jobs.find((item) => item.id === application.jobId)
        if (!job) return null
        const status = statusOf(application)
        const canConfirmCompletion = status === "completion-pending"
        const pillClass = status === "pending" ? "bg-[#F5F0EB] text-[#70472F]" : status === "completed" ? "bg-[#261C14] text-white" : status === "cancelled" ? "bg-stone-100 text-stone-600" : "bg-[#EEE8E2] text-[#3A2A20]"
        const label = hiringStatusTabs.find((item) => item.id === status)?.label || status
        return <article key={application.id} className="grid gap-4 border-b border-[#E7E0D9] bg-white py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-2">
          <div className="flex min-w-0 items-start gap-3">{application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F5F0EB] text-sm font-bold text-[#261C14]">{application.workerName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#261C14]">{application.workerName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pillClass}`}>{label}</span></div><p className="mt-1 text-sm font-medium text-[#3A2A20]">{job.title}</p><p className="mt-1 text-xs text-[#766B61]">{job.location}, {job.district} · {formatNepalDate(job.date, { month: "short", day: "numeric", year: "numeric" })}{job.endDate && job.endDate !== job.date ? ` – ${formatNepalDate(job.endDate, { month: "short", day: "numeric" })}` : ""} · {job.startTime}–{job.endTime}</p><p className="mt-1 text-xs text-[#92877E]">{application.offeredAmount != null ? `NPR ${application.offeredAmount.toLocaleString()} offered total` : `NPR ${job.payment.toLocaleString()} ${job.paymentType.replace("per-", "per ")}`} · {application.engagementStatus === "AWAITING_RESPONSE" ? "Waiting for worker to respond to the offer" : status === "completion-pending" ? "Worker requested completion · awaiting provider review" : application.engagementStatus === "COMPLETED" ? "Provider confirmed completion" : application.engagementStatus === "IN_PROGRESS" ? "Work is underway" : "Worker accepted this assignment"}</p></div></div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {application.engagementStatus === "AWAITING_RESPONSE" && <button type="button" onClick={() => { if (window.confirm(`Withdraw the offer sent to ${application.workerName}?`)) updateWorkStatus(application, "withdraw") }} className="border border-[#D4C9BF] px-3 py-2 text-sm font-semibold text-[#553421] hover:bg-[#FAF8F5]">Withdraw offer</button>}
            {application.engagementStatus === "CONFIRMED" && <button type="button" onClick={() => updateWorkStatus(application, "start")} className="bg-[#261C14] px-3 py-2 text-sm font-semibold text-white hover:bg-[#553421]">Mark started</button>}
            {application.engagementStatus === "IN_PROGRESS" && !application.providerCompletionConfirmed && <button type="button" disabled={!completedWorkEligible(application)} title={!completedWorkEligible(application) ? "This assignment can be marked complete after its scheduled end date." : undefined} onClick={() => updateWorkStatus(application, application.seekerCompletionConfirmed ? "confirm-completion" : "request-completion")} className="bg-[#261C14] px-3 py-2 text-sm font-semibold text-white hover:bg-[#553421] disabled:cursor-not-allowed disabled:opacity-50">{application.seekerCompletionConfirmed ? "Confirm completion" : "Mark work completed"}</button>}
            {canConfirmCompletion && application.providerCompletionConfirmed && !application.seekerCompletionConfirmed && <span className="self-center text-xs font-medium text-[#766B61]">Completion submitted · awaiting worker confirmation</span>}
          </div>
        </article>
      })}</div> : <Empty message={hiringRecords.length ? "No hiring records match this status." : "No workers hired yet. Find skilled workers and send your first hiring offer."} />}
      {hiringRecords.length === 0 && <button type="button" onClick={() => navigate("provider-hire")} className="bg-[#261C14] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#553421]">Find Workers</button>}
    </section>}

    {tab === "payments" && <section className="space-y-5">
      <div className="border border-[#E7D9B7] bg-[#FFF9E9] p-4 text-sm leading-relaxed text-[#705A2E]">Payments are recorded manually. Shram Bazaar does not process payments through this feature.</div>
      <div className="grid grid-cols-1 divide-y divide-[#E7E0D9] border-y border-[#E7E0D9] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[{ label: "Completed work value", value: completedWorkValue }, { label: "Total paid", value: recordedPaymentTotal }, { label: "Outstanding", value: outstandingPaymentTotal }].map((metric) => <article key={metric.label} className="px-4 py-4 sm:px-5"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#766B61]">{metric.label}</p><p className="mt-1 text-xl font-bold tabular-nums text-[#261C14]">NPR {metric.value.toLocaleString()}</p></article>)}</div>
      {hiringRecords.filter((application) => !["AWAITING_RESPONSE", "DECLINED", "CANCELLED"].includes(application.engagementStatus || "")).length ? hiringRecords.filter((application) => !["AWAITING_RESPONSE", "DECLINED", "CANCELLED"].includes(application.engagementStatus || "")).map((application) => {
        const job = jobs.find((item) => item.id === application.jobId)
        if (!job) return null
        const savedPayment = payments.find((payment) => payment.engagementId === Number(application.engagementId))
        const demoRecorded = (import.meta.env.VITE_DEMO_MODE === "true" || application.showcaseHire) && application.paymentStatus === "PAID"
        const draft = paymentDrafts[application.id] || { method: "CASH", paymentDate: nepalDateString(), transactionReference: "", note: "" }
        return <article key={application.id} className="space-y-4 border-b border-[#E7E0D9] bg-white py-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#261C14]">{application.workerName}</h2><p className="mt-1 text-sm text-[#766B61]">{job.title} · Agreed amount: NPR {agreedAmount(application).toLocaleString()}</p><p className="mt-1 text-xs text-[#92877E]">{savedPayment?.status === "PAID" ? `Paid ${formatNepalDate(savedPayment.paymentDate, { month: "short", day: "numeric", year: "numeric" })} · ${savedPayment.method.replace(/_/g, " ")}` : savedPayment ? `Unpaid · scheduled ${formatNepalDate(savedPayment.paymentDate, { month: "short", day: "numeric", year: "numeric" })}` : demoRecorded ? "Marked paid in this demo browser" : "Payment record unavailable"}</p>{savedPayment?.transactionReference && <p className="mt-1 text-xs text-[#766B61]">Reference: {savedPayment.transactionReference}</p>}</div>{(savedPayment?.status === "PAID" || demoRecorded) && <span className="rounded-full bg-[#F5F0EB] px-3 py-1 text-xs font-semibold text-[#261C14]">Paid</span>}{savedPayment?.status === "UNPAID" && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Unpaid</span>}</div>
          {statusOf(application) === "completed" && savedPayment?.status !== "PAID" && !demoRecorded && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-[#766B61]">Payment method<select value={draft.method} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, method: event.target.value } }))} className="input-style mt-1 w-full"><option value="CASH">Cash</option><option value="ESEWA">eSewa</option><option value="KHALTI">Khalti</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label>
            <label className="text-xs font-semibold text-[#766B61]">Payment date<input type="date" max={nepalDateString()} value={draft.paymentDate} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, paymentDate: event.target.value } }))} className="input-style mt-1 w-full" /></label>
            <label className="text-xs font-semibold text-[#766B61]">Transaction reference <span className="font-normal">(optional)</span><input maxLength={120} value={draft.transactionReference} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, transactionReference: event.target.value } }))} className="input-style mt-1 w-full" /></label>
            <label className="text-xs font-semibold text-[#766B61]">Note <span className="font-normal">(optional)</span><input maxLength={1000} value={draft.note} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application.id]: { ...draft, note: event.target.value } }))} className="input-style mt-1 w-full" /></label>
            <div className="sm:col-span-2 lg:col-span-4"><button type="button" disabled={!draft.paymentDate} onClick={() => void recordPayment(application)} className="bg-[#261C14] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#553421] disabled:opacity-50">Record payment · NPR {agreedAmount(application).toLocaleString()}</button></div>
          </div>}
        </article>
      }) : <Empty message="No payment records yet. Payments you record for completed work will appear here." />}
    </section>}

    {tab === "reviews" && <section className="space-y-6">
      {accepted.filter((application) => application.engagementStatus === "COMPLETED").length ? accepted.filter((application) => application.engagementStatus === "COMPLETED").map((application) => {
        const draft = ratings[application.id] || { rating: 0, review: "", showWork: true }
        const ratingLabels = ["", "Poor", "Fair", "Good", "Very good", "Exceptional"]
        return <article key={application.id} className="rounded-2xl border border-[#E8E2D5] bg-white p-5 shadow-[0_3px_14px_rgba(38,28,20,0.06)] sm:p-7">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#F0EBE6] pb-4">
            {application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-14 w-14 rounded-full object-cover"/> : <span className="grid h-14 w-14 place-items-center rounded-full bg-[#F5F0EB] font-semibold text-[#553421]">{application.workerName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>}
            <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-semibold text-[#261C14]">{application.workerName}</h3><p className="mt-0.5 truncate text-sm text-[#766B61]">{jobs.find((job) => job.id === application.jobId)?.title || application.jobTitle}</p></div>
            <span className="text-sm font-semibold text-[#3A2A20]">NPR {agreedAmount(application).toLocaleString()}</span>
          </div>
          {application.workerReviewDate && activeReviewId !== application.id ? <div className="pt-5"><div className="flex items-center gap-2 text-amber-500" aria-label={`${application.workerReviewRating || 0} out of 5 stars`}><span className="text-lg tracking-wide">{"★".repeat(application.workerReviewRating || 0)}{"☆".repeat(5 - (application.workerReviewRating || 0))}</span><strong className="text-sm text-[#3A2A20]">{application.workerReviewRating}/5</strong></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#51483F]">{application.workerReview || "Review submitted"}</p>{isTeamDemoApplication(application.id) && <button type="button" onClick={() => openReview(application)} className="mt-3 text-sm font-semibold text-[#553421] underline underline-offset-2">Edit review</button>}</div> : <>
            <h4 className="mt-5 text-lg font-semibold text-[#261C14]">How was it working with {application.workerName}?</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={draft.rating === value} onClick={() => setRatings((current) => ({ ...current, [application.id]: { ...(current[application.id] || { review: "", showWork: true }), rating: value } }))} className={`flex min-h-[88px] flex-col items-center justify-center rounded-xl border px-2 py-3 transition ${draft.rating === value ? "border-[#553421] bg-[#F7F1EB] text-[#553421] ring-1 ring-[#553421]/20" : "border-[#E2E0DE] text-[#766B61] hover:border-[#B9A99A] hover:bg-[#FCFBF9]"}`}><span className="text-2xl leading-none" aria-hidden="true">{draft.rating >= value ? "★" : "☆"}</span><span className="mt-2 text-xs font-semibold sm:text-sm">{ratingLabels[value]}</span></button>)}</div>
            <label className="mt-5 block"><span className="sr-only">Write your public review</span><textarea rows={5} minLength={10} maxLength={1000} value={draft.review} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { ...(current[application.id] || { rating: 0, showWork: true }), review: event.target.value } }))} placeholder="Write your review here…" className="w-full resize-y rounded-xl border border-[#D8D6D3] bg-white px-4 py-3 text-base leading-6 text-[#261C14] outline-none placeholder:text-[#9A9692] focus:border-[#76543B] focus:ring-2 focus:ring-[#76543B]/10" /></label>
            <p className="mt-2 text-sm text-[#8A8580]">{draft.review.trim().length < 10 ? `Write at least 10 characters${draft.review ? ` · ${draft.review.trim().length}/10` : ""}` : `${draft.review.length}/1000 characters`}</p>
            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-medium text-[#3A2A20]"><input type="checkbox" checked={draft.showWork} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { ...(current[application.id] || { rating: 0, review: "" }), showWork: event.target.checked } }))} className="h-5 w-5 accent-[#261C14]"/>Show the delivered work on my review</label>
            <div className="mt-5 flex justify-end"><button type="button" disabled={draft.rating < 1 || draft.review.trim().length < 10} onClick={() => { if (isTeamDemoApplication(application.id)) { updateTeamDemoApplication(application.id, { workerReviewRating: draft.rating, workerReview: draft.review.trim(), workerReviewDate: nepalDateString() }); setActiveReviewId(null); setNotice("Review saved in this demo account."); return } void reviewWorker(application.id, draft.rating, draft.review.trim()).then((error) => { setNotice(error || "Review submitted to Shram Bazar."); if (!error) setActiveReviewId(null) }) }} className="rounded-lg bg-[#261C14] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#553421] disabled:cursor-not-allowed disabled:opacity-40">Publish review</button></div>
          </>}
        </article>
      }) : <Empty message="After both parties confirm completion, leave a review here." />}
      <p className="text-xs text-stone-500">Workers can also review providers after scheduled work is complete from My Applications.</p>
    </section>}

        {viewingWorker && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#38291F]/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingWorker(null) }}><section role="dialog" aria-modal="true" aria-labelledby="worker-preview-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{viewingWorker.photo ? <img src={viewingWorker.photo} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#F7F1EB] text-lg font-bold text-[#70472F]">{viewingWorker.name.slice(0, 1).toUpperCase()}</span>}<div className="min-w-0"><h2 id="worker-preview-title" className="truncate text-xl font-bold text-[#38291F]">{viewingWorker.name}</h2><p className="mt-0.5 text-sm text-[#766B61]">{viewingWorker.professionalTitle || "Worker"} · {viewingWorker.district || viewingWorker.location}</p></div></div><button type="button" aria-label="Close worker profile" onClick={() => setViewingWorker(null)} className="rounded-md px-2 py-1 text-xl text-[#766B61] hover:bg-[#F2F5F1]">×</button></div><div className="mt-4 flex flex-wrap gap-2">{viewingWorker.verified && <span className="rounded-full bg-[#F7F1EB] px-2.5 py-1 text-xs font-semibold text-[#70472F]">Verified</span>}<span className="rounded-full bg-[#FAF8F5] px-2.5 py-1 text-xs font-semibold text-[#65564A]">{viewingWorker.rating ? `${viewingWorker.rating.toFixed(1)} ★ · ${viewingWorker.totalJobs} reviews` : "New profile · no reviews yet"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${viewingWorker.acceptingWork === false ? "bg-stone-100 text-stone-600" : "bg-[#F7F1EB] text-[#70472F]"}`}>{viewingWorker.acceptingWork === false ? "Paused new requests" : "Accepting work"}</span></div><p className="mt-4 text-sm leading-relaxed text-[#65564A]">{viewingWorker.bio || "This worker has not added an introduction yet."}</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#766B61]">Skills</h3><p className="mt-2 text-sm leading-relaxed text-[#38291F]">{viewingWorker.skills.join(" · ") || "No skills listed"}</p><h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-[#766B61]">Experience</h3>{viewingWorker.experience.length ? <ul className="mt-2 space-y-2">{viewingWorker.experience.slice(0, 4).map((item) => <li key={item.id} className="text-sm text-[#38291F]"><strong>{item.title}</strong><span className="block text-xs text-[#766B61]">{item.company}{item.duration ? ` · ${item.duration}` : ""}</span></li>)}</ul> : <p className="mt-2 text-sm text-[#766B61]">No experience entries listed.</p>}</div><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#766B61]">Services and indicative rates</h3>{viewingWorker.services?.length ? <ul className="mt-2 space-y-2">{viewingWorker.services.map((service) => <li key={service.id} className="rounded-lg border border-[#E8E2D5] p-3"><p className="text-sm font-semibold text-[#38291F]">{service.title}</p><p className="mt-0.5 text-xs text-[#766B61]">{service.pricingType === "NEGOTIABLE" ? "Quote on request" : `NPR ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : " starting"}`}{service.negotiable ? " · negotiable" : ""}{service.serviceArea ? ` · ${service.serviceArea}` : ""}</p><p className="mt-1 text-xs font-medium text-[#70472F]">{serviceAvailabilitySummary(service)}</p><p className="mt-1 text-xs text-[#65564A]">{service.description}</p></li>)}</ul> : <p className="mt-2 text-sm text-[#766B61]">No active services listed.</p>}<p className="mt-4 text-xs leading-relaxed text-[#766B61]">{selectedJob ? "This worker was matched against the selected task. Availability is rechecked before booking." : "Choose a task to match workers against their published schedule. Confirmed work always uses the live calendar."}</p></div></div><div className="mt-5 flex justify-end border-t border-[#E8E2D5] pt-4"><button type="button" onClick={() => { setViewingWorker(null); setOfferingWorker(viewingWorker) }} disabled={!selectedJob || viewingWorker.acceptingWork === false} className="rounded-lg bg-[#70472F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{viewingWorker.acceptingWork === false ? "Not accepting work" : "Review and send offer"}</button></div></section></div>}
        {offeringWorker && selectedJob && <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#14251B]/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOfferingWorker(null) }}><section role="dialog" aria-modal="true" aria-labelledby="worker-offer-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-[#553421]">Review hiring offer</p><h2 id="worker-offer-title" className="mt-1 text-xl font-bold text-[#261C14]">Send offer to {offeringWorker.name}</h2></div><button type="button" aria-label="Cancel offer" onClick={() => setOfferingWorker(null)} className="px-2 text-xl text-[#766B61]">×</button></div><p className="mt-2 text-sm leading-relaxed text-[#766B61]">This offer uses your task details. The worker must accept before they appear as an active hire.</p><dl className="mt-5 divide-y divide-[#E7E0D9] border-y border-[#E7E0D9]">{[["Work title", selectedJob.title], ["Location", `${selectedJob.location}, ${selectedJob.district}`], ["Date", formatNepalDate(selectedJob.date, { month: "long", day: "numeric", year: "numeric" })], ["Schedule", `${selectedJob.startTime}–${selectedJob.endTime}`], ["Duration", selectedJob.duration || "As scheduled"], ["Workers needed", String(selectedJob.workersNeeded || 1)], ["Payment basis", selectedJob.budgetNegotiable ? "Agreed with worker" : selectedJob.paymentMax != null ? `NPR ${selectedJob.payment.toLocaleString()}–${selectedJob.paymentMax.toLocaleString()}` : `NPR ${selectedJob.payment.toLocaleString()} ${selectedJob.paymentType.replace("per-", "per ")}`], ["Payment method", (selectedJob.paymentMethod || "CASH").replace(/_/g, " ")]].map(([label, value]) => <div key={label} className="grid grid-cols-[8rem_1fr] gap-3 py-3 text-sm"><dt className="font-medium text-[#766B61]">{label}</dt><dd className="font-semibold text-[#261C14]">{value}</dd></div>)}</dl><label className="mt-4 block text-sm font-semibold text-[#3A2A20]">Agreed payment (NPR)<input type="number" min="1" step="0.01" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} className="input-style mt-1.5 w-full" required />{selectedJob.paymentMax != null && <span className="mt-1 block text-xs font-normal text-[#766B61]">Must be between NPR {selectedJob.payment.toLocaleString()} and NPR {selectedJob.paymentMax.toLocaleString()}.</span>}</label><div className="mt-4 max-h-32 overflow-y-auto text-sm leading-relaxed text-[#766B61]"><p className="font-semibold text-[#3A2A20]">Task description</p><p className="mt-1 whitespace-pre-wrap">{selectedJob.description || "No additional task description."}</p></div><label className="mt-4 block text-sm font-semibold text-[#3A2A20]">Optional message to the worker<textarea value={offerMessage} onChange={(event) => setOfferMessage(event.target.value)} rows={3} maxLength={1200} placeholder="Add a note about the assignment or what the worker should bring…" className="input-style mt-1.5 w-full resize-y font-normal" /><span className="mt-1 block text-right text-xs font-normal text-[#92877E]">{offerMessage.length}/1200</span></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOfferingWorker(null)} className="border border-[#D4C9BF] px-4 py-2.5 text-sm font-semibold text-[#3A2A20]">Cancel</button><button type="button" disabled={requestingWorker === offeringWorker.id || !offerAmount || Number(offerAmount) <= 0} onClick={() => { void requestWorker(offeringWorker).then(() => setOfferingWorker(null)) }} className="bg-[#261C14] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#553421] disabled:opacity-50">{requestingWorker === offeringWorker.id ? "Sending offer…" : "Send offer"}</button></div></section></div>}
  </main>
}

function Empty({ message }: { message: string }) {
  return <div className="border-y border-[#E7E0D9] bg-white p-10 text-center text-sm text-[#766B61]">{message}</div>
}
