import { useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import { ApplicationStatusBadge } from "../../components/StatusBadge"
import type { Application, ApplicationStatus, Job } from "../../types"

type StatusFilter = ApplicationStatus | "all"

const statusCards: {
  key: StatusFilter
  label: string
  className: string
  icon: "all" | "applied" | "shortlisted" | "accepted" | "rejected"
}[] = [
  { key: "all", label: "All applications", className: "brown", icon: "all" },
  { key: "pending", label: "Applied", className: "blue", icon: "applied" },
  { key: "shortlisted", label: "Shortlisted", className: "amber", icon: "shortlisted" },
  { key: "accepted", label: "Accepted", className: "green", icon: "accepted" },
  { key: "rejected", label: "Not selected", className: "gray", icon: "rejected" },
]

const statusLabel: Record<ApplicationStatus, string> = {
  pending: "Applied",
  shortlisted: "Shortlisted",
  accepted: "Accepted",
  rejected: "Not selected",
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-NP", { day: "2-digit", month: "short" })
}

function StatusIcon({ name }: { name: (typeof statusCards)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {name === "all" && <><path d="M5 5h14v14H5z" /><path d="M8 9h8M8 12h8M8 15h5" /></>}
      {name === "applied" && <><path d="m4 11 16-7-6 16-3-7-7-2Z" /><path d="m11 13 4-4" /></>}
      {name === "shortlisted" && <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>}
      {name === "accepted" && <path d="m5 12 4 4L19 6" />}
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
  navigate: (page: "job-detail", jobId?: string) => void
}) {
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
              {job?.employmentType || job?.workType.replaceAll("-", " ") || "Job details"}
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
          <ApplicationStatusBadge status={application.status} />
          <button
            type="button"
            onClick={() => navigate("job-detail", application.jobId)}
            className="rounded-lg border border-[#D7C6B7] px-3 py-2 text-xs font-semibold text-[#70472F] transition-colors hover:bg-[#F7F1EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            View details
          </button>
        </div>
      </div>

      {(application.providerNote || application.coverNote) && (
        <div className="mt-4 border-t border-[#F0EBE6] pt-3">
          {application.providerNote ? (
            <p className="text-sm leading-relaxed text-stone-600"><span className="font-semibold text-stone-800">Employer update: </span>{application.providerNote}</p>
          ) : (
            <p className="line-clamp-2 text-sm leading-relaxed text-stone-500"><span className="font-medium text-stone-700">Your note: </span>{application.coverNote}</p>
          )}
        </div>
      )}
    </article>
  )
}

export default function MyApplications() {
  const { myApplications, navigate, state } = useApp()
  const [activeTab, setActiveTab] = useState<StatusFilter>("all")
  const [query, setQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [workType, setWorkType] = useState("all")

  const jobsById = useMemo(() => new Map<string, Job>([...state.jobs, ...state.externalJobs].map((job) => [job.id, job] as const)), [state.jobs, state.externalJobs])
  const counts = {
    all: myApplications.length,
    pending: myApplications.filter((application) => application.status === "pending").length,
    shortlisted: myApplications.filter((application) => application.status === "shortlisted").length,
    accepted: myApplications.filter((application) => application.status === "accepted").length,
    rejected: myApplications.filter((application) => application.status === "rejected").length,
  }
  const workTypes = [...new Set(myApplications.map((application) => jobsById.get(application.jobId)?.workType).filter((value): value is string => !!value))]
  const filtered = myApplications
    .filter((application) => activeTab === "all" || application.status === activeTab)
    .filter((application) => {
      const normalizedQuery = query.trim().toLowerCase()
      return !normalizedQuery || `${application.jobTitle} ${application.providerName}`.toLowerCase().includes(normalizedQuery)
    })
    .filter((application) => workType === "all" || jobsById.get(application.jobId)?.workType === workType)
    .sort((a, b) => {
      const difference = new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
      return sortOrder === "newest" ? difference : -difference
    })

  const nextStep = counts.shortlisted
    ? `${counts.shortlisted} application${counts.shortlisted === 1 ? " is" : "s are"} shortlisted. Keep an eye out for employer messages.`
    : counts.pending
      ? `${counts.pending} application${counts.pending === 1 ? " is" : "s are"} awaiting an update. You can continue exploring suitable roles.`
      : counts.accepted
        ? "You have accepted work. Review job details for schedule and next steps."
        : counts.rejected
          ? "Review any employer notes and keep exploring roles that fit your skills."
          : "Check your application details for the latest updates."

  return (
    <main className="applications-page w-full max-w-none px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-950 sm:text-5xl">My applications</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-stone-600 sm:text-lg">Explore current openings and your applications will be tracked here.</p>
      </header>

      {myApplications.length ? (
        <section className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5" aria-label="Application totals">
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

      <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center" aria-label="Search and filter applications">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job title or company" aria-label="Search job title or company" className="w-full border-0 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" />
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
              {workTypes.map((type) => <option key={type} value={type}>{type.replaceAll("-", " ")}</option>)}
            </select>
          </label>
        </div>
      </section>

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
                  const count = counts[card.key as ApplicationStatus]
                  const ratio = counts.all ? (count / counts.all) * 100 : 0
                  return (
                    <div key={card.key}>
                      <div className="mb-1 flex items-center justify-between text-xs"><span className="text-stone-600">{statusLabel[card.key as ApplicationStatus]}</span><span className="font-semibold text-stone-800">{count}</span></div>
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
    </main>
  )
}
