import { useState, useMemo, useEffect, useRef, type FormEvent } from "react"
import { useApp } from "../../store/AppContext"
import JobListRow from "../../components/JobListRow"
import { DISTRICTS, ALL_SKILLS } from "../../data/mockData"
import { searchHimalayasJobs } from "../../services/himalayas"
import type { JobCategory, WorkType } from "../../types"

type SortOption = "match" | "payment-high" | "payment-low" | "newest" | "deadline"

const employmentTypeForApi: Record<string, string> = {
  "full-time": "Full Time",
  "part-time": "Part Time",
  contract: "Contractor",
  freelance: "Contractor",
}

const seniorityForApi: Record<string, string> = {
  "entry-level": "Entry-level",
  "mid-level": "Mid-level",
  "senior-level": "Senior",
  manager: "Manager",
}

const sortForHimalayas = (sort: SortOption) => {
  if (sort === "newest") return "recent" as const
  if (sort === "payment-high") return "salaryDesc" as const
  if (sort === "payment-low") return "salaryAsc" as const
  return "relevant" as const
}

export default function JobDiscovery() {
  const { state, setExternalJobs, browseSkill } = useApp()
  const { jobs, externalJobs } = state

  const [search, setSearch] = useState(state.discoverySkill)
  const [submittedSearch, setSubmittedSearch] = useState(state.discoverySkill)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterOptionsRef = useRef<HTMLDivElement>(null)
  const [filterDistrict, setFilterDistrict] = useState("")
  const [filterCategory, setFilterCategory] = useState<JobCategory | "">("")
  const [filterWorkType, setFilterWorkType] = useState<WorkType | "">("")
  const [filterEmploymentType, setFilterEmploymentType] = useState("")
  const [filterCountry, setFilterCountry] = useState("Nepal")
  const [filterSeniority, setFilterSeniority] = useState("")
  const [filterPayMin, setFilterPayMin] = useState("")
  const [filterSkill, setFilterSkill] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("match")
  const [showFilters, setShowFilters] = useState(false)
  const [externalLoading, setExternalLoading] = useState(true)
  const [externalLoadingMore, setExternalLoadingMore] = useState(false)
  const [externalError, setExternalError] = useState("")
  const [externalPage, setExternalPage] = useState(1)
  const [externalHasMore, setExternalHasMore] = useState(true)
  const [externalRetry, setExternalRetry] = useState(0)

  useEffect(() => {
    searchInputRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterOptionsRef.current?.contains(event.target as Node))
        setShowFilters(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFilters(false)
    }

    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status === "active" || j.status === "filled"),
    [jobs],
  )
  const allJobs = useMemo(
    () => [...activeJobs, ...externalJobs],
    [activeJobs, externalJobs],
  )

  useEffect(() => {
    const controller = new AbortController()
    setExternalLoading(true)
    setExternalError("")
    setExternalJobs([])

    searchHimalayasJobs(
      {
        q: submittedSearch,
        employmentType: employmentTypeForApi[filterEmploymentType] || "",
        country: filterCountry,
        seniority: seniorityForApi[filterSeniority] || "",
        sort: sortForHimalayas(sortBy),
        page: 1,
      },
      controller.signal,
    )
      .then((result) => {
        setExternalJobs(result.jobs)
        setExternalPage(result.page)
        setExternalHasMore(result.hasMore)
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setExternalError(
            error instanceof Error
              ? error.message
              : "External jobs could not be loaded.",
          )
          setExternalHasMore(false)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setExternalLoading(false)
      })

    return () => controller.abort()
  }, [
    submittedSearch,
    filterEmploymentType,
    filterCountry,
    filterSeniority,
    sortBy,
    externalRetry,
    setExternalJobs,
  ])

  const filtered = useMemo(() => {
    return allJobs
      .filter((job) => {
        if (submittedSearch) {
          const s = submittedSearch.toLowerCase()
          if (
            !job.title.toLowerCase().includes(s) &&
            !job.providerName.toLowerCase().includes(s) &&
            !job.location.toLowerCase().includes(s) &&
            !job.description.toLowerCase().includes(s) &&
            !job.skillsRequired.some((sk) => sk.toLowerCase().includes(s)) &&
            !job.externalCategories?.some((category) =>
              category.toLowerCase().includes(s),
            )
          ) {
            return false
          }
        }
        if (
          filterDistrict &&
          !job.externalSource &&
          job.district !== filterDistrict
        )
          return false
        if (filterCategory && job.category !== filterCategory) return false
        if (
          filterWorkType &&
          !job.externalSource &&
          job.workType !== filterWorkType
        )
          return false
        if (
          filterPayMin &&
          !job.externalSource &&
          job.payment < Number(filterPayMin)
        )
          return false
        if (
          filterSkill &&
          !job.skillsRequired.some((s) =>
            s.toLowerCase().includes(filterSkill.toLowerCase()),
          ) &&
          !job.description.toLowerCase().includes(filterSkill.toLowerCase()) &&
          !job.title.toLowerCase().includes(filterSkill.toLowerCase()) &&
          !job.externalCategories?.some((category) =>
            category.toLowerCase().includes(filterSkill.toLowerCase()),
          )
        )
          return false
        if (filterDate && !job.externalSource && job.date !== filterDate)
          return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === "match") return (b.matchScore ?? 0) - (a.matchScore ?? 0)
        if (sortBy === "payment-high" || sortBy === "payment-low") {
          if (a.externalSource !== b.externalSource)
            return a.externalSource ? 1 : -1
          if (a.externalSource && b.externalSource) {
            if (
              a.externalSalaryCurrency !== b.externalSalaryCurrency ||
              a.externalSalaryPeriod !== b.externalSalaryPeriod
            )
              return 0
            const aPay =
              sortBy === "payment-high"
                ? (a.externalSalaryMax ?? a.externalSalaryMin)
                : (a.externalSalaryMin ?? a.externalSalaryMax)
            const bPay =
              sortBy === "payment-high"
                ? (b.externalSalaryMax ?? b.externalSalaryMin)
                : (b.externalSalaryMin ?? b.externalSalaryMax)
            if (aPay === undefined || bPay === undefined) return 0
            return sortBy === "payment-high" ? bPay - aPay : aPay - bPay
          }
          return sortBy === "payment-high"
            ? b.payment - a.payment
            : a.payment - b.payment
        }
        if (sortBy === "newest") return b.postedDate.localeCompare(a.postedDate)
        if (sortBy === "deadline") return a.deadline.localeCompare(b.deadline)
        return 0
      })
  }, [
    allJobs,
    submittedSearch,
    filterDistrict,
    filterCategory,
    filterWorkType,
    filterPayMin,
    filterSkill,
    filterDate,
    sortBy,
  ])

  const activeFiltersCount = [
    filterDistrict,
    filterCategory,
    filterWorkType,
    filterEmploymentType,
    filterCountry !== "Nepal" ? filterCountry : "",
    filterSeniority,
    filterPayMin,
    filterSkill,
    filterDate,
    submittedSearch,
  ].filter(Boolean).length

  const clearFilters = () => {
    browseSkill("")
    setFilterDistrict("")
    setFilterCategory("")
    setFilterWorkType("")
    setFilterEmploymentType("")
    setFilterCountry("Nepal")
    setFilterSeniority("")
    setFilterPayMin("")
    setFilterSkill("")
    setFilterDate("")
    setSearch("")
    setSubmittedSearch("")
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const query = search.trim()
    browseSkill(query)
    setSearch(query)
    setSubmittedSearch(query)
  }

  const loadMoreExternal = async () => {
    if (externalLoadingMore || !externalHasMore) return
    setExternalLoadingMore(true)
    try {
      const nextPage = externalPage + 1
      const result = await searchHimalayasJobs({
        q: submittedSearch,
        employmentType: employmentTypeForApi[filterEmploymentType] || "",
        country: filterCountry,
        seniority: seniorityForApi[filterSeniority] || "",
        sort: sortForHimalayas(sortBy),
        page: nextPage,
      })
      const existingIds = new Set(externalJobs.map((job) => job.id))
      const nextJobs = result.jobs.filter((job) => !existingIds.has(job.id))
      setExternalJobs([...externalJobs, ...nextJobs])
      setExternalPage(nextPage)
      setExternalHasMore(result.hasMore)
      setExternalError("")
    } catch (error) {
      setExternalError(
        error instanceof Error
          ? error.message
          : "More external jobs could not be loaded.",
      )
    } finally {
      setExternalLoadingMore(false)
    }
  }

  return (
    <div className="relative isolate w-full max-w-none bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <img
        aria-hidden="true"
        alt=""
        src="/images/worker/nepali-temple-skyline.svg"
        className="pointer-events-none fixed bottom-0 left-1/2 z-0 w-[min(100vw,90rem)] -translate-x-1/2 opacity-[0.2]"
      />
      <div className="relative z-10">
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <h1 className="font-sans text-[1.85rem] font-semibold leading-none tracking-[-0.035em] text-stone-900 sm:text-3xl">
              Discover Jobs
            </h1>
            <img
              src="/images/worker/detective.png"
              alt=""
              aria-hidden="true"
              className="h-[4.5rem] w-[3.375rem] shrink-0 object-contain"
            />
          </div>
        </div>

        <div ref={filterOptionsRef}>
          {/* Search bar */}
          <form
            onSubmit={submitSearch}
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <div className="group flex h-14 min-w-0 flex-1 items-center gap-3 rounded-xl border border-stone-300 bg-white px-5 shadow-sm transition-all hover:border-stone-400 focus-within:border-[#80502F] focus-within:ring-4 focus-within:ring-[#80502F]/10 sm:min-w-[24rem]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-[18px] w-[18px] shrink-0 text-stone-500 transition-colors group-focus-within:text-[#553421]"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                value={search}
                ref={searchInputRef}
                aria-label="Search jobs by title, skill, or keyword"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs by title, skill, or keyword"
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-stone-900 outline-none placeholder:text-stone-500 focus:ring-0"
              />
            </div>
            {submittedSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setSubmittedSearch("")
                }}
                className="rounded-xl border border-[#E4D3C3] bg-[#F8F3EE] px-4 py-2.5 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#F0E5DB]"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeFiltersCount > 0
                  ? "border-[#D7BDA8] bg-[#E7D7C8] text-[#70472F]"
                  : "border-[#E4D3C3] bg-[#F8F3EE] text-[#70472F] hover:bg-[#F0E5DB]"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-white text-primary-ink rounded-full text-xs font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-[#E4D3C3] bg-white px-3 py-2.5 text-sm text-[#454B52] transition-all focus:border-[#986744] focus:ring-2 focus:ring-[#986744]/20"
            >
              <option value="match">Best Match</option>
              <option value="payment-high">Highest Pay</option>
              <option value="payment-low">Lowest Pay</option>
              <option value="newest">Newest</option>
              <option value="deadline">Deadline Soon</option>
            </select>
          </form>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-stone-900">Filters</h3>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary-ink hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    District
                  </label>
                  <select
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">All districts</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Category
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">All categories</option>
                    <option value="qualified">Qualified / Professional</option>
                    <option value="skill-based">Skill Based</option>
                    <option value="beginner-friendly">Beginner Friendly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Work Type
                  </label>
                  <select
                    value={filterWorkType}
                    onChange={(e) => setFilterWorkType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">All types</option>
                    <option value="full-day">Full Day</option>
                    <option value="half-day">Half Day</option>
                    <option value="multi-day">Multi-Day</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Employment type
                  </label>
                  <select
                    value={filterEmploymentType}
                    onChange={(e) => setFilterEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">All employment types</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Country
                  </label>
                  <input
                    type="text"
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    placeholder="e.g. Nepal"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Seniority
                  </label>
                  <select
                    value={filterSeniority}
                    onChange={(e) => setFilterSeniority(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">All seniority levels</option>
                    <option value="entry-level">Entry level</option>
                    <option value="mid-level">Mid level</option>
                    <option value="senior-level">Senior level</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Min Pay (NPR/day)
                  </label>
                  <input
                    type="number"
                    value={filterPayMin}
                    onChange={(e) => setFilterPayMin(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Skill
                  </label>
                  <input
                    type="text"
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    placeholder="e.g. Electrical"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1 block">
                    Date
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {externalLoading && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-primary" />
            Loading current Himalayas opportunities…
          </div>
        )}
        {externalError && (
          <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                External jobs are temporarily unavailable. Shram Bazzar jobs are
                still shown below.
              </span>
              <button
                onClick={() => setExternalRetry((value) => value + 1)}
                className="font-semibold underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {externalLoading && filtered.length === 0 ? (
          <div
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Loading jobs"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5"
              >
                <div className="flex gap-3">
                  <div className="h-11 w-11 rounded-xl bg-stone-100" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-3/4 rounded bg-stone-100" />
                    <div className="h-3 w-1/2 rounded bg-stone-100" />
                  </div>
                </div>
                <div className="mt-5 h-3 w-2/3 rounded bg-stone-100" />
                <div className="mt-3 h-3 w-full rounded bg-stone-100" />
                <div className="mt-2 h-3 w-5/6 rounded bg-stone-100" />
                <div className="mt-6 h-9 rounded-lg bg-stone-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && activeFiltersCount > 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center sm:px-12">
            <span
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-ink"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <circle cx="10.8" cy="10.8" r="6.5" />
                <path d="m15.6 15.6 4.6 4.6" />
              </svg>
            </span>
            <h3 className="mb-2 font-semibold text-stone-900">No jobs found</h3>
            <p className="mb-4 text-sm text-stone-500">
              Try adjusting your search or removing some filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#DFE4E8] bg-white shadow-[0_8px_28px_-24px_rgba(28,28,28,0.3)]">
            {filtered.map((job) => (
              <JobListRow key={job.id} job={job} />
            ))}
          </div>
        ) : null}
        {!externalLoading && externalHasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMoreExternal}
              disabled={externalLoadingMore}
              className="rounded-xl border border-[#E4D3C3] bg-[#F0E5DB] px-5 py-2.5 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#E7D7C8] disabled:opacity-60"
            >
              {externalLoadingMore ? "Loading…" : "Load more external jobs"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
