export type UserRole = "worker" | "provider" | "admin"
export type JobCategory = string
export type WorkType = "full-day" | "half-day" | "hourly" | "multi-day"
export type ApplicationStatus = "pending" | "shortlisted" | "accepted" | "rejected"
export type JobStatus = "active" | "filled" | "closed" | "draft"
export type PaymentType = "per-day" | "per-hour" | "fixed"
export type KycStatus = "not-verified" | "pending" | "verified" | "rejected" | "expired"
export type KycDocumentType = "national-id" | "citizenship" | "passport" | "driving-licence"
export type ProviderVerificationStatus = "not-submitted" | "pending" | "verified" | "rejected"
export type ProviderType = "individual" | "business" | "organization"

export interface Qualification {
  id: string
  degree: string
  institution: string
  year: number
  field: string
}

export interface Experience {
  id: string
  title: string
  company: string
  duration: string
  description: string
}

export type Weekday = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"

export interface AvailabilitySlot {
  id: string
  day: Weekday
  startTime: string
  endTime: string
}

export interface WorkHistory {
  jobId: string
  jobTitle: string
  providerName: string
  date: string
  payment: number
  rating: number
  review: string
}

export interface WorkerProfile {
  id: string
  name: string
  professionalTitle?: string
  photo: string
  phone: string
  email: string
  dateOfBirth?: string
  gender?: "female" | "male" | "non-binary" | "prefer-not-to-say"
  address?: string
  location: string
  district: string
  skills: string[]
  qualifications: Qualification[]
  experience: Experience[]
  availableDates: string[]
  weeklyAvailability?: AvailabilitySlot[]
  availability: "morning" | "afternoon" | "full-day" | "flexible"
  bio: string
  workHistory: WorkHistory[]
  rating: number
  totalJobs: number
  verified: boolean
  kycStatus?: KycStatus
  phoneVerified?: boolean
  emailVerified?: boolean
  kycDocumentType?: KycDocumentType
  kycDocumentNumber?: string
  kycDocumentFileName?: string
  kycDocumentData?: string
  kycDocumentExpiryDate?: string
  kycSelfieData?: string
  kycSelfieFileName?: string
  kycSubmittedDate?: string
  kycVerifiedDate?: string
  kycReviewNote?: string
  kycRequestId?: string
  kycDocumentId?: string
}

export interface ProviderProfile {
  id: string
  providerType?: ProviderType
  dateOfBirth?: string
  orgName: string
  logo: string
  contactName: string
  email: string
  phone: string
  location: string
  district: string
  industry: string
  description: string
  verified: boolean
  verifiedDate?: string
  pan: string
  totalHires: number
  rating: number
  reviewCount: number
  website?: string
  socialLinks?: string
  operatingHours?: string
  yearsOperating?: number
  verificationStatus?: ProviderVerificationStatus
  verificationDocumentName?: string
  verificationDocumentData?: string
  verificationReviewNote?: string
}

export interface Job {
  id: string
  providerId: string
  providerName: string
  providerLogo: string
  providerVerified: boolean
  title: string
  description: string
  category: JobCategory
  skillsRequired: string[]
  qualificationRequired: string
  experienceRequired: string
  workType: WorkType
  workersNeeded: number
  workersHired: number
  date: string
  endDate?: string
  startTime: string
  endTime: string
  duration: string
  location: string
  district: string
  payment: number
  paymentType: PaymentType
  status: JobStatus
  postedDate: string
  deadline: string
  applicantCount: number
  matchScore?: number
  matchReasons?: string[]
  externalSource?: "himalayas" | "freeapi"
  externalUrl?: string
  externalCategory?: string
  externalCategories?: string[]
  externalExcerpt?: string
  salaryText?: string
  externalSalaryMin?: number
  externalSalaryMax?: number
  externalSalaryCurrency?: string
  externalSalaryPeriod?: string
  externalUpdatedAt?: string
  employmentType?: string
  seniority?: string
  publishedDate?: string
}

export interface Application {
  id: string
  jobId: string
  workerId: string
  workerName: string
  workerPhoto: string
  workerLocation: string
  workerSkills: string[]
  workerRating: number
  workerTotalJobs: number
  jobTitle: string
  providerName: string
  providerId: string
  appliedDate: string
  status: ApplicationStatus
  coverNote: string
  providerNote?: string
  providerRating?: number
  providerReview?: string
  providerReviewDate?: string
  engagementId?: string
  engagementStatus?: string
  workerReviewRating?: number
  workerReview?: string
  workerReviewDate?: string
}

export interface Notification {
  id: string
  userId: string
  type: "application" | "selection" | "new-job" | "job-update" | "profile-update" | "rejection" | "shortlisted" | "message" | "announcement"
  title: string
  message: string
  date: string
  read: boolean
  jobId?: string
  applicationId?: string
}

export interface Report {
  id: string
  reporterId: string
  jobId: string
  reason: string
  details: string
  date: string
  status: "submitted" | "reviewing" | "resolved" | "dismissed"
  adminNote?: string
}

export interface User {
  id: string
  role: UserRole
  email: string
  name: string
  profileId: string
  accountStatus?: "active" | "suspended"
  backendAuth?: boolean
}
