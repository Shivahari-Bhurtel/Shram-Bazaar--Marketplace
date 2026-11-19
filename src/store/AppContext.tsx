import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  Application,
  ApplicationStatus,
  AvailabilitySlot,
  Job,
  KycDocumentType,
  Notification,
  ProviderProfile,
  ProviderType,
  Report,
  User,
  WorkerProfile,
  Weekday,
} from "../types"
import { isDateOnlyString, nepalDateString, nepalYear } from "../utils/dates"
import {
  isValidEmail,
  isValidNepalPan,
  isValidPhoneNumber,
} from "../utils/validation"
import {
  apiRequest,
  apiRoleToUserRole,
  getBackendAuth,
  mapApiApplication,
  mapApiJob,
  mapProviderProfile,
  mapSeekerProfile,
  setBackendAuth,
  type ApiApplication,
  type ApiJob,
  type BackendAuth,
} from "../services/backendApi"

export type Page = "landing" | "login" | "worker-signup" | "provider-signup" | "worker-dashboard" | "worker-profile" | "job-discovery" | "job-detail" | "my-applications" | "saved-jobs" | "learn" | "settings" | "kyc-verification" | "provider-dashboard" | "provider-profile" | "provider-operations" | "create-job" | "edit-job" | "my-jobs" | "applicant-management" | "admin-dashboard" | "chat" | "shram-ai" | "voice-assistant"

type Credentials = { userId: string; password: string }
type SavedJob = { workerId: string; jobId: string }
type PersistedData = {
  users: User[]
  credentials: Credentials[]
  workerProfiles: WorkerProfile[]
  providerProfiles: ProviderProfile[]
  jobs: Job[]
  externalJobs: Job[]
  applications: Application[]
  savedJobs: SavedJob[]
  notifications: Notification[]
  reports: Report[]
}

interface AppState {
  currentPage: Page
  currentJobId: string | null
  currentUser: User | null
  workerProfile: WorkerProfile | null
  providerProfile: ProviderProfile | null
  jobs: Job[]
  externalJobs: Job[]
  applications: Application[]
  savedJobIds: string[]
  notifications: Notification[]
  allWorkerProfiles: WorkerProfile[]
  allProviderProfiles: ProviderProfile[]
  adminWorkerProfiles: WorkerProfile[]
  adminUsers: User[]
  reports: Report[]
  discoverySkill: string
  storageWarning: string
}

export interface WorkerSignup {
  email: string
  password: string
  name: string
  phone: string
  dateOfBirth?: string
  gender?: WorkerProfile["gender"]
  address?: string
  district: string
  location: string
  skills: string[]
}
export interface ProviderSignup {
  email: string
  password: string
  contactName: string
  providerType: ProviderType
  dateOfBirth?: string
  address?: string
  phone: string
  orgName: string
  pan: string
  industry: string
  district: string
  location: string
}
export interface KycSubmission {
  documentType: KycDocumentType
  documentNumber: string
  fileName: string
  documentData: string
  documentExpiryDate?: string
  selfieData?: string
  selfieFileName?: string
}

const DATA_KEY = "shram-bazar-data-v1"
const SESSION_KEY = "shram-bazar-session-v1"
const FRESH_START_KEY = "shram-bazar-fresh-start-2026-10"
const emptyData: PersistedData = {
  users: [],
  credentials: [],
  workerProfiles: [],
  providerProfiles: [],
  jobs: [],
  externalJobs: [],
  applications: [],
  savedJobs: [],
  notifications: [],
  reports: [],
}
const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const today = () => nepalDateString()
const blankProviderLogo =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop&auto=format"
const backendMode = import.meta.env.VITE_DEMO_MODE !== "true"

function loadData(): PersistedData {
  try {
    if (localStorage.getItem(FRESH_START_KEY) !== "complete") {
      localStorage.removeItem(DATA_KEY)
      localStorage.removeItem(SESSION_KEY)
      localStorage.setItem(FRESH_START_KEY, "complete")
    }
    const parsed: unknown = JSON.parse(localStorage.getItem(DATA_KEY) || "{}")
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return emptyData
    const restored = { ...emptyData }
    for (const key of Object.keys(emptyData) as (keyof PersistedData)[]) {
      const value = (parsed as Partial<PersistedData>)[key]
      if (Array.isArray(value)) restored[key] = value as never
    }
    return restored
  } catch {
    return emptyData
  }
}

function readSessionId(): string {
  try {
    const auth = getBackendAuth()
    if (auth) return String(auth.userId)
    const storedSession = localStorage.getItem(SESSION_KEY) || ""
    const persisted = JSON.parse(localStorage.getItem(DATA_KEY) || "{}") as Partial<PersistedData>
    if (persisted.users?.some((user) => user.id === storedSession && user.backendAuth))
      return ""
    return storedSession
  } catch {
    return ""
  }
}

function experienceYears(profile: WorkerProfile) {
  return profile.experience.reduce((total, entry) => {
    const duration = entry.duration.trim()
    const dateRange = duration.match(
      /(19\d{2}|20\d{2})\s*[-–—]\s*(19\d{2}|20\d{2}|present|current)/i,
    )
    if (dateRange) {
      const endYear = /present|current/i.test(dateRange[2])
        ? nepalYear()
        : Number(dateRange[2])
      return total + Math.max(0, endYear - Number(dateRange[1]))
    }
    const years = duration.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i)
    if (years) return total + Number(years[1])
    const months = duration.match(/(\d+(?:\.\d+)?)\s*(?:months?|mos?)/i)
    if (months) return total + Number(months[1]) / 12
    const value = duration.match(/\d+(?:\.\d+)?/)?.[0]
    return total + (value ? Number(value) : 1)
  }, 0)
}

const weekdayNames: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

function minutesOfDay(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
}

function availabilityMatch(job: Job, worker: WorkerProfile) {
  const schedule = worker.weeklyAvailability ?? []
  if (!schedule.length) {
    const available =
      worker.availability === "flexible" || worker.availability === job.workType
    return {
      score: available ? 15 : 5,
      reason: `${worker.availability.replace("-", " ")} availability`,
    }
  }

  const date = new Date(`${job.date}T12:00:00`)
  const day = Number.isNaN(date.getTime()) ? null : weekdayNames[date.getDay()]
  const jobStart = minutesOfDay(job.startTime)
  const jobEnd = minutesOfDay(job.endTime)
  if (!day || jobStart === null || jobEnd === null || jobEnd <= jobStart)
    return { score: 0, reason: "Add valid job hours to compare your schedule" }

  const daySlots: AvailabilitySlot[] = schedule.filter(
    (slot) => slot.day === day,
  )
  const exact = daySlots.find((slot) => {
    const start = minutesOfDay(slot.startTime)
    const end = minutesOfDay(slot.endTime)
    return start !== null && end !== null && start <= jobStart && end >= jobEnd
  })
  if (exact) {
    return {
      score: 15,
      reason: `Matches your availability: ${day}, ${exact.startTime}–${exact.endTime}`,
    }
  }

  const partial = daySlots.some((slot) => {
    const start = minutesOfDay(slot.startTime)
    const end = minutesOfDay(slot.endTime)
    return start !== null && end !== null && start < jobEnd && end > jobStart
  })
  return partial
    ? { score: 4, reason: `Partially overlaps your ${day} availability` }
    : { score: 0, reason: `Outside your saved ${day} availability` }
}

function computeMatch(job: Job, worker: WorkerProfile) {
  const matchingSkills = job.skillsRequired.filter((required) =>
    worker.skills.some(
      (skill) => skill.toLowerCase() === required.toLowerCase(),
    ),
  )
  const skillsScore = job.skillsRequired.length
    ? Math.round((matchingSkills.length / job.skillsRequired.length) * 40)
    : 40
  const locationScore = worker.district === job.district ? 20 : 0
  const availability = availabilityMatch(job, worker)
  const availableOnDate =
    worker.availableDates.length === 0 ||
    worker.availableDates.includes(job.date)
  const durationScore = availableOnDate ? 10 : 0
  const years = experienceYears(worker)
  const requiredYears = Number(job.experienceRequired.match(/\d+/)?.[0] || 0)
  const experienceScore =
    !requiredYears || years >= requiredYears
      ? 15
      : Math.round((years / requiredYears) * 15)
  return {
    score: Math.min(
      100,
      skillsScore +
        locationScore +
        availability.score +
        durationScore +
        experienceScore,
    ),
    reasons: [
      `${matchingSkills.length} of ${job.skillsRequired.length} required skills match`,
      locationScore
        ? `Location matches ${job.district}`
        : `Job is in ${job.district}; your district is ${worker.district}`,
      availability.reason,
      availableOnDate
        ? "Available for the job date/duration"
        : "Job date is outside saved availability",
      `${years} year${years === 1 ? "" : "s"} of listed experience`,
    ],
  }
}

function withMatches(jobs: Job[], worker: WorkerProfile | null) {
  if (!worker)
    return jobs.map((job) => ({
      ...job,
      matchScore: undefined,
      matchReasons: undefined,
    }))
  return jobs.map((job) => {
    const match = computeMatch(job, worker)
    return { ...job, matchScore: match.score, matchReasons: match.reasons }
  })
}

const workerOnly: Page[] = [
  "worker-dashboard",
  "worker-profile",
  "my-applications",
  "saved-jobs",
  "learn",
  "kyc-verification",
]
const providerOnly: Page[] = [
  "provider-dashboard",
  "provider-profile",
  "provider-operations",
  "create-job",
  "edit-job",
  "my-jobs",
  "applicant-management",
]
const adminOnly: Page[] = ["admin-dashboard"]
const publicOnly: Page[] = [
  "landing",
  "login",
  "worker-signup",
  "provider-signup",
  "job-discovery",
]

