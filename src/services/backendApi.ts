import type { Application, Job, ProviderProfile, User, WorkerProfile } from "../types"

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "")
const AUTH_KEY = "shram-bazar-api-session-v1"
let memoryAuth: BackendAuth | null | undefined

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly method: string,
  ) {
    super(message)
    this.name = "BackendApiError"
  }
}

export type BackendRole = "JOB_SEEKER" | "JOB_PROVIDER" | "ADMIN"
export interface BackendAuth {
  accessToken: string
  tokenType: string
  userId: number
  fullName: string
  email: string
  role: BackendRole
}

export interface ApiJob {
  id: number
  providerName: string
  businessName?: string
  title: string
  category?: string
  qualificationRequired?: string
  description: string
  responsibilities?: string
  address: string
  municipality?: string
  district?: string
  province?: string
  latitude?: number
  longitude?: number
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  durationDescription?: string
  paymentAmount: number | null
  paymentMaxAmount?: number
  budgetNegotiable?: boolean
  paymentPeriod?: "PER_HOUR" | "PER_DAY" | "FIXED"
  paymentMethod: "CASH" | "BANK_TRANSFER" | "DIGITAL_WALLET" | "OTHER"
  requiredExperienceMonths?: number
  numberOfWorkersRequired: number
  requiredSkills: string[]
  applicationCount?: number
  status: "DRAFT" | "OPEN" | "ASSIGNED" | "CLOSED" | "CANCELLED" | "COMPLETED" | "REMOVED"
  createdAt?: string
  publishedAt?: string
}

export interface ApiApplication {
  applicationId: number
  jobId: number
  jobTitle: string
  jobAddress: string
  district?: string
  startDate: string
  endDate: string
  paymentAmount: number
  paymentMethod: ApiJob["paymentMethod"]
  status: "PENDING" | "SELECTED" | "NOT_SELECTED" | "WITHDRAWN" | "CANCELLED"
  appliedAt: string
  offeredAmount?: number
  offerMessage?: string
  estimatedDurationHours?: number
  proposedStartAt?: string
  applicantName?: string
  applicantEmail?: string
  applicantPhone?: string
  applicantLocation?: string
  skills?: string[]
  experienceLevel?: "No Experience" | "Beginner" | "Experienced"
  introduction?: string
  confirmationEmailSent?: boolean
}

export function getBackendAuth(): BackendAuth | null {
  if (memoryAuth !== undefined) return memoryAuth
  try {
    const raw = sessionStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as BackendAuth
    return value?.accessToken && Number.isFinite(value.userId) ? value : null
  } catch {
    return null
  }
}

