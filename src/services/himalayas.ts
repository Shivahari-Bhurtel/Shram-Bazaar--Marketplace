import type { Job, JobCategory, WorkType } from "../types"

type HimalayasLocation = string | {
  alpha2?: string
  name?: string
  slug?: string
}

interface HimalayasApiJob {
  guid?: string
  title?: string
  companyName?: string
  companySlug?: string
  companyLogo?: string
  applicationLink?: string
  description?: string
  excerpt?: string
  employmentType?: string
  seniority?: string[] | string
  locationRestrictions?: HimalayasLocation[]
  timezoneRestrictions?: (number | string)[]
  categories?: string[]
  parentCategories?: string[]
  minSalary?: number | null
  maxSalary?: number | null
  currency?: string
  salaryPeriod?: string
  pubDate?: number | string
  expiryDate?: number | string
}

interface HimalayasApiResponse {
  jobs?: HimalayasApiJob[]
  totalCount?: number
  offset?: number
  limit?: number
  nextCursor?: string
  errors?: string
  error?: string
}

export interface HimalayasSearchOptions {
  q?: string
  employmentType?: string
  country?: string
  seniority?: string
  sort?: "relevant" | "recent" | "salaryAsc" | "salaryDesc" | "nameAToZ" | "nameZToA" | "jobs"
  page?: number
}

export interface HimalayasSearchResult {
  jobs: Job[]
  totalCount: number
  page: number
  limit: number
  hasMore: boolean
}

const IT_RECOMMENDATIONS_CACHE_KEY = "shram-bazaar-it-recommendations-v1"
const IT_RECENT_CACHE_KEY = "shram-bazaar-it-recent-v1"
const IT_RECOMMENDATIONS_CACHE_TTL = 24 * 60 * 60 * 1000
const itRolePattern = /\b(software|developer|programmer|frontend|front-end|backend|back-end|full[- ]stack|devops|data analyst|data engineer|machine learning|ai engineer|cybersecurity|security engineer|it support|systems administrator|network engineer|qa engineer|quality assurance|product designer|ux designer|technical writer|cloud architect|database administrator|mobile developer|ios developer|android developer|technical support|software engineer|web engineer|platform engineer|site reliability engineer)\b/i
const itCategoryPattern = /\b(technology|information technology|software development|web development|data science|cybersecurity|cloud computing|it & services)\b/i

function isItOpportunity(job: Job) {
  return itRolePattern.test(job.title) ||
    itCategoryPattern.test([job.externalCategory, ...(job.externalCategories || [])].join(" "))
}

function readItJobsCache(key: string): { jobs: Job[]; savedAt: number } {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { jobs: [], savedAt: 0 }
    const parsed: unknown = JSON.parse(raw)
    const jobs = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "jobs" in parsed && Array.isArray(parsed.jobs)
        ? parsed.jobs
        : []
    const savedAt = parsed && typeof parsed === "object" && "savedAt" in parsed && typeof parsed.savedAt === "number"
      ? parsed.savedAt
      : 0
    return {
      jobs: jobs.filter((item): item is Job =>
      Boolean(item && typeof item === "object" && "id" in item && "title" in item && "externalSource" in item && item.externalSource === "himalayas" && isItOpportunity(item as Job) && (!((item as Job).deadline) || (item as Job).deadline >= new Date().toISOString().slice(0, 10))),
      ).slice(0, 40),
      savedAt,
    }
  } catch {
    return { jobs: [], savedAt: 0 }
  }
}

function loadFreshItCache(key: string) {
  const cache = readItJobsCache(key)
  return cache.savedAt > 0 && Date.now() - cache.savedAt < IT_RECOMMENDATIONS_CACHE_TTL
    ? cache.jobs
    : []
}

function saveItJobsCache(key: string, jobs: Job[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), jobs }))
  } catch {
    // The live listings still work if browser storage is unavailable.
  }
}

export function loadCachedItRecommendations(): Job[] {
  return readItJobsCache(IT_RECOMMENDATIONS_CACHE_KEY).jobs
}

export function loadCachedRecentItJobs(): Job[] {
  return readItJobsCache(IT_RECENT_CACHE_KEY).jobs
}

