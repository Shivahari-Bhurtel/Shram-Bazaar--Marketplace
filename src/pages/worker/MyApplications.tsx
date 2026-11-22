import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { ApplicationStatusBadge } from "../../components/StatusBadge"
import DemoJobDetailsModal from "../../components/DemoJobDetailsModal"
import { useDemoJobState } from "../../hooks/useDemoJobState"
import { loadDemoJobs, type DemoJob } from "../../services/demoJobs"
import type { Application, ApplicationStatus, Job, WorkType } from "../../types"
import { formatNepalDate, nepalDateString } from "../../utils/dates"
import { openConversation } from "../../services/messaging"
import { apiRequest } from "../../services/backendApi"
import type { Page } from "../../store/AppContext"

type StatusFilter = ApplicationStatus | "all"

const statusCards: {
  key: StatusFilter
  label: string
  className: string
  icon: "all" | "applied" | "accepted" | "rejected" | "completed"
}[] = [
  { key: "all", label: "All applications", className: "brown", icon: "all" },
  { key: "pending", label: "Applied", className: "blue", icon: "applied" },
  { key: "accepted", label: "Accepted", className: "green", icon: "accepted" },
  { key: "declined", label: "Declined", className: "gray", icon: "rejected" },
  { key: "rejected", label: "Not selected", className: "gray", icon: "rejected" },
  { key: "withdrawn", label: "Withdrawn", className: "gray", icon: "rejected" },
  { key: "completed", label: "Completed", className: "green", icon: "completed" },
]

function formatDate(date: string) {
  return formatNepalDate(date, { day: "2-digit", month: "short" })
}

function getApplicationDisplayStatus(application: Application): ApplicationStatus {
  return application.engagementStatus === "COMPLETED" ? "completed" : application.status
}

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim()
}

function scheduledWorkHasEnded(job?: Job) {
  if (!job) return false
  const date = job.endDate || job.date
  if (!date) return false
  if (job.endTime && /^\d{2}:\d{2}$/.test(job.endTime)) {
    const scheduledEnd = new Date(`${date}T${job.endTime}:00+05:45`)
    return !Number.isNaN(scheduledEnd.getTime()) && scheduledEnd <= new Date()
  }
  return date <= nepalDateString()
}

function StatusIcon({ name }: { name: (typeof statusCards)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {name === "all" && <><path d="M5 5h14v14H5z" /><path d="M8 9h8M8 12h8M8 15h5" /></>}
      {name === "applied" && <><path d="m4 11 16-7-6 16-3-7-7-2Z" /><path d="m11 13 4-4" /></>}
      {name === "accepted" && <path d="m5 12 4 4L19 6" />}
      {name === "completed" && <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>}
      {name === "rejected" && <><path d="m6 6 12 12M18 6 6 18" /></>}
    </svg>
  )
}