interface AppContextValue {
  state: AppState
  setExternalJobs: (jobs: Job[]) => void
  navigate: (page: Page, jobId?: string) => void
  login: (email: string, password: string) => Promise<string | null>
  signupWorker: (data: WorkerSignup) => Promise<string | null>
  signupProvider: (data: ProviderSignup) => Promise<string | null>
  loginAsWorker: () => void
  loginAsProvider: () => void
  loginAsAdmin: () => void
  logout: () => void
  applyToJob: (jobId: string, coverNote: string) => Promise<void>
  saveJob: (jobId: string) => void
  unsaveJob: (jobId: string) => void
  updateApplicationStatus: (
    applicationId: string,
    status: ApplicationStatus,
    note?: string,
  ) => void
  respondToSelection: (applicationId: string, accept: boolean) => void
  updateEngagementWork: (applicationId: string, action: "start" | "confirm-completion") => void
  postJob: (
    job: Omit<Job, "id" | "providerId" | "providerName" | "providerLogo" | "providerVerified" | "workersHired" | "postedDate" | "applicantCount" | "status">,
  ) => Promise<void>
  updateJob: (jobId: string, updates: Partial<Job>) => Promise<void>
  deleteJob: (jobId: string) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  updateWorkerProfile: (updates: Partial<WorkerProfile>) => void
  notifyProfileUpdated: (message: string) => void
  updateProviderProfile: (updates: Partial<ProviderProfile>) => void
  submitProviderVerification: (fileName: string, fileData: string) => void
  reviewProviderVerification: (providerId: string, approved: boolean, note?: string) => void
  sendUserNotification: (userId: string, title: string, message: string, type?: Notification["type"]) => Promise<string | null>
  hasApplied: (jobId: string) => boolean
  isSaved: (jobId: string) => boolean
  browseSkill: (skill: string) => void
  reportJob: (jobId: string, reason: string, details: string) => Promise<string | null>
  reviewWorker: (applicationId: string, rating: number, review: string) => Promise<string | null>
  reviewProvider: (applicationId: string, rating: number, review: string) => Promise<string | null>
  submitKyc: (submission: KycSubmission) => Promise<string | null>
  approveKyc: () => void
  reviewKyc: (
    workerId: string,
    decision: "verified" | "rejected",
    note?: string,
  ) => void
  updateReport: (
    reportId: string,
    status: Report["status"],
    note?: string,
  ) => void
  moderateJob: (jobId: string, status: Job["status"]) => void
  verifyProvider: (providerId: string, verified: boolean) => void
  updateUserStatus: (userId: string, status: "active" | "suspended") => void
  unreadNotificationsCount: number
  myApplications: Application[]
  myJobs: Job[]
  jobApplications: (jobId: string) => Application[]
}

/*
 * Keep one context identity across Vite Fast Refresh updates. Without this,
 * the provider mounted by main.tsx can retain the previous module's Context
 * while refreshed consumers read a newly-created Context, making useApp()
 * incorrectly report that no provider exists.
 */