export function setBackendAuth(auth: BackendAuth | null) {
  memoryAuth = auth
  try {
    if (auth) sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth))
    else sessionStorage.removeItem(AUTH_KEY)
  } catch {
    // Keep auth usable for this page session when browser storage is blocked.
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = getBackendAuth()
  const method = (init.method || (init.body ? "POST" : "GET")).toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json")
  if (auth?.accessToken) headers.set("Authorization", `Bearer ${auth.accessToken}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new Error("Could not reach the Shram Bazar API. Check that the backend is running, the API URL is correct, and this website's origin is allowed by the backend.")
  }
  if (response.status === 401) {
    if (auth) setBackendAuth(null)
    window.dispatchEvent(new Event("shram-bazar:session-expired"))
  }
  const requiredRole = path.startsWith("/api/seeker/") ? "JOB_SEEKER" : path.startsWith("/api/provider/") ? "JOB_PROVIDER" : undefined
  if (response.status === 403 && auth && requiredRole && auth.role !== requiredRole) {
    setBackendAuth(null)
    window.dispatchEvent(new Event("shram-bazar:session-expired"))
  }
  if (!response.ok) {
    let message = response.status === 401 && path === "/api/auth/login"
      ? "Email or password is incorrect."
      : response.status === 403 && path.startsWith("/api/auth/")
        ? "The server refused this authentication request. Check the API deployment and security configuration."
        : response.status === 409 && path.startsWith("/api/auth/register/")
          ? "An account with this email already exists. Sign in instead, or use password recovery if you cannot access it."
          : response.status === 403
      ? requiredRole && auth?.role !== requiredRole
        ? "Your saved sign-in belongs to a different account type. Sign in as a worker to open availability, or as a provider to manage tasks."
        : "Your signed-in account does not have permission to view this information. Check that you are using the correct worker or provider account."
      : `Request failed (${response.status})`
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      message = import.meta.env.DEV
        ? "The availability service is offline. Start the Java backend and database, then try publishing again. Your availability was not published."
        : "The availability service is temporarily offline. Your availability was not published; try again when the service is back."
    }
    if (response.status === 404)
      message = "Backend service route not found. The Java API or its Vercel container deployment may not be running."
    try {
      const body: unknown = await response.json()
      if (body && typeof body === "object") {
        const errorBody = body as Record<string, unknown>
        const serverMessage = [errorBody.detail, errorBody.message]
          .find((value): value is string => typeof value === "string" && value.trim().length > 0)
        if (serverMessage) message = serverMessage.trim()
        else if (typeof errorBody.error === "string") message = errorBody.error
      }
    } catch {
      // Keep the status based message for non-JSON errors.
    }
    if (response.status === 409 && path.startsWith("/api/auth/register/") && /conflict/i.test(message)) {
      message = "An account with this email already exists. Sign in instead, or use password recovery if you cannot access it."
    }
    if (response.status === 401 && path === "/api/auth/login") {
      message = "Email or password is incorrect."
    } else if (response.status === 403 && path.startsWith("/api/auth/")) {
      message = "The server refused this authentication request. Check the API deployment and security configuration."
    } else if (response.status >= 500) {
      message = `The server failed while processing ${method} ${path}. Please try again shortly.`
    }
    throw new BackendApiError(message, response.status, path, method)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function apiFileRequest(path: string): Promise<Blob> {
  const auth = getBackendAuth()
  const headers = new Headers()
  if (auth?.accessToken) headers.set("Authorization", `Bearer ${auth.accessToken}`)
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { headers })
  } catch {
    throw new Error("Could not reach the Shram Bazar API. Check that the backend is running, the API URL is correct, and this website's origin is allowed by the backend.")
  }
  if (response.status === 401 && auth) {
    setBackendAuth(null)
    window.dispatchEvent(new Event("shram-bazar:session-expired"))
  }
  if (!response.ok) throw new Error(`Document request failed (${response.status})`)
  return response.blob()
}

export function apiRoleToUserRole(role: BackendRole): User["role"] {
  if (role === "JOB_SEEKER") return "worker"
  if (role === "JOB_PROVIDER") return "provider"
  return "admin"
}

export function mapApiJob(job: ApiJob, providerId?: string): Job {
  const paymentType = job.paymentPeriod === "PER_HOUR" ? "per-hour" : job.paymentPeriod === "FIXED" || job.paymentMethod === "OTHER" ? "fixed" : "per-day"
  const date = job.startDate || ""
  const status = job.status === "OPEN" ? "active" : job.status === "CLOSED" ? "closed" : job.status === "CANCELLED" ? "closed" : job.status === "DRAFT" ? "draft" : "filled"
  return {
    id: String(job.id),
    providerId: providerId || "api-provider",
    providerName: job.businessName || job.providerName || "Provider",
    providerLogo: "",
    providerVerified: false,
    title: job.title || "Untitled job",
    description: [job.description, job.responsibilities].filter(Boolean).join("\n\n"),
    category: job.category || (job.requiredSkills?.length ? "skill-based" : "beginner-friendly"),
    skillsRequired: job.requiredSkills || [],
    qualificationRequired: job.qualificationRequired || "",
    experienceRequired: job.requiredExperienceMonths ? `${job.requiredExperienceMonths} months` : "",
    workType: job.startDate && job.endDate && job.startDate !== job.endDate ? "multi-day" : "full-day",
    workersNeeded: job.numberOfWorkersRequired || 1,
    workersHired: 0,
    date,
    endDate: job.endDate,
    startTime: (job.startTime || "").slice(0, 5),
    endTime: (job.endTime || "").slice(0, 5),
    duration: job.durationDescription || "",
    location: [job.address, job.municipality, job.district].filter(Boolean).join(", "),
    district: job.district || "",
    latitude: job.latitude,
    longitude: job.longitude,
    payment: Number(job.paymentAmount) || 0,
    paymentMax: job.paymentMaxAmount == null ? undefined : Number(job.paymentMaxAmount),
    budgetNegotiable: job.budgetNegotiable === true,
    paymentType,
    status,
    postedDate: (job.publishedAt || job.createdAt || "").slice(0, 10),
    deadline: "",
    applicantCount: Number(job.applicationCount) || 0,
  }
}

export function mapApiApplication(app: ApiApplication, user: User, profile?: WorkerProfile): Application {
  const status: Application["status"] = app.status === "SELECTED" ? "accepted" : app.status === "NOT_SELECTED" || app.status === "CANCELLED" ? "rejected" : app.status === "WITHDRAWN" ? "withdrawn" : "pending"
  return {
    id: String(app.applicationId),
    jobId: String(app.jobId),
    workerId: user.role === "worker" ? user.profileId : "",
    workerName: app.applicantName || user.name,
    workerPhone: app.applicantPhone || profile?.phone || "",
    workerEmail: app.applicantEmail || user.email,
    workerPhoto: profile?.photo || "",
    workerLocation: app.applicantLocation || profile?.location || app.jobAddress || "",
    workerSkills: app.skills || profile?.skills || [],
    workerRating: profile?.rating || 0,
    workerTotalJobs: profile?.totalJobs || 0,
    jobTitle: app.jobTitle,
    providerName: "",
    providerId: "",
    appliedDate: (app.appliedAt || "").slice(0, 10),
    status,
    engagementId: undefined,
    engagementStatus: undefined,
    coverNote: app.introduction || "",
    offeredAmount: app.offeredAmount == null ? undefined : Number(app.offeredAmount),
    offerMessage: app.offerMessage || app.introduction || undefined,
    estimatedDurationHours: app.estimatedDurationHours,
    proposedStartAt: app.proposedStartAt,
  }
}

export function mapSeekerProfile(value: any, user: User): WorkerProfile {
  const address = value.address || ""
  const district = address.split(",").at(-1)?.trim() || ""
  return {
    id: user.profileId,
    name: value.fullName || user.name,
    photo: value.profilePictureUrl || "",
    phone: value.phoneNumber || "",
    email: value.email || user.email,
    dateOfBirth: value.dateOfBirth || undefined,
    latitude: value.latitude,
    longitude: value.longitude,
    preferredTravelDistanceKm: value.preferredTravelDistanceKm ?? 10,
    preferredCategories: value.preferredCategories || [],
    acceptingWork: value.acceptingWork !== false,
    address,
    location: address,
    district,
    skills: [],
    qualifications: [],
    experience: [],
    availableDates: [],
    availability: "flexible",
    bio: value.bio || "",
    workHistory: [],
    rating: 0,
    totalJobs: 0,
    verified: Boolean(value.verified),
    kycStatus: value.verified ? "verified" : "not-verified",
  }
}

export function mapProviderProfile(value: any, user: User): ProviderProfile {
  const businessName = value.businessName || value.fullName || user.name
  const address = value.businessLocation || value.address || ""
  return {
    id: user.profileId,
    providerType: value.hasBusiness ? "business" : "individual",
    dateOfBirth: value.dateOfBirth || undefined,
    orgName: businessName,
    logo: value.profilePictureUrl || "",
    contactName: value.fullName || user.name,
    email: value.email || user.email,
    phone: value.phoneNumber || "",
    location: address,
    district: value.address?.split(",").at(-1)?.trim() || "",
    industry: "Other",
    description: value.businessDescription || "",
    verified: Boolean(value.verified),
    pan: "",
    totalHires: 0,
    rating: 0,
    reviewCount: 0,
    website: value.businessWebsite || "",
  }
}
