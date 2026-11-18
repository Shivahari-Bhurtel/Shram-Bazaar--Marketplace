import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { formatNepalDate, nepalDateString } from "../../utils/dates"
import { apiRequest } from "../../services/backendApi"

type Tab = "discover" | "schedule" | "workers" | "payments" | "reviews" | "messages"
type LocalOps = { completed: string[]; recordedPayments: string[] }
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
  const { state, sendUserNotification, reviewWorker, updateEngagementWork } = useApp()
  const provider = state.providerProfile
  const [tab, setTab] = useState<Tab>("discover")
  const [search, setSearch] = useState("")
  const [district, setDistrict] = useState("all")
  const [jobId, setJobId] = useState("")
  const [targetId, setTargetId] = useState("")
  const [message, setMessage] = useState("")
  const [notice, setNotice] = useState("")
  const [ratings, setRatings] = useState<Record<string, { rating: number; review: string }>>({})
  const [ops, setOps] = useState<LocalOps>(() => readOps(provider?.id || "none"))
  const [apiWorkers, setApiWorkers] = useState<Array<(typeof state.allWorkerProfiles)[number]>>([])
  const jobs = useMemo(() => state.jobs.filter((job) => job.providerId === provider?.id), [state.jobs, provider?.id])
  const applications = useMemo(() => state.applications.filter((application) => jobs.some((job) => job.id === application.jobId)), [state.applications, jobs])
  const accepted = applications.filter((application) => application.status === "accepted")
  const completedWorkEligible = (application: (typeof accepted)[number]) => {
    const job = jobs.find((item) => item.id === application.jobId)
    return !!job && (job.endDate || job.date) <= nepalDateString()
  }
  const contacted = applications.filter((application) => application.status === "accepted" || application.status === "shortlisted")
  const selectedJob = jobs.find((job) => job.id === jobId) || jobs[0]
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
          averageRating?: number; reviewCount: number;
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
  const workerPool = import.meta.env.VITE_DEMO_MODE === "true" ? state.allWorkerProfiles : apiWorkers
  const districts = [...new Set(workerPool.map((profile) => profile.district).filter(Boolean))].sort()
  const workers = useMemo(() => workerPool
    .filter((profile) => district === "all" || profile.district === district)
    .filter((profile) => !search.trim() || `${profile.name} ${profile.professionalTitle || ""} ${profile.skills.join(" ")} ${profile.location} ${profile.district}`.toLowerCase().includes(search.trim().toLowerCase()))
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
    .sort((a, b) => b.score - a.score), [workerPool, district, search, selectedJob])
  const saveOps = (next: LocalOps) => {
    setOps(next)
    try { localStorage.setItem(storageKey(provider?.id || "none"), JSON.stringify(next)) } catch { setNotice("Browser storage is unavailable; this update may not persist after refresh.") }
  }
  const notify = async (workerId: string, title: string, body: string) => {
    const error = await sendUserNotification(workerId, title, body)
    setNotice(error || (import.meta.env.VITE_DEMO_MODE === "true" ? "Notification sent in demo mode." : "Message sent to the worker."))
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
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_14rem_18rem]">
        <label className="text-xs font-semibold text-stone-600">Search skills, name or location<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. cooking, Pokhara" className="input-style mt-1.5 w-full" /></label>
        <label className="text-xs font-semibold text-stone-600">District<select value={district} onChange={(event) => setDistrict(event.target.value)} className="input-style mt-1.5 w-full"><option value="all">All districts</option>{districts.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs font-semibold text-stone-600">Match against job<select value={selectedJob?.id || ""} onChange={(event) => setJobId(event.target.value)} className="input-style mt-1.5 w-full"><option value="">General profile match</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
      </div>
      {workers.length ? workers.slice(0, 30).map(({ profile, score, skillMatches }) => <article key={profile.id} className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-stone-900">{profile.name}</h2>{profile.verified && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">Verified</span>}<span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-800">{score}% profile fit</span></div><p className="mt-1 text-sm text-stone-500">{profile.professionalTitle || "Worker"} · {profile.district} · {profile.rating ? `${profile.rating} ★` : "New profile"}</p><p className="mt-2 text-sm text-stone-700">{profile.skills.join(", ") || "No skills listed"}</p><p className="mt-1 text-xs text-stone-500">{skillMatches} required skills match · {profile.experience.length} experience entries · availability uses shared dates and weekly hours when provided.</p></div>
        <button type="button" disabled={!selectedJob || import.meta.env.VITE_DEMO_MODE !== "true"} title={import.meta.env.VITE_DEMO_MODE !== "true" ? "Direct job invitations are not supported by the backend yet." : undefined} onClick={() => selectedJob && void notify(profile.id, "Job invitation", `${provider.orgName} invited you to apply for “${selectedJob.title}” in ${selectedJob.location}.`)} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{import.meta.env.VITE_DEMO_MODE === "true" ? "Invite to job" : "Invite unavailable"}</button>
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
      {accepted.length ? accepted.map((application) => { const job = jobs.find((item) => item.id === application.jobId)!; const recorded = ops.recordedPayments.includes(application.id); return <article key={application.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-stone-900">{application.workerName}</h2><p className="mt-1 text-sm text-stone-600">{job.title} · Agreed rate: NPR {job.payment.toLocaleString()} {job.paymentType === "fixed" ? "fixed" : job.paymentType.replace("per-", "per ")}</p><p className="mt-1 text-xs text-stone-500">{recorded ? "Marked paid in local records" : "Pending record"}</p></div><button type="button" onClick={() => saveOps({ ...ops, recordedPayments: recorded ? ops.recordedPayments.filter((id) => id !== application.id) : [...ops.recordedPayments, application.id] })} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700">{recorded ? "Undo record" : "Mark as paid"}</button></article> }) : <Empty message="Agreed payment records for hired workers will appear here." />}
    </section>}

    {tab === "reviews" && <section className="space-y-3">
      {accepted.filter((application) => (import.meta.env.VITE_DEMO_MODE === "true" ? ops.completed.includes(application.id) && completedWorkEligible(application) : application.engagementStatus === "COMPLETED")).length ? accepted.filter((application) => (import.meta.env.VITE_DEMO_MODE === "true" ? ops.completed.includes(application.id) && completedWorkEligible(application) : application.engagementStatus === "COMPLETED")).map((application) => <article key={application.id} className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold text-stone-900">Review {application.workerName}</h2>{application.workerReviewDate ? <p className="mt-3 text-sm text-stone-600"><strong className="text-stone-800">Your review ({application.workerReviewRating}/5):</strong> {application.workerReview || "Review submitted"}</p> : <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><label className="text-xs font-semibold text-stone-600">Rating<select value={ratings[application.id]?.rating ?? 5} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { rating: Number(event.target.value), review: current[application.id]?.review || "" } }))} className="input-style mt-1 w-full">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-xs font-semibold text-stone-600">Review<textarea rows={2} maxLength={500} value={ratings[application.id]?.review || ""} onChange={(event) => setRatings((current) => ({ ...current, [application.id]: { rating: current[application.id]?.rating ?? 5, review: event.target.value } }))} placeholder="Share brief, fair feedback" className="input-style mt-1 w-full" /></label><button type="button" disabled={!ratings[application.id]?.review.trim()} onClick={() => { const draft = ratings[application.id] || { rating: 5, review: "" }; void reviewWorker(application.id, draft.rating, draft.review).then((error) => setNotice(error || "Review submitted to Shram Bazar.")) }} className="self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save review</button></div>}</article>) : <Empty message="After both parties confirm completion, leave a review here." />}
      <p className="text-xs text-stone-500">Workers can also review providers after scheduled work is complete from My Applications.</p>
    </section>}

    {tab === "messages" && <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Contact an applicant</h2><label className="mt-4 block text-sm font-semibold text-stone-700">Worker<select value={targetId} onChange={(event) => setTargetId(event.target.value)} className="input-style mt-1.5 w-full"><option value="">Choose a worker</option>{contacted.map((application) => <option key={application.id} value={application.workerId}>{application.workerName} · {application.jobTitle}</option>)}</select></label><label className="mt-4 block text-sm font-semibold text-stone-700">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={1000} placeholder="Write an interview or schedule update" className="input-style mt-1.5 w-full" /></label><button type="button" disabled={!targetId || !message.trim()} onClick={() => { notify(targetId, "Message from provider", message.trim()); setMessage("") }} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Send message</button></div><div className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-display text-lg font-bold text-stone-900">Communication options</h2><p className="mt-2 text-sm leading-relaxed text-stone-600">Messages are delivered to the worker’s in-app notification centre. Replies and persistent conversation threads are not included in this frontend prototype.</p><p className="mt-4 text-xs text-stone-500">{contacted.length} shortlisted or hired worker{contacted.length === 1 ? "" : "s"} available to contact.</p></div></section>}
  </main>
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">{message}</div>
}