function ApplicationRow({
  application,
  job,
  navigate,
}: {
  application: Application
  job?: Job
  navigate: (page: Page, jobId?: string) => void
}) {
  const { reviewProvider, respondToSelection, updateEngagementWork, withdrawApplication, state } = useApp()
  const [providerRating, setProviderRating] = useState(5)
  const [providerReview, setProviderReview] = useState("")
  const [reviewMessage, setReviewMessage] = useState("")
  const [providerContact, setProviderContact] = useState<{ providerName: string; phoneNumber: string } | null>(null)
  const [contactError, setContactError] = useState("")
  const [contactLoading, setContactLoading] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawNotice, setWithdrawNotice] = useState("")
  const [messageNotice, setMessageNotice] = useState("")
  const [messageBusy, setMessageBusy] = useState(false)
  const completed = application.engagementStatus === "COMPLETED" || (
    import.meta.env.VITE_DEMO_MODE === "true" &&
    scheduledWorkHasEnded(job)
  )
  return (
    <article className="rounded-xl border border-[#E8E2DC] bg-white p-4 transition-colors hover:border-[#CDB9A7] sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAE3DC] bg-[#F8F4EF] text-sm font-bold text-[#70472F]">
            {job?.providerLogo ? (
              <img src={job.providerLogo} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              application.providerName.trim().slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate("job-detail", application.jobId)}
              className="block max-w-full truncate text-left font-semibold text-stone-900 transition-colors hover:text-primary-ink"
            >
              {application.jobTitle}
            </button>
            <p className="mt-0.5 truncate text-sm text-stone-500">{application.providerName}</p>
            <p className="mt-1 truncate text-xs text-stone-500">
              {job?.employmentType || job?.workType?.replace(/-/g, " ") || "Job details"}
              {job?.location ? ` · ${job.location.split(",").slice(-1)[0].trim()}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-500 sm:block sm:space-y-1">
          <span className="text-stone-400 sm:hidden">Applied</span>
          <span className="inline-flex items-center gap-1.5 sm:flex">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18" /></svg>
            {formatDate(application.appliedDate)}
          </span>
          <span className="hidden text-xs text-stone-400 sm:block">Applied</span>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <ApplicationStatusBadge status={getApplicationDisplayStatus(application)} />
          <button
            type="button"
            onClick={() => navigate("job-detail", application.jobId)}
            className="rounded-lg border border-[#D7C6B7] px-3 py-2 text-xs font-semibold text-[#70472F] transition-colors hover:bg-[#F7F1EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View details
          </button>
          {application.status === "pending" && <button type="button" disabled={withdrawLoading} onClick={() => {
            if (!window.confirm("Withdraw this offer? The provider will no longer be able to select it.")) return
            setWithdrawLoading(true)
            setWithdrawNotice("")
            void withdrawApplication(application.id).then((error) => setWithdrawNotice(error || "Offer withdrawn.")).finally(() => setWithdrawLoading(false))
          }} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 disabled:opacity-50">{withdrawLoading ? "Withdrawing…" : "Withdraw offer"}</button>}
        </div>
      </div>

      {withdrawNotice && <p role="status" className="mt-3 text-xs text-stone-600">{withdrawNotice}</p>}

      {application.status === "pending" || application.status === "accepted" ? <div className="mt-4 border-t border-[#F0EBE6] pt-3">
        <button type="button" disabled={messageBusy} onClick={async () => { setMessageBusy(true); setMessageNotice(""); try { const conversation = await openConversation(import.meta.env.VITE_DEMO_MODE === "true", application.id, state.currentUser?.role === "worker" && import.meta.env.VITE_DEMO_MODE === "true" ? "demo-worker" : state.currentUser?.id || "", state.currentUser?.name || "Worker"); sessionStorage.setItem("shram-open-conversation-id", conversation.id); navigate("messages"); } catch (error) { setMessageNotice(error instanceof Error ? error.message : "Unable to open conversation.") } finally { setMessageBusy(false) } }} className="rounded-lg bg-[#70472F] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{messageBusy ? "Opening…" : "Open conversation"}</button>
        {messageNotice && <p role="status" className="mt-2 text-xs text-stone-600">{messageNotice}</p>}
      </div> : null}

      {application.providerNote && (
        <div className="mt-4 border-t border-[#F0EBE6] pt-3">
          <p className="text-sm leading-relaxed text-stone-600"><span className="font-semibold text-stone-800">Employer update: </span>{application.providerNote}</p>
        </div>
      )}
      {application.engagementStatus === "CANCELLED" && (
        <p className="mt-4 border-t border-[#F0EBE6] pt-3 text-sm text-stone-600">The provider cancelled this task. The time is available again on your calendar.</p>
      )}
      {application.offeredAmount != null && (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2 border-t border-[#F0EBE6] pt-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Your offer</p><p className="mt-0.5 text-sm font-bold text-[#286B50]">NPR {application.offeredAmount.toLocaleString()} · {application.estimatedDurationHours || "—"}h estimate</p>{application.offerMessage && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-600">{application.offerMessage}</p>}</div>
          {application.proposedStartAt && <p className="text-xs text-stone-500">Proposed {application.proposedStartAt.replace("T", " ").slice(0, 16)} Nepal time</p>}
        </div>
      )}
      {application.engagementStatus === "AWAITING_RESPONSE" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F0EBE6] pt-3">
          <p className="mr-auto text-sm text-stone-600">The provider selected you. Confirm or decline this work.</p>
          <button type="button" onClick={() => respondToSelection(application.id, false)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700">Decline</button>
          <button type="button" onClick={() => respondToSelection(application.id, true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Confirm work</button>
        </div>
      )}
      {["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(application.engagementStatus || "") && application.engagementId && (
        <div className="mt-4 border-t border-[#F0EBE6] pt-3">
          {providerContact ? (
            <p className="text-sm text-stone-700">Provider contact: <a className="font-semibold text-primary-ink underline" href={`tel:${providerContact.phoneNumber}`}>{providerContact.phoneNumber}</a>{providerContact.providerName ? ` · ${providerContact.providerName}` : ""}</p>
          ) : (
            <button type="button" disabled={contactLoading} onClick={() => {
              setContactLoading(true); setContactError("")
              void apiRequest<{ providerName: string; phoneNumber: string }>(`/api/seeker/engagements/${application.engagementId}/provider-contact`)
                .then((contact) => setProviderContact(contact))
                .catch((error: unknown) => setContactError(error instanceof Error ? error.message : "Provider contact is unavailable."))
                .finally(() => setContactLoading(false))
            }} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-50">{contactLoading ? "Loading contact…" : "View provider contact"}</button>
          )}
          {contactError && <p role="alert" className="mt-2 text-xs text-red-700">{contactError}</p>}
        </div>
      )}
      {application.engagementStatus === "CONFIRMED" && scheduledWorkHasEnded(job) && !application.seekerCompletionConfirmed && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F0EBE6] pt-3">
          <p className="mr-auto text-sm text-stone-600">Confirm when the scheduled work is complete.</p>
          <button type="button" onClick={() => updateEngagementWork(application.id, "confirm-completion")} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Confirm work complete</button>
        </div>
      )}
      {application.engagementStatus === "IN_PROGRESS" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F0EBE6] pt-3">
          <p className="mr-auto text-sm text-stone-600">{application.seekerCompletionConfirmed ? "You confirmed completion. Waiting for the provider to confirm." : application.providerCompletionConfirmed ? "The provider marked this work complete. Confirm if the work is finished." : "The provider started this work. Confirm completion after the scheduled work ends."}</p>
          {!application.seekerCompletionConfirmed && scheduledWorkHasEnded(job) && <button type="button" onClick={() => updateEngagementWork(application.id, "confirm-completion")} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">Confirm work complete</button>}
        </div>
      )}
      {application.status === "accepted" && <div className="mt-4 border-t border-[#F0EBE6] pt-3">
        {application.providerReviewDate ? <p className="text-sm text-stone-600"><strong className="text-stone-800">Your provider review ({application.providerRating}/5):</strong> {application.providerReview || "Review submitted"}</p> : completed ? <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"><label className="text-xs font-semibold text-stone-600">Rate provider<select value={providerRating} onChange={(event) => setProviderRating(Number(event.target.value))} className="input-style mt-1 w-full">{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-xs font-semibold text-stone-600">Feedback<textarea value={providerReview} onChange={(event) => setProviderReview(event.target.value)} maxLength={500} rows={2} placeholder="Share respectful feedback about the work experience" className="input-style mt-1 w-full" /></label><button type="button" disabled={!providerReview.trim()} onClick={() => { void reviewProvider(application.id, providerRating, providerReview).then((error) => setReviewMessage(error || "Review submitted.")) }} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit review</button>{reviewMessage && <p role="status" className="text-xs text-stone-600">{reviewMessage}</p>}</div> : <p className="text-xs text-stone-500">You can review this provider after the scheduled work date.</p>}
      </div>}
    </article>
  )
}

export default function MyApplications() {
  const { myApplications, navigate, state } = useApp()
  const demoState = useDemoJobState(state.workerProfile?.id)
  const [demoJobs, setDemoJobs] = useState<DemoJob[]>([])
  const [selectedDemoJob, setSelectedDemoJob] = useState<DemoJob | null>(null)
  const [demoLoadError, setDemoLoadError] = useState("")
  const [activeTab, setActiveTab] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [workType, setWorkType] = useState("all")

  useEffect(() => {
    const controller = new AbortController()
    loadDemoJobs(controller.signal).then(setDemoJobs).catch((error: unknown) => {
      if (error instanceof Error && error.name !== "AbortError") setDemoLoadError(error.message)
    })
    return () => controller.abort()
  }, [])

  const demoApplications = demoState.applications.map((application) => ({
    application,
    job: demoJobs.find((job) => job.id === application.jobId),
  })).filter((item): item is { application: typeof demoState.applications[number]; job: DemoJob } => !!item.job)

  const jobsById = useMemo(() => new Map<string, Job>([...state.jobs, ...state.externalJobs].map((job) => [job.id, job] as const)), [state.jobs, state.externalJobs])
  const counts = {
    all: myApplications.length,
    pending: myApplications.filter((application) => getApplicationDisplayStatus(application) === "pending").length,
    accepted: myApplications.filter((application) => getApplicationDisplayStatus(application) === "accepted").length,
    declined: myApplications.filter((application) => getApplicationDisplayStatus(application) === "declined").length,
    rejected: myApplications.filter((application) => getApplicationDisplayStatus(application) === "rejected").length,
    withdrawn: myApplications.filter((application) => getApplicationDisplayStatus(application) === "withdrawn").length,
    completed: myApplications.filter((application) => getApplicationDisplayStatus(application) === "completed").length,
  }
  const workTypes = [...new Set(myApplications.map((application) => jobsById.get(application.jobId)?.workType).filter((value): value is WorkType => !!value))]
  const filtered = myApplications
    .filter((application) => activeTab === "all" || getApplicationDisplayStatus(application) === activeTab)
    .filter((application) => {
      const normalizedQuery = normalizeSearchText(query)
      if (!normalizedQuery) return true
      const job = jobsById.get(application.jobId)
      const searchableText = normalizeSearchText([
        application.jobTitle,
        application.providerName,
        application.providerNote,
        application.status,
        job?.title,
        job?.location,
        job?.district,
        job?.municipality,
        job?.category,
        job?.employmentType,
        job?.workType?.replace(/-/g, " "),
        job?.description,
        ...(job?.skillsRequired || []),
      ].filter(Boolean).join(" "))
      return searchableText.includes(normalizedQuery)
    })
    .filter((application) => workType === "all" || jobsById.get(application.jobId)?.workType === workType)
    .sort((a, b) => {
      const difference = new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
      return sortOrder === "newest" ? difference : -difference
    })

  const nextStep = counts.pending
      ? `${counts.pending} application${counts.pending === 1 ? " is" : "s are"} awaiting an update. You can continue exploring suitable roles.`
      : counts.accepted
        ? "You have accepted work. Review job details for schedule and next steps."
        : counts.rejected
          ? "Review any employer notes and keep exploring roles that fit your skills."
          : "Check your application details for the latest updates."

  return (
    <main className="applications-page w-full max-w-none px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center" aria-label="Search and filter applications">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, employers, location, or skills" aria-label="Search jobs, employers, location, or skills" className="w-full border-0 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-800">Clear</button>}
        </label>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-600">
            <span className="sr-only">Sort applications</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-stone-700 outline-none">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-600">
            <span className="sr-only">Filter by job type</span>
            <select value={workType} onChange={(event) => setWorkType(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-stone-700 outline-none">
              <option value="all">All job types</option>
              {workTypes.map((type) => <option key={type} value={type}>{type.replace(/-/g, " ")}</option>)}
            </select>
          </label>
        </div>
      </section>

      {(demoApplications.length > 0 || demoLoadError) && <section className="saved-application-activity mb-8" aria-label="Saved application activity">
        <div className="mb-3">
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">Application activity</h2>
          <p className="mt-1 text-sm text-stone-500">{demoApplications.length} saved entr{demoApplications.length === 1 ? "y" : "ies"} <span aria-hidden="true">·</span> stored on this device</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white px-4 shadow-sm sm:px-5">
        {demoLoadError && <p role="alert" className="py-3 text-sm text-amber-900">Job listing details could not load: {demoLoadError}</p>}
        {demoApplications.length > 0 && <div className="divide-y divide-stone-100">{demoApplications.map(({ application, job }) => <article key={application.jobId} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-5 text-stone-900 sm:text-base">{job.title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-stone-600 sm:text-sm">{job.company} <span aria-hidden="true" className="px-1 text-stone-400">·</span> {job.location}, {job.city}</p>
            <p className="mt-1.5 text-[11px] font-medium tabular-nums text-stone-500 sm:text-xs">Saved {new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(new Date(application.appliedAt))}</p>
          </div>
          <button type="button" onClick={() => setSelectedDemoJob(job)} className="inline-flex min-h-9 w-fit items-center justify-center gap-2 rounded-lg bg-[#246B50] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1D5942] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#246B50]">
            View listing <span aria-hidden="true">↗</span>
          </button>
        </article>)}</div>}
        </div>
      </section>}

      {myApplications.length ? (
        <section className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" aria-label="Application totals">
          {statusCards.map((card) => {
            const selected = activeTab === card.key
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveTab(card.key)}
                aria-pressed={selected}
                className={`application-stat application-stat-${card.className} ${selected ? "is-selected" : ""}`}
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate text-xs font-semibold sm:text-sm">{card.label}</span>
                  <span className="mt-1 block text-2xl font-bold leading-none sm:mt-2 sm:text-3xl">{counts[card.key]}</span>
                </span>
                <span className="application-stat-icon"><StatusIcon name={card.icon} /></span>
              </button>
            )
          })}
        </section>
      ) : null}

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(20rem,1fr)]">
        <section className="min-h-[30rem] min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Job applications list">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-stone-900">Job applications</h2>
            <span className="text-xs font-medium text-stone-500">{filtered.length} shown</span>
          </div>
          {filtered.length ? (
            <div className="space-y-3">
              {filtered.map((application) => (
                <ApplicationRow key={application.id} application={application} job={jobsById.get(application.jobId)} navigate={navigate} />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[23rem] flex-col items-center justify-center rounded-xl bg-[#F8F5F1] px-5 py-12 text-center sm:px-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-primary-ink shadow-sm" aria-hidden="true"><StatusIcon name="all" /></span>
              <h3 className="mt-4 text-lg font-bold text-stone-900">{myApplications.length ? "No applications match these filters" : "Your next opportunity starts here"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">{myApplications.length ? "Try another status, search term, or job type." : "Your applications and employer updates will appear here once you apply."}</p>
              {myApplications.length ? (
                <button type="button" onClick={() => { setActiveTab("all"); setQuery(""); setWorkType("all") }} className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Clear filters</button>
              ) : (
                <button type="button" onClick={() => navigate("job-discovery")} className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Discover jobs</button>
              )}
            </div>
          )}
        </section>

        <aside className="min-h-[30rem] rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7" aria-label="Application insights">
          <h2 className="text-lg font-bold text-stone-900">Application insights</h2>
          {counts.all ? (
            <>
              <p className="mt-4 text-sm font-semibold text-stone-800">Status overview</p>
              <div className="mt-3 space-y-3">
                {statusCards.slice(1).map((card) => {
                  const count = counts[card.key]
                  const ratio = counts.all ? (count / counts.all) * 100 : 0
                  return (
                    <div key={card.key}>
                      <div className="mb-1 flex items-center justify-between text-xs"><span className="text-stone-600">{card.label}</span><span className="font-semibold text-stone-800">{count}</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full application-bar-${card.className}`} style={{ width: `${ratio}%` }} /></div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 border-t border-stone-100 pt-4">
                <h3 className="text-sm font-semibold text-stone-800">Next step</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-500">{nextStep}</p>
              </div>
            </>
          ) : (
            <div className="mt-6 flex min-h-[20rem] flex-col items-center justify-center rounded-xl bg-[#F8F5F1] px-5 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#80502F] shadow-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M7 3h10v18l-5-3-5 3V3Z" /><path d="M9.5 8h5M9.5 11h5" /></svg>
              </span>
              <h3 className="mt-4 text-base font-bold text-stone-900">Updates, all in one place</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-500">Employer responses and application status changes will appear here after you apply.</p>
            </div>
          )}
        </aside>
      </div>
      {selectedDemoJob && <DemoJobDetailsModal job={selectedDemoJob} applied onClose={() => setSelectedDemoJob(null)} onToggleSaved={demoState.toggleSaved} saved={demoState.savedIds.includes(selectedDemoJob.id)} />}
    </main>
  )
}
