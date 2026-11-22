import { useEffect, useMemo, useState } from "react"
import WorkerCard, { formatHirePrice, workerLocation } from "../../components/provider/hire/WorkerCard"
import WorkerProfile from "../../components/provider/hire/WorkerProfile"
import RatingStars from "../../components/provider/hire/RatingStars"
import type { HireWorker, HireWorkerDataset } from "../../types/hireWorker"
import type { WorkerProfile as WorkerProfileData, WorkerServiceListing } from "../../types"
import { useApp } from "../../store/AppContext"
import { apiRequest } from "../../services/backendApi"

type ViewMode = "grid" | "list"
type Filters = { location: string; profession: string; availability: string; skill: string; payment: string; minimumRating: string; maximumRate: string }
const emptyFilters: Filters = { location: "", profession: "", availability: "", skill: "", payment: "", minimumRating: "", maximumRate: "" }
const workerServicesEvent = "shram-worker-services-updated"
type PublishedWorkerService = {
  worker: HireWorker
  service: WorkerServiceListing
}

function experienceYears(profile: WorkerProfileData) {
  const years = profile.experience.reduce((total, item) => {
    const match = item.duration.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i)
    return total + (match ? Number(match[1]) : 0)
  }, 0)
  return years || undefined
}

function hireWorkerFromProfile(profile: WorkerProfileData, service: WorkerServiceListing): HireWorker {
  const type = service.pricingType === "PER_HOUR" ? "hourly" : service.pricingType === "PER_DAY" ? "daily" : service.pricingType === "NEGOTIABLE" ? "fixed" : service.pricingType === "FIXED" ? "project" : "fixed"
  const period = service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : service.pricingType === "NEGOTIABLE" ? " · quote" : " starting"
  const amount = Number(service.price || 0)
  const display = `${service.pricingType === "NEGOTIABLE" ? "Quote on request" : `Rs. ${amount.toLocaleString()}${period}`}${service.negotiable && service.pricingType !== "NEGOTIABLE" ? " · negotiable" : ""}`
  return {
    id: profile.id,
    name: profile.name,
    profileImage: profile.photo,
    profession: profile.professionalTitle || service.category,
    category: service.category,
    location: { city: profile.location, district: profile.district, country: "Nepal" },
    description: profile.bio,
    skills: profile.skills,
    experience: { years: experienceYears(profile) },
    rating: profile.rating,
    ratingCount: profile.rating ? profile.totalJobs : 0,
    pricing: { amount, currency: "Rs.", type, display },
    availability: { status: profile.acceptingWork === false ? "busy" : "available", statusLabel: profile.acceptingWork === false ? "Busy" : "Available" },
    isPublished: true,
  }
}

