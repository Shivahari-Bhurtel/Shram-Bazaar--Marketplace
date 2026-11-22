import type { Job } from "../types"

interface JSearchApiJob {
  job_id?: string
  job_title?: string
  employer_name?: string
  employer_logo?: string | null
  employer_website?: string | null
  job_apply_link?: string
  job_description?: string
  job_employment_type?: string
  job_employment_types?: string[]
  job_apply_is_direct?: boolean
  apply_options?: Array<{ apply_link?: string; is_direct?: boolean; publisher?: string }>
  job_is_remote?: boolean
  job_posted_at?: string | null
  job_posted_at_timestamp?: number
  job_posted_at_datetime_utc?: string
  job_location?: string
  job_city?: string
  job_state?: string
  job_country?: string
  job_latitude?: number
  job_longitude?: number
  job_salary_string?: string
  job_salary?: number | string | null
  job_min_salary?: number
  job_max_salary?: number
  job_salary_period?: string
  job_publisher?: string
  job_benefits?: string[] | null
  job_benefits_strings?: string[] | null
  job_google_link?: string
  job_highlights?: Record<string, string[]> | null
  job_onet_soc?: string | null
  job_onet_job_zone?: number | null
  job_uid?: string
}

interface JSearchObjectResponse {
  data?: JSearchApiJob[]
  jobs?: JSearchApiJob[]
  error?: string | { message?: string }
  message?: string
}
type JSearchResponse = JSearchApiJob[] | JSearchObjectResponse

const CACHE_KEY = "shram-bazaar-remote-it-jobs-v5"
const CACHE_TTL = 3 * 24 * 60 * 60 * 1000
const FAILED_REQUEST_COOLDOWN = 15 * 60 * 1000
const itRole = /\b(software|developer|programmer|frontend|front-end|backend|back-end|full[- ]stack|devops|data analyst|data engineer|data scientist|machine learning|ml engineer|mlops|ai|artificial intelligence|cybersecurity|security engineer|it support|systems administrator|network engineer|qa engineer|quality assurance|product designer|ux designer|technical writer|cloud architect|database administrator|mobile developer|ios developer|android developer|technical support|api engineer|api developer|platform engineer|site reliability engineer)\b/i

function readCache(key = CACHE_KEY): { jobs: Job[]; savedAt: number; page: number; complete: boolean; retryAt: number } {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "null")
    if (!value || typeof value !== "object") return { jobs: [], savedAt: 0, page: 0, complete: false, retryAt: 0 }
    const jobs = "jobs" in value && Array.isArray(value.jobs)
      ? value.jobs.filter((job): job is Job => Boolean(job && typeof job === "object" && "id" in job && "title" in job && (job as Job).externalSource === "jsearch"))
      : []
    return {
      jobs,
      savedAt: "savedAt" in value && typeof value.savedAt === "number" ? value.savedAt : 0,
      page: "page" in value && typeof value.page === "number" ? value.page : (jobs.length ? 1 : 0),
      complete: "complete" in value && value.complete === true,
      retryAt: "retryAt" in value && typeof value.retryAt === "number" ? value.retryAt : 0,
    }
  } catch {
    return { jobs: [], savedAt: 0, page: 0, complete: false, retryAt: 0 }
  }
}

export function loadCachedRemoteItJobs(): Job[] {
  return readCache().jobs
}

export function loadCachedRemoteItPage(): number {
  return readCache().page
}

