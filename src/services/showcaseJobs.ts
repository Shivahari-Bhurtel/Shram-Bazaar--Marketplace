import { findJobMapArea } from "../data/jobMapConfig"

export type ShowcaseJob = {
  id: number
  title: string
  company: string | null
  location: string | null
  country: string | null
  salaryText: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  category: string | null
  deadline: string | null
  experience: string | null
  skills: string[]
  jobLevel: string | null
  jobTypes: string[]
  vacancies: number | null
  postedDate: string | null
  source: string
  sourceUrl: string | null
  scrapedAt: string | null
  availabilityStatus: "UNVERIFIED_HISTORICAL" | string
  mapArea: string | null
  mapLatitude: number | null
  mapLongitude: number | null
}

export type ShowcaseJobFilters = {
  keyword?: string
  location?: string
  category?: string
  jobType?: string
  minSalary?: string | number
  maxSalary?: string | number
  source?: string
}

export function searchShowcaseJobs(filters: ShowcaseJobFilters = {}, signal?: AbortSignal) {
  return loadLocalShowcaseJobs(filters, signal)
}

async function loadLocalShowcaseJobs(filters: ShowcaseJobFilters, signal?: AbortSignal) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/nepali_jobs.json`, { signal })
  if (!response.ok) throw new Error(`The bundled dataset returned HTTP ${response.status}`)
  const jobs = await response.json() as ShowcaseJob[]
  const keyword = normalize(filters.keyword)
  const location = normalize(filters.location)
  const category = normalize(filters.category)
  const jobType = normalize(filters.jobType)
  const source = normalize(filters.source)
  const minSalary = filters.minSalary === undefined || filters.minSalary === "" ? null : Number(filters.minSalary)
  const maxSalary = filters.maxSalary === undefined || filters.maxSalary === "" ? null : Number(filters.maxSalary)

  return jobs.map((job) => {
    if (job.mapArea || !job.location) return job
    const match = findJobMapArea(job.location)
    if (!match) return job
    const [name, area] = match
    return { ...job, mapArea: name === "kathmandu valley" ? "Kathmandu" : name[0].toUpperCase() + name.slice(1), mapLatitude: area.center[1], mapLongitude: area.center[0] }
  }).filter((job) => {
    const searchable = normalize([job.title, job.company, job.location, job.category, job.experience, job.jobLevel, job.source, ...job.skills, ...job.jobTypes].filter(Boolean).join(" "))
    const low = job.salaryMin ?? job.salaryMax
    const high = job.salaryMax ?? job.salaryMin
    return (!keyword || searchable.includes(keyword))
      && (!location || normalize(`${job.location || ""} ${job.mapArea || ""}`).includes(location))
      && (!category || normalize(job.category).includes(category) || searchable.includes(category))
      && (!jobType || job.jobTypes.some((type) => normalize(type).includes(jobType)))
      && (!source || normalize(job.source) === source)
      && (minSalary === null || (high != null && high >= minSalary))
      && (maxSalary === null || (low != null && low <= maxSalary))
  })
}

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}