const contextGlobal = globalThis as typeof globalThis & {
  __SHRAM_BAZAR_APP_CONTEXT__?: ReturnType<typeof createContext<AppContextValue | null>>
}
const AppContext =
  contextGlobal.__SHRAM_BAZAR_APP_CONTEXT__ ??
  (contextGlobal.__SHRAM_BAZAR_APP_CONTEXT__ =
    createContext<AppContextValue | null>(null))

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PersistedData>(loadData)
  const [sessionId, setSessionId] = useState(readSessionId)
  const [storageWarning, setStorageWarning] = useState("")
  const [currentPage, setCurrentPage] = useState<Page>(() =>
    sessionId ? "worker-dashboard" : "landing",
  )
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [externalJobs, setExternalJobsState] = useState<Job[]>([])
  const [discoverySkill, setDiscoverySkill] = useState("")

  const currentUser = data.users.find((user) => user.id === sessionId) || null
  const storedWorkerProfile =
    currentUser?.role === "worker"
      ? data.workerProfiles.find(
          (profile) => profile.id === currentUser.profileId,
        ) || null
      : null
  const workerProfile = storedWorkerProfile
    ? storedWorkerProfile.kycStatus === "verified" &&
      storedWorkerProfile.kycDocumentExpiryDate &&
      storedWorkerProfile.kycDocumentExpiryDate < today()
      ? {
          ...storedWorkerProfile,
          kycStatus: "expired" as const,
          verified: false,
        }
      : storedWorkerProfile
    : null
  const providerProfile =
    currentUser?.role === "provider"
      ? data.providerProfiles.find(
          (profile) => profile.id === currentUser.profileId,
        ) || null
      : null

  useEffect(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(data))
      setStorageWarning("")
    } catch {
      setStorageWarning(
        "Browser storage is full or unavailable. Your latest changes may not survive a refresh; remove large uploads or free browser storage.",
      )
    }
  }, [data])
  useEffect(() => {
    try {
      if (sessionId) localStorage.setItem(SESSION_KEY, sessionId)
      else localStorage.removeItem(SESSION_KEY)
    } catch {
      setStorageWarning(
        "Browser storage is unavailable. Your session may not survive a refresh.",
      )
    }
  }, [sessionId])

  useEffect(() => {
    if (!currentUser && !publicOnly.includes(currentPage))
      setCurrentPage("login")
    if (currentUser?.accountStatus === "suspended") {
      setSessionId("")
      setCurrentPage("login")
      return
    }
    if (
      currentUser &&
      publicOnly.includes(currentPage) &&
      currentPage !== "job-discovery"
    ) {
      setCurrentPage(
        currentUser.role === "worker"
          ? "worker-dashboard"
          : currentUser.role === "admin"
            ? "admin-dashboard"
            : "provider-dashboard",
      )
    }
    if (currentUser?.role === "admin" && !adminOnly.includes(currentPage))
      setCurrentPage("admin-dashboard")
    if (currentUser?.role === "worker" && providerOnly.includes(currentPage))
      setCurrentPage("worker-dashboard")
    if (currentUser?.role === "provider" && workerOnly.includes(currentPage))
      setCurrentPage("provider-dashboard")
    if (
      currentUser &&
      currentUser.role !== "admin" &&
      adminOnly.includes(currentPage)
    )
      setCurrentPage(
        currentUser.role === "worker"
          ? "worker-dashboard"
          : "provider-dashboard",
      )
  }, [currentPage, currentUser])

  useEffect(() => {
    if (!backendMode) return
    let active = true
    const syncBackend = async () => {
      try {
        const [publicJobs, serverNotifications] = await Promise.all([
          apiRequest<ApiJob[]>("/api/jobs"),
          currentUser
            ? apiRequest<Array<{ id: number; title: string; message: string; type?: string; read: boolean; createdAt?: string; referenceType?: string; referenceId?: number }>>("/api/notifications")
            : Promise.resolve([]),
        ])
        if (!active) return
        const mappedJobs = publicJobs.map((job) => mapApiJob(job))
        setData((old) => ({
          ...old,
          jobs: mappedJobs,
          ...(currentUser ? { notifications: serverNotifications.map((note) => ({
            id: String(note.id),
            userId: currentUser.id,
            type: (note.type === "APPLICATION" ? "application" : note.type === "SELECTION" ? "selection" : note.type === "MESSAGE" ? "message" : note.type === "JOB_UPDATE" ? "job-update" : "announcement") as Notification["type"],
            title: note.title,
            message: note.message,
            date: (note.createdAt || "").slice(0, 10),
            read: note.read,
            jobId: note.referenceType === "JOB" ? String(note.referenceId) : undefined,
            applicationId: note.referenceType === "APPLICATION" ? String(note.referenceId) : undefined,
          })) } : {}),
        }))
        if (currentUser?.role === "provider") {
          const ownJobs = await apiRequest<ApiJob[]>("/api/provider/jobs")
          if (!active) return
          const mappedOwnJobs = ownJobs.map((job) => mapApiJob(job, currentUser.id))
          const applicantLists = await Promise.all(mappedOwnJobs.map(async (job) => {
            const applicants = await apiRequest<Array<{ applicationId: number; seekerUserId: number; seekerName: string; profilePictureUrl?: string; bio?: string; skills?: string[]; status: string; appliedAt: string }>>(`/api/provider/jobs/${job.id}/applications`)
            return applicants.map((app): Application => ({
              id: String(app.applicationId),
              jobId: job.id,
              workerId: String(app.seekerUserId),
              workerName: app.seekerName,
              workerPhoto: app.profilePictureUrl || "",
              workerLocation: "",
              workerSkills: app.skills || [],
              workerRating: 0,
              workerTotalJobs: 0,
              jobTitle: job.title,
              providerName: job.providerName,
              providerId: currentUser.id,
              appliedDate: (app.appliedAt || "").slice(0, 10),
              status: app.status === "SELECTED" ? "accepted" as const : app.status === "NOT_SELECTED" || app.status === "CANCELLED" ? "rejected" as const : "pending" as const,
              coverNote: app.bio || "",
            }))
          }))
          const [engagements, reviews] = await Promise.all([
            apiRequest<Array<{ engagementId: number; applicationId: number; status: string }>>("/api/provider/engagements"),
            apiRequest<Array<{ engagementId: number; direction: string; rating: number; comment?: string; createdAt: string }>>("/api/reviews/me"),
          ])
          if (!active) return
          const engagementByApplication = new Map(engagements.map((item) => [String(item.applicationId), item]))
          const providerApplications = applicantLists.flat().map((application) => {
            const engagement = engagementByApplication.get(application.id)
            const review = engagement && reviews.find((item) => item.engagementId === engagement.engagementId)
            return engagement ? {
              ...application,
              engagementId: String(engagement.engagementId),
              engagementStatus: engagement.status,
              ...(review ? { workerReviewRating: review.rating, workerReview: review.comment || "", workerReviewDate: (review.createdAt || "").slice(0, 10) } : {}),
            } : application
          })
          const jobsWithHires = mappedOwnJobs.map((job) => ({
            ...job,
            workersHired: providerApplications.filter((app) => app.jobId === job.id && app.status === "accepted" && app.engagementStatus !== "DECLINED").length,
          }))
          setData((old) => ({ ...old, jobs: [...jobsWithHires, ...mappedJobs.filter((job) => !jobsWithHires.some((own) => own.id === job.id))], applications: providerApplications }))
        } else if (currentUser?.role === "worker") {
          const [applications, savedJobs, notifications, engagements, reviews, verificationRequests] = await Promise.all([
            apiRequest<ApiApplication[]>("/api/seeker/applications"),
            apiRequest<Array<{ jobId: number }>>("/api/seeker/saved-jobs"),
            Promise.resolve(serverNotifications),
            apiRequest<Array<{ engagementId: number; applicationId: number; status: string }>>("/api/seeker/engagements"),
            apiRequest<Array<{ engagementId: number; direction: string; rating: number; comment?: string; createdAt: string }>>("/api/reviews/me"),
            apiRequest<Array<{ type: string; status: string; reviewNote?: string; submittedAt?: string; reviewedAt?: string; documents?: Array<{ documentType: string; originalFileName: string }> }>>("/api/verifications/me"),
          ])
          if (!active) return
          const engagementByApplication = new Map(engagements.map((item) => [String(item.applicationId), item]))
          const mappedApplications = applications.map((app) => {
            const mapped = mapApiApplication(app, currentUser, workerProfile || undefined)
            const engagement = engagementByApplication.get(mapped.id)
            const review = engagement && reviews.find((item) => item.engagementId === engagement.engagementId)
            const job = mappedJobs.find((item) => item.id === mapped.jobId)
            return {
              ...mapped,
              providerName: job?.providerName || "",
              providerId: job?.providerId || "",
              engagementId: engagement ? String(engagement.engagementId) : undefined,
              engagementStatus: engagement?.status,
              ...(review ? { providerRating: review.rating, providerReview: review.comment || "", providerReviewDate: (review.createdAt || "").slice(0, 10) } : {}),
            }
          })
          const identityRequest = verificationRequests.find((item) => item.type === "IDENTITY")
          const verified = identityRequest?.status === "APPROVED"
          const syncedWorkerProfile = identityRequest ? {
            ...(workerProfile || mapSeekerProfile({}, currentUser)),
            kycStatus: identityRequest.status === "APPROVED" ? "verified" as const : identityRequest.status === "REJECTED" ? "rejected" as const : "pending" as const,
            verified,
            kycReviewNote: identityRequest.reviewNote,
            kycSubmittedDate: identityRequest.submittedAt?.slice(0, 10),
            kycVerifiedDate: verified ? identityRequest.reviewedAt?.slice(0, 10) : undefined,
            kycDocumentType: identityRequest.documents?.[0]?.documentType === "NID_FRONT" ? "national-id" as const : identityRequest.documents?.length ? "citizenship" as const : undefined,
            kycDocumentFileName: identityRequest.documents?.[0]?.originalFileName,
          } : workerProfile
          setData((old) => ({
            ...old,
            jobs: mappedJobs,
            applications: mappedApplications,
            workerProfiles: syncedWorkerProfile ? old.workerProfiles.map((profile) => profile.id === currentUser.profileId ? syncedWorkerProfile : profile) : old.workerProfiles,
            savedJobs: savedJobs.map((item) => ({ workerId: currentUser.profileId, jobId: String(item.jobId) })),
            notifications: notifications.map((note) => ({
              id: String(note.id), userId: currentUser.id,
              type: "application", title: note.title, message: note.message,
              date: (note.createdAt || "").slice(0, 10), read: note.read,
              jobId: note.referenceType === "JOB" ? String(note.referenceId) : undefined,
            })),
          }))
        } else if (currentUser?.role === "admin") {
          const [verificationRequests, backendReports] = await Promise.all([
            apiRequest<Array<{ id: number; userId: number; fullName: string; email: string; type: string; status: string; reviewNote?: string; submittedAt?: string; reviewedAt?: string; documents?: Array<{ id: number; documentType: string; originalFileName: string }> }>>("/api/admin/verifications"),
            apiRequest<Array<{ id: number; reporterId: number; reportedJobPostId?: number; reportedJobTitle?: string; reason: string; description: string; status: string; createdAt: string }>>("/api/admin/reports"),
          ])
          if (!active) return
          const workerProfiles = verificationRequests.filter((request) => request.type === "IDENTITY").map((request) => {
            const user: User = { id: String(request.userId), role: "worker", email: request.email, name: request.fullName, profileId: String(request.userId), backendAuth: true }
            const profile = mapSeekerProfile({}, user)
            const document = request.documents?.[0]
            return {
              ...profile,
              kycStatus: request.status === "APPROVED" ? "verified" as const : request.status === "REJECTED" ? "rejected" as const : "pending" as const,
              verified: request.status === "APPROVED",
              kycReviewNote: request.reviewNote,
              kycSubmittedDate: request.submittedAt?.slice(0, 10),
              kycVerifiedDate: request.status === "APPROVED" ? request.reviewedAt?.slice(0, 10) : undefined,
              kycDocumentType: document?.documentType === "NID_FRONT" ? "national-id" as const : document ? "citizenship" as const : undefined,
              kycDocumentFileName: document?.originalFileName,
              kycRequestId: String(request.id),
              kycDocumentId: document ? String(document.id) : undefined,
            }
          })
          setData((old) => ({
            ...old,
            workerProfiles: [...old.workerProfiles.filter((item) => !workerProfiles.some((apiProfile) => apiProfile.id === item.id)), ...workerProfiles],
            users: [...old.users.filter((item) => !workerProfiles.some((profile) => profile.id === item.id)), ...workerProfiles.map((profile) => ({ id: profile.id, role: "worker" as const, email: profile.email, name: profile.name, profileId: profile.id, backendAuth: true }))],
            reports: backendReports.map((report) => ({
              id: String(report.id),
              reporterId: String(report.reporterId),
              jobId: report.reportedJobPostId ? String(report.reportedJobPostId) : "",
              reason: report.reason,
              details: report.description,
              date: (report.createdAt || "").slice(0, 10),
              status: report.status === "UNDER_REVIEW" ? "reviewing" as const : report.status === "RESOLVED" ? "resolved" as const : report.status === "REJECTED" ? "dismissed" as const : "submitted" as const,
            })),
          }))
        }
        if (active) setStorageWarning("")
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "The server could not be reached."
          setStorageWarning(
            message.includes("404") || message.includes("route not found")
              ? "Server sync unavailable: the Java API is not deployed or reachable. Check the Vercel backend service and database."
              : `Server sync unavailable: ${message}`,
          )
        }
      }
    }
    void syncBackend()
    return () => { active = false }
  }, [currentUser?.id, currentUser?.role, workerProfile?.id, providerProfile?.id])

  useEffect(() => {
    const handleExpired = () => {
      setSessionId("")
      setCurrentPage("login")
      setCurrentJobId(null)
    }
    window.addEventListener("shram-bazar:session-expired", handleExpired)
    return () => window.removeEventListener("shram-bazar:session-expired", handleExpired)
  }, [])

  const addNotification = (
    draft: PersistedData,
    notification: Omit<Notification, "id" | "date" | "read">,
  ) => {
    draft.notifications.push({
      ...notification,
      id: id("n"),
      date: today(),
      read: false,
    })
  }

  const navigate = (page: Page, jobId?: string) => {
    if (!currentUser && !publicOnly.includes(page))
      return setCurrentPage("login")
    if (currentUser?.role === "worker" && providerOnly.includes(page))
      return setCurrentPage("worker-dashboard")
    if (currentUser?.role === "provider" && workerOnly.includes(page))
      return setCurrentPage("provider-dashboard")
    if (currentUser?.role === "admin" && !adminOnly.includes(page))
      return setCurrentPage("admin-dashboard")
    if (currentUser && currentUser.role !== "admin" && adminOnly.includes(page))
      return setCurrentPage(
        currentUser.role === "worker"
          ? "worker-dashboard"
          : "provider-dashboard",
      )
    if (
      page === "job-detail" &&
      jobId &&
      !data.jobs.some((job) => job.id === jobId) &&
      !externalJobs.some((job) => job.id === jobId)
    )
      return
    if (
      (page === "edit-job" || page === "applicant-management") &&
      jobId &&
      !data.jobs.some(
        (job) => job.id === jobId && job.providerId === providerProfile?.id,
      )
    )
      return
    setCurrentPage(page)
    if (jobId) setCurrentJobId(jobId)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const activate = (user: User) => {
    setSessionId(user.id)
    setCurrentPage(
      user.role === "worker"
        ? "worker-dashboard"
        : user.role === "admin"
          ? "admin-dashboard"
          : "provider-dashboard",
    )
  }

  const activateBackend = async (
    auth: BackendAuth,
    signupProfile?: Partial<WorkerProfile & ProviderProfile>,
  ) => {
    setBackendAuth(auth)
    const role = apiRoleToUserRole(auth.role)
    const user: User = {
      id: String(auth.userId),
      role,
      email: auth.email,
      name: auth.fullName,
      profileId: String(auth.userId),
      accountStatus: "active",
      backendAuth: true,
    }
    let worker: WorkerProfile | null = null
    let provider: ProviderProfile | null = null
    if (role === "worker") {
      worker = {
        id: user.profileId,
        name: user.name,
        photo: "",
        phone: signupProfile?.phone || "",
        email: user.email,
        dateOfBirth: signupProfile?.dateOfBirth,
        address: signupProfile?.address,
        location: signupProfile?.location || signupProfile?.address || "",
        district: signupProfile?.district || "",
        skills: signupProfile?.skills || [],
        qualifications: [],
        experience: [],
        availableDates: [],
        availability: "flexible",
        bio: "",
        workHistory: [],
        rating: 0,
        totalJobs: 0,
        verified: false,
        kycStatus: "not-verified",
      }
    } else if (role === "provider") {
      provider = {
        id: user.profileId,
        providerType: signupProfile?.providerType || "individual",
        dateOfBirth: signupProfile?.dateOfBirth,
        orgName: signupProfile?.orgName || user.name,
        logo: "",
        contactName: user.name,
        email: user.email,
        phone: signupProfile?.phone || "",
        location: signupProfile?.location || signupProfile?.address || "",
        district: signupProfile?.district || "",
        industry: signupProfile?.industry || "Other",
        description: signupProfile?.description || "",
        verified: false,
        pan: "",
        totalHires: 0,
        rating: 0,
        reviewCount: 0,
      }
    }
    setData((old) => ({
      ...old,
      users: [...old.users.filter((item) => item.id !== user.id), user],
      credentials: old.credentials.filter((item) => item.userId !== user.id),
      workerProfiles: worker
        ? [...old.workerProfiles.filter((item) => item.id !== worker!.id), worker]
        : old.workerProfiles,
      providerProfiles: provider
        ? [...old.providerProfiles.filter((item) => item.id !== provider!.id), provider]
        : old.providerProfiles,
    }))
    activate(user)
    if (role === "worker") {
      try {
        const profile = await apiRequest<Record<string, unknown>>("/api/seeker/profile")
        const mapped = mapSeekerProfile(profile, user)
        const catalog = await apiRequest<Array<{ id: number; name: string }>>("/api/skills")
        if (signupProfile?.skills?.length) {
          const currentSkills = await apiRequest<Array<{ skillName: string }>>("/api/seeker/skills")
          const currentNames = new Set(currentSkills.map((item) => item.skillName.toLowerCase()))
          await Promise.all(signupProfile.skills.flatMap((name) => {
            const skill = catalog.find((item) => item.name.toLowerCase() === name.toLowerCase())
            return skill && !currentNames.has(name.toLowerCase())
              ? [apiRequest("/api/seeker/skills", { method: "POST", body: JSON.stringify({ skillId: skill.id }) })]
              : []
          }))
        }
        const seekerSkills = await apiRequest<Array<{ skillName: string }>>("/api/seeker/skills")
        mapped.skills = seekerSkills.map((item) => item.skillName)
        const verificationRequests = await apiRequest<Array<{ type: string; status: string; reviewNote?: string; submittedAt?: string; reviewedAt?: string; documents?: Array<{ documentType: string; originalFileName: string }> }>>("/api/verifications/me")
        const identityRequest = verificationRequests.find((item) => item.type === "IDENTITY")
        if (identityRequest) {
          mapped.kycStatus = identityRequest.status === "APPROVED" ? "verified" : identityRequest.status === "REJECTED" ? "rejected" : "pending"
          mapped.verified = identityRequest.status === "APPROVED"
          mapped.kycReviewNote = identityRequest.reviewNote
          mapped.kycSubmittedDate = identityRequest.submittedAt?.slice(0, 10)
          mapped.kycVerifiedDate = identityRequest.status === "APPROVED" ? identityRequest.reviewedAt?.slice(0, 10) : undefined
          const document = identityRequest.documents?.[0]
          mapped.kycDocumentType = document?.documentType === "NID_FRONT" ? "national-id" : document ? "citizenship" : undefined
          mapped.kycDocumentFileName = document?.originalFileName
        }
        setData((old) => ({
          ...old,
          workerProfiles: [...old.workerProfiles.filter((item) => item.id !== mapped.id), { ...worker, ...mapped }],
        }))
      } catch {
        // A profile read can be retried from the profile page without undoing sign-in.
      }
    } else if (role === "provider") {
      try {
        const profile = await apiRequest<Record<string, unknown>>("/api/provider/profile")
        const mapped = mapProviderProfile(profile, user)
        setData((old) => ({
          ...old,
          providerProfiles: [...old.providerProfiles.filter((item) => item.id !== mapped.id), { ...provider, ...mapped }],
        }))
      } catch {
        // A profile read can be retried from the profile page without undoing sign-in.
      }
    }
  }

  const login = async (email: string, password: string) => {
    if (backendMode) {
      return await apiRequest<BackendAuth>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
        .then(async (auth) => {
          await activateBackend(auth)
          return null
        })
        .catch((error: unknown) =>
          error instanceof Error ? error.message : "Sign in failed. Please try again.",
        )
    }
    const user = data.users.find(
      (item) => item.email.toLowerCase() === email.trim().toLowerCase(),
    )
    const credentials =
      user && data.credentials.find((item) => item.userId === user.id)
    if (user?.accountStatus === "suspended")
      return "This account is suspended. Contact Shram Bazaar support."
    if (!user || credentials?.password !== password)
      return "Email or password is incorrect."
    activate(user)
    return null
  }

  const duplicateError = (email: string) =>
    data.users.some(
      (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
    )
      ? "An account with this email already exists."
      : null

  const signupWorker = async (form: WorkerSignup) => {
    if (!form.name.trim()) return "Enter your full name."
    if (!isValidEmail(form.email)) return "Enter a valid email address."
    if (!isValidPhoneNumber(form.phone))
      return "Enter a valid phone number with 7 to 15 digits."
    if (!form.dateOfBirth || !isDateOnlyString(form.dateOfBirth))
      return "Enter your date of birth."
    if (!form.address?.trim() && !form.location.trim())
      return "Enter your local address."
    if (form.password.length < 8)
      return "Use a password with at least 8 characters."
    if (
      form.dateOfBirth &&
      (!isDateOnlyString(form.dateOfBirth) || form.dateOfBirth > today())
    )
      return "Enter a valid date of birth that is not in the future."
    if (!form.district.trim()) return "Select your district."
    if (!form.location.trim()) return "Enter your local address."
    const duplicate = duplicateError(form.email)
    if (duplicate) return duplicate
    if (backendMode) {
      return await apiRequest<BackendAuth>("/api/auth/register/job-seeker", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.password,
          phoneNumber: form.phone.replace(/[\s()-]/g, ""),
          dateOfBirth: form.dateOfBirth,
          address: (form.address || form.location || form.district).trim(),
        }),
      })
        .then(async (auth) => {
          await activateBackend(auth, {
            phone: form.phone,
            district: form.district,
            location: form.location,
            skills: form.skills,
          })
          return null
        })
        .catch((error: unknown) =>
          error instanceof Error ? error.message : "Could not create your account.",
        )
    }
    const profileId = id("wp")
    const user: User = {
      id: id("u-w"),
      role: "worker",
      email: form.email.trim().toLowerCase(),
      name: form.name.trim(),
      profileId,
    }
    const profile: WorkerProfile = {
      id: profileId,
      name: form.name.trim(),
      photo: "",
      phone: form.phone.trim(),
      email: user.email,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      address: form.address,
      location: form.location || form.district,
      district: form.district,
      skills: form.skills,
      qualifications: [],
      experience: [],
      availableDates: [],
      availability: "flexible",
      bio: "",
      workHistory: [],
      rating: 0,
      totalJobs: 0,
      verified: false,
      kycStatus: "not-verified",
      phoneVerified: false,
      emailVerified: false,
    }
    setData((old) => ({
      ...old,
      users: [...old.users, user],
      credentials: [
        ...old.credentials,
        { userId: user.id, password: form.password },
      ],
      workerProfiles: [...old.workerProfiles, profile],
    }))
    activate(user)
    return null
  }

  const signupProvider = async (form: ProviderSignup) => {
    if (!form.contactName.trim()) return "Enter a contact person name."
    if (!form.orgName.trim()) return "Enter your organisation name."
    if (!isValidEmail(form.email)) return "Enter a valid email address."
    if (!isValidPhoneNumber(form.phone))
      return "Enter a valid phone number with 7 to 15 digits."
    if (!form.dateOfBirth || !isDateOnlyString(form.dateOfBirth))
      return "Enter your date of birth."
    if (form.password.length < 8)
      return "Use a password with at least 8 characters."
    if (form.providerType !== "individual" && !isValidNepalPan(form.pan))
      return "Enter a 9-digit PAN number for your business or organization."
    if (form.pan && !isValidNepalPan(form.pan))
      return "Enter a valid 9-digit PAN number or leave it blank for an individual account."
    if (!form.industry.trim()) return "Select your industry."
    if (!form.district.trim()) return "Select your district."
    if (!form.location.trim()) return "Enter your organisation address."
    const duplicate = duplicateError(form.email)
    if (duplicate) return duplicate
    if (backendMode) {
      const hasBusiness = form.providerType !== "individual"
      return await apiRequest<BackendAuth>("/api/auth/register/job-provider", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.contactName.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.password,
          phoneNumber: form.phone.replace(/[\s()-]/g, ""),
          dateOfBirth: form.dateOfBirth,
          address: (form.address || form.location || form.district).trim(),
          hasBusiness,
          businessName: hasBusiness ? form.orgName.trim() : null,
          businessLocation: hasBusiness ? form.location.trim() : null,
          businessDescription: hasBusiness ? form.industry : null,
        }),
      })
        .then(async (auth) => {
          await activateBackend(auth, {
            phone: form.phone,
            dateOfBirth: form.dateOfBirth,
            location: form.location,
            orgName: form.orgName,
            industry: form.industry,
            district: form.district,
            providerType: form.providerType,
          })
          return null
        })
        .catch((error: unknown) =>
          error instanceof Error ? error.message : "Could not create your account.",
        )
    }
    const profileId = id("pp")
    const user: User = {
      id: id("u-p"),
      role: "provider",
      email: form.email.trim().toLowerCase(),
      name: form.orgName.trim(),
      profileId,
    }
    const profile: ProviderProfile = {
      id: profileId,
      providerType: form.providerType,
      orgName: form.orgName.trim(),
      logo: blankProviderLogo,
      contactName: form.contactName.trim(),
      email: user.email,
      phone: form.phone.trim(),
      location: form.location || form.district,
      district: form.district,
      industry: form.industry,
      description: "",
      verified: false,
      pan: form.pan.trim(),
      totalHires: 0,
      rating: 0,
      reviewCount: 0,
      verificationStatus: "not-submitted",
    }
    setData((old) => ({
      ...old,
      users: [...old.users, user],
      credentials: [
        ...old.credentials,
        { userId: user.id, password: form.password },
      ],
      providerProfiles: [...old.providerProfiles, profile],
    }))
    activate(user)
    return null
  }

  const logout = () => {
    const hadBackendSession = !!getBackendAuth()
    if (hadBackendSession) {
      void apiRequest<void>("/api/auth/logout", { method: "POST" }).catch(() => {})
      setBackendAuth(null)
    }
    setSessionId("")
    setCurrentPage("landing")
    setCurrentJobId(null)
    setExternalJobsState([])
  }
  const unsupportedDemo = () => setCurrentPage("login")
  const loginAsAdmin = () => {
    if (!import.meta.env.DEV) return
    const existing = data.users.find((user) => user.role === "admin")
    if (existing) return activate(existing)
    const admin: User = {
      id: "u-admin-demo",
      role: "admin",
      email: "admin@shram-bazar.local",
      name: "Shram Bazaar Admin",
      profileId: "admin-demo",
    }
    setData((old) => ({ ...old, users: [...old.users, admin] }))
    activate(admin)
  }

  const applyToJob = async (jobId: string, coverNote: string) => {
    if (
      !currentUser ||
      !workerProfile ||
      (!backendMode && workerProfile.kycStatus !== "verified") ||
      data.applications.some(
        (app) => app.jobId === jobId && app.workerId === workerProfile.id,
      )
    )
      return
    const job = data.jobs.find(
      (item) => item.id === jobId && item.status === "active",
    )
    if (!job) return
    if (backendMode) {
      if (!/^\d+$/.test(jobId)) return
      const saved = await apiRequest<ApiApplication>(`/api/jobs/${jobId}/applications`, {
        method: "POST",
      })
      const application = {
        ...mapApiApplication(saved, currentUser, workerProfile),
        providerName: job.providerName,
        providerId: job.providerId,
        coverNote,
      }
      setData((old) => ({ ...old, applications: [...old.applications.filter((item) => item.id !== application.id), application] }))
      return
    }
    setData((old) => {
      const draft = structuredClone(old)
      const application: Application = {
        id: id("app"),
        jobId,
        workerId: workerProfile.id,
        workerName: workerProfile.name,
        workerPhoto: workerProfile.photo,
        workerLocation: workerProfile.location,
        workerSkills: workerProfile.skills,
        workerRating: workerProfile.rating,
        workerTotalJobs: workerProfile.totalJobs,
        jobTitle: job.title,
        providerName: job.providerName,
        providerId: job.providerId,
        appliedDate: today(),
        status: "pending",
        coverNote,
      }
      draft.applications.push(application)
      draft.jobs = draft.jobs.map((item) =>
        item.id === jobId
          ? { ...item, applicantCount: item.applicantCount + 1 }
          : item,
      )
      const providerUser = draft.users.find(
        (user) => user.profileId === job.providerId,
      )
      if (providerUser)
        addNotification(draft, {
          userId: providerUser.id,
          type: "application",
          title: "New Applicant",
          message: `${workerProfile.name} applied for "${job.title}".`,
          jobId,
          applicationId: application.id,
        })
      return draft
    })
  }

  const saveJob = (jobId: string) => {
    if (
      !workerProfile ||
      data.savedJobs.some(
        (saved) => saved.workerId === workerProfile.id && saved.jobId === jobId,
      )
    )
      return
    if (backendMode) {
      if (!/^\d+$/.test(jobId)) return
      void apiRequest(`/api/seeker/saved-jobs/${jobId}`, { method: "PUT" })
        .then(() => setData((old) => ({ ...old, savedJobs: [...old.savedJobs, { workerId: workerProfile.id, jobId }] })))
        .catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Unable to save this job."))
      return
    }
    setData((old) => ({
      ...old,
      savedJobs: [...old.savedJobs, { workerId: workerProfile.id, jobId }],
    }))
  }
  const unsaveJob = (jobId: string) => {
    if (backendMode && workerProfile && /^\d+$/.test(jobId)) {
      void apiRequest<void>(`/api/seeker/saved-jobs/${jobId}`, { method: "DELETE" })
        .then(() => setData((old) => ({ ...old, savedJobs: old.savedJobs.filter((saved) => !(saved.workerId === workerProfile.id && saved.jobId === jobId)) })))
        .catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Unable to remove this saved job."))
      return
    }
    workerProfile &&
    setData((old) => ({
      ...old,
      savedJobs: old.savedJobs.filter(
        (saved) =>
          !(saved.workerId === workerProfile.id && saved.jobId === jobId),
      ),
    }))
  }

  const updateApplicationStatus = (
    applicationId: string,
    status: ApplicationStatus,
    note?: string,
  ) => {
    if (!providerProfile) return
    if (backendMode) {
      const application = data.applications.find((item) => item.id === applicationId)
      if (!application || !/^\d+$/.test(applicationId) || !/^\d+$/.test(application.jobId)) return
      const endpoint = status === "accepted"
        ? `/api/provider/jobs/${application.jobId}/applications/${applicationId}/select`
        : status === "rejected"
          ? `/api/provider/jobs/${application.jobId}/applications/${applicationId}/reject`
          : ""
      if (!endpoint) {
        setStorageWarning("The server does not support this applicant status yet.")
        return
      }
      void apiRequest<{ engagementId?: number; status?: string }>(endpoint, { method: "POST" })
        .then((response) => setData((old) => ({ ...old, applications: old.applications.map((item) => item.id === applicationId ? { ...item, status, providerNote: note, engagementId: response?.engagementId ? String(response.engagementId) : item.engagementId, engagementStatus: response?.status || item.engagementStatus } : item) })))
        .catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Unable to update the applicant."))
      return
    }
    setData((old) => {
      const application = old.applications.find(
        (app) =>
          app.id === applicationId &&
          old.jobs.some(
            (job) =>
              job.id === app.jobId && job.providerId === providerProfile.id,
          ),
      )
      if (!application) return old
      if (application.status === status) return old
      if (status === "accepted") {
        const job = old.jobs.find((item) => item.id === application.jobId)
        const acceptedCount = old.applications.filter(
          (item) => item.jobId === application.jobId && item.status === "accepted",
        ).length
        if (!job || acceptedCount >= job.workersNeeded) return old
      }
      const draft = structuredClone(old)
      draft.applications = draft.applications.map((app) =>
        app.id === applicationId ? { ...app, status, providerNote: note } : app,
      )
      const accepted = draft.applications.filter(
        (app) => app.jobId === application.jobId && app.status === "accepted",
      ).length
      draft.jobs = draft.jobs.map((job) =>
        job.id === application.jobId
          ? {
              ...job,
              workersHired: accepted,
              status:
                accepted >= job.workersNeeded
                  ? "filled"
                  : job.status === "filled"
                    ? "active"
                    : job.status,
            }
          : job,
      )
      const workerUser = draft.users.find(
        (user) => user.profileId === application.workerId,
      )
      if (workerUser)
        addNotification(draft, {
          userId: workerUser.id,
          type:
            status === "accepted"
              ? "selection"
              : status === "shortlisted"
                ? "shortlisted"
                : "rejection",
          title:
            status === "accepted"
              ? "Application Accepted!"
              : status === "shortlisted"
                ? "You've been Shortlisted"
                : "Application Update",
          message: `Your application for "${application.jobTitle}" is now ${status}.${
            note ? ` Note: ${note}` : ""
          }`,
          jobId: application.jobId,
          applicationId,
        })
      return draft
    })
  }

  const respondToSelection = (applicationId: string, accept: boolean) => {
    const application = data.applications.find((item) => item.id === applicationId)
    if (!backendMode || !application?.engagementId) return
    const decision = accept ? "confirm" : "decline"
    void apiRequest<{ status: string }>(`/api/seeker/engagements/${application.engagementId}/${decision}`, { method: "POST" })
      .then((result) => setData((old) => ({
        ...old,
        applications: old.applications.map((item) => item.id === applicationId
          ? { ...item, status: accept ? "accepted" : "rejected", engagementStatus: result.status }
          : item),
      })))
      .catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Unable to respond to the work selection."))
  }

  const updateEngagementWork: AppContextValue["updateEngagementWork"] = (applicationId, action) => {
    const application = data.applications.find((item) => item.id === applicationId)
    if (!backendMode || !application?.engagementId || !currentUser) return
    const prefix = currentUser.role === "provider" ? "provider" : "seeker"
    void (async () => {
      try {
        if (action === "start") {
          await apiRequest(`/api/provider/engagements/${application.engagementId}/start`, { method: "POST" })
          return
        }
        if (currentUser.role === "provider" && application.engagementStatus === "CONFIRMED") {
          await apiRequest(`/api/provider/engagements/${application.engagementId}/start`, { method: "POST" })
        }
        const result = await apiRequest<{ status: string }>(`/api/${prefix}/engagements/${application.engagementId}/confirm-completion`, { method: "POST" })
        setData((old) => ({ ...old, applications: old.applications.map((item) => item.id === applicationId ? { ...item, engagementStatus: result.status } : item) }))
        setStorageWarning("")
      } catch (error) {
        setStorageWarning(error instanceof Error ? error.message : "Unable to update the work status.")
      }
    })()
  }

  const postJob: AppContextValue["postJob"] = async (job) => {
    if (!providerProfile) return
    if (backendMode) {
      try {
        const skillCatalog = await apiRequest<Array<{ id: number; name: string }>>("/api/skills")
        const skillIds = job.skillsRequired
          .map((name) => skillCatalog.find((skill) => skill.name.toLowerCase() === name.toLowerCase())?.id)
          .filter((skillId): skillId is number => Number.isFinite(skillId))
        const payload = {
          title: job.title,
          description: job.description,
          responsibilities: "",
          address: job.location,
          municipality: job.district,
          district: job.district,
          province: "",
          startDate: job.date,
          endDate: job.endDate || job.date,
          startTime: `${job.startTime}:00`,
          endTime: `${job.endTime}:00`,
          durationDescription: job.duration,
          paymentAmount: job.payment,
          paymentMethod: job.paymentType === "fixed" ? "OTHER" : "CASH",
          requiredExperienceMonths: Number(job.experienceRequired.match(/\d+/)?.[0] || 0),
          numberOfWorkersRequired: job.workersNeeded,
          requiredSkillIds: skillIds,
        }
        const created = await apiRequest<ApiJob>("/api/provider/jobs", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        const mapped = mapApiJob(created, providerProfile.id)
        setData((old) => ({ ...old, jobs: [mapped, ...old.jobs.filter((item) => item.id !== mapped.id)] }))
        setStorageWarning("")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to post this job."
        setStorageWarning(message)
        throw error
      }
      return
    }
    const newJob: Job = {
      ...job,
      id: id("j"),
      providerId: providerProfile.id,
      providerName: providerProfile.orgName,
      providerLogo: providerProfile.logo,
      providerVerified: providerProfile.verified,
      workersHired: 0,
      postedDate: today(),
      applicantCount: 0,
      status: "active",
    }
    setData((old) => ({ ...old, jobs: [newJob, ...old.jobs] }))
  }

  const updateJob = async (jobId: string, updates: Partial<Job>) => {
    if (
      !providerProfile ||
      !data.jobs.some(
        (job) => job.id === jobId && job.providerId === providerProfile.id,
      )
    )
      return
    if (backendMode) {
      const existing = data.jobs.find((job) => job.id === jobId)
      if (!existing || !/^\d+$/.test(jobId)) return
      if (updates.status === "closed") {
        try {
          await apiRequest<void>(`/api/provider/jobs/${jobId}/close`, { method: "POST" })
          setData((old) => ({ ...old, jobs: old.jobs.map((job) => job.id === jobId ? { ...job, status: "closed" } : job) }))
          return
        } catch (error) {
          setStorageWarning(error instanceof Error ? error.message : "Unable to close this job.")
          throw error
        }
      }
      const job = { ...existing, ...updates }
      try {
        const skillCatalog = await apiRequest<Array<{ id: number; name: string }>>("/api/skills")
        const skillIds = job.skillsRequired
          .map((name) => skillCatalog.find((skill) => skill.name.toLowerCase() === name.toLowerCase())?.id)
          .filter((skillId): skillId is number => Number.isFinite(skillId))
        const saved = await apiRequest<ApiJob>(`/api/provider/jobs/${jobId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: job.title, description: job.description, responsibilities: "",
            address: job.location, municipality: job.district, district: job.district, province: "",
            startDate: job.date, endDate: job.endDate || job.date,
            startTime: `${job.startTime}:00`, endTime: `${job.endTime}:00`,
            durationDescription: job.duration, paymentAmount: job.payment,
            paymentMethod: job.paymentType === "fixed" ? "OTHER" : "CASH",
            requiredExperienceMonths: Number(job.experienceRequired.match(/\d+/)?.[0] || 0),
            numberOfWorkersRequired: job.workersNeeded, requiredSkillIds: skillIds,
          }),
        })
        const mapped = { ...mapApiJob(saved, providerProfile.id), status: updates.status || mapApiJob(saved, providerProfile.id).status }
        setData((old) => ({ ...old, jobs: old.jobs.map((item) => item.id === jobId ? mapped : item) }))
        setStorageWarning("")
      } catch (error) {
        setStorageWarning(error instanceof Error ? error.message : "Unable to update this job.")
        throw error
      }
      return
    }
    setData((old) => {
      const draft = structuredClone(old)
      const job = draft.jobs.find((item) => item.id === jobId)!
      draft.jobs = draft.jobs.map((item) =>
        item.id === jobId ? { ...item, ...updates } : item,
      )
      const recipients = new Set([
        ...draft.applications
          .filter((app) => app.jobId === jobId)
          .map((app) => app.workerId),
        ...draft.savedJobs
          .filter((saved) => saved.jobId === jobId)
          .map((saved) => saved.workerId),
      ])
      recipients.forEach((profileId) => {
        const workerUser = draft.users.find(
          (user) => user.profileId === profileId,
        )
        if (workerUser)
          addNotification(draft, {
            userId: workerUser.id,
            type: "job-update",
            title: "Job Updated",
            message: `"${job.title}" was updated by the provider.`,
            jobId,
          })
      })
      return draft
    })
  }

  const deleteJob = async (jobId: string) => {
    if (
      !providerProfile ||
      !data.jobs.some(
        (job) => job.id === jobId && job.providerId === providerProfile.id,
      )
    )
      return
    if (backendMode) {
      try {
        await apiRequest(`/api/provider/jobs/${jobId}/cancel`, { method: "POST" })
        setData((old) => ({
          ...old,
          jobs: old.jobs.map((job) => job.id === jobId ? { ...job, status: "closed" } : job),
        }))
      } catch (error) {
        setStorageWarning(error instanceof Error ? error.message : "Could not cancel this job.")
      }
      return
    }
    setData((old) => {
      const draft = structuredClone(old)
      const job = draft.jobs.find((item) => item.id === jobId)!
      new Set(
        draft.applications
          .filter((app) => app.jobId === jobId)
          .map((app) => app.workerId),
      ).forEach((profileId) => {
        const workerUser = draft.users.find(
          (user) => user.profileId === profileId,
        )
        if (workerUser)
          addNotification(draft, {
            userId: workerUser.id,
            type: "job-update",
            title: "Job Removed",
            message: `"${job.title}" was removed by the provider.`,
            jobId,
          })
      })
      draft.jobs = draft.jobs.filter((item) => item.id !== jobId)
      draft.applications = draft.applications.filter(
        (app) => app.jobId !== jobId,
      )
      draft.savedJobs = draft.savedJobs.filter((saved) => saved.jobId !== jobId)
      return draft
    })
  }

  const reportJob = async (jobId: string, reason: string, details: string) => {
    if (!currentUser) return "Please sign in before reporting a job."
    if (!data.jobs.some((job) => job.id === jobId))
      return "This job is no longer available."
    if (
      data.reports.some(
        (report) =>
          report.jobId === jobId && report.reporterId === currentUser.id,
      )
    ) {
      return "You have already reported this job."
    }
    if (backendMode) {
      const backendReason = reason.toLowerCase().includes("payment")
        ? "PAYMENT_ISSUE"
        : reason.toLowerCase().includes("unsafe") || reason.toLowerCase().includes("inappropriate")
          ? "MISCONDUCT"
          : reason.toLowerCase().includes("incorrect") || reason.toLowerCase().includes("misleading")
            ? "SUSPICIOUS_JOB"
            : "OTHER"
      try {
        await apiRequest("/api/reports", {
          method: "POST",
          body: JSON.stringify({ reportedJobPostId: Number(jobId), reason: backendReason, description: details.trim() || reason }),
        })
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Could not submit this report. Please try again."
      }
    }
    setData((old) => ({
      ...old,
      reports: [
        ...old.reports,
        {
          id: id("report"),
          reporterId: currentUser.id,
          jobId,
          reason,
          details: details.trim(),
          date: today(),
          status: "submitted",
        },
      ],
    }))
    return null
  }

  const reviewWorker = async (
    applicationId: string,
    rating: number,
    review: string,
  ) => {
    if (!providerProfile || rating < 1 || rating > 5 || !review.trim()) return "Enter a rating and review first."
    if (backendMode) {
      const application = data.applications.find((item) => item.id === applicationId)
      if (!application?.engagementId || application.engagementStatus !== "COMPLETED") return "Reviews are available after both sides confirm the work is complete."
      try {
        await apiRequest(`/api/engagements/${application.engagementId}/reviews`, {
          method: "POST",
          body: JSON.stringify({ rating, comment: review.trim() }),
        })
        setData((old) => ({ ...old, applications: old.applications.map((item) => item.id === applicationId
          ? { ...item, workerReviewRating: rating, workerReview: review.trim(), workerReviewDate: today() }
          : item) }))
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Unable to submit the worker review."
      }
    }
    setData((old) => {
      const application = old.applications.find(
        (app) =>
          app.id === applicationId &&
          app.status === "accepted" &&
          old.jobs.some(
            (job) =>
              job.id === app.jobId && job.providerId === providerProfile.id,
          ),
      )
      if (!application || application.workerReviewDate) return old
      const job = old.jobs.find((item) => item.id === application.jobId)!
      if ((job.endDate || job.date) > today()) return old
      return {
        ...old,
        applications: old.applications.map((item) => item.id === applicationId ? { ...item, workerReviewRating: rating, workerReview: review.trim(), workerReviewDate: today() } : item),
        workerProfiles: old.workerProfiles.map((profile) => {
          if (profile.id !== application.workerId) return profile
          const entry = {
            jobId: job.id,
            jobTitle: job.title,
            providerName: providerProfile.orgName,
            date: today(),
            payment: job.payment,
            rating,
            review: review.trim(),
          }
          const workHistory = [
            ...profile.workHistory.filter((item) => item.jobId !== job.id),
            entry,
          ]
          const average =
            workHistory.reduce((sum, item) => sum + item.rating, 0) /
            workHistory.length
          return {
            ...profile,
            workHistory,
            totalJobs: workHistory.length,
            rating: Number(average.toFixed(1)),
          }
        }),
      }
    })
    return null
  }

  const reviewProvider = async (applicationId: string, rating: number, review: string) => {
    if (!workerProfile || rating < 1 || rating > 5 || !review.trim()) return "Enter a rating and review first."
    if (backendMode) {
      const application = data.applications.find((item) => item.id === applicationId)
      if (!application?.engagementId || application.engagementStatus !== "COMPLETED") return "Reviews are available after both sides confirm the work is complete."
      try {
        await apiRequest(`/api/engagements/${application.engagementId}/reviews`, {
          method: "POST",
          body: JSON.stringify({ rating, comment: review.trim() }),
        })
        setData((old) => ({ ...old, applications: old.applications.map((item) => item.id === applicationId
          ? { ...item, providerRating: rating, providerReview: review.trim(), providerReviewDate: today() }
          : item) }))
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Unable to submit the provider review."
      }
    }
    setData((old) => {
      const application = old.applications.find((item) => item.id === applicationId && item.workerId === workerProfile.id && item.status === "accepted")
      if (!application || application.providerRating) return old
      const job = old.jobs.find((item) => item.id === application.jobId)
      if (!job || (job.endDate || job.date) > today()) return old
      const updatedApplications = old.applications.map((item) => item.id === applicationId ? { ...item, providerRating: rating, providerReview: review.trim(), providerReviewDate: today() } : item)
      const providerReviews = updatedApplications.filter((item) => item.providerId === application.providerId && item.providerRating)
      const providerUser = old.users.find((user) => user.profileId === application.providerId)
      const draft = { ...old, applications: updatedApplications, providerProfiles: old.providerProfiles.map((profile) => profile.id === application.providerId ? { ...profile, rating: Number((providerReviews.reduce((sum, item) => sum + (item.providerRating || 0), 0) / providerReviews.length).toFixed(1)), reviewCount: providerReviews.length } : profile) }
      if (providerUser) addNotification(draft, { userId: providerUser.id, type: "message", title: "New provider review", message: `${workerProfile.name} left feedback for “${job.title}”.`, jobId: job.id, applicationId })
      return draft
    })
    return null
  }

  const submitKyc = async (submission: KycSubmission) => {
    if (!workerProfile)
      return "Only worker accounts can submit identity verification."
    if (!workerProfile.phoneVerified || !workerProfile.emailVerified)
      return "Verify your phone number and email address before submitting identity verification."
    if (
      !(
        "national-id" === submission.documentType ||
        "citizenship" === submission.documentType ||
        "passport" === submission.documentType ||
        "driving-licence" === submission.documentType
      )
    ) {
      return "Choose a valid identity document type."
    }
    const documentNumber = submission.documentNumber.trim()
    if (!documentNumber) return "Enter the document number."
    if (documentNumber.length < 4 || documentNumber.length > 40)
      return "Document number must be between 4 and 40 characters."
    if (!submission.fileName || !submission.documentData)
      return "Upload a clear identity document."
    if (submission.documentExpiryDate) {
      if (!isDateOnlyString(submission.documentExpiryDate))
        return "Enter a valid document expiry date."
      if (submission.documentExpiryDate < today())
        return "The identity document must be current and not expired."
    }
    if (submission.documentData.length > 1_400_000)
      return "The document is too large. Use a file smaller than 1 MB."
    if (submission.selfieData && submission.selfieData.length > 700_000)
      return "The selfie is too large. Use an image smaller than 512 KB."
    if (backendMode) {
      try {
        const requests = await apiRequest<Array<{ id: number; type: string; status: string }>>("/api/verifications/me")
        const pendingRequest = requests.find((item) => item.type === "IDENTITY" && item.status === "PENDING")
        const requestId = pendingRequest?.id ?? (await apiRequest<{ id: number }>("/api/verifications", {
            method: "POST",
            body: JSON.stringify({ type: "IDENTITY" }),
          })).id
        const blob = await (await fetch(submission.documentData)).blob()
        const form = new FormData()
        form.set("documentType", submission.documentType === "national-id" ? "NID_FRONT" : "OTHER")
        form.set("file", new File([blob], submission.fileName, { type: blob.type || "application/octet-stream" }))
        await apiRequest(`/api/verifications/${requestId}/documents`, {
          method: "POST",
          body: form,
        })
        updateWorkerProfile({
          kycStatus: "pending",
          kycDocumentType: submission.documentType,
          kycDocumentNumber: undefined,
          kycDocumentFileName: submission.fileName,
          kycDocumentData: undefined,
          kycDocumentExpiryDate: submission.documentExpiryDate || undefined,
          kycSelfieData: undefined,
          kycSelfieFileName: undefined,
          kycReviewNote: undefined,
          kycSubmittedDate: today(),
          kycVerifiedDate: undefined,
          verified: false,
        })
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Unable to submit identity verification."
      }
    }
    updateWorkerProfile({
      kycStatus: "pending",
      kycDocumentType: submission.documentType,
      kycDocumentNumber: documentNumber,
      kycDocumentFileName: submission.fileName,
      kycDocumentData: submission.documentData,
      kycDocumentExpiryDate: submission.documentExpiryDate || undefined,
      kycSelfieData: submission.selfieData,
      kycSelfieFileName: submission.selfieFileName,
      kycReviewNote: undefined,
      kycSubmittedDate: today(),
      kycVerifiedDate: undefined,
      verified: false,
    })
    return null
  }

  const approveKyc = () => {
    if (!workerProfile || workerProfile.kycStatus !== "pending") return
    setData((old) => {
      const draft = structuredClone(old)
      draft.workerProfiles = draft.workerProfiles.map((profile) =>
        profile.id === workerProfile.id
          ? {
              ...profile,
              kycStatus: "verified",
              kycVerifiedDate: today(),
              verified: true,
            }
          : profile,
      )
      addNotification(draft, {
        userId: currentUser!.id,
        type: "job-update",
        title: "Identity Verified",
        message:
          "Your identity verification was approved. You can now apply for jobs.",
      })
      return draft
    })
  }

  const reviewKyc = (
    workerId: string,
    decision: "verified" | "rejected",
    note?: string,
  ) => {
    if (currentUser?.role !== "admin") return
    if (backendMode) {
      const worker = data.workerProfiles.find((profile) => profile.id === workerId)
      if (!worker?.kycRequestId) return
      const params = decision === "rejected" ? `?note=${encodeURIComponent(note?.trim() || "Please upload a clear, valid document.")}` : ""
      void apiRequest(`/api/admin/verifications/${worker.kycRequestId}/${decision === "verified" ? "approve" : "reject"}${params}`, { method: "POST" })
        .then(() => setData((old) => ({
          ...old,
          workerProfiles: old.workerProfiles.map((profile) => profile.id === workerId
            ? { ...profile, kycStatus: decision, verified: decision === "verified", kycReviewNote: decision === "rejected" ? note?.trim() : undefined, kycVerifiedDate: decision === "verified" ? today() : undefined }
            : profile),
        })))
        .catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Could not review this identity request."))
      return
    }
    setData((old) => {
      const draft = structuredClone(old)
      const worker = draft.workerProfiles.find(
        (profile) => profile.id === workerId,
      )
      if (!worker || worker.kycStatus !== "pending") return old
      worker.kycStatus = decision
      worker.verified = decision === "verified"
      worker.kycVerifiedDate = decision === "verified" ? today() : undefined
      worker.kycReviewNote = decision === "rejected" ? note?.trim() : undefined
      const user = draft.users.find((item) => item.profileId === workerId)
      if (user)
        addNotification(draft, {
          userId: user.id,
          type: decision === "verified" ? "selection" : "job-update",
          title:
            decision === "verified"
              ? "Identity verified"
              : "Identity review needs an update",
          message:
            decision === "verified"
              ? "Your identity verification was approved. You can now apply for jobs."
              : note?.trim() ||
                "Please review your identity document and submit it again.",
        })
      return draft
    })
  }

  const updateReport = (
    reportId: string,
    status: Report["status"],
    note?: string,
  ) => {
    if (currentUser?.role !== "admin") return
    if (backendMode) {
      const endpoint = status === "reviewing"
        ? `/api/admin/reports/${reportId}/review`
        : status === "resolved" || status === "dismissed"
          ? `/api/admin/reports/${reportId}/actions`
          : ""
      if (!endpoint) {
        setStorageWarning("The backend does not support reopening this report.")
        return
      }
      const request = status === "reviewing"
        ? apiRequest(endpoint, { method: "POST" })
        : apiRequest(endpoint, {
            method: "POST",
            body: JSON.stringify({ actionType: status === "dismissed" ? "REPORT_DISMISSED" : "OTHER", reason: note?.trim() || (status === "dismissed" ? "Report reviewed and dismissed." : "Report reviewed and resolved.") }),
          })
      void request.then(() => setData((old) => ({
        ...old,
        reports: old.reports.map((report) => report.id === reportId ? { ...report, status, adminNote: note?.trim() } : report),
      }))).catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Could not update this report."))
      return
    }
    setData((old) => {
      const draft = structuredClone(old)
      const report = draft.reports.find((item) => item.id === reportId)
      if (!report) return old
      const changed = report.status !== status
      report.status = status
      report.adminNote = note?.trim()
      if (changed) {
        const statusText =
          status === "resolved"
            ? "reviewed and resolved"
            : status === "dismissed"
              ? "reviewed and closed"
              : status === "reviewing"
                ? "started reviewing"
                : "reopened"
        const job = draft.jobs.find((item) => item.id === report.jobId)
        addNotification(draft, {
          userId: report.reporterId,
          type: "job-update",
          title: "Safety report updated",
          message: `We ${statusText} your report${
            job ? ` about “${job.title}”` : ""
          }.`,
          jobId: report.jobId,
        })
      }
      return draft
    })
  }

  const moderateJob = (jobId: string, status: Job["status"]) => {
    if (currentUser?.role !== "admin") return
    if (backendMode) {
      setStorageWarning("Administrator job moderation is not available in the backend API yet.")
      return
    }
    setData((old) => ({
      ...old,
      jobs: old.jobs.map((job) =>
        job.id === jobId ? { ...job, status } : job,
      ),
    }))
  }

  const verifyProvider = (providerId: string, verified: boolean) => {
    if (currentUser?.role !== "admin") return
    setData((old) => ({
      ...old,
      providerProfiles: old.providerProfiles.map((profile) =>
        profile.id === providerId
          ? {
              ...profile,
              verified,
              verifiedDate: verified ? today() : undefined,
              verificationStatus: verified ? "verified" : "not-submitted",
              verificationReviewNote: undefined,
            }
          : profile,
      ),
      jobs: old.jobs.map((job) => job.providerId === providerId ? { ...job, providerVerified: verified } : job),
    }))
  }

  const submitProviderVerification = (fileName: string, fileData: string) => {
    if (currentUser?.role !== "provider" || !providerProfile || !fileData) return
    setData((old) => {
      const draft = structuredClone(old)
      const profile = draft.providerProfiles.find((item) => item.id === providerProfile.id)
      if (!profile) return old
      profile.verificationDocumentName = fileName
      profile.verificationDocumentData = fileData
      profile.verificationStatus = "pending"
      profile.verificationReviewNote = undefined
      profile.verified = false
      profile.verifiedDate = undefined
      draft.jobs = draft.jobs.map((job) => job.providerId === profile.id ? { ...job, providerVerified: false } : job)
      draft.users.filter((user) => user.role === "admin").forEach((admin) =>
        addNotification(draft, {
          userId: admin.id,
          type: "profile-update",
          title: "Provider verification submitted",
          message: `${profile.orgName} submitted a provider verification document.`,
        }),
      )
      return draft
    })
  }

  const reviewProviderVerification = (providerId: string, approved: boolean, note?: string) => {
    if (currentUser?.role !== "admin") return
    setData((old) => {
      const draft = structuredClone(old)
      const profile = draft.providerProfiles.find((item) => item.id === providerId)
      if (!profile || profile.verificationStatus !== "pending") return old
      profile.verified = approved
      profile.verifiedDate = approved ? today() : undefined
      profile.verificationStatus = approved ? "verified" : "rejected"
      profile.verificationReviewNote = approved ? undefined : note?.trim() || "Please submit a valid identity or organisation verification document."
      draft.jobs = draft.jobs.map((job) => job.providerId === profile.id ? { ...job, providerVerified: approved } : job)
      const user = draft.users.find((item) => item.profileId === providerId)
      if (user) addNotification(draft, {
        userId: user.id,
        type: "profile-update",
        title: approved ? "Provider verification approved" : "Provider verification needs an update",
        message: approved ? "Your organisation verification was approved." : profile.verificationReviewNote!,
      })
      return draft
    })
  }

  const sendUserNotification = async (userId: string, title: string, message: string, type: Notification["type"] = "message") => {
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "provider")) return "Sign in with a provider account to send messages."
    const recipient = data.users.find((user) => user.id === userId || user.profileId === userId)
    if ((!recipient && !backendMode) || !title.trim() || !message.trim()) return "Enter a recipient and message."
    if (currentUser.role === "provider" && recipient && recipient.role !== "worker") return "Messages can only be sent to workers."
    if (backendMode && currentUser.role === "provider") {
      const application = data.applications.find((item) =>
        item.workerId === userId &&
        data.jobs.some((job) => job.id === item.jobId && job.providerId === providerProfile?.id),
      )
      if (!application) return "A message can only be sent to a worker who has applied to one of your jobs."
      try {
        await apiRequest(`/api/applications/${application.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ message: message.trim() }),
        })
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Could not send the message."
      }
    }
    if (!recipient) return "Recipient not found."
    setData((old) => {
      const draft = structuredClone(old)
      addNotification(draft, { userId: recipient.id, title: title.trim(), message: message.trim(), type })
      return draft
    })
    return null
  }

  const updateUserStatus = (userId: string, status: "active" | "suspended") => {
    if (currentUser?.role !== "admin") return
    if (backendMode && /^\d+$/.test(userId)) {
      void apiRequest(`/api/admin/users/${userId}/${status === "suspended" ? "suspend" : "reactivate"}`, { method: "PATCH" })
        .then(() => setData((old) => ({ ...old, users: old.users.map((user) => user.id === userId ? { ...user, accountStatus: status } : user) })))
        .catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Could not update this account."))
      return
    }
    setData((old) => ({
      ...old,
      users: old.users.map((user) =>
        user.id === userId && user.role !== "admin"
          ? { ...user, accountStatus: status }
          : user,
      ),
    }))
  }

  const updateWorkerProfile = (updates: Partial<WorkerProfile>) => {
    if (!workerProfile) return
    if (backendMode) {
      const next = { ...workerProfile, ...updates }
      if (updates.name !== undefined || updates.phone !== undefined || updates.dateOfBirth !== undefined || updates.address !== undefined || updates.location !== undefined || updates.bio !== undefined || updates.skills !== undefined) {
        void apiRequest<Record<string, unknown>>("/api/seeker/profile", {
          method: "PUT",
          body: JSON.stringify({
            fullName: next.name,
            phoneNumber: next.phone.replace(/[\s()-]/g, ""),
            dateOfBirth: next.dateOfBirth,
            address: next.address || next.location || next.district,
            bio: next.bio,
            preferredTravelDistanceKm: 10,
          }),
        }).catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Unable to save the worker profile."))
      }
      if (updates.skills) {
        void (async () => {
          try {
            const [catalog, current] = await Promise.all([
              apiRequest<Array<{ id: number; name: string }>>("/api/skills"),
              apiRequest<Array<{ seekerSkillId: number; skillName: string }>>("/api/seeker/skills"),
            ])
            const nextNames = new Set(updates.skills!.map((skill) => skill.toLowerCase()))
            await Promise.all(current.filter((item) => !nextNames.has(item.skillName.toLowerCase())).map((item) => apiRequest<void>(`/api/seeker/skills/${item.seekerSkillId}`, { method: "DELETE" })))
            const currentNames = new Set(current.map((item) => item.skillName.toLowerCase()))
            await Promise.all(updates.skills!.flatMap((name) => {
              const skill = catalog.find((item) => item.name.toLowerCase() === name.toLowerCase())
              return skill && !currentNames.has(name.toLowerCase())
                ? [apiRequest("/api/seeker/skills", { method: "POST", body: JSON.stringify({ skillId: skill.id }) })]
                : []
            }))
          } catch (error) {
            setStorageWarning(error instanceof Error ? error.message : "Unable to update worker skills.")
          }
        })()
      }
      if (updates.photo?.startsWith("data:")) {
        void (async () => {
          try {
            const blob = await (await fetch(updates.photo!)).blob()
            const form = new FormData()
            form.append("file", new File([blob], "profile-picture.png", { type: blob.type || "image/png" }))
            const response = await apiRequest<Record<string, unknown>>("/api/seeker/profile/picture", { method: "POST", body: form })
            const mapped = mapSeekerProfile(response, currentUser!)
            setData((old) => ({ ...old, workerProfiles: old.workerProfiles.map((profile) => profile.id === workerProfile.id ? { ...profile, photo: mapped.photo } : profile) }))
          } catch (error) {
            setStorageWarning(error instanceof Error ? error.message : "Unable to upload the profile picture.")
          }
        })()
      }
    }
    setData((old) => {
      const updated = {
        ...workerProfile,
        ...updates,
        ...(updates.phone !== undefined && updates.phone !== workerProfile.phone
          ? { phoneVerified: false }
          : {}),
        ...(updates.email !== undefined && updates.email !== workerProfile.email
          ? { emailVerified: false }
          : {}),
      }
      const identityChanged =
        (updates.name !== undefined && updates.name !== workerProfile.name) ||
        (updates.dateOfBirth !== undefined &&
          updates.dateOfBirth !== workerProfile.dateOfBirth)
      if (identityChanged && updated.kycStatus !== "not-verified") {
        updated.kycStatus = "not-verified"
        updated.verified = false
        updated.kycVerifiedDate = undefined
      }
      return {
        ...old,
        users: old.users.map((user) =>
          user.profileId === workerProfile.id
            ? { ...user, name: updated.name }
            : user,
        ),
        workerProfiles: old.workerProfiles.map((profile) =>
          profile.id === workerProfile.id ? updated : profile,
        ),
        applications: old.applications.map((application) =>
          application.workerId === workerProfile.id
            ? {
                ...application,
                workerName: updated.name,
                workerPhoto: updated.photo,
                workerLocation: updated.location,
                workerSkills: updated.skills,
                workerRating: updated.rating,
                workerTotalJobs: updated.totalJobs,
              }
            : application,
        ),
      }
    })
  }
  const notifyProfileUpdated = (message: string) => {
    if (!currentUser || !workerProfile) return
    setData((old) => {
      const draft = structuredClone(old)
      addNotification(draft, {
        userId: currentUser.id,
        type: "profile-update",
        title: "Profile updated",
        message,
      })
      return draft
    })
  }
  const updateProviderProfile = (updates: Partial<ProviderProfile>) => {
    if (!providerProfile) return
    if (backendMode) {
      const next = { ...providerProfile, ...updates }
      void apiRequest<Record<string, unknown>>("/api/provider/profile", {
        method: "PUT",
        body: JSON.stringify({
          fullName: next.contactName,
          phoneNumber: next.phone.replace(/[\s()-]/g, ""),
          dateOfBirth: next.dateOfBirth,
          address: next.location || next.district,
          businessName: next.providerType === "individual" ? null : next.orgName,
          businessLocation: next.providerType === "individual" ? null : next.location,
          businessDescription: next.description,
          hasBusiness: next.providerType !== "individual",
          businessWebsite: next.website || null,
        }),
      }).catch((error: unknown) => setStorageWarning(error instanceof Error ? error.message : "Unable to save the provider profile."))
      if (updates.logo?.startsWith("data:")) {
        void (async () => {
          try {
            const blob = await (await fetch(updates.logo!)).blob()
            const form = new FormData()
            form.append("file", new File([blob], "provider-picture.png", { type: blob.type || "image/png" }))
            await apiRequest("/api/provider/profile/picture", { method: "POST", body: form })
          } catch (error) {
            setStorageWarning(error instanceof Error ? error.message : "Unable to upload the provider picture.")
          }
        })()
      }
    }
    setData((old) => ({
      ...old,
      users: old.users.map((user) =>
        user.profileId === providerProfile.id
          ? { ...user, name: updates.orgName || user.name }
          : user,
      ),
      providerProfiles: old.providerProfiles.map((profile) =>
        profile.id === providerProfile.id
          ? { ...profile, ...updates }
          : profile,
      ),
      jobs: old.jobs.map((job) =>
        job.providerId === providerProfile.id
          ? {
              ...job,
              providerName: updates.orgName || job.providerName,
              providerLogo: updates.logo || job.providerLogo,
              providerVerified: updates.verified ?? job.providerVerified,
            }
          : job,
      ),
      applications: old.applications.map((application) =>
        application.providerId === providerProfile.id
          ? {
              ...application,
              providerName: updates.orgName || application.providerName,
            }
          : application,
      ),
    }))
  }

  const state: AppState = {
    currentPage,
    currentJobId,
    currentUser,
    workerProfile,
    providerProfile,
    jobs: withMatches(data.jobs, workerProfile),
    externalJobs,
    applications: data.applications,
    savedJobIds: workerProfile
      ? data.savedJobs
          .filter((saved) => saved.workerId === workerProfile.id)
          .map((saved) => saved.jobId)
      : [],
    notifications: data.notifications,
    allWorkerProfiles: data.workerProfiles.map((profile) => {
      const expired =
        profile.kycStatus === "verified" &&
        !!profile.kycDocumentExpiryDate &&
        profile.kycDocumentExpiryDate < today()
      const {
        dateOfBirth: _dateOfBirth,
        gender: _gender,
        address: _address,
        kycDocumentNumber: _documentNumber,
        kycDocumentData: _documentData,
        kycDocumentFileName: _documentFileName,
        kycDocumentExpiryDate: _documentExpiryDate,
        kycSelfieData: _selfieData,
        kycSelfieFileName: _selfieFileName,
        ...publicProfile
      } = profile
      return expired
        ? { ...publicProfile, kycStatus: "expired" as const, verified: false }
        : publicProfile
    }),
    allProviderProfiles: data.providerProfiles.map((profile) => {
      if (currentUser?.role === "admin") return profile
      const { verificationDocumentName: _documentName, verificationDocumentData: _documentData, verificationReviewNote: _reviewNote, ...publicProfile } = profile
      return publicProfile
    }),
    adminWorkerProfiles:
      currentUser?.role === "admin"
        ? data.workerProfiles.map((profile) =>
            profile.kycStatus === "verified" &&
            profile.kycDocumentExpiryDate &&
            profile.kycDocumentExpiryDate < today()
              ? { ...profile, kycStatus: "expired", verified: false }
              : profile,
          )
        : [],
    adminUsers: currentUser?.role === "admin" ? data.users : [],
    reports: currentUser?.role === "admin" ? data.reports : [],
    discoverySkill,
    storageWarning,
  }
  const myApplications = workerProfile
    ? data.applications.filter((app) => app.workerId === workerProfile.id)
    : []
  const myJobs = providerProfile
    ? data.jobs.filter((job) => job.providerId === providerProfile.id)
    : []
  const jobApplications = (jobId: string) =>
    providerProfile &&
    data.jobs.some(
      (job) => job.id === jobId && job.providerId === providerProfile.id,
    )
      ? data.applications.filter((app) => app.jobId === jobId)
      : []
  const unreadNotificationsCount = currentUser
    ? data.notifications.filter(
        (note) => note.userId === currentUser.id && !note.read,
      ).length
    : 0

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      setExternalJobs: setExternalJobsState,
      navigate,
      login,
      signupWorker,
      signupProvider,
      loginAsWorker: unsupportedDemo,
      loginAsProvider: unsupportedDemo,
      loginAsAdmin,
      logout,
      applyToJob,
      saveJob,
      unsaveJob,
      updateApplicationStatus,
      respondToSelection,
      updateEngagementWork,
      postJob,
      updateJob,
      deleteJob,
      markNotificationRead: async (notificationId) => {
        if (backendMode) {
          try { await apiRequest(`/api/notifications/${notificationId}/read`, { method: "PATCH" }) }
          catch (error) { setStorageWarning(error instanceof Error ? error.message : "Could not update notification."); return }
        }
        setData((old) => ({
          ...old,
          notifications: old.notifications.map((note) =>
            note.id === notificationId && note.userId === currentUser?.id
              ? { ...note, read: true }
              : note,
          ),
        }))
      },
      markAllNotificationsRead: async () => {
        if (backendMode) {
          try { await apiRequest("/api/notifications/read-all", { method: "PATCH" }) }
          catch (error) { setStorageWarning(error instanceof Error ? error.message : "Could not update notifications."); return }
        }
        setData((old) => ({
          ...old,
          notifications: old.notifications.map((note) =>
            note.userId === currentUser?.id ? { ...note, read: true } : note,
          ),
        }))
      },
      updateWorkerProfile,
      notifyProfileUpdated,
      updateProviderProfile,
      submitProviderVerification,
      reviewProviderVerification,
      sendUserNotification,
      hasApplied: (jobId) =>
        !!workerProfile &&
        data.applications.some(
          (app) => app.jobId === jobId && app.workerId === workerProfile.id,
        ),
      isSaved: (jobId) =>
        !!workerProfile &&
        data.savedJobs.some(
          (saved) =>
            saved.jobId === jobId && saved.workerId === workerProfile.id,
        ),
      browseSkill: (skill) => {
        setDiscoverySkill(skill)
        navigate("job-discovery")
      },
      reportJob,
      reviewWorker,
      reviewProvider,
      submitKyc,
      approveKyc,
      reviewKyc,
      updateReport,
      moderateJob,
      verifyProvider,
      updateUserStatus,
      unreadNotificationsCount,
      myApplications,
      myJobs,
      jobApplications,
      // Function identities intentionally track current persisted state.
    }),
    [
      data,
      currentPage,
      currentJobId,
      currentUser,
      workerProfile,
      providerProfile,
      discoverySkill,
      externalJobs,
      storageWarning,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within AppProvider")
  return context
}
