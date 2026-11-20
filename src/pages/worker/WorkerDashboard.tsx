import { useEffect, useState, type FormEvent } from "react"
import { useApp } from "../../store/AppContext"
import JobCard from "../../components/JobCard"
import DemoJobCard from "../../components/DemoJobCard"
import DemoJobDetailsModal from "../../components/DemoJobDetailsModal"
import { useDemoJobState } from "../../hooks/useDemoJobState"
import type { Job } from "../../types"
import { ApplicationStatusBadge } from "../../components/StatusBadge"
import { getRecentItJobs, getRecommendedItJobs, loadCachedItRecommendations, loadCachedRecentItJobs } from "../../services/himalayas"
import { getRemoteItJobs, loadCachedRemoteItJobs } from "../../services/jsearch"
import { distanceBetweenKm, filterDemoJobs, formatDemoSalary, loadDemoJobs, type DemoJob } from "../../services/demoJobs"

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

function JobCategoryIcon({ category }: { category: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {category === "Construction & Skilled Trades" && <><path d="M3 11h18M5 11V8l2-3h10l2 3v3M4 11v8h16v-8M9 19v-5h6v5"/><path d="m8 5 1 3m7-3-1 3"/></>}
      {category === "Delivery & Logistics" && <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M14 13h7"/></>}
      {category === "Hospitality & Service" && <><path d="M5 10h14l-1.2 9H6.2L5 10ZM4 10h16M8 6c0-1 1-1.2 1-2m4 2c0-1 1-1.2 1-2m3 2c0-1 1-1.2 1-2"/><path d="M9 14h6"/></>}
      {category === "Retail & Sales" && <><path d="M4 9h16l-1 11H5L4 9ZM3 9l2-5h14l2 5M8 9v2a2 2 0 0 0 4 0V9m0 0v2a2 2 0 0 0 4 0V9"/><path d="M9 20v-5h6v5"/></>}
    </svg>
  )
}

function DashboardStatIcon({ name }: { name: "jobs" | "nearby" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {name === "jobs" ? <><path d="M5 4h14v17H5zM8 8h8M8 12h8M8 16h5"/><path d="M9 4V2h6v2"/></> : <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    </svg>
  )
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  )
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatApplicationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "recently"
  return new Intl.DateTimeFormat("en-NP", { day: "numeric", month: "short", year: "numeric" }).format(date)
}

function formatExperienceLabel(value: string) {
  return /no experience required|fresh workers welcome|training provided/i.test(value) ? "Entry-level" : value
}

function searchCachedItListings(jobs: Job[], query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return Array.from(new Map(jobs
    .filter((job) => job.externalSource === "himalayas" || job.externalSource === "jsearch")
    .map((job) => [job.id, job])).values())
    .map((job) => {
      const title = job.title.toLowerCase()
      const company = job.providerName.toLowerCase()
      const details = `${job.description} ${job.location} ${job.externalCategory || ""} ${(job.externalCategories || []).join(" ")}`.toLowerCase()
      const score = terms.reduce((total, term) => total
        + (title.includes(term) ? 4 : 0)
        + (company.includes(term) ? 2 : 0)
        + (details.includes(term) ? 1 : 0), 0)
      return { job, score }
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || (b.job.externalUpdatedAt || "").localeCompare(a.job.externalUpdatedAt || ""))
    .map(({ job }) => job)
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
  const { state, navigate, myApplications, setExternalJobs } = useApp()
  const { workerProfile, jobs, externalJobs } = state
  const demoState = useDemoJobState(workerProfile?.id)
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [demoJobs, setDemoJobs] = useState<DemoJob[]>([])
  const [showcaseItSearchJobs, setShowcaseItSearchJobs] = useState<Job[]>([])
  const [selectedDemoJob, setSelectedDemoJob] = useState<DemoJob | null>(null)
  const [exploreCategory, setExploreCategory] = useState("")
  const [exploreJobLimit, setExploreJobLimit] = useState(12)
  const [exploreNearby, setExploreNearby] = useState(false)
  const [nearbyLocating, setNearbyLocating] = useState(false)
  const [nearbyLocationMessage, setNearbyLocationMessage] = useState("")
  const [recommendedTab, setRecommendedTab] =
    useState<"best" | "recent" | "saved">("best")
  const [remoteJobsExpanded, setRemoteJobsExpanded] = useState(false)
  const [recommendedExternalJobs, setRecommendedExternalJobs] = useState<Job[]>(loadCachedItRecommendations)
  const [recentExternalJobs, setRecentExternalJobs] = useState<Job[]>(loadCachedRecentItJobs)
  const [remoteItJobs, setRemoteItJobs] = useState<Job[]>(loadCachedRemoteItJobs)
  const [remoteVisibleCount, setRemoteVisibleCount] = useState(5)
  const [remoteInitialLoading, setRemoteInitialLoading] = useState(() => loadCachedRemoteItJobs().length === 0)
  const [remoteMoreError, setRemoteMoreError] = useState("")
  const [recommendedExternalLoading, setRecommendedExternalLoading] =
    useState(() => loadCachedItRecommendations().length === 0)
  const [recommendedExternalError, setRecommendedExternalError] = useState("")
  const [recommendedRequest, setRecommendedRequest] = useState(0)
  const [recentExternalLoading, setRecentExternalLoading] = useState(false)
  const [recentExternalError, setRecentExternalError] = useState("")
  const [recentRequest, setRecentRequest] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    loadDemoJobs(controller.signal)
      .then(setDemoJobs)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setDemoJobs([])
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!workerProfile) return
    const controller = new AbortController()
    Promise.allSettled([
      getRecommendedItJobs(controller.signal),
      getRemoteItJobs(controller.signal, (jobs) => {
        setRemoteItJobs(jobs)
        setRemoteMoreError("")
      }),
    ]).then((results) => {
      const [bestResult, remoteResult] = results
      const bestJobs = bestResult.status === "fulfilled" ? bestResult.value : []
      const remoteJobs = remoteResult.status === "fulfilled" ? remoteResult.value : []
      if (bestJobs.length) setRecommendedExternalJobs(bestJobs)
      if (remoteJobs.length) {
        setRemoteItJobs(remoteJobs)
        setRemoteMoreError("")
      } else if (remoteResult.status === "rejected") {
        setRemoteMoreError(remoteResult.reason instanceof Error ? remoteResult.reason.message : "Remote IT jobs are temporarily unavailable.")
      }
      const incomingJobs = [...bestJobs, ...remoteJobs]
      if (incomingJobs.length) {
        setRecommendedExternalError("")
        setExternalJobs(Array.from(new Map(
          [...state.externalJobs, ...incomingJobs].map((job) => [job.id, job]),
        ).values()))
      } else if (bestResult.status === "rejected" && remoteResult.status === "rejected") {
        setRecommendedExternalError("Remote job listings are temporarily unavailable.")
      }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRecommendedExternalLoading(false)
          setRemoteInitialLoading(false)
        }
      })
    return () => controller.abort()
  }, [workerProfile?.id, recommendedRequest])

  useEffect(() => {
    if (!workerProfile || !remoteJobsExpanded || recommendedTab !== "recent") return
    const controller = new AbortController()
    setRecentExternalLoading(recentExternalJobs.length === 0)
    getRecentItJobs(controller.signal)
      .then((listings) => {
        if (listings.length) {
          setRecentExternalJobs(listings)
          setRecentExternalError("")
          setExternalJobs(Array.from(new Map(
            [...state.externalJobs, ...listings].map((job) => [job.id, job]),
          ).values()))
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setRecentExternalError(error.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecentExternalLoading(false)
      })
    return () => controller.abort()
  }, [workerProfile?.id, remoteJobsExpanded, recommendedTab, recentRequest])

  useEffect(() => {
    if (!submittedSearch) {
      setShowcaseItSearchJobs([])
      return
    }
    setShowcaseItSearchJobs(searchCachedItListings(
      [...recommendedExternalJobs, ...recentExternalJobs, ...remoteItJobs, ...externalJobs],
      submittedSearch,
    ))
  }, [submittedSearch, recommendedExternalJobs, recentExternalJobs, remoteItJobs, externalJobs])

  if (!workerProfile) return null

  const allJobs = Array.from(
    new Map(
      [...jobs, ...externalJobs, ...recommendedExternalJobs, ...recentExternalJobs, ...remoteItJobs].map((job) => [
        job.id,
        job,
      ]),
    ).values(),
  )
  const savedJobs = allJobs
    .filter((job) => state.savedJobIds.includes(job.id))
    .slice(0, 2)
  const demoAppliedIds = new Set(demoState.applications.map((application) => application.jobId))
  const exploreJobs = demoJobs.filter((job) => (!exploreCategory || job.category === exploreCategory)
    && (!exploreNearby || (demoState.userLocation != null && distanceBetweenKm(demoState.userLocation, job) <= 5))).sort((a, b) => {
    const score = (job: DemoJob) => job.skills.filter((skill) => workerProfile.skills.some((item) => item.toLowerCase() === skill.toLowerCase())).length
    return score(b) - score(a) || b.posted_date.localeCompare(a.posted_date)
  })
  const savedDemoJobs = demoJobs.filter((job) => demoState.savedIds.includes(job.id)).slice(0, 2)
  const recentDemoJobs = demoState.recentlyViewedIds.map((id) => demoJobs.find((job) => job.id === id)).filter((job): job is DemoJob => !!job).slice(0, 3)
  const nearbyDemoCount = demoState.userLocation ? demoJobs.filter((job) => distanceBetweenKm(demoState.userLocation!, job) <= 5).length : null
  const itJobs = Array.from(new Map(
    [...recommendedExternalJobs, ...recentExternalJobs, ...remoteItJobs, ...externalJobs]
      .filter((job) => job.externalSource === "himalayas" || job.externalSource === "jsearch")
      .map((job) => [job.id, job]),
  ).values())
  const bestItJobs = Array.from(new Map([...recommendedExternalJobs, ...remoteItJobs].map((job) => [job.id, job])).values())
  const recentItJobs = Array.from(new Map([...recentExternalJobs, ...remoteItJobs].map((job) => [job.id, job])).values())
  const displayedItJobs = recommendedTab === "recent" ? recentItJobs : bestItJobs
  const displayedExternalLoading = recommendedTab === "recent" ? recentExternalLoading : recommendedExternalLoading
  const displayedExternalError = recommendedTab === "recent" ? recentExternalError : recommendedExternalError
  const compareItJobs = (a: Job, b: Job) => recommendedTab !== "best"
    ? (b.externalUpdatedAt || b.postedDate).localeCompare(a.externalUpdatedAt || a.postedDate)
    : recommendedScore(b, workerProfile.skills) - recommendedScore(a, workerProfile.skills)
      || (b.externalUpdatedAt || b.postedDate).localeCompare(a.externalUpdatedAt || a.postedDate)
  const sortedDisplayedItJobs = [...displayedItJobs].sort(compareItJobs)
  const himalayasItJobs = sortedDisplayedItJobs.filter((job) => job.externalSource === "himalayas").slice(0, 10)
  const allBestItListings = [...himalayasItJobs, ...remoteItJobs.slice(0, 100)]
  const bestItListings = allBestItListings.slice(0, remoteVisibleCount)
  const recommendedJobs = recommendedTab === "recent"
    ? sortedDisplayedItJobs.slice(0, 10)
    : recommendedTab === "saved"
      ? itJobs.filter((job) => state.savedJobIds.includes(job.id)).sort(compareItJobs).slice(0, 10)
      : []
  const canLoadMoreRemoteJobs = remoteVisibleCount < allBestItListings.length
  const recentApplications = myApplications.slice(0, 3)
  const firstName = workerProfile.name.trim().split(/\s+/)[0]

  const selectNearbyExploreJobs = () => {
    setExploreCategory("")
    setExploreJobLimit(12)
    setNearbyLocationMessage("")
    if (demoState.userLocation) {
      setExploreNearby(true)
      return
    }
    if (!navigator.geolocation) {
      setNearbyLocationMessage("Location is unavailable in this browser. Open the job map to choose a nearby area.")
      return
    }
    setNearbyLocating(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      demoState.setUserLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : undefined })
      setExploreNearby(true)
      setNearbyLocating(false)
    }, (error) => {
      setExploreNearby(false)
      setNearbyLocating(false)
      setNearbyLocationMessage(error.code === error.PERMISSION_DENIED
        ? "Location access was denied. Allow it in your browser settings and try again."
        : "Could not get your location. Check your device location settings and try again.")
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const query = search.trim()
    setSubmittedSearch(query)
  }

  const selectDemoJob = (job: DemoJob) => {
    setSelectedDemoJob(job)
    demoState.markViewed(job.id)
  }

  return (
    <div className="worker-home-page w-full max-w-[1920px] px-4 py-5 sm:px-6 sm:py-8 lg:-mt-8 lg:px-10">
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
                className="flex min-h-[3.5rem] w-full max-w-[31rem] items-center gap-2 rounded-xl border border-[#E8E2D5] bg-white p-1.5 shadow-md focus-within:ring-2 focus-within:ring-white/40 sm:min-h-[3.75rem]"
              >
                <SidebarIcon
                  name="search"
                  className="ml-3 h-5 w-5 shrink-0 text-[#9299A1]"
                />
                <input
                  type="search"
                  aria-label="Search jobs by skill or role"
                  value={search}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearch(value)
                    if (!value.trim()) setSubmittedSearch("")
                  }}
                  placeholder="Search IT jobs, skills, or companies..."
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 sm:text-base"
                />
              </form>
            </div>
          </header>

          {submittedSearch && <section className="mb-8 scroll-mt-6 space-y-3" aria-live="polite" aria-label="IT job matches">
            {showcaseItSearchJobs.length > 0 ? <div className="overflow-hidden rounded-xl border border-[#E8E2D5] bg-white"><h2 className="border-b border-stone-200 px-4 py-3 text-lg font-bold text-stone-900 sm:px-6">IT job matches</h2>{showcaseItSearchJobs.map((job) => <RecommendedJobRow key={job.id} job={job} />)}</div> : <div className="rounded-xl border border-stone-200 bg-white px-5 py-8 text-center"><p className="font-semibold text-stone-900">No matching IT jobs found</p><p className="mt-1 text-sm text-stone-500">Try another IT role, skill, or company.</p></div>}
          </section>}

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-stone-950">
                  Remote work
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("job-discovery")}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#E8E2D5] bg-[#EFECE6] px-3 py-2 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#EAE3D5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744]"
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
                ["best", "IT jobs"],
                ["recent", "Most recent"],
                ["saved", "Saved jobs"],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={recommendedTab === tab}
                  aria-expanded={recommendedTab === tab && remoteJobsExpanded}
                  aria-controls="remote-work-listings"
                  onClick={() => {
                    if (recommendedTab === tab) setRemoteJobsExpanded((expanded) => !expanded)
                    else {
                      setRecommendedTab(tab)
                      setRemoteJobsExpanded(true)
                    }
                  }}
                  className={`-mb-px shrink-0 rounded-t-lg border-b-2 px-3 pb-3 pt-2 text-sm font-semibold transition-colors ${
                    recommendedTab === tab
                      ? "border-[#70472F] bg-[#EAE3D5] text-[#70472F]"
                      : "border-transparent bg-[#FAF8F5] text-stone-600 hover:bg-[#EFECE6] hover:text-[#70472F]"
                  }`}
                >
                  {label}
                  {tab === "saved" && itJobs.filter((job) => state.savedJobIds.includes(job.id)).length > 0 && (
                    <span className="ml-1.5 text-xs text-stone-400">
                      {itJobs.filter((job) => state.savedJobIds.includes(job.id)).length}
                    </span>
                  )}
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`ml-1 inline h-3.5 w-3.5 transition-transform ${recommendedTab === tab && remoteJobsExpanded ? "rotate-180" : ""}`} aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
                </button>
              ))}
            </div>
            {remoteJobsExpanded && <div id="remote-work-listings" className="space-y-5">
            {recommendedTab === "best" ? (
              <>
                <div className="overflow-hidden rounded-xl border border-[#E8E2D5] bg-white" aria-label="IT job listings">
                  {bestItListings.map((job) => <RecommendedJobRow key={job.id} job={job} />)}
                  {remoteInitialLoading && remoteItJobs.length === 0 && <div role="status" aria-label="Loading job listings" className="space-y-0">{Array.from({ length: bestItListings.length ? 2 : 3 }, (_, index) => <div key={index} className="h-24 animate-pulse border-b border-stone-200 bg-white last:border-0" />)}</div>}
                </div>
                {canLoadMoreRemoteJobs && <div className="flex justify-center"><button type="button" onClick={() => setRemoteVisibleCount((count) => Math.min(100, count + 5))} className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-stone-900 hover:text-black">Show more<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button></div>}
                {remoteMoreError && <p role="alert" className="text-sm text-amber-900">{remoteMoreError}</p>}
              </>
            ) : recommendedJobs.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-[#E8E2D5] bg-white">
                {recommendedJobs.map((job) => (
                  <RecommendedJobRow key={job.id} job={job} />
                ))}
              </div>
            ) : recommendedTab !== "saved" && displayedExternalLoading ? (
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
                        ? "No saved IT jobs"
                        : displayedExternalError
                          ? "IT jobs are temporarily unavailable"
                          : "No IT jobs available right now"}
                    </p>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-500">
                      {recommendedTab === "saved"
                        ? "Save an IT job to keep it handy."
                        : displayedExternalError
                          ? "Check your connection and try loading the listings again."
                          : "Check back soon for new IT listings."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (recommendedTab === "saved") {
                      navigate("job-discovery")
                    } else if (displayedExternalError) {
                      if (recommendedTab === "recent") {
                        setRecentExternalLoading(true)
                        setRecentExternalError("")
                        setRecentRequest((request) => request + 1)
                      } else {
                        setRecommendedExternalLoading(true)
                        setRecommendedExternalError("")
                        setRecommendedRequest((request) => request + 1)
                      }
                    } else {
                      navigate("job-discovery")
                    }
                  }}
                  className="self-start rounded-lg border border-[#E4D3C3] bg-[#F0E5DB] px-4 py-2 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#E7D7C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744] sm:self-auto"
                >
                  {recommendedTab === "saved"
                    ? "Browse jobs"
                    : displayedExternalError
                      ? "Retry listings"
                      : "Browse IT jobs"}
                </button>
              </div>
            )}
            </div>}
          </section>

          <section className="mb-8 rounded-2xl border border-[#E8E2D5] bg-white p-5 shadow-sm sm:p-6" aria-label="Kathmandu Valley job discovery">
            <h2 className="font-heading text-xl font-bold text-stone-950">Explore work across Kathmandu Valley</h2>
            <button type="button" onClick={() => navigate("job-discovery")} aria-label="Find your work on map" className="group relative mt-4 flex h-32 w-full items-center overflow-hidden rounded-xl text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#265D4C] sm:h-36">
              <img src="/images/worker/find-work-map-banner.svg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              <span className="absolute inset-0 bg-[#265D4C]/60 transition-colors group-hover:bg-[#265D4C]/65" />
              <span className="relative flex items-center gap-3 px-5 text-lg font-semibold text-white drop-shadow-sm sm:px-8 sm:text-2xl">Find your work on map <span aria-hidden="true" className="text-2xl transition-transform group-hover:translate-x-1">→</span></span>
            </button>
            <div className="job-category-strip mt-4 flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Job categories and nearby jobs">
              <button type="button" aria-pressed={!exploreCategory && !exploreNearby} onClick={() => { setExploreCategory(""); setExploreNearby(false); setNearbyLocationMessage(""); setExploreJobLimit(12) }} className={`flex h-16 min-w-[150px] shrink-0 items-center justify-between gap-3 rounded-xl border-2 px-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#265D4C] ${!exploreCategory && !exploreNearby ? "border-[#265D4C] bg-[#DFF1E9] text-[#173F33] hover:bg-[#D2EADF]" : "border-[#E0E3E1] bg-white text-stone-700 hover:border-[#C8D8CF] hover:bg-[#F8FAF8]"}`} aria-label={`Show all ${demoJobs.length} jobs`}>
                <span className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-[#265D4C]"><DashboardStatIcon name="jobs" /></span><span className="whitespace-nowrap text-sm font-semibold">All Jobs <span className="tabular-nums">({demoJobs.length})</span></span></span><span aria-hidden="true" className="text-xl">›</span>
              </button>
              {[{ label: "Construction", value: "Construction & Skilled Trades" }, { label: "Delivery", value: "Delivery & Logistics" }, { label: "Hospitality", value: "Hospitality & Service" }, { label: "Retail", value: "Retail & Sales" }].map(({ label, value }) => (
                <button key={value} type="button" aria-pressed={exploreCategory === value} onClick={() => { setExploreCategory(exploreCategory === value ? "" : value); setExploreNearby(false); setNearbyLocationMessage(""); setExploreJobLimit(12) }} className={`flex h-16 min-w-[148px] shrink-0 items-center gap-2.5 rounded-xl border px-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#265D4C] ${exploreCategory === value ? "border-[#A9C6B9] bg-[#EAF2EE]" : "border-[#E0E3E1] bg-white hover:border-[#C8D8CF] hover:bg-[#F8FAF8]"}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF2EE] text-[#477767]"><JobCategoryIcon category={value} /></span>
                  <span className="whitespace-nowrap text-sm font-medium text-stone-700">{label} <span className="tabular-nums text-stone-500">({demoJobs.filter((job) => job.category === value).length})</span></span>
                </button>
              ))}
              <button type="button" onClick={selectNearbyExploreJobs} disabled={nearbyLocating} aria-pressed={exploreNearby} className={`flex h-16 min-w-[164px] shrink-0 items-center gap-2.5 rounded-xl border px-3.5 text-left transition-colors hover:border-[#C8D8CF] hover:bg-[#F8FAF8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#265D4C] disabled:opacity-70 ${exploreNearby ? "border-[#A9C6B9] bg-[#EAF2EE]" : "border-[#E0E3E1] bg-white"}`} aria-label={nearbyDemoCount == null ? "Use your location to show nearby jobs" : `${nearbyDemoCount} jobs within 5 kilometers`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1F4F1] text-[#66766D]"><DashboardStatIcon name="nearby" /></span>
                <span className="min-w-0"><span className="block whitespace-nowrap text-sm font-medium text-stone-700">Within 5 km</span><span className="block whitespace-nowrap text-[11px] text-stone-500">{nearbyLocating ? "Locating…" : nearbyDemoCount == null ? "Enable location" : `${nearbyDemoCount} jobs nearby`}</span></span>
              </button>
            </div>
            {nearbyLocationMessage && <p role="status" className="mt-3 text-xs text-[#80502F]">{nearbyLocationMessage}</p>}
            {exploreJobs.length > 0 ? <>
              <div className="mt-6 grid auto-rows-fr gap-5 lg:grid-cols-3 lg:gap-6">{exploreJobs.slice(0, exploreJobLimit).map((job) => <DemoJobCard key={job.id} job={job} homeStyle matchReasons={workerProfile.skills.filter((skill) => job.skills.some((required) => required.toLowerCase() === skill.toLowerCase())).slice(0, 1).map((skill) => `Matches your skill: ${skill}`)} saved={demoState.savedIds.includes(job.id)} applied={demoAppliedIds.has(job.id)} onOpen={selectDemoJob} onToggleSaved={demoState.toggleSaved} onApply={demoState.apply} />)}</div>
              {exploreJobs.length > exploreJobLimit && <div className="mt-5 flex justify-center"><button type="button" onClick={() => setExploreJobLimit((limit) => limit + 12)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#171717] transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800">Show More <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m5 8 7 7 7-7" /></svg></button></div>}
            </> : <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-[#FAF8F5] p-6 text-center text-sm text-stone-600">{exploreNearby ? "No jobs found within 5 km of your location." : "No jobs in this category yet."}</p>}
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
            {savedJobs.length || savedDemoJobs.length ? (
              <div className="space-y-5">
                {savedDemoJobs.length > 0 && <div><div className="grid auto-rows-fr gap-5 lg:grid-cols-3 lg:gap-6">{savedDemoJobs.map((job) => <DemoJobCard key={job.id} job={job} homeStyle saved onOpen={selectDemoJob} onToggleSaved={demoState.toggleSaved} onApply={demoState.apply} applied={demoAppliedIds.has(job.id)} />)}</div></div>}
                {savedJobs.length > 0 && <div><h3 className="mb-3 text-sm font-semibold text-stone-700">Saved provider and external posts</h3><div className="grid gap-5 lg:grid-cols-3 lg:gap-6">{savedJobs.map((job) => <JobCard key={job.id} job={job} compact />)}</div></div>}
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

          {demoState.applications.length > 0 && <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Recent application activity">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Recent application activity</h2>
              </div>
            </div>
            <div className="mt-4">
              {demoState.applications.slice(0, 3).map((application) => {
                const job = demoJobs.find((item) => item.id === application.jobId)
                if (!job) return null
                return <article key={application.jobId} className="grid grid-cols-1 gap-x-6 gap-y-3 border-b border-stone-200 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <button type="button" onClick={() => selectDemoJob(job)} className="block max-w-full text-left text-base font-semibold leading-snug text-stone-900 hover:text-[#70472F] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#80502F]">{job.title}</button>
                    <p className="mt-1 truncate text-sm font-medium text-stone-700">{job.company}</p>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <span className="whitespace-nowrap text-xs text-stone-500">Applied {formatApplicationDate(application.appliedAt)}</span>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-stone-800">{formatDemoSalary(job)}</span>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-stone-600">
                    <span className="rounded-full bg-[#F5F2EE] px-2.5 py-1 font-medium">{job.job_type}</span>
                    <span className="rounded-full bg-[#F5F2EE] px-2.5 py-1 font-medium">{formatExperienceLabel(job.experience)}</span>
                    <span className="inline-flex items-center gap-1.5 px-1 py-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5 shrink-0" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg>{job.location}, {job.city}</span>
                  </div>
                  <button type="button" onClick={() => selectDemoJob(job)} className="inline-flex min-h-9 items-center justify-center gap-1.5 justify-self-start rounded-lg bg-[#80502F] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#70472F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80502F] sm:justify-self-end">View job <span aria-hidden="true">↗</span></button>
                </article>
              })}
            </div>
          </section>}

          {recentDemoJobs.length > 0 && <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6" aria-label="Recently viewed jobs">
            <div className="mb-4"><h2 className="font-sans text-xl font-semibold tracking-tight text-stone-950">Recently viewed jobs</h2></div>
            <div className="grid auto-rows-fr gap-5 lg:grid-cols-3 lg:gap-6">{recentDemoJobs.map((job) => <DemoJobCard key={job.id} job={job} homeStyle saved={demoState.savedIds.includes(job.id)} applied={demoAppliedIds.has(job.id)} onOpen={selectDemoJob} onToggleSaved={demoState.toggleSaved} onApply={demoState.apply} />)}</div>
          </section>}

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
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  Find work
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M4 12 12 4M5 4h7v7" /></svg>
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
      {selectedDemoJob && <DemoJobDetailsModal job={selectedDemoJob} saved={demoState.savedIds.includes(selectedDemoJob.id)} applied={demoAppliedIds.has(selectedDemoJob.id)} onClose={() => setSelectedDemoJob(null)} onViewMap={() => { const jobId = selectedDemoJob.id; setSelectedDemoJob(null); navigate("job-discovery", jobId) }} onToggleSaved={demoState.toggleSaved} onApply={demoState.apply} portal />}
    </div>
  )
}

function RecommendedJobRow({ job }: { job: Job }) {
  const { navigate, isSaved, saveJob, unsaveJob } = useApp()
  const [logoFailed, setLogoFailed] = useState(false)
  const saved = isSaved(job.id)
  const isExternal = job.externalSource === "himalayas" || job.externalSource === "jsearch"

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
