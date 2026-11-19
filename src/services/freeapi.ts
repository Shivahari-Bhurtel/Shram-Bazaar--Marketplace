import type { Job } from "../types"
import { fetchAiService } from "./shramAi"

type FreeapiJob = {
  id?: string | number
  title?: string
  name?: string
  company?: string
  company_name?: string
  organization?: string
  description?: string
  location?: string
  district?: string
  category?: string
  job_type?: string
  type?: string
  employment_type?: string
  salary?: number | string
  payment?: number | string
  application_url?: string
  apply_url?: string
  url?: string
  posted_date?: string
  deadline?: string
  skills?: string[]
}

export type FreeapiSearchResult = {
  jobs: Job[]
}

const numberFrom = (value: unknown) => {
  if (typeof value === "number") return value
  if (typeof value !== "string") return 0
  const match = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

const workTypeFor = (value?: string) => {
  const normalized = value?.toLowerCase() || ""
  if (normalized.includes("hour")) return "hourly" as const
  if (normalized.includes("part")) return "half-day" as const
  if (normalized.includes("contract") || normalized.includes("multi")) return "multi-day" as const
  return "full-day" as const
}

export function mapFreeapiJob(raw: FreeapiJob, index: number): Job {
  const title = raw.title || raw.name || "Untitled opportunity"
  const company = raw.company || raw.company_name || raw.organization || "Company not listed"
  const location = raw.location || raw.district || "Nepal"
  const employmentType = raw.job_type || raw.type || raw.employment_type
  const description = raw.description || ""
  const externalUrl = raw.application_url || raw.apply_url || raw.url

  return {
    id: `freeapi-${raw.id || `${company}-${title}-${index}`}`,
    providerId: "freeapi",
    providerName: company,
    providerLogo: "",
    providerVerified: false,
    title,
    description,
    category: raw.category || "skill-based",
    skillsRequired: Array.isArray(raw.skills) ? raw.skills : [],
    qualificationRequired: "",
    experienceRequired: "",
    workType: workTypeFor(employmentType),
    workersNeeded: 0,
    workersHired: 0,
    date: "",
    startTime: "",
    endTime: "",
    duration: "",
    location,
    district: raw.district || location,
    payment: numberFrom(raw.salary ?? raw.payment),
    paymentType: "fixed",
    status: "active",
    postedDate: raw.posted_date || "",
    deadline: raw.deadline || "",
    applicantCount: 0,
    externalSource: "freeapi",
    externalUrl,
    externalCategory: raw.category,
    externalCategories: raw.category ? [raw.category] : [],
    externalExcerpt: description.slice(0, 220),
    salaryText: typeof (raw.salary ?? raw.payment) === "string"
      ? String(raw.salary ?? raw.payment)
      : undefined,
  }
}

export async function searchFreeapiJobs(
  options: { category?: string; location?: string; type?: string },
  signal?: AbortSignal,
): Promise<FreeapiSearchResult> {
  const query = new URLSearchParams()
  if (options.category) query.set("category", options.category)
  if (options.location) query.set("location", options.location)
  if (options.type) query.set("type", options.type)

  const suffix = query.size ? `?${query.toString()}` : ""
  const response = await fetchAiService(`/api/v1/freeapi/jobs/search${suffix}`, {
    method: "GET",
    signal,
  })

  let payload: { jobs?: FreeapiJob[] } = {}
  try {
    payload = await response.json()
  } catch {
    throw new Error("Freeapi job search is temporarily unavailable.")
  }
  if (!response.ok) {
    const detail = typeof (payload as { detail?: string }).detail === "string"
      ? (payload as { detail: string }).detail
      : "Freeapi job search is temporarily unavailable."
    throw new Error(detail)
  }

  return {
    jobs: (payload.jobs || [])
      .filter((job) => Boolean(job.title || job.name))
      .map(mapFreeapiJob),
  }
}
