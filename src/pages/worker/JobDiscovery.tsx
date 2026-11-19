import { useCallback, useEffect, useMemo, useState } from "react"
import JobDiscoveryMap, { type ShowcaseAreaMarker } from "../../components/worker/JobDiscoveryMap"
import ShowcaseJobRow from "../../components/ShowcaseJobRow"
import ShowcaseJobDetailsModal from "../../components/ShowcaseJobDetailsModal"
import { useApp } from "../../store/AppContext"
import { searchShowcaseJobs, type ShowcaseJob } from "../../services/showcaseJobs"

export default function JobDiscovery() {
  const { state, navigate } = useApp()
  const [search, setSearch] = useState(() => state.discoverySkill || "")
  const [district, setDistrict] = useState("All Nepal")
  const [locationSearch, setLocationSearch] = useState("")
  const [category, setCategory] = useState("All jobs")
  const [jobTypeFilter, setJobTypeFilter] = useState("")
  const [sourceFilter, setSourceFilter] = useState("")
  const [minSalaryFilter, setMinSalaryFilter] = useState("")
  const [maxSalaryFilter, setMaxSalaryFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null)
  const [searchCurrentArea, setSearchCurrentArea] = useState(false)
  const [selectedShowcaseJob, setSelectedShowcaseJob] = useState<ShowcaseJob | null>(null)
  const [showcaseJobs, setShowcaseJobs] = useState<ShowcaseJob[]>([])
  const [showcaseLoading, setShowcaseLoading] = useState(true)
  const [showcaseError, setShowcaseError] = useState("")
  const closeShowcaseDetails = useCallback(() => setSelectedShowcaseJob(null), [])

  useEffect(() => {
    const controller = new AbortController()
    searchShowcaseJobs({}, controller.signal)
      .then(setShowcaseJobs)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setShowcaseError(`Dataset listings are unavailable: ${error.message}`)
      })
      .finally(() => { if (!controller.signal.aborted) setShowcaseLoading(false) })
    return () => controller.abort()
  }, [])

  const filteredShowcaseJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    const place = locationSearch.trim().toLowerCase()
    const [south, west, north, east] = mapBounds ?? [0, 0, 0, 0]
    return showcaseJobs.filter((job) => {
      const searchable = [job.title, job.company, job.location, job.category, job.experience, job.jobLevel, job.source, ...job.skills, ...job.jobTypes].filter(Boolean).join(" ").toLowerCase()
      const matchesQuery = !query || searchable.includes(query)
      const matchesPlace = !place || `${job.location || ""} ${job.mapArea || ""}`.toLowerCase().includes(place)
      const matchesDistrict = district === "All Nepal" || `${job.location || ""} ${job.mapArea || ""}`.toLowerCase().includes(district.toLowerCase())
      const matchesCategory = category === "All jobs" || (job.category || "").toLowerCase().includes(category.toLowerCase()) || searchable.includes(category.toLowerCase())
      const matchesJobType = !jobTypeFilter || job.jobTypes.some((type) => type.toLowerCase().includes(jobTypeFilter.toLowerCase()))
      const matchesSource = !sourceFilter || job.source.toLowerCase() === sourceFilter.toLowerCase()
      const low = job.salaryMin ?? job.salaryMax
      const high = job.salaryMax ?? job.salaryMin
      const matchesMinSalary = !minSalaryFilter || (high != null && high >= Number(minSalaryFilter))
      const matchesMaxSalary = !maxSalaryFilter || (low != null && low <= Number(maxSalaryFilter))
      const matchesBounds = !searchCurrentArea || (job.mapLatitude != null && job.mapLongitude != null && job.mapLatitude >= south && job.mapLatitude <= north && job.mapLongitude >= west && job.mapLongitude <= east)
      return matchesQuery && matchesPlace && matchesDistrict && matchesCategory && matchesJobType && matchesSource && matchesMinSalary && matchesMaxSalary && matchesBounds
    })
  }, [showcaseJobs, search, locationSearch, district, category, jobTypeFilter, sourceFilter, minSalaryFilter, maxSalaryFilter, mapBounds, searchCurrentArea])

  const showcaseAreas = useMemo<ShowcaseAreaMarker[]>(() => {
    const grouped = new Map<string, ShowcaseAreaMarker>()
    for (const job of filteredShowcaseJobs) {
      if (!job.mapArea || job.mapLatitude == null || job.mapLongitude == null) continue
      const current = grouped.get(job.mapArea)
      if (current) current.count++
      else grouped.set(job.mapArea, { name: job.mapArea, count: 1, latitude: job.mapLatitude, longitude: job.mapLongitude })
    }
    return [...grouped.values()].sort((a, b) => b.count - a.count)
  }, [filteredShowcaseJobs])

  const updateMapBounds = useCallback((bounds: [number, number, number, number]) => setMapBounds(bounds), [])

  const categories = useMemo(() => [...new Set(showcaseJobs.map((job) => job.category).filter((value): value is string => Boolean(value)))].slice(0, 8), [showcaseJobs])

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white lg:flex-row">
      <aside className="job-discovery-sidebar z-10 flex max-h-[58dvh] w-full shrink-0 flex-col border-b border-stone-200 bg-white lg:max-h-none lg:w-[390px] lg:border-b-0 lg:border-r xl:w-[420px]" aria-label="Find and filter jobs">
        <div className="border-b border-stone-100 px-4 pb-4 pt-3">
          <button type="button" onClick={() => navigate("worker-dashboard")} className="mb-2 inline-flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm font-semibold text-stone-600 transition-colors hover:text-primary-ink" aria-label="Back to worker dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></svg>
            Back to main page
          </button>
          <div className="mt-4 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><h1 className="font-heading text-xl font-bold text-stone-900">Discover jobs</h1><img src="/images/worker/detective.png" alt="" aria-hidden="true" className="h-10 w-10 shrink-0 object-contain" /></div><span className="shrink-0 text-xs text-stone-500">Nepal</span></div>
          <label className="job-discovery-search mt-3 flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-stone-500" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Job title, company, or keywords…" aria-label="Search jobs" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:ring-0" />
          </label>
          <div className="job-discovery-filters mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter by industry">
            {["All jobs", ...categories].map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${category === item ? "bg-[#80502F] text-white shadow-sm" : "bg-stone-100 text-stone-700 hover:-translate-y-0.5 hover:bg-stone-200"}`}>{item}</button>)}
          </div>
          <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="mt-3 flex items-center gap-2 rounded-lg py-1 text-sm font-semibold text-stone-700 hover:text-[#80502F]">☷ More filters <span className="text-xs text-stone-400">{showFilters ? "−" : "+"}</span></button>
          {showFilters && <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs font-medium text-stone-500">Area<select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="Filter by area" className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm text-stone-800"><option>All Nepal</option><option>Kathmandu</option><option>Lalitpur</option><option>Bhaktapur</option><option>Pokhara</option><option>Chitwan</option><option>Biratnagar</option><option>Dhangadhi</option></select></label><label className="text-xs font-medium text-stone-500">Map place<input type="search" value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Town or address" aria-label="Search job locations" className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-800" /></label><label className="text-xs font-medium text-stone-500">Job type<select value={jobTypeFilter} onChange={(event) => setJobTypeFilter(event.target.value)} aria-label="Filter by job type" className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm text-stone-800"><option value="">All types</option><option>Full Time</option><option>Part Time</option><option>Contract</option><option>Internship</option><option>Traineeship</option></select></label><label className="text-xs font-medium text-stone-500">Source<select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Filter by source" className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm text-stone-800"><option value="">All sources</option><option value="merojob">MeroJob</option><option value="jobsnepal">JobsNepal</option></select></label><label className="text-xs font-medium text-stone-500">Minimum salary<input type="number" min="0" value={minSalaryFilter} onChange={(event) => setMinSalaryFilter(event.target.value)} placeholder="NPR" className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-800" /></label><label className="text-xs font-medium text-stone-500">Maximum salary<input type="number" min="0" value={maxSalaryFilter} onChange={(event) => setMaxSalaryFilter(event.target.value)} placeholder="NPR" className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-2 text-sm text-stone-800" /></label></div>}
          <p className="mt-3 text-sm text-stone-600"><strong className="text-stone-900">{filteredShowcaseJobs.length}</strong> jobs found</p>
        </div>
        <div className="job-discovery-results flex-1 space-y-3 overflow-y-auto bg-[#F8F6F2] p-3">
          {showcaseLoading && <p role="status" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">Loading Nepal job dataset…</p>}
          {showcaseError && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{showcaseError}</p>}
          {filteredShowcaseJobs.length > 0 && <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-100 px-4 py-3"><h2 className="text-sm font-bold text-stone-900">Nepal job dataset</h2><p className="mt-0.5 text-xs text-stone-500">Historical source listings · availability is unverified</p></div>{filteredShowcaseJobs.map((job) => <ShowcaseJobRow key={`dataset-${job.id}`} job={job} onOpen={setSelectedShowcaseJob} />)}</section>}
          {filteredShowcaseJobs.length === 0 && !showcaseLoading && !showcaseError && <div className="rounded-xl border border-dashed border-stone-300 bg-white p-7 text-center"><p className="font-semibold text-stone-800">No dataset listings match</p><p className="mt-1 text-sm text-stone-500">Try another keyword, industry, or location.</p></div>}
        </div>
      </aside>
      <section aria-label="Job map" className="relative min-h-0 flex-1 bg-[#E8E6DF]">
        <JobDiscoveryMap onBoundsChange={updateMapBounds} fitToJobs={!searchCurrentArea && !showcaseLoading} focusArea={locationSearch || (district === "All Nepal" ? undefined : district)} searchCurrentArea={searchCurrentArea} showcaseAreas={showcaseAreas} onSelectShowcaseArea={(area) => { setLocationSearch(area.name); setSearchCurrentArea(false) }} />
        <div className="pointer-events-none absolute left-4 top-5 z-[500] flex flex-wrap gap-2 rounded-xl border border-white/70 bg-white/90 p-2.5 text-[11px] font-semibold text-stone-700 shadow-md backdrop-blur" aria-label="Map marker legend">
          <span className="inline-flex items-center gap-2"><i className="job-map-marker-legend">J</i>Job listing areas</span>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-5 z-[500] w-[min(92%,560px)] -translate-x-1/2">
          <label className="job-map-location-search pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-3.5 shadow-[0_12px_36px_-18px_rgba(40,29,20,.55)] backdrop-blur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-stone-500" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input type="search" value={locationSearch} onChange={(event) => { setLocationSearch(event.target.value); setSearchCurrentArea(false) }} placeholder="Search city, address or place" aria-label="Search map location" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:ring-0" />
          </label>
          <div className="mt-3 flex justify-center"><button type="button" onClick={() => setSearchCurrentArea(true)} className="job-map-area-button pointer-events-auto rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-lg hover:-translate-y-0.5 hover:bg-[#FFFDF9]">Search this area</button></div>
        </div>
        <div className="absolute bottom-5 left-4 z-[500] rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-stone-700 shadow-md">{showcaseAreas.length} mapped areas · {filteredShowcaseJobs.length} dataset listings</div>
        {searchCurrentArea && <button type="button" onClick={() => setSearchCurrentArea(false)} className="absolute bottom-5 right-4 z-[500] rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-stone-700 shadow-md">Clear map area search</button>}
      </section>

      {selectedShowcaseJob && <ShowcaseJobDetailsModal job={selectedShowcaseJob} onClose={closeShowcaseDetails} />}
    </div>
  )
}