function PublishedServiceCard({ listing, layout, onViewProfile }: { listing: PublishedWorkerService; layout: ViewMode; onViewProfile: (worker: HireWorker, service: WorkerServiceListing) => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const { worker, service } = listing
  const isList = layout === "list"
  const status = worker.availability?.status
  const skills = worker.skills || []
  return (
    <article className={`flex h-full flex-col border border-[#E2E8E3] bg-white shadow-[0_1px_3px_rgba(20,45,31,0.04)] transition hover:border-[#B8CDBD] hover:shadow-[0_8px_24px_rgba(20,45,31,0.08)] ${isList ? "sm:flex-row sm:items-center sm:gap-6 sm:p-5" : "p-5"}`}>
      <div className={`flex shrink-0 flex-col items-center ${isList ? "sm:w-36" : ""}`}>
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#E5EAE6] bg-[#F3F6F3] shadow-sm">
          {worker.profileImage && !imageFailed ? <img src={worker.profileImage} alt={`${worker.name} profile`} className="h-full w-full object-cover" onError={() => setImageFailed(true)} /> : worker.name.trim().charAt(0).toUpperCase() || "W"}
        </div>
        <span className={`mt-3 inline-flex min-h-7 items-center gap-2 px-1 text-sm font-semibold ${status === "busy" ? "bg-transparent text-stone-700" : status === "available-soon" || status === "available_soon" ? "bg-transparent text-amber-800" : "bg-transparent text-[#164E38]"}`}>
          <span className={`h-2 w-2 rounded-full ${status === "busy" ? "bg-stone-500" : status === "available-soon" || status === "available_soon" ? "bg-amber-600" : "bg-[#236B4B]"}`} />
          {worker.availability?.statusLabel || (status === "busy" ? "Busy" : status === "available-soon" || status === "available_soon" ? "Soon" : "Available")}
        </span>
        <div className="mt-1.5"><RatingStars rating={worker.rating} count={worker.ratingCount} compact /></div>
      </div>
      <div className={`flex min-w-0 flex-1 flex-col ${isList ? "mt-4 sm:mt-0" : "mt-4 text-center"}`}>
        <h2 className="truncate text-xl font-bold leading-7 tracking-[-0.02em] text-[#1A2420]" title={worker.name}>{worker.name}</h2>
        <p className="mt-1.5 truncate text-[17px] font-bold leading-6 text-black" title={worker.profession || service.category}>{worker.profession || service.category}</p>
        <p className={`mt-2 flex items-center gap-1.5 text-[15px] font-semibold text-black ${isList ? "" : "justify-center"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px] shrink-0" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span className="truncate" title={workerLocation(worker)}>{workerLocation(worker)}</span>
        </p>
        <div className={`mt-3 flex min-h-12 flex-wrap content-start gap-x-2 gap-y-1 text-[11px] leading-4 ${isList ? "" : "justify-center"}`}>
          {skills.slice(0, 3).map((skill, index) => <span key={skill} className="inline-flex items-center gap-2 font-medium text-black" title={skill}><span className="truncate">{skill}</span>{index < Math.min(skills.length, 3) - 1 && <span className="text-[#A2ACA4]" aria-hidden="true">·</span>}</span>)}
          {skills.length > 3 && <span className="inline-flex items-center gap-2 font-semibold text-black"><span className="font-normal text-[#A2ACA4]" aria-hidden="true">·</span>+{skills.length - 3} more</span>}
          {!skills.length && <span className="text-xs text-[#8A938C]">No skills listed</span>}
        </div>
        <div className={`mt-4 flex gap-3 border-t border-[#E7ECE8] pt-4 ${isList ? "items-end justify-between" : "flex-col items-stretch text-left"}`}>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-6 tabular-nums text-[#164E38]" title={formatHirePrice(worker)}>{formatHirePrice(worker)}</p>
            <p className="mt-1.5 text-sm font-medium text-[#657168]">{typeof worker.experience?.years === "number" ? `${worker.experience.years} ${worker.experience.years === 1 ? "year" : "years"} experience` : worker.experience?.level || "Experience not listed"}</p>
          </div>
          <button type="button" onClick={() => onViewProfile(worker, service)} className={`min-h-10 shrink-0 border border-[#164E38] px-4 text-sm font-bold text-[#164E38] transition hover:bg-[#EAF3ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236B4B] ${isList ? "" : "w-full"}`}>View Profile</button>
        </div>
      </div>
    </article>
  )
}

function isWorkerRecord(value: unknown): value is HireWorker {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return typeof record.id === "string" && typeof record.name === "string"
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b))
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-xs font-semibold text-[#536057]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full border border-[#DDE4DE] bg-white px-3 text-sm font-medium text-[#25342B] outline-none transition focus:border-[#236B4B] focus:ring-2 focus:ring-[#236B4B]/15">
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="border border-[#E2E8E3] bg-white px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center border border-[#DCE8DE] bg-[#F2F7F3] text-[#236B4B]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true"><circle cx="10.5" cy="8" r="3.5"/><path d="M3.5 20v-1a7 7 0 0 1 12.7-4M17 17h5m-2.5-2.5v5"/></svg>
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight text-[#1A2420]">{filtered ? "No matching workers" : "No workers available yet"}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#68756C]">{filtered ? "Try adjusting your search or filters." : "Worker profiles will appear here when they publish their services on Shram Bazaar."}</p>
      {filtered && <button type="button" onClick={onClear} className="mt-5 min-h-10 border border-[#164E38] px-4 text-sm font-semibold text-[#164E38] hover:bg-[#EAF3ED]">Clear filters</button>}
    </div>
  )
}

export default function Hire() {
  const { state, navigate } = useApp()
  const [workers, setWorkers] = useState<HireWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("grid")
  const [selectedWorker, setSelectedWorker] = useState<HireWorker | null>(null)
  const [selectedPublishedService, setSelectedPublishedService] = useState<WorkerServiceListing | null>(null)
  const [selectedJobId, setSelectedJobId] = useState("")
  const [publishedServices, setPublishedServices] = useState<PublishedWorkerService[]>([])
  const [publishedServicesLoading, setPublishedServicesLoading] = useState(false)
  const [publishedServicesError, setPublishedServicesError] = useState("")
  const providerJobs = state.jobs.filter((job) => job.providerId === state.providerProfile?.id && job.status === "active")
  const localWorkerDirectory = import.meta.env.VITE_DEMO_MODE === "true" || (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname))

  useEffect(() => {
    if (!localWorkerDirectory) return
    const refreshPublishedServices = () => {
      const listings: PublishedWorkerService[] = []
      state.allWorkerProfiles.forEach((profile) => {
        let services = profile.services || []
        try {
          const saved = JSON.parse(localStorage.getItem(`shram-worker-services:${profile.id}`) || "null")
          if (Array.isArray(saved)) services = saved
        } catch { /* Keep profile services if the local listing cache cannot be read. */ }
        services.filter((service): service is WorkerServiceListing => Boolean(service && service.active)).forEach((service) => {
          listings.push({
            worker: hireWorkerFromProfile(profile, service),
            service,
          })
        })
      })
      setPublishedServices(listings)
      setPublishedServicesLoading(false)
      setPublishedServicesError("")
    }
    refreshPublishedServices()
    window.addEventListener("storage", refreshPublishedServices)
    window.addEventListener(workerServicesEvent, refreshPublishedServices)
    return () => {
      window.removeEventListener("storage", refreshPublishedServices)
      window.removeEventListener(workerServicesEvent, refreshPublishedServices)
    }
  }, [localWorkerDirectory, state.allWorkerProfiles])

  useEffect(() => {
    if (localWorkerDirectory || !state.providerProfile) return
    let active = true
    let loadedOnce = false
    type SearchWorker = {
      userId: number
      fullName: string
      profilePictureUrl?: string
      address?: string
      bio?: string
      skills?: string[]
      totalExperienceYears?: number
      averageRating?: number
      reviewCount?: number
      verified?: boolean
      acceptingWork?: boolean
      services?: Array<Omit<WorkerServiceListing, "id" | "skills" | "active"> & { id: number; skills?: string[]; active?: boolean }>
    }
    const refreshPublishedServices = async () => {
      if (!loadedOnce) setPublishedServicesLoading(true)
      try {
        const workers = await apiRequest<SearchWorker[]>("/api/provider/workers/search")
        if (!active) return
        const listings = workers.flatMap((worker) => (worker.services || []).filter((service) => service.active !== false).map((rawService) => {
          const service: WorkerServiceListing = { ...rawService, id: String(rawService.id), skills: rawService.skills || [], active: true }
          const ratePeriod = service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : service.pricingType === "NEGOTIABLE" ? " · quote" : " starting"
          const rate = service.pricingType === "NEGOTIABLE" ? "Quote on request" : `Rs. ${Number(service.price || 0).toLocaleString()}${ratePeriod}${service.negotiable ? " · negotiable" : ""}`
          return {
            worker: {
              id: String(worker.userId), name: worker.fullName, profileImage: worker.profilePictureUrl,
              profession: service.category, category: service.category,
              location: { city: worker.address?.split(",")[0]?.trim(), district: worker.address?.split(",").at(-1)?.trim(), country: "Nepal" },
              description: worker.bio, skills: worker.skills || [], experience: { years: worker.totalExperienceYears },
              rating: worker.averageRating || 0, ratingCount: worker.reviewCount || 0,
              pricing: { amount: service.price, currency: "Rs.", type: service.pricingType === "PER_HOUR" ? "hourly" : service.pricingType === "PER_DAY" ? "daily" : service.pricingType === "NEGOTIABLE" ? "fixed" : "project", display: rate },
              availability: { status: worker.acceptingWork === false ? "busy" : "available", statusLabel: worker.acceptingWork === false ? "Busy" : "Available" },
              isPublished: true,
            },
            service,
          }
        }))
        setPublishedServices(listings)
        setPublishedServicesError("")
      } catch (error: unknown) {
        if (active) setPublishedServicesError(error instanceof Error ? error.message : "Published worker services could not be loaded.")
      } finally {
        if (active) {
          loadedOnce = true
          setPublishedServicesLoading(false)
        }
      }
    }
    const refreshFromWorkerSave = (event: StorageEvent) => {
      if (event.key?.startsWith("shram-worker-services:")) void refreshPublishedServices()
    }
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshPublishedServices() }
    void refreshPublishedServices()
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshPublishedServices() }, 30_000)
    window.addEventListener("focus", refreshWhenVisible)
    window.addEventListener("storage", refreshFromWorkerSave)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshWhenVisible)
      window.removeEventListener("storage", refreshFromWorkerSave)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [localWorkerDirectory, state.providerProfile?.id])

  useEffect(() => {
    let cancelled = false
    const loadWorkers = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/hire-workers.json`, { headers: { Accept: "application/json" } })
        if (!response.ok) throw new Error(`Worker directory could not be loaded (HTTP ${response.status}).`)
        const data: unknown = await response.json()
        if (!data || typeof data !== "object" || !Array.isArray((data as HireWorkerDataset).workers)) {
          throw new Error("The worker directory data is not in the expected format.")
        }
        const parsed = (data as HireWorkerDataset).workers
        if (!parsed.every(isWorkerRecord)) throw new Error("One or more worker profiles are missing a valid ID or name.")
        const ids = new Set<string>()
        const publishedWorkers = parsed.filter((worker) => worker.isPublished !== false && !ids.has(worker.id) && Boolean(ids.add(worker.id)))
        if (!cancelled) setWorkers(publishedWorkers)
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "The worker directory could not be loaded.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadWorkers()
    return () => { cancelled = true }
  }, [])

  const options = useMemo(() => ({
    locations: unique(workers.flatMap((worker) => [worker.location?.city, worker.location?.district])),
    professions: unique(workers.flatMap((worker) => [worker.profession, worker.category])),
    availability: unique(workers.map((worker) => worker.availability?.status || "unknown").map((value) => value === "available-soon" || value === "available_soon" ? "Available soon" : value.charAt(0).toUpperCase() + value.slice(1))),
    skills: unique(workers.flatMap((worker) => worker.skills ?? [])),
    payment: unique(workers.map((worker) => worker.pricing?.type)),
  }), [workers])

  const visibleWorkers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const selectedJob = providerJobs.find((job) => job.id === selectedJobId)
    return workers.filter((worker) => {
      const searchable = [worker.name, worker.profession, worker.category, worker.description, worker.location?.city, worker.location?.district, worker.location?.country, ...(worker.skills ?? [])].filter(Boolean).join(" ").toLocaleLowerCase()
      if (query && !searchable.includes(query)) return false
      if (filters.location && worker.location?.city !== filters.location && worker.location?.district !== filters.location) return false
      if (filters.profession && worker.profession !== filters.profession && worker.category !== filters.profession) return false
      const availability = worker.availability?.status || "unknown"
      const selectedAvailability = filters.availability.toLowerCase().replace(" ", "_")
      if (filters.availability && availability !== selectedAvailability && availability !== selectedAvailability.replace("_", "-")) return false
      if (filters.skill && !(worker.skills ?? []).includes(filters.skill)) return false
      if (filters.payment && worker.pricing?.type !== filters.payment) return false
      if (filters.minimumRating && (worker.rating || 0) < Number(filters.minimumRating)) return false
      if (filters.maximumRate && (worker.pricing?.amount == null || worker.pricing.amount > Number(filters.maximumRate))) return false
      if (selectedJob && selectedJob.skillsRequired.length > 0 && !selectedJob.skillsRequired.some((skill) => (worker.skills || []).some((workerSkill) => workerSkill.toLowerCase() === skill.toLowerCase()))) return false
      return true
    })
  }, [workers, search, filters, providerJobs, selectedJobId])

  const hasFilters = Boolean(search.trim() || selectedJobId || Object.values(filters).some(Boolean))
  const activeFilterCount = Object.values(filters).filter(Boolean).length + Number(Boolean(selectedJobId))
  const setFilter = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => { setSearch(""); setFilters(emptyFilters); setSelectedJobId("") }

  return (
    <div className="provider-page mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <header className="flex flex-col justify-between gap-5 border-b border-[#E4EAE5] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-[#1A2420] sm:text-4xl">Find Workers</h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#68756C]">Discover skilled workers across Nepal and connect with the right talent for your work.</p>
        </div>
      </header>

      <section aria-label="Search and filter workers" className="mt-6 border border-[#E2E8E3] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search workers</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D8980]" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workers by name, profession or skills..." className="h-11 w-full border border-[#DDE4DE] bg-white pl-10 pr-4 text-sm text-[#1A2420] outline-none transition placeholder:text-[#8A938C] focus:border-[#236B4B] focus:ring-2 focus:ring-[#236B4B]/15" />
        </label>
        <button type="button" aria-expanded={filtersOpen} aria-controls="hire-worker-filters" onClick={() => setFiltersOpen((open) => !open)} className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236B4B]/30 ${filtersOpen || activeFilterCount ? "border-[#236B4B] bg-[#EAF3ED] text-[#164E38]" : "border-[#DDE4DE] bg-white text-[#34443A] hover:bg-[#F7F9F7]"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="8" cy="6" r="1.5" fill="white"/><circle cx="15" cy="12" r="1.5" fill="white"/><circle cx="11" cy="18" r="1.5" fill="white"/></svg>
          Filters{activeFilterCount > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center bg-[#164E38] px-1 text-xs font-bold text-white">{activeFilterCount}</span>}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        </div>
        {filtersOpen && <div id="hire-worker-filters" className="mt-4 grid grid-cols-1 gap-3 border-t border-[#EEF1EE] pt-4 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect label="District" value={filters.location} options={options.locations} onChange={(value) => setFilter("location", value)} />
          <FilterSelect label="Service category" value={filters.profession} options={options.professions} onChange={(value) => setFilter("profession", value)} />
          <FilterSelect label="Availability" value={filters.availability} options={options.availability} onChange={(value) => setFilter("availability", value)} />
          <FilterSelect label="Skills" value={filters.skill} options={options.skills} onChange={(value) => setFilter("skill", value)} />
          <FilterSelect label="Payment type" value={filters.payment} options={options.payment} onChange={(value) => setFilter("payment", value)} />
          <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-semibold text-[#536057]">Minimum rating</span><select value={filters.minimumRating} onChange={(event) => setFilter("minimumRating", event.target.value)} className="h-10 w-full border border-[#DDE4DE] bg-white px-3 text-sm text-[#25342B] focus:border-[#236B4B] focus:outline-none"><option value="">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="5">5 stars</option></select></label>
          <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-semibold text-[#536057]">Maximum indicative rate (NPR)</span><input type="number" min="0" value={filters.maximumRate} onChange={(event) => setFilter("maximumRate", event.target.value)} placeholder="Any rate" className="h-10 w-full border border-[#DDE4DE] bg-white px-3 text-sm text-[#25342B] focus:border-[#236B4B] focus:outline-none" /></label>
          <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-semibold text-[#536057]">Match against task</span><select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)} className="h-10 w-full border border-[#DDE4DE] bg-white px-3 text-sm text-[#25342B] focus:border-[#236B4B] focus:outline-none"><option value="">General profile match</option>{providerJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
        </div>}
        <div className={`flex flex-wrap items-center justify-between gap-3 ${filtersOpen ? "mt-4 border-t border-[#EEF1EE] pt-3" : "mt-3"}`}>
          <div className="flex min-h-8 flex-wrap items-center gap-2">
            {Object.entries(filters).filter(([, value]) => Boolean(value)).map(([key, value]) => <span key={key} className="inline-flex min-h-7 items-center gap-1.5 border border-[#DCE8DE] bg-[#F2F7F3] px-2.5 py-1 text-xs font-semibold text-[#164E38]">{value}<button type="button" aria-label={`Remove ${value} filter`} onClick={() => setFilter(key as keyof Filters, "")} className="text-sm leading-none hover:text-black">×</button></span>)}
            {hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#164E38] underline underline-offset-2">Clear filters</button>}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Worker display mode">
            <button type="button" onClick={() => setView("grid")} aria-pressed={view === "grid"} aria-label="Grid view" className={`flex h-10 w-10 items-center justify-center border ${view === "grid" ? "border-[#164E38] bg-[#EAF3ED] text-[#164E38]" : "border-[#DDE4DE] text-[#657168] hover:bg-[#F7F9F7]"}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></button>
            <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view" className={`flex h-10 w-10 items-center justify-center border ${view === "list" ? "border-[#164E38] bg-[#EAF3ED] text-[#164E38]" : "border-[#DDE4DE] text-[#657168] hover:bg-[#F7F9F7]"}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M9 5h12M9 12h12M9 19h12"/><circle cx="4" cy="5" r=".8" fill="currentColor"/><circle cx="4" cy="12" r=".8" fill="currentColor"/><circle cx="4" cy="19" r=".8" fill="currentColor"/></svg></button>
          </div>
        </div>
      </section>

      {loadError ? (
        <div role="alert" className="mt-6 border border-red-200 bg-white p-6 text-sm text-red-800"><h2 className="font-bold">Worker directory unavailable</h2><p className="mt-1">{loadError}</p><p className="mt-2 text-red-700">Check that <code className="font-mono">public/data/hire-workers.json</code> contains a workers array with an ID and name for each profile.</p></div>
      ) : loading ? (
        <div className={`mt-6 grid gap-4 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`} aria-label="Loading worker profiles">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="flex animate-pulse flex-col items-center border border-[#E2E8E3] bg-white p-5"><span className="h-24 w-24 rounded-full bg-[#EEF2EE]"/><span className="mt-4 h-5 w-2/3 bg-[#EEF2EE]"/><span className="mt-2 h-4 w-1/2 bg-[#F2F4F2]"/><span className="mt-5 h-14 w-full bg-[#F2F4F2]"/></div>)}
        </div>
      ) : visibleWorkers.length === 0 ? (
        <div className="mt-6"><EmptyState filtered={workers.length > 0 && hasFilters} onClear={clearFilters} /></div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-[#68756C]"><span>Showing <strong className="font-bold text-[#1A2420]">{visibleWorkers.length}</strong> of <strong className="font-bold text-[#1A2420]">{workers.length}</strong> workers</span></div>
          <div className={`mt-3 grid gap-4 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            {visibleWorkers.map((worker) => <WorkerCard key={worker.id} worker={worker} layout={view} onViewProfile={(selected) => { setSelectedPublishedService(null); setSelectedWorker(selected) }} />)}
          </div>
        </>
      )}

      <section aria-labelledby="published-worker-services-title" className="mt-12 border-t border-[#E2E8E3] pt-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="published-worker-services-title" className="text-2xl font-bold tracking-tight text-[#1A2420]">Services published by workers</h2>
          </div>
        </header>
        {publishedServicesLoading ? (
          <p className="mt-5 border border-[#E2E8E3] bg-white p-5 text-sm text-[#68756C]">Loading published worker services…</p>
        ) : publishedServicesError ? (
          <p role="status" className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{publishedServicesError}</p>
        ) : publishedServices.length ? (
          <div className={`mt-5 grid gap-4 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            {publishedServices.map((listing) => <PublishedServiceCard key={`${listing.worker.id}-${listing.service.id}`} listing={listing} layout={view} onViewProfile={(worker, service) => { setSelectedPublishedService(service); setSelectedWorker(worker) }} />)}
          </div>
        ) : (
          <p className="mt-5 border border-dashed border-[#CBD8CE] bg-white px-5 py-8 text-center text-sm text-[#68756C]">Published worker services will appear here when workers add them to their schedules.</p>
        )}
      </section>
      {selectedWorker && <WorkerProfile key={`${selectedWorker.id}-${selectedPublishedService?.id || "profile"}`} worker={selectedWorker} service={selectedPublishedService} onClose={() => { setSelectedWorker(null); setSelectedPublishedService(null) }} />}
    </div>
  )
}