async function getItJobs(
  sort: "relevant" | "recent",
  cacheKey: string,
  signal?: AbortSignal,
): Promise<Job[]> {
  const cached = readItJobsCache(cacheKey)
  const freshCache = loadFreshItCache(cacheKey)
  if (freshCache.length) return freshCache

  const searchTerms = ["software", "developer", "data", "IT support"]
  const batches = await Promise.allSettled(
    searchTerms.map((q) => searchHimalayasJobs({ q, sort, page: 1 }, signal)),
  )
  let successfulRequests = batches.filter((batch) => batch.status === "fulfilled").length
  const unique = new Map<string, Job>()
  for (const batch of batches) {
    if (batch.status !== "fulfilled") continue
    for (const job of batch.value.jobs) {
      if (isItOpportunity(job) && !unique.has(job.id)) unique.set(job.id, job)
    }
  }
  let jobs = [...unique.values()]

  // Broaden only when the primary queries return fewer than the showcase needs.
  if (jobs.length < 10 && !signal?.aborted) {
    const fallback = await Promise.allSettled(
      ["cybersecurity", "cloud", "QA engineer"].map((q) =>
        searchHimalayasJobs({ q, sort, page: 1 }, signal),
      ),
    )
    successfulRequests += fallback.filter((batch) => batch.status === "fulfilled").length
    for (const batch of fallback) {
      if (batch.status !== "fulfilled") continue
      for (const job of batch.value.jobs) {
        if (isItOpportunity(job) && !unique.has(job.id)) unique.set(job.id, job)
      }
    }
    jobs = [...unique.values()]
  }

  if (successfulRequests === 0) {
    if (cached.jobs.length) return cached.jobs
    throw new Error("IT listings are temporarily unavailable.")
  }

  jobs = jobs.sort((a, b) =>
    (b.externalUpdatedAt || b.postedDate).localeCompare(a.externalUpdatedAt || a.postedDate),
  ).slice(0, 40)
  if (jobs.length) saveItJobsCache(cacheKey, jobs)
  if (!jobs.length && cached.jobs.length) return cached.jobs
  return jobs
}

export function getRecommendedItJobs(signal?: AbortSignal): Promise<Job[]> {
  return getItJobs("relevant", IT_RECOMMENDATIONS_CACHE_KEY, signal)
}

export function getRecentItJobs(signal?: AbortSignal): Promise<Job[]> {
  return getItJobs("recent", IT_RECENT_CACHE_KEY, signal)
}

