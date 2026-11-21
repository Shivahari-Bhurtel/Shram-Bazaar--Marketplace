export type UserRole = "worker" | "provider" | "admin"
export type JobCategory = string
export type WorkType = "full-day" | "half-day" | "hourly" | "multi-day"
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "declined" | "withdrawn" | "completed"
export type JobStatus = "active" | "filled" | "closed" | "draft"
export type PaymentType = "per-day" | "per-hour" | "fixed"
export type KycStatus = "not-verified" | "pending" | "verified" | "rejected" | "expired"
export type KycDocumentType = "national-id" | "citizenship"
export type ProviderVerificationStatus = "not-submitted" | "pending" | "verified" | "rejected"
export type ProviderType = "individual" | "business" | "organization"

export interface Qualification {
  id: string
  credentialType?: "education" | "certificate" | "training"
  degree: string
  institution: string
  year: number
  field: string
  startDate?: string
  endDate?: string
  currentlyStudying?: boolean
}

export interface Experience {
  id: string
  title: string
  company: string
  duration: string
  description: string
  startDate?: string
  endDate?: string
  currentlyWorking?: boolean
}

export type Weekday = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"

export interface AvailabilitySlot {
  id: string
  day: Weekday
  startTime: string
  endTime: string
  date?: string
  endDate?: string
  serviceListingId?: string
}

export interface WorkHistory {
  jobId: string
  jobTitle: string
  providerName: string
  date: string
  payment?: number
  rating: number
  review: string
  description?: string
  location?: string
  startDate?: string
  endDate?: string
  completedAt?: string
  reviewedAt?: string
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
  latitude?: number
  longitude?: number
  skills: string[]
  preferredCategories?: string[]
  acceptingWork?: boolean
  services?: WorkerServiceListing[]
  qualifications: Qualification[]
  experience: Experience[]
  availableDates: string[]
  preferredTravelDistanceKm?: number
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
  kycBackDocumentData?: string
  kycDocumentExpiryDate?: string
  kycSelfieData?: string
  kycSelfieFileName?: string
  kycSubmittedDate?: string
  kycVerifiedDate?: string
  kycReviewNote?: string
  kycRequestId?: string
  kycDocumentId?: string
  kycBackDocumentId?: string
  kycBackDocumentFileName?: string
}

export interface WorkerServiceListing {
  id: string
  category: string
  title: string
  description: string
  skills: string[]
  pricingType: "PER_HOUR" | "PER_DAY" | "FIXED" | "STARTING_AT" | "NEGOTIABLE"
  price?: number
  minimumDurationHours?: number
  serviceArea?: string
  negotiable?: boolean
  availability?: Array<{
    availabilityId: string | number
    dayOfWeek?: string | null
    startDate: string
    endDate?: string | null
    startTime: string
    endTime: string
  }>
  active: boolean
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
  address?: string
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
  verificationDocumentType?: "BUSINESS_REGISTRATION" | "PAN_CERTIFICATE"
  verificationIdentityDocumentType?: KycDocumentType
  verificationDocumentData?: string
  verificationBackDocumentData?: string
  verificationBackDocumentName?: string
  verificationRequestId?: string
  verificationDocumentId?: string
  verificationBackDocumentId?: string
  verificationReviewNote?: string
}

export interface Job {
  id: string
  providerId: string
  providerName: string
  providerLogo: string
  providerVerified: boolean
  providerRating?: number
  providerReviewCount?: number
  title: string
  description: string
  responsibilities?: string
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
  address?: string
  municipality?: string
  district: string
  province?: string
  latitude?: number
  longitude?: number
  payment: number
  paymentMax?: number
  budgetNegotiable?: boolean
  paymentType: PaymentType
  paymentMethod?: "CASH" | "BANK_TRANSFER" | "DIGITAL_WALLET" | "OTHER"
  status: JobStatus
  postedDate: string
  deadline: string
  applicantCount: number
  matchScore?: number
  matchReasons?: string[]
  externalSource?: "himalayas" | "jsearch" | "freeapi"
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
  workerPhone?: string
  workerEmail?: string
  workerPhoto: string
  workerLocation: string
  workerSkills: string[]
  workerVerified?: boolean
  applicantProfile?: {
    seekerName: string
    phoneNumber?: string
    email?: string
    profilePictureUrl?: string
    bio?: string
    address?: string
    preferredTravelDistanceKm?: number
    skills?: string[]
    qualifications?: Array<{ id: number; qualificationName: string; institution?: string; fieldOfStudy?: string; credentialType?: string; startDate?: string; endDate?: string; currentlyStudying: boolean }>
    workExperience?: Array<{ id: number; jobTitle: string; organizationName?: string; description?: string; startDate?: string; endDate?: string; currentlyWorking: boolean }>
    availability?: Array<{ id: number; dayOfWeek?: string; startDate: string; endDate?: string; startTime: string; endTime: string; active: boolean }>
    completedJobHistory?: Array<{ jobPostId: number; jobTitle: string; providerName?: string; jobDescription: string; location: string; startDate: string; endDate: string; completedAt: string; rating?: number; review?: string; reviewedAt?: string }>
    verified: boolean
    averageRating?: number
    reviewCount: number
  }
  workerRating: number
  workerTotalJobs: number
  jobTitle: string
  providerName: string
  providerId: string
  appliedDate: string
  status: ApplicationStatus
  coverNote?: string
  offeredAmount?: number
  offerMessage?: string
  estimatedDurationHours?: number
  proposedStartAt?: string
  providerNote?: string
  providerRating?: number
  providerReview?: string
  providerReviewDate?: string
  engagementId?: string
  engagementStatus?: string
  providerCompletionConfirmed?: boolean
  seekerCompletionConfirmed?: boolean
  workerReviewRating?: number
  workerReview?: string
  workerReviewDate?: string
}

export interface Notification {
  id: string
  userId: string
  type: "application" | "selection" | "new-job" | "job-update" | "profile-update" | "rejection" | "message" | "announcement"
  title: string
  message: string
  date: string
  createdAt?: string
  read: boolean
  jobId?: string
  applicationId?: string
  engagementId?: string
}

export interface Report {
  id: string
  reporterId: string
  jobId?: string
  reportedUserId?: string
  reportedUserName?: string
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
