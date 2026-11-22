import bundledDemoJobs from "../../shrambazar/src/main/resources/data/jobs.json"

const EXPECTED_BUNDLED_DEMO_JOB_COUNT = 130

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
  if (signal?.aborted) throw new DOMException("Job loading was cancelled.", "AbortError")
  // This showcase dataset is bundled with the app and is the canonical source
  // for worker demo listings, so results never depend on a stale API copy.
  return getBundledDemoJobs()
}

export function getBundledDemoJobs(): DemoJob[] {
  const jobs = validateDemoJobs(bundledDemoJobs)
  if (jobs.length < EXPECTED_BUNDLED_DEMO_JOB_COUNT) {
    throw new Error(`The bundled showcase dataset must contain at least ${EXPECTED_BUNDLED_DEMO_JOB_COUNT} unique valid jobs; found ${jobs.length}.`)
  }
  return jobs
}

function validateDemoJobs(value: unknown): DemoJob[] {
  if (!Array.isArray(value)) throw new Error("The jobs service returned an invalid response.")
  const jobs = Array.from(new Map(value.filter(isDemoJob).map((job) => [job.id, job])).values())
  if (!jobs.length) throw new Error("No valid job listings are available in the showcase dataset.")
  return jobs
}

export function filterDemoJobs(jobs: DemoJob[], filters: DemoJobFilters = {}) {
  const keywords = normalize(filters.keyword).split(/\s+/).filter(Boolean)
  const category = normalize(filters.category)
  const location = normalize(filters.location)
  const city = normalize(filters.city)
  const jobType = normalize(filters.jobType)
  const experience = normalize(filters.experience)
  const salaryType = normalize(filters.salaryType)
  const parsedMinSalary = filters.minSalary === undefined || filters.minSalary === "" ? null : Number(filters.minSalary)
  const parsedMaxSalary = filters.maxSalary === undefined || filters.maxSalary === "" ? null : Number(filters.maxSalary)
  const minSalary = parsedMinSalary !== null && Number.isFinite(parsedMinSalary) ? parsedMinSalary : null
  const maxSalary = parsedMaxSalary !== null && Number.isFinite(parsedMaxSalary) ? parsedMaxSalary : null
  const [south, west, north, east] = filters.bounds ?? [-90, -180, 90, 180]

  return jobs.filter((job) => {
    const searchable = normalize([job.title, job.company, job.description, job.category, job.experience, job.job_type, job.location, job.address, job.city, job.salary_type, job.salary_min, job.salary_max, ...job.skills, ...job.requirements].join(" "))
    const distance = filters.userLocation ? distanceBetweenKm(filters.userLocation, job) : null
    return (keywords.length === 0 || keywords.every((keyword) => searchable.includes(keyword)))
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
    && typeof job.latitude === "number" && Number.isFinite(job.latitude) && job.latitude >= -90 && job.latitude <= 90
    && typeof job.longitude === "number" && Number.isFinite(job.longitude) && job.longitude >= -180 && job.longitude <= 180
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