const toDate = (value?: number | string) => {
  if (value === undefined || value === null || value === "") return ""
  const numeric = typeof value === "number" ? value : Number(value)
  const date = new Date(Number.isFinite(numeric) ? numeric * 1000 : value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

const toDateTime = (value?: number | string) => {
  if (value === undefined || value === null || value === "") return ""
  const numeric = typeof value === "number" ? value : Number(value)
  const date = new Date(Number.isFinite(numeric) ? numeric * 1000 : value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

const cleanText = (value?: string) =>
  value
    ?.replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ")
    .replace(
      /<\/(?:p|div|h[1-6]|li|ul|ol|section|article|blockquote)\s*>/gi,
      "\n",
    )
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() || ""

const seniorityList = (value?: string[] | string) =>
  (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean)

const workTypeFor = (employmentType?: string): WorkType => {
  const value = employmentType?.toLowerCase() || ""
  if (value.includes("hour")) return "hourly"
  if (value.includes("part")) return "half-day"
  if (
    value.includes("contract") ||
    value.includes("freelance") ||
    value.includes("temporary")
  )
    return "multi-day"
  return "full-day"
}

const categoryFor = (
  seniority?: string[] | string,
  parentCategories?: string[],
): JobCategory => {
  const levels = seniorityList(seniority).join(" ").toLowerCase()
  if (levels.includes("entry")) return "beginner-friendly"
  if (
    levels.includes("senior") ||
    levels.includes("manager") ||
    levels.includes("director") ||
    levels.includes("executive")
  )
    return "qualified"
  if (
    parentCategories?.some((category) =>
      /engineering|design|finance|legal|product|marketing|operations/i.test(
        category,
      ),
    )
  )
    return "qualified"
  return "skill-based"
}

const salaryFor = (job: HimalayasApiJob) => {
  if (job.minSalary == null && job.maxSalary == null) return undefined
  const currency = job.currency || ""
  const period = job.salaryPeriod ? ` / ${job.salaryPeriod}` : ""
  const minimum =
    job.minSalary != null
      ? `${currency} ${job.minSalary.toLocaleString()}`.trim()
      : ""
  const maximum =
    job.maxSalary != null
      ? `${currency} ${job.maxSalary.toLocaleString()}`.trim()
      : ""
  return minimum && maximum && minimum !== maximum
    ? `${minimum} - ${maximum}${period}`
    : `${minimum || maximum}${period}`
}

const countryName = (location: HimalayasLocation) =>
  typeof location === "string"
    ? location.trim()
    : (location.name || location.alpha2 || location.slug || "").trim()

const humanizeCategory = (value: string) =>
  value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()

const isExpired = (value?: number | string) => {
  if (value === undefined || value === null || value === "") return false
  const numeric = typeof value === "number" ? value : Number(value)
  const expiryTime = Number.isFinite(numeric)
    ? numeric * 1000
    : Date.parse(String(value))
  return Number.isFinite(expiryTime) && expiryTime <= Date.now()
}

export function mapHimalayasJob(job: HimalayasApiJob, index: number): Job {
  const publishedDate = toDate(job.pubDate)
  const allowedCountries =
    job.locationRestrictions?.map(countryName).filter(Boolean) || []
  const location = allowedCountries.length
    ? `Remote · ${allowedCountries.join(", ")}`
    : "Worldwide remote"
  const description = cleanText(job.description) || cleanText(job.excerpt)
  const seniority = seniorityList(job.seniority).join(", ")
  const categories = [
    ...new Set(
      [...(job.categories || []), ...(job.parentCategories || [])]
        .map(humanizeCategory)
        .filter(Boolean),
    ),
  ]

  return {
    id: `himalayas-${job.guid || `${job.companySlug || job.companyName || "job"}-${job.title || index}`}`,
    providerId: "himalayas",
    providerName: job.companyName || "Company not listed",
    providerLogo: job.companyLogo || "",
    providerVerified: false,
    title: job.title || "Untitled opportunity",
    description,
    category: categoryFor(job.seniority, job.parentCategories),
    skillsRequired: [],
    qualificationRequired: "",
    experienceRequired: seniority,
    workType: workTypeFor(job.employmentType),
    workersNeeded: 0,
    workersHired: 0,
    date: "",
    startTime: "",
    endTime: "",
    duration: "",
    location,
    district: location,
    payment: 0,
    paymentType: "fixed",
    status: "active",
    postedDate: publishedDate,
    deadline: toDate(job.expiryDate),
    applicantCount: 0,
    externalSource: "himalayas",
    externalUrl: job.applicationLink,
    externalCategory: categories[0],
    externalCategories: categories,
    externalExcerpt: cleanText(job.excerpt),
    salaryText: salaryFor(job),
    externalSalaryMin: job.minSalary ?? undefined,
    externalSalaryMax: job.maxSalary ?? undefined,
    externalSalaryCurrency: job.currency || undefined,
    externalSalaryPeriod: job.salaryPeriod || undefined,
    employmentType: job.employmentType,
    seniority,
    publishedDate,
    externalUpdatedAt: toDateTime(job.pubDate),
  }
}

async function fetchJobs(
  query: URLSearchParams,
  signal?: AbortSignal,
): Promise<HimalayasApiResponse> {
  const response = await fetch(`/api/himalayas/jobs?${query.toString()}`, {
    signal,
  })
  let payload: HimalayasApiResponse
  try {
    payload = ((await response.json()) as HimalayasApiResponse)
  } catch {
    throw new Error("Himalayas jobs are temporarily unavailable.")
  }
  if (!response.ok)
    throw new Error(
      payload.errors ||
        payload.error ||
        "Himalayas jobs are temporarily unavailable.",
    )
  return payload
}

export async function getFeaturedHimalayasJobs(
  limit = 10,
  signal?: AbortSignal,
): Promise<Job[]> {
  const query = new URLSearchParams({
    feed: "browse",
    limit: String(Math.min(20, Math.max(1, limit))),
  })
  const payload = await fetchJobs(query, signal)
  return (payload.jobs || [])
    .filter(
      (job) =>
        Boolean(job.guid && job.title && job.applicationLink) &&
        !isExpired(job.expiryDate),
    )
    .map((job, index) => mapHimalayasJob(job, index))
}

export async function searchHimalayasJobs(
  options: HimalayasSearchOptions,
  signal?: AbortSignal,
): Promise<HimalayasSearchResult> {
  const query = new URLSearchParams()
  if (options.q) query.set("q", options.q)
  if (options.employmentType)
    query.set("employment_type", options.employmentType)
  if (options.country) query.set("country", options.country)
  if (options.seniority) query.set("seniority", options.seniority)
  if (options.sort) query.set("sort", options.sort)
  const page = options.page || 1
  query.set("page", String(page))

  const payload = await fetchJobs(query, signal)
  const rawJobs = payload.jobs || []
  const jobs = rawJobs
    .filter(
      (job) =>
        Boolean(job.guid && job.title && job.applicationLink) &&
        !isExpired(job.expiryDate),
    )
    .map((job, index) =>
      mapHimalayasJob(job, index + (page - 1) * (payload.limit || 20)),
    )
  return {
    jobs,
    totalCount: payload.totalCount || jobs.length,
    page,
    limit: payload.limit || jobs.length,
    hasMore: rawJobs.length >= (payload.limit || 20),
  }
}
