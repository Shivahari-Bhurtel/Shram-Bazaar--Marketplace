import { apiRequest } from "./backendApi"
import bundledDemoJobs from "../../shrambazar/src/main/resources/data/jobs.json"

export type DemoJob = {
  id: string
  title: string
  category: string
  company: string
  description: string
  location: string
  address: string
  city: "Kathmandu" | "Lalitpur" | "Bhaktapur" | string
  latitude: number
  longitude: number
  salary_min: number
  salary_max: number
  salary_type: "monthly" | "daily" | "hourly" | string
  job_type: string
  experience: string
  skills: string[]
  requirements: string[]
  vacancies: number
  posted_date: string
  deadline: string
  is_demo: true
  source: string
  location_accuracy: "approximate" | string
}

export type DemoJobFilters = {
  keyword?: string
  category?: string
  location?: string
  city?: string
  jobType?: string
  experience?: string
  salaryType?: string
  minSalary?: string | number
  maxSalary?: string | number
  maxDistance?: number | null
  userLocation?: { latitude: number; longitude: number } | null
  bounds?: [number, number, number, number] | null
}

export async function loadDemoJobs(signal?: AbortSignal): Promise<DemoJob[]> {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort()
  if (signal?.aborted) throw new DOMException("Job loading was cancelled.", "AbortError")
  signal?.addEventListener("abort", abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(), 3500)

  try {
    const value: unknown = await apiRequest<unknown>("/api/jobs/showcase", { signal: controller.signal })
    return validateDemoJobs(value)
  } catch {
    if (signal?.aborted) throw new DOMException("Job loading was cancelled.", "AbortError")
    // The frontend and backend share the same checked-in JSON source, so job
    // discovery remains usable when an API or database is not running locally.
    return validateDemoJobs(bundledDemoJobs)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener("abort", abortFromCaller)
  }
}

function validateDemoJobs(value: unknown): DemoJob[] {
  if (!Array.isArray(value)) throw new Error("The jobs service returned an invalid response.")
  if (value.length !== 80) throw new Error(`Expected all 80 supplied job listings, but received ${value.length}. Restart the local API to reload the supplied dataset.`)
  if (!value.every(isDemoJob)) throw new Error("Some job records are incomplete. The supplied dataset could not be fully loaded.")
  const jobs = value as DemoJob[]
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length) throw new Error("The jobs service returned duplicate listing IDs.")
  return jobs
}

export function filterDemoJobs(jobs: DemoJob[], filters: DemoJobFilters = {}) {
  const keyword = normalize(filters.keyword)
  const category = normalize(filters.category)
  const location = normalize(filters.location)
  const city = normalize(filters.city)
  const jobType = normalize(filters.jobType)
  const experience = normalize(filters.experience)
  const salaryType = normalize(filters.salaryType)
  const minSalary = filters.minSalary === undefined || filters.minSalary === "" ? null : Number(filters.minSalary)
  const maxSalary = filters.maxSalary === undefined || filters.maxSalary === "" ? null : Number(filters.maxSalary)
  const [south, west, north, east] = filters.bounds ?? [-90, -180, 90, 180]

  return jobs.filter((job) => {
    const searchable = normalize([job.title, job.company, job.description, job.category, job.experience, job.job_type, ...job.skills, ...job.requirements].join(" "))
    const distance = filters.userLocation ? distanceBetweenKm(filters.userLocation, job) : null
    return (!keyword || searchable.includes(keyword))
      && (!category || normalize(job.category) === category)
      && (!location || normalize(`${job.location} ${job.address}`).includes(location))
      && (!city || normalize(job.city) === city)
      && (!jobType || normalize(job.job_type) === jobType)
      && (!experience || (experience === "beginner"
        ? /no experience required|fresh workers welcome/i.test(job.experience)
        : !/no experience required|fresh workers welcome/i.test(job.experience)))
      && (!salaryType || normalize(job.salary_type) === salaryType)
      && (minSalary === null || job.salary_max >= minSalary)
      && (maxSalary === null || job.salary_min <= maxSalary)
      && (filters.maxDistance == null || (distance != null && distance <= filters.maxDistance))
      && job.latitude >= south && job.latitude <= north && job.longitude >= west && job.longitude <= east
  })
}

export function distanceBetweenKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDemoSalary(job: DemoJob) {
  const period = job.salary_type === "daily" ? "day" : job.salary_type === "hourly" ? "hour" : "month"
  return `NPR ${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()} / ${period}`
}

export function formatDemoDistance(distance: number | null | undefined) {
  if (distance == null || !Number.isFinite(distance)) return null
  return distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`
}

function isDemoJob(value: unknown): value is DemoJob {
  if (!value || typeof value !== "object") return false
  const job = value as Partial<DemoJob>
  return typeof job.id === "string" && !!job.id.trim()
    && typeof job.title === "string" && !!job.title.trim()
    && typeof job.company === "string" && !!job.company.trim()
    && typeof job.category === "string" && !!job.category.trim()
    && typeof job.description === "string" && !!job.description.trim()
    && typeof job.location === "string" && !!job.location.trim()
    && typeof job.address === "string" && !!job.address.trim()
    && typeof job.city === "string" && !!job.city.trim()
    && typeof job.latitude === "number" && Number.isFinite(job.latitude) && job.latitude >= 27.5 && job.latitude <= 27.9
    && typeof job.longitude === "number" && Number.isFinite(job.longitude) && job.longitude >= 85.1 && job.longitude <= 85.6
    && typeof job.salary_min === "number" && Number.isFinite(job.salary_min) && job.salary_min > 0
    && typeof job.salary_max === "number" && Number.isFinite(job.salary_max) && job.salary_max >= job.salary_min
    && typeof job.salary_type === "string" && !!job.salary_type.trim()
    && typeof job.job_type === "string" && !!job.job_type.trim()
    && typeof job.experience === "string" && !!job.experience.trim()
    && Array.isArray(job.skills) && job.skills.every((skill) => typeof skill === "string" && !!skill.trim())
    && Array.isArray(job.requirements) && job.requirements.every((requirement) => typeof requirement === "string" && !!requirement.trim())
    && typeof job.vacancies === "number" && Number.isInteger(job.vacancies) && job.vacancies > 0
    && typeof job.posted_date === "string" && !!job.posted_date.trim()
    && typeof job.deadline === "string" && !!job.deadline.trim()
    && job.is_demo === true
    && typeof job.source === "string" && !!job.source.trim()
    && job.location_accuracy === "approximate"
}

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

