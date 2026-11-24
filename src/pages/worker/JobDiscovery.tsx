import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import JobDiscoveryMap from "../../components/worker/JobDiscoveryMap"
import DemoJobCard from "../../components/DemoJobCard"
import DemoJobDetailsModal from "../../components/DemoJobDetailsModal"
import JobCard from "../../components/JobCard"
import { useDemoJobState } from "../../hooks/useDemoJobState"
import { distanceBetweenKm, filterDemoJobs, getBundledDemoJobs, loadDemoJobs, type DemoJob } from "../../services/demoJobs"
import { useApp } from "../../store/AppContext"

const CATEGORIES = [
  { value: "Construction & Skilled Trades", label: "Trades" },
  { value: "Delivery & Logistics", label: "Delivery" },
  { value: "Hospitality & Service", label: "Hospitality" },
  { value: "Retail & Sales", label: "Retail" },
  { value: "Agriculture & Local Production", label: "Agriculture" },
  { value: "Technical & Repair Work", label: "Technical & Repair" },
  { value: "Cleaning & Maintenance", label: "Cleaning" },
  { value: "Office Support & General Work", label: "Office Support" },
]
const DISTANCES = [1, 3, 5, 10] as const

export default function JobDiscovery() {
  const { state, navigate } = useApp()
  const { jobs: marketplaceJobs, workerProfile } = state
  const demoState = useDemoJobState(workerProfile?.id)
  const [allDemoJobs, setAllDemoJobs] = useState<DemoJob[]>(() => getBundledDemoJobs())
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState(() => state.discoverySkill || "")
  const [category, setCategory] = useState("")
  const [city, setCity] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("")
  const [experience, setExperience] = useState("")
  const [salaryType, setSalaryType] = useState("")
  const [minSalary, setMinSalary] = useState("")
  const [maxSalary, setMaxSalary] = useState("")
  const [skillPreference, setSkillPreference] = useState("")
  const [maxDistance, setMaxDistance] = useState<number | null>(null)
  const [sortOrder, setSortOrder] = useState<"recommended" | "nearest">("recommended")
  const [showFilters, setShowFilters] = useState(false)
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null)
  const [searchCurrentArea, setSearchCurrentArea] = useState(false)
  const [selectedJob, setSelectedJob] = useState<DemoJob | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string>()
  const [routeDismissedJobId, setRouteDismissedJobId] = useState<string>()
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState("")
  const [fitMap, setFitMap] = useState(true)
  const [notice, setNotice] = useState("")
  const [discoveryView, setDiscoveryView] = useState<"map" | "list">("map")
  const locationWatchRef = useRef<number | null>(null)
  const locationWatchTokenRef = useRef(0)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      demoState.setUserLocation(null)
      setSortOrder("recommended")
      setLocationMessage("Location sharing is unavailable in this browser. Choose a city or locality instead.")
      return
    }
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current)
    const token = ++locationWatchTokenRef.current
    setLocating(true)
    setLocationMessage("")
    const watchId = navigator.geolocation.watchPosition(({ coords }) => {
      if (token !== locationWatchTokenRef.current) return
      const { latitude, longitude, accuracy } = coords
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setLocating(false)
        setLocationMessage("Your browser returned an invalid location. Check GPS access and retry.")
        return
      }
      demoState.setUserLocation({ latitude, longitude, accuracy: Number.isFinite(accuracy) ? accuracy : undefined })
      setMaxDistance(null)
      setSortOrder("nearest")
      setFitMap(false)
      setLocationMessage("Current location updated.")
      setLocating(false)
    }, (error) => {
      if (token !== locationWatchTokenRef.current) return
      if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current)
      locationWatchRef.current = null
      setLocating(false)
      demoState.setUserLocation(null)
      setMaxDistance(null)
      setSortOrder("recommended")
      setLocationMessage(error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. Enable it in your browser settings, then retry."
        : error.code === error.POSITION_UNAVAILABLE
          ? "Your current location is unavailable. Check GPS or device location services, then retry."
          : "Getting your location timed out. Check GPS access and retry.")
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
    locationWatchRef.current = watchId
  }, [demoState.setUserLocation])

  useEffect(() => {
    const controller = new AbortController()
    loadDemoJobs(controller.signal)
      .then((items) => { setAllDemoJobs(items); setLoadError("") })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setLoadError(error.message)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!state.currentJobId || allDemoJobs.length === 0) return
    const job = allDemoJobs.find((item) => item.id === state.currentJobId)
    if (!job) return
    setSelectedJobId(job.id)
    setRouteDismissedJobId(undefined)
    setFitMap(false)
    setDiscoveryView("map")
    demoState.markViewed(job.id)
  }, [state.currentJobId, allDemoJobs, demoState.markViewed])

  useEffect(() => {
    let active = true
    if (!navigator.geolocation || !navigator.permissions?.query) return () => { active = false }
    navigator.permissions.query({ name: "geolocation" })
      .then((permission) => {
        if (active && permission.state === "granted") requestLocation()
      })
      .catch(() => { /* The manual location button remains available when permission status cannot be queried. */ })

    return () => { active = false }
  }, [requestLocation])

  useEffect(() => () => {
    locationWatchTokenRef.current += 1
    if (locationWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatchRef.current)
  }, [])

  const workerSkills = workerProfile?.skills ?? []
  const matchingJobs = useMemo(() => filterDemoJobs(allDemoJobs, {
    keyword: search,
    category,
    city,
    location,
    jobType,
    experience,
    salaryType,
    minSalary,
    maxSalary,
    maxDistance,
    userLocation: demoState.userLocation,
    bounds: searchCurrentArea ? mapBounds : null,
  }).filter((job) => !skillPreference || job.skills.some((skill) => normalize(skill).includes(normalize(skillPreference))))
    .map((job) => {
      const distance = demoState.userLocation ? distanceBetweenKm(demoState.userLocation, job) : null
      const match = getMatchScore(job, workerSkills)
      if (skillPreference) match.reasons.push(`Matches selected skill: ${skillPreference}`)
      if (category) match.reasons.push("Matches selected category")
      if (city || location) match.reasons.push("Matches selected area")
      if (maxDistance != null && distance != null) match.reasons.push(`Within ${maxDistance} km`)
      if ((minSalary || maxSalary) && salaryType) match.reasons.push("Fits your pay range")
      match.score += Number(!!skillPreference) * 2 + Number(!!category) + Number(!!(city || location)) + Number(maxDistance != null) + Number(!!(minSalary || maxSalary))
      return { job, distance, match }
    })
    .sort((a, b) => sortOrder === "nearest" && a.distance != null && b.distance != null
      ? a.distance - b.distance
      : b.match.score - a.match.score || a.job.title.localeCompare(b.job.title)),
  [allDemoJobs, search, category, city, location, jobType, experience, salaryType, minSalary, maxSalary, skillPreference, maxDistance, demoState.userLocation, searchCurrentArea, mapBounds, workerSkills, sortOrder])
  // Keep the map feed sourced only from the Nepal showcase dataset above.
  // Remote IT providers and employer marketplace jobs are separate feeds and
  // must never be merged into map markers or map search results.
  const filteredJobs = useMemo(() => matchingJobs.map((item) => item.job), [matchingJobs])

  const locations = useMemo(() => [...new Set(allDemoJobs.map((job) => job.location))].sort((a, b) => a.localeCompare(b)), [allDemoJobs])
  const skills = useMemo(() => [...new Set(allDemoJobs.flatMap((job) => job.skills))].sort((a, b) => a.localeCompare(b)), [allDemoJobs])
  const selectedFocusJob = useMemo(() => allDemoJobs.find((job) => job.location === location && (!city || job.city === city)) || allDemoJobs.find((job) => job.city === city), [allDemoJobs, location, city])

  const demoApplications = demoState.applications
  const minimumPay = minSalary.trim() ? Number(minSalary) : null
  const maximumPay = maxSalary.trim() ? Number(maxSalary) : null
  const marketplaceResults = useMemo(() => marketplaceJobs.filter((job) => {
    if (job.status !== "active") return false
    const searchText = `${job.title} ${job.providerName} ${job.description} ${job.location} ${job.district} ${job.skillsRequired.join(" ")}`.toLowerCase()
    return (!search.trim() || searchText.includes(search.trim().toLowerCase()))
      && (!city || `${job.location} ${job.district}`.toLowerCase().includes(city.toLowerCase()))
      && (!location || `${job.location} ${job.district}`.toLowerCase().includes(location.toLowerCase()))
      && (minimumPay === null || !Number.isFinite(minimumPay) || job.payment >= minimumPay)
      && (maximumPay === null || !Number.isFinite(maximumPay) || job.payment <= maximumPay)
  }), [marketplaceJobs, search, city, location, minimumPay, maximumPay])
  const totalResults = filteredJobs.length + marketplaceResults.length

  const selectJob = useCallback((job: DemoJob) => {
    setSelectedJobId(job.id)
    setRouteDismissedJobId(undefined)
    demoState.markViewed(job.id)
  }, [demoState.markViewed])

  const handleSelectJob = useCallback((job: DemoJob) => {
    selectJob(job)
    setSelectedJob(job)
  }, [selectJob])

  const closeDetails = useCallback(() => setSelectedJob(null), [])
  const saveJob = useCallback((jobId: string) => {
    demoState.toggleSaved(jobId)
  }, [demoState.toggleSaved])
  const applyToJob = useCallback((jobId: string) => {
    if (demoApplications.some((item) => item.jobId === jobId)) return
    demoState.apply(jobId)
    setNotice("Your interest was saved on this device. It wasn’t sent to an employer.")
  }, [demoApplications, demoState.apply])

  const clearFilters = () => {
    setSearch("")
    setCategory("")
    setCity("")
    setLocation("")
    setJobType("")
    setExperience("")
    setSalaryType("")
    setMinSalary("")
    setMaxSalary("")
    setSkillPreference("")
    setMaxDistance(null)
    setSearchCurrentArea(false)
    setMapBounds(null)
    setSelectedJobId(undefined)
    setFitMap(true)
    setSortOrder("recommended")
  }

  const appliedIds = new Set(demoApplications.map((application) => application.jobId))
  const hasActiveFilters = Boolean(search || category || city || location || jobType || experience || salaryType || minSalary || maxSalary || skillPreference || maxDistance !== null || searchCurrentArea)

  return (
    <div className="job-discovery relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside id="job-list-view" className={`job-discovery-sidebar z-10 ${discoveryView === "list" ? "flex" : "hidden lg:flex"} ${discoveryView === "list" ? "w-full" : "w-full lg:w-[410px] xl:w-[440px]"} max-h-none shrink-0 flex-col border-b border-stone-200 bg-white lg:border-b-0 ${discoveryView === "map" ? "lg:border-r" : ""}`} aria-label="Find and filter jobs">
        <div className="shrink-0 border-b border-stone-200 px-4 pb-3 pt-2.5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("worker-dashboard")} className="inline-flex items-center gap-2 px-1 py-1 text-[14px] font-medium text-stone-600 transition-colors hover:text-primary-ink" aria-label="Back to worker dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></svg>Back
          </button>
          <button type="button" onClick={() => navigate("saved-jobs")} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[14px] font-medium text-stone-700 transition-colors hover:border-[#475231]/40 hover:bg-[#475231]/5 hover:text-[#475231]" aria-label={`Open saved jobs, ${demoState.savedIds.length} saved`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.75L6 21V4.75Z" /></svg>
            Saved ({demoState.savedIds.length})
          </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-baseline gap-2.5">
              <h1 className="job-panel-heading text-lg font-semibold text-stone-900">Jobs</h1>
              <p className="text-xs text-stone-500"><strong className="font-semibold text-stone-700">{totalResults}</strong> results</p>
            </div>
          </div>
          <div className="job-discovery-filters mt-2.5 flex gap-1.5 overflow-x-auto pb-1" aria-label="Filters and job categories">
            <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${showFilters ? "border-[#475231] bg-[#475231]/10 text-[#475231]" : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>
              {showFilters ? "Hide filters" : "Filters +"}
            </button>
            <button type="button" aria-pressed={!category} onClick={() => setCategory("")} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${!category ? "border-[#475231] bg-[#475231] text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}>All</button>
            {CATEGORIES.map((item) => <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(category === item.value ? "" : item.value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${category === item.value ? "border-[#475231] bg-[#475231] text-white" : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}>{item.label}</button>)}
          </div>
          <div className="mt-1 flex items-center">
            <button type="button" onClick={requestLocation} disabled={locating} className="group inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-[2px] border border-[#475231] bg-[#475231] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#364025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#475231] disabled:cursor-wait disabled:opacity-75" aria-label="Locate me">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-[18px] w-[18px] shrink-0 ${locating ? "animate-pulse" : "transition-transform group-hover:scale-110"}`} aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/></svg>
              <span className="truncate">{locating ? "Finding you…" : "Locate me"}</span>
            </button>
          </div>
          {locationMessage && !demoState.userLocation && <p role="status" className="mt-2 text-xs leading-relaxed text-stone-600">{locationMessage}</p>}
          {showFilters && <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl bg-stone-50 p-3">
            <Filter label="City" value={city} onChange={(value) => { setCity(value); setSearchCurrentArea(false) }}><option value="">All areas</option><option value="Kathmandu">Kathmandu</option><option value="Lalitpur">Lalitpur</option><option value="Bhaktapur">Bhaktapur</option><option value="Banepa">Banepa</option></Filter>
            <Filter label="Locality" value={location} onChange={(value) => { setLocation(value); setSearchCurrentArea(false) }}><option value="">All localities</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</Filter>
            <Filter label="Job type" value={jobType} onChange={setJobType}><option value="">Any type</option>{[...new Set(allDemoJobs.map((job) => job.job_type))].map((item) => <option key={item} value={item}>{item}</option>)}</Filter>
            <Filter label="Experience" value={experience} onChange={setExperience}><option value="">Any experience</option><option value="beginner">Beginner friendly</option><option value="experienced">Experience preferred</option></Filter>
            <Filter label="Pay period" value={salaryType} onChange={setSalaryType}><option value="">Any pay period</option><option value="monthly">Monthly</option><option value="daily">Daily wage</option><option value="hourly">Hourly</option></Filter>
            <Filter label="Skill match" value={skillPreference} onChange={setSkillPreference}><option value="">Any skill</option>{skills.map((item) => <option key={item} value={item}>{item}</option>)}</Filter>
            <label className="text-xs font-medium text-stone-600">Minimum pay<input type="number" min="0" value={minSalary} onChange={(event) => setMinSalary(event.target.value)} placeholder={salaryType ? "NPR" : "Select pay period"} disabled={!salaryType} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-800 disabled:bg-stone-100 disabled:text-stone-400" /></label>
            <label className="text-xs font-medium text-stone-600">Maximum pay<input type="number" min="0" value={maxSalary} onChange={(event) => setMaxSalary(event.target.value)} placeholder={salaryType ? "NPR" : "Select pay period"} disabled={!salaryType} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-800 disabled:bg-stone-100 disabled:text-stone-400" /></label>
            <div className="col-span-2">
              <p className="text-xs font-medium text-stone-600">Distance from your location</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <DistanceButton active={maxDistance === null} disabled={!demoState.userLocation} onClick={() => setMaxDistance(null)}>All</DistanceButton>
                {DISTANCES.map((distance) => <DistanceButton key={distance} active={maxDistance === distance} disabled={!demoState.userLocation} onClick={() => setMaxDistance(distance)}>{distance} km</DistanceButton>)}
              </div>
              {!demoState.userLocation && <p className="mt-1 text-[11px] text-stone-500">Share your location to enable distance filters.</p>}
            </div>
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-600">Sort<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "recommended" | "nearest")} className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700"><option value="recommended">Best match</option><option value="nearest" disabled={!demoState.userLocation}>Nearest first</option></select></label>
              <button type="button" onClick={clearFilters} disabled={!hasActiveFilters} className="text-xs font-semibold text-[#70472F] underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-45">Clear filters</button>
            </div>
          </div>}
          {hasActiveFilters && <div className="mt-2 flex justify-end"><button type="button" onClick={clearFilters} className="text-xs font-medium text-[#70472F] hover:underline">Clear filters</button></div>}
        </div>

        <div className="job-discovery-results min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[#FAF8F5] p-3 sm:p-4">
          {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">{notice}</p>}
          {loading && <p role="status" className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">Loading jobs…</p>}
          {loadError && <div role="alert" className="rounded-lg border border-amber-300 bg-white px-4 py-4 text-sm text-amber-950"><p className="font-semibold">Jobs could not be loaded</p><p className="mt-1">{loadError}</p><button type="button" onClick={() => { setLoading(true); setLoadError(""); void loadDemoJobs().then(setAllDemoJobs).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Please try again.")).finally(() => setLoading(false)) }} className="mt-3 rounded-lg bg-[#80502F] px-3 py-2 text-xs font-semibold text-white">Try again</button></div>}
          {!loading && !loadError && totalResults === 0 && <div className="rounded-xl border border-dashed border-stone-300 bg-white p-7 text-center"><p className="font-semibold text-stone-800">No jobs match these filters</p><p className="mt-1 text-sm text-stone-500">Try a nearby locality, broader pay range, or clear filters.</p><button type="button" onClick={clearFilters} className="mt-4 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700">Clear filters</button></div>}
          {matchingJobs.map(({ job }) => <DemoJobCard key={job.id} job={job} selected={selectedJobId === job.id} saved={demoState.savedIds.includes(job.id)} applied={appliedIds.has(job.id)} inlineSaveAction onOpen={handleSelectJob} onToggleSaved={saveJob} onApply={applyToJob} />)}
          {marketplaceResults.length > 0 && <section className="space-y-3 border-t border-stone-200 pt-4" aria-label="Employer-posted jobs"><div><h2 className="text-sm font-bold text-stone-900">Employer-posted jobs</h2><p className="mt-1 text-xs text-stone-500">Recently posted through Shram Bazar.</p></div>{marketplaceResults.map((job) => <JobCard key={`marketplace-${job.id}`} job={job} compact />)}</section>}
        </div>
      </aside>

      <section id="job-map-view" aria-label="Job map" className={`${discoveryView === "map" ? "flex" : "hidden"} relative min-h-0 flex-1 bg-[#E8E6DF]`}>
        <JobDiscoveryMap jobs={filteredJobs} selectedJobId={selectedJobId} routeJob={selectedJobId && routeDismissedJobId !== selectedJobId ? allDemoJobs.find((job) => job.id === selectedJobId) : undefined} userLocation={demoState.userLocation} focusLocation={selectedFocusJob ? { latitude: selectedFocusJob.latitude, longitude: selectedFocusJob.longitude } : null} onSelectJob={selectJob} onOpenJob={handleSelectJob} onCloseRoute={() => setRouteDismissedJobId(selectedJobId)} onRequestLocation={requestLocation} locating={locating} locationMessage={locationMessage} onBoundsChange={setMapBounds} onMapInteraction={() => setFitMap(false)} fitToJobs={fitMap && !searchCurrentArea} searchCurrentArea={searchCurrentArea} active={discoveryView === "map"} />
        <div className="pointer-events-none absolute left-4 top-5 z-[500] flex flex-wrap gap-2 rounded-xl border border-white/70 bg-white/90 p-2.5 text-[11px] font-semibold text-stone-700 shadow-md backdrop-blur" aria-label="Map marker legend"><span className="inline-flex items-center gap-2"><i className="job-map-legend-bubble">Rs.</i>Pay</span><span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow" />You</span></div>
        <div className="pointer-events-none absolute left-1/2 top-5 z-[500] w-[min(92%,560px)] -translate-x-1/2">
          <div className="job-map-search pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-3.5 shadow-[0_12px_36px_-18px_rgba(40,29,20,.55)] backdrop-blur"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-stone-500" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); if (searchCurrentArea) { setSearchCurrentArea(false); setMapBounds(null) } }} placeholder="Search Nepal jobs by title, skill, or location" aria-label="Search Nepal showcase jobs by title, skill, or location" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:ring-0" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear job search" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900">×</button>}</div>
          <div className="mt-3 flex justify-center"><button type="button" onClick={() => { setSearchCurrentArea(true); setFitMap(false) }} className="job-map-area-button pointer-events-auto rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-lg hover:bg-[#FFFDF9]">Search this map area</button></div>
        </div>
        <div className="pointer-events-none absolute bottom-5 left-4 z-[500] rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-stone-700 shadow-md">{filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} shown · approximate locations</div>
        {searchCurrentArea && <button type="button" onClick={() => { setSearchCurrentArea(false); setMapBounds(null) }} className="absolute bottom-5 right-4 z-[500] rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-stone-700 shadow-md">Clear map area</button>}
        {city || location ? <div className="absolute bottom-16 right-4 z-[500] rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-stone-700 shadow-md">{selectedFocusJob ? `${selectedFocusJob.location}, ${selectedFocusJob.city}` : city || location}</div> : null}
        {!loading && !loadError && filteredJobs.length === 0 && <div className="absolute inset-x-4 bottom-20 z-[500] mx-auto max-w-md rounded-xl border border-stone-200 bg-white/95 p-4 text-center shadow-lg backdrop-blur"><p className="font-semibold text-stone-800">No jobs match your search</p><p className="mt-1 text-xs text-stone-500">Try a different job title, company, or skill.</p>{hasActiveFilters && <button type="button" onClick={clearFilters} className="mt-3 rounded-lg bg-[#80502F] px-3 py-2 text-xs font-semibold text-white">Clear filters</button>}</div>}
      </section>
      </div>

      {selectedJob && <DemoJobDetailsModal job={selectedJob} distance={demoState.userLocation ? distanceBetweenKm(demoState.userLocation, selectedJob) : null} saved={demoState.savedIds.includes(selectedJob.id)} applied={appliedIds.has(selectedJob.id)} matchReasons={getMatchScore(selectedJob, workerSkills).reasons} onClose={closeDetails} onViewMap={() => { closeDetails(); setDiscoveryView("map"); setFitMap(false) }} onToggleSaved={saveJob} onApply={applyToJob} />}
    </div>
  )
}

function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="text-xs font-medium text-stone-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-800">{children}</select></label>
}

function DistanceButton({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick} className={`rounded-full px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-[#80502F] text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100"}`}>{children}</button>
}

function getMatchScore(job: DemoJob, workerSkills: string[]) {
  const matches = job.skills.filter((skill) => workerSkills.some((workerSkill) => normalize(workerSkill) === normalize(skill)))
  const beginner = /no experience required|fresh workers welcome/i.test(job.experience)
  const reasons = matches.length ? [`Matches your skill: ${matches[0]}`] : []
  if (beginner) reasons.push("Suitable for beginners")
  return { score: matches.length * 10 + (beginner ? 2 : 0), reasons }
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}