const postedDate = (job: JSearchApiJob) => {
  if (job.job_posted_at_datetime_utc) {
    const date = new Date(job.job_posted_at_datetime_utc)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  if (job.job_posted_at_timestamp) {
    const timestamp = job.job_posted_at_timestamp < 10_000_000_000
      ? job.job_posted_at_timestamp * 1000
      : job.job_posted_at_timestamp
    const date = new Date(timestamp)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return ""
}

function mapJob(job: JSearchApiJob, index: number): Job | null {
  const title = job.job_title?.trim()
  const applyLink = job.job_apply_link?.trim()
  // The request itself is scoped to remote roles. The provider may omit
  // job_is_remote even when its search result is explicitly remote.
  if (!title || !applyLink || !itRole.test(title)) return null

  const employmentType = job.job_employment_type || job.job_employment_types?.join(", ") || "Remote"
  const employment = employmentType.toLowerCase()
  const workType = employment.includes("part")
    ? "half-day"
    : employment.includes("contract") || employment.includes("intern")
      ? "multi-day"
      : "full-day"
  const location = job.job_location?.trim() || "Anywhere"
  const published = postedDate(job)
  const salaryText = job.job_salary_string?.trim() || (job.job_salary != null ? String(job.job_salary) : undefined) || (
    job.job_min_salary != null || job.job_max_salary != null
      ? `${job.job_min_salary != null ? job.job_min_salary.toLocaleString() : ""}${job.job_min_salary != null && job.job_max_salary != null ? "–" : ""}${job.job_max_salary != null ? job.job_max_salary.toLocaleString() : ""}${job.job_salary_period ? ` / ${job.job_salary_period.toLowerCase()}` : ""}`
      : undefined
  )

  return {
    id: `jsearch-${job.job_id || `${job.employer_name || "remote-job"}-${title}-${index}`}`,
    providerId: `jsearch-${(job.employer_name || "employer").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    providerName: job.employer_name?.trim() || "Employer not listed",
    providerLogo: job.employer_logo || "",
    providerVerified: false,
    title,
    description: job.job_description?.trim() || "Description not listed.",
    category: "skill-based",
    skillsRequired: [],
    qualificationRequired: "",
    experienceRequired: "",
    workType,
    workersNeeded: 0,
    workersHired: 0,
    date: "",
    startTime: "",
    endTime: "",
    duration: "",
    location: `Remote · ${location}`,
    district: location,
    payment: 0,
    paymentType: "fixed",
    status: "active",
    postedDate: published.slice(0, 10),
    deadline: "",
    applicantCount: 0,
    externalSource: "jsearch",
    externalUrl: applyLink,
    externalCategory: "Information Technology",
    externalCategories: ["Information Technology", "Remote", job.job_publisher].filter((item): item is string => Boolean(item)),
    salaryText,
    externalSalaryMin: job.job_min_salary,
    externalSalaryMax: job.job_max_salary,
    externalSalaryCurrency: undefined,
    externalSalaryPeriod: job.job_salary_period,
    employmentType,
    publishedDate: published.slice(0, 10),
    externalUpdatedAt: published,
    externalPublisher: job.job_publisher,
    externalEmployerWebsite: job.employer_website || undefined,
    externalIsRemote: job.job_is_remote,
    externalDirectApply: job.job_apply_is_direct,
    externalPostedLabel: job.job_posted_at || undefined,
    externalBenefits: job.job_benefits_strings?.length
      ? job.job_benefits_strings
      : job.job_benefits?.map((benefit) => benefit.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())) || undefined,
    externalHighlights: job.job_highlights || undefined,
    externalApplyOptions: job.apply_options?.filter((option) => Boolean(option.apply_link)).map((option) => ({
      link: option.apply_link as string,
      publisher: option.publisher,
      isDirect: option.is_direct,
    })),
    externalGoogleUrl: job.job_google_link,
    externalCity: job.job_city,
    externalRegion: job.job_state,
    externalCountry: job.job_country,
  }
}

async function requestRemoteItPage(query: string, page: number, signal?: AbortSignal): Promise<Job[]> {
  const params = new URLSearchParams({ query, page: String(page) })
  const response = await fetch(`/api/jsearch/jobs?${params.toString()}`, { signal })
  const payload = await response.json() as JSearchResponse
  if (!response.ok) {
    const error = Array.isArray(payload) ? undefined : payload.error
    const message = typeof error === "string" ? error : error?.message
    throw new Error(message || (!Array.isArray(payload) ? payload.message : undefined) || "Remote job listings are temporarily unavailable.")
  }
  const rawJobs = Array.isArray(payload) ? payload : payload.data || payload.jobs || []
  return rawJobs.map(mapJob).filter((job): job is Job => Boolean(job))
}

async function fetchRemoteItJobs(query: string, cacheKey: string, signal?: AbortSignal): Promise<Job[]> {
  const cached = readCache(cacheKey)
  const cacheTtl = cached.jobs.length ? CACHE_TTL : FAILED_REQUEST_COOLDOWN
  if (cached.savedAt > 0 && Date.now() - cached.savedAt < cacheTtl) return cached.jobs

  try {
    const jobs = (await requestRemoteItPage(query, 1, signal))
      .sort((a, b) => (b.externalUpdatedAt || "").localeCompare(a.externalUpdatedAt || ""))
    if (jobs.length) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), page: 1, complete: true, jobs: jobs.slice(0, 100) }))
      } catch {
        // The fetched jobs remain usable if browser storage is unavailable.
      }
      return jobs.slice(0, 100)
    }
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), page: 1, complete: true, jobs: [] }))
    } catch {
      // Keep the empty result cooldown best-effort when browser storage is unavailable.
    }
    return cached.jobs
  } catch (error) {
    if (signal?.aborted) throw error
    if (cached.jobs.length) return cached.jobs
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), page: 0, complete: false, jobs: [] }))
    } catch {
      // Keep the retry cooldown best-effort when browser storage is unavailable.
    }
    throw error
  }
}

const DEFAULT_REMOTE_IT_QUERY = "remote AI engineer OR artificial intelligence engineer OR machine learning engineer OR backend developer OR frontend developer OR full stack developer OR data scientist OR data analyst OR DevOps engineer OR API engineer OR cybersecurity analyst OR QA engineer"

export async function getRemoteItJobs(signal?: AbortSignal, onProgress?: (jobs: Job[], page: number) => void): Promise<Job[]> {
  let cached = readCache()
  const cacheFresh = cached.savedAt > 0 && Date.now() - cached.savedAt < CACHE_TTL
  if (cacheFresh && (cached.complete || cached.page >= 10 || cached.jobs.length >= 100)) {
    if (!cached.complete) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...cached, complete: true }))
      } catch {
        // Existing cached results remain usable if browser storage is unavailable.
      }
    }
    return cached.jobs.slice(0, 100)
  }
  if (cacheFresh && cached.retryAt > Date.now()) return cached.jobs.slice(0, 100)

  if (!cacheFresh) cached = { jobs: [], savedAt: Date.now(), page: 0, complete: false, retryAt: 0 }
  const jobsById = new Map(cached.jobs.map((job) => [job.id, job]))
  for (let page = cached.page + 1; page <= 10; page += 1) {
    try {
      const batch = await requestRemoteItPage(DEFAULT_REMOTE_IT_QUERY, page, signal)
      batch.forEach((job) => jobsById.set(job.id, job))
      cached = {
        jobs: Array.from(jobsById.values()).slice(0, 100),
        savedAt: cached.savedAt || Date.now(),
        page,
        complete: page === 10,
        retryAt: 0,
      }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
      } catch {
        // The current session still uses the fetched batch if browser storage is unavailable.
      }
      onProgress?.(cached.jobs, page)
    } catch (error) {
      if (signal?.aborted) throw error
      cached = { ...cached, retryAt: Date.now() + FAILED_REQUEST_COOLDOWN }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
      } catch {
        // Keep the cooldown best-effort when browser storage is unavailable.
      }
      if (cached.jobs.length) return cached.jobs.slice(0, 100)
      throw error
    }
  }
  return cached.jobs.slice(0, 100)
}

export async function searchRemoteItJobs(query: string, signal?: AbortSignal): Promise<Job[]> {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []

  const matches = loadCachedRemoteItJobs().map((job) => {
    const title = job.title.toLowerCase()
    const company = job.providerName.toLowerCase()
    const details = `${job.description} ${job.location} ${job.externalCategory || ""} ${(job.externalCategories || []).join(" ")}`.toLowerCase()
    const score = terms.reduce((total, term) => total
      + (title.includes(term) ? 4 : 0)
      + (company.includes(term) ? 2 : 0)
      + (details.includes(term) ? 1 : 0), 0)
    return { job, score }
  }).filter((result) => result.score > 0 && terms.every((term) =>
    `${result.job.title} ${result.job.providerName} ${result.job.description} ${result.job.location}`.toLowerCase().includes(term),
  ))
    .sort((a, b) => b.score - a.score || (b.job.externalUpdatedAt || "").localeCompare(a.job.externalUpdatedAt || ""))
    .map(({ job }) => job)

  try {
    const liveJobs = await requestRemoteItPage(`remote ${query.trim()}`, 1, signal)
    return liveJobs.length ? liveJobs : matches
  } catch (error) {
    if (signal?.aborted) throw error
    if (matches.length) return matches
    throw error
  }
}
