export type HireAvailabilityStatus = "available" | "busy" | "available-soon" | "unknown" | string
export type HirePaymentType = "hourly" | "daily" | "weekly" | "monthly" | "project" | "fixed" | string

export interface HireWorker {
  id: string
  name: string
  profileImage?: string | null
  avatarSeed?: string | null
  avatarUrl?: string | null
  profession?: string | null
  category?: string | null
  location?: {
    city?: string | null
    district?: string | null
    country?: string | null
  } | null
  description?: string | null
  skills?: string[] | null
  experience?: {
    years?: number | null
    level?: string | null
  } | null
  rating?: number | null
  ratingCount?: number | null
  pricing?: {
    amount?: number | null
    currency?: string | null
    type?: HirePaymentType | null
    display?: string | null
  } | null
  availability?: {
    status?: HireAvailabilityStatus | null
    statusLabel?: string | null
    days?: string[] | null
    hours?: string | null
    preference?: string | null
  } | null
  workTypes?: string[] | null
  isPublished?: boolean
  isDemo?: boolean
}

export interface HireWorkerDataset {
  meta?: {
    title?: string
    description?: string
    isDemoData?: boolean
    currency?: string
  }
  workers: HireWorker[]
}
