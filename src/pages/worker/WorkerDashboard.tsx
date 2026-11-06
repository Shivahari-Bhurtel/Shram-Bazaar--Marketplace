import { useEffect, useState, type FormEvent } from "react"
import { useApp } from "../../store/AppContext"
import JobCard from "../../components/JobCard"
import type { Job } from "../../types"
import { ApplicationStatusBadge } from "../../components/StatusBadge"
import { searchHimalayasJobs } from "../../services/himalayas"

function SidebarIcon({
  name,
  className = "",
}: {
  name: "search"
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 ${className}`}
      aria-hidden="true"
    >
      <circle cx="10.8" cy="10.8" r="6.5" />
      <path d="m15.6 15.6 4.6 4.6" />
    </svg>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function recommendedScore(job: Job, skills: string[]) {
  if (job.matchScore !== undefined) return job.matchScore
  const content = [
    job.title,
    job.description,
    ...(job.externalCategories ?? []),
  ]
    .join(" ")
    .toLowerCase()
  return (
    skills.filter((skill) => content.includes(skill.toLowerCase())).length * 20
  )
}

export default function WorkerDashboard() {
  const { state, navigate, myApplications, browseSkill } = useApp()
  const { workerProfile, jobs, externalJobs } = state
  const [search, setSearch] = useState("")
  const [recommendedTab, setRecommendedTab] =
    useState<"best" | "recent" | "saved">("best")
  const [recommendedExternalJobs, setRecommendedExternalJobs] = useState<Job[]>(
    [],
  )
  const [recommendedExternalLoading, setRecommendedExternalLoading] =
    useState(true)

  useEffect(() => {
    if (!workerProfile) return
    const controller = new AbortController()
    searchHimalayasJobs(
      { country: "Nepal", sort: "recent", page: 1 },
      controller.signal,
    )
      .then((result) => setRecommendedExternalJobs(result.jobs))
      .catch(() => {
        // Local Shram Bazar jobs remain available if the external feed is down.
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecommendedExternalLoading(false)
      })
    return () => controller.abort()
  }, [workerProfile?.id])

  if (!workerProfile) return null

  const allJobs = Array.from(
    new Map(
      [...jobs, ...externalJobs, ...recommendedExternalJobs].map((job) => [
        job.id,
        job,
      ]),
    ).values(),
  )
  const availableJobs = allJobs.filter(
    (job) =>
      job.status === "active" &&
      !myApplications.some((application) => application.jobId === job.id),
  )
  const savedJobs = allJobs
    .filter((job) => state.savedJobIds.includes(job.id))
    .slice(0, 2)
  const recommendedJobs = (
    recommendedTab === "saved"
      ? allJobs.filter((job) => state.savedJobIds.includes(job.id))
      : [...availableJobs].sort((a, b) =>
          recommendedTab === "recent"
            ? (b.externalUpdatedAt || b.postedDate).localeCompare(
                a.externalUpdatedAt || a.postedDate,
              )
            : recommendedScore(b, workerProfile.skills) -
              recommendedScore(a, workerProfile.skills),
        )
  ).slice(0, 3)
  const recentApplications = myApplications.slice(0, 3)
  const firstName = workerProfile.name.trim().split(/\s+/)[0]

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    browseSkill(search.trim())
  }

  return (
    <div className="w-full max-w-[1920px] px-4 py-5 sm:px-6 sm:py-8 lg:-mt-8 lg:px-10">
      <div className="grid items-start gap-6 2xl:gap-8">
        <main className="order-3 min-w-0 lg:order-2">
          <header className="relative mb-6 overflow-hidden rounded-2xl border border-[#553421] bg-gradient-to-r from-[#80502F] via-[#704327] to-[#4F3020] px-5 py-6 shadow-sm sm:px-7 sm:py-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-[36%] bg-[#42291B]/55 [clip-path:polygon(0_0,100%_0,100%_100%)]"
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div>
                <h1 className="font-sans text-[1.8rem] font-semibold leading-tight tracking-[-0.035em] text-white sm:text-3xl lg:text-[2.65rem]">
                  {greeting()},{" "}
                  {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#F0E5DA] sm:text-base lg:text-lg">
                  Find work that fits your skills, experience, and availability.
                </p>
              </div>
              <form
                onSubmit={submitSearch}
                className="flex min-h-[3.5rem] w-full max-w-[31rem] items-center gap-2 rounded-xl border border-white/70 bg-white p-1.5 shadow-md focus-within:ring-2 focus-within:ring-white/40 sm:min-h-[3.75rem]"
              >
                <SidebarIcon
                  name="search"
                  className="ml-3 h-5 w-5 shrink-0 text-[#9299A1]"
                />
                <input
                  aria-label="Search jobs by skill or role"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by job title, skill, or town..."
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 sm:text-base"
                />
                <button
                  type="submit"
                  className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#80502F] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#553421] sm:px-6 sm:text-base"
                >
                  Search
                </button>
              </form>
            </div>
          </header>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-stone-950">
                  Recommended jobs
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("job-discovery")}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E4D3C3] bg-[#F0E5DB] px-3 py-2 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#E7D7C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744]"
                aria-label="Open job discovery filters"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M7 12h10m-7 6h4"
                  />
                  <circle cx="8" cy="6" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="11" cy="18" r="1.5" fill="currentColor" />
                </svg>
                Filters
              </button>
            </div>
            <div
              className="mb-3 flex items-center gap-6 overflow-x-auto border-b border-stone-200"
              role="tablist"
              aria-label="Recommended job views"
            >
              {([
                ["best", "Best matches"],
                ["recent", "Most recent"],
                ["saved", "Saved jobs"],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={recommendedTab === tab}
                  onClick={() => setRecommendedTab(tab)}
                  className={`-mb-px shrink-0 rounded-t-lg border-b-2 px-3 pb-3 pt-2 text-sm font-semibold transition-colors ${
                    recommendedTab === tab
                      ? "border-[#70472F] bg-[#F0E5DB] text-[#70472F]"
                      : "border-transparent bg-[#F8F3EE] text-stone-600 hover:bg-[#F0E5DB] hover:text-[#70472F]"
                  }`}
                >
                  {label}
                  {tab === "saved" && state.savedJobIds.length > 0 && (
                    <span className="ml-1.5 text-xs text-stone-400">
                      {state.savedJobIds.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {recommendedJobs.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                {recommendedJobs.map((job) => (
                  <RecommendedJobRow key={job.id} job={job} />
                ))}
              </div>
            ) : recommendedTab !== "saved" && recommendedExternalLoading ? (
              <div
                role="status"
                className="rounded-2xl border border-stone-200 bg-white px-5 py-6 text-sm font-ui text-stone-600"
              >
                Loading jobs…
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-ink"
                    aria-hidden="true"
                  >
                    <SidebarIcon name="search" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {recommendedTab === "saved"
                        ? "No saved jobs"
                        : "No job matches yet"}
                    </p>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-500">
                      {recommendedTab === "saved"
                        ? "Save a job to keep it handy."
                        : "Update your profile or browse all jobs."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    navigate(
                      recommendedTab === "saved"
                        ? "job-discovery"
                        : "worker-profile",
                    )
                  }
                  className="self-start rounded-lg border border-[#E4D3C3] bg-[#F0E5DB] px-4 py-2 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#E7D7C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744] sm:self-auto"
                >
                  {recommendedTab === "saved"
                    ? "Browse jobs"
                    : "Update profile"}
                </button>
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-2xl font-semibold tracking-tight text-stone-950">
                Saved jobs
              </h2>
              <button
                onClick={() => navigate("saved-jobs")}
                className="rounded-lg px-2 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-50"
              >
                View all <span aria-hidden="true">→</span>
              </button>
            </div>
            {savedJobs.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {savedJobs.map((job) => (
                  <JobCard key={job.id} job={job} compact />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-ink"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                    >
                      <path d="M6 3.5h12V21l-6-3.8L6 21V3.5Z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      Keep interesting jobs close
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-500">
                      Save a job while browsing and it will be easy to find here
                      when you’re ready to apply.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("job-discovery")}
                  className="self-start rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:border-primary-100 hover:text-primary-ink sm:self-auto"
                >
                  Find jobs
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-xl font-semibold tracking-tight text-stone-950">
                Recent applications
              </h2>
              <button
                onClick={() => navigate("my-applications")}
                className="text-sm font-semibold text-primary-ink hover:underline"
              >
                View all
              </button>
            </div>
            {recentApplications.length ? (
              <div className="divide-y divide-stone-100">
                {recentApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {application.jobTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {application.providerName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <ApplicationStatusBadge status={application.status} />
                      <button
                        type="button"
                        onClick={() =>
                          navigate("job-detail", application.jobId)
                        }
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-ink hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        aria-label={`View ${application.jobTitle}`}
                      >
                        View job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-stone-50 px-4 py-5 text-center">
                <p className="text-sm font-semibold text-stone-800">
                  Your applications will appear here
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
                  When you find a role that suits you, apply to keep track of
                  updates and responses in one place.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("job-discovery")}
                  className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Find work
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function RecommendedJobRow({ job }: { job: Job }) {
  const { navigate, isSaved, saveJob, unsaveJob } = useApp()
  const [logoFailed, setLogoFailed] = useState(false)
  const saved = isSaved(job.id)
  const isExternal = job.externalSource === "himalayas"

  return (
    <article className="border-b border-stone-200 px-4 py-5 last:border-b-0 sm:px-6 sm:py-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-white text-sm font-semibold text-primary-ink">
          {job.providerLogo && !logoFailed ? (
            <img
              src={job.providerLogo}
              alt=""
              loading="lazy"
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            job.providerName.trim().slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => navigate("job-detail", job.id)}
                className="font-heading text-left text-lg font-semibold leading-snug text-stone-950 underline decoration-black underline-offset-4 hover:text-primary-ink hover:decoration-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {job.title}
              </button>
              <p className="mt-0.5 text-sm text-stone-600">
                {job.providerName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (saved ? unsaveJob(job.id) : saveJob(job.id))}
              aria-label={
                saved
                  ? `Remove ${job.title} from saved jobs`
                  : `Save ${job.title}`
              }
              aria-pressed={saved}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                saved
                  ? "bg-[#E7D7C8] text-[#70472F]"
                  : "bg-[#F8F3EE] text-[#70472F] hover:bg-[#F0E5DB]"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          <p className="mt-2 font-ui text-sm font-medium capitalize text-stone-600">
            {[
              job.employmentType || job.workType.replace("-", " "),
              job.seniority || job.experienceRequired,
              job.duration,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {job.location}
              </span>
              <span className="font-semibold text-stone-800">
                {isExternal
                  ? job.salaryText || "Salary not listed"
                  : `NPR ${job.payment.toLocaleString()} / ${job.paymentType.replace("per-", "")}`}
              </span>
            </div>
            {isExternal && job.externalUrl ? (
              <a
                href={job.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#986744] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#80502F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744]"
              >
                Apply
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M4 12 12 4M5 4h7v7" />
                </svg>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => navigate("job-detail", job.id)}
                className="inline-flex min-h-10 items-center rounded-lg border border-[#E4D3C3] bg-[#F0E5DB] px-4 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#E7D7C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744]"
              >
                View job
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
