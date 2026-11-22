import { apiRequest, type ApiJob } from "./backendApi"
import { sendChatMessage, type ChatTurn, type ChatLanguage } from "./shramAi"

export type ProviderWorkerService = {
  id: number
  category?: string
  title?: string
  description?: string
  price?: number
  pricingType?: string
  availability?: Array<{ dayOfWeek?: string; startDate?: string; endDate?: string; startTime?: string; endTime?: string }>
}
export type ProviderWorker = {
  seekerProfileId: number
  userId: number
  fullName: string
  profilePictureUrl?: string
  bio?: string
  address?: string
  skills?: string[]
  qualifications?: string[]
  workExperiences?: string[]
  totalExperienceYears?: number
  verified: boolean
  averageRating?: number
  reviewCount: number
  services?: ProviderWorkerService[]
}
export type ProviderCandidate = { worker: ProviderWorker; matchScore: number | null; matchReasons: string[] }
export type ProviderMatchResponse = { jobs: ApiJob[]; selectedJob: ApiJob | null; needsJobSelection: boolean; candidates: ProviderCandidate[] }
export type ProviderReply = { answer: string; matches: ProviderMatchResponse }

export function providerWorkerSkills(worker: ProviderWorker) {
  return [...new Set([...(worker.skills || []), ...(worker.services || []).map((service) => service.category || service.title || "")].filter(Boolean))]
}

export function providerWorkerAvailability(worker: ProviderWorker) {
  const slots = (worker.services || []).flatMap((service) => service.availability || [])
  if (!slots.length) return "Availability not listed"
  const labels = slots.slice(0, 3).map((slot) => {
    const day = slot.dayOfWeek?.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
    const date = slot.startDate ? slot.endDate && slot.endDate !== slot.startDate ? `${slot.startDate}–${slot.endDate}` : slot.startDate : ""
    const time = slot.startTime ? `${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ""}` : ""
    return [day, date, time].filter(Boolean).join(" · ")
  }).filter(Boolean)
  return labels.length ? labels.join(", ") : "Availability details not listed"
}

export function providerContext(matches: ProviderMatchResponse) {
  return JSON.stringify({
    selected_job: matches.selectedJob ? {
      title: matches.selectedJob.title, category: matches.selectedJob.category,
      description: matches.selectedJob.description, skills: matches.selectedJob.requiredSkills,
      requirements: matches.selectedJob.qualificationRequired, location: matches.selectedJob.address,
      district: matches.selectedJob.district, pay_min: matches.selectedJob.paymentAmount,
      pay_max: matches.selectedJob.paymentMaxAmount, pay_period: matches.selectedJob.paymentPeriod,
      schedule: `${matches.selectedJob.startDate || ""} ${matches.selectedJob.startTime || ""}-${matches.selectedJob.endTime || ""}`,
      status: matches.selectedJob.status,
    } : null,
    provider_jobs: matches.jobs.slice(0, 12).map((job) => ({ title: job.title, district: job.district, status: job.status })),
    retrieved_candidates: matches.candidates.map(({ worker, matchScore, matchReasons }) => ({
      name: worker.fullName,
      address: worker.address, bio: worker.bio, skills: providerWorkerSkills(worker),
      qualifications: worker.qualifications, work_history: worker.workExperiences,
      experience_years: worker.totalExperienceYears, rating: worker.averageRating,
      review_count: worker.reviewCount, services: worker.services?.map((service) => ({
        category: service.category, title: service.title, description: service.description,
        rate: service.price, rate_type: service.pricingType, availability: service.availability,
      })), indicative_match_score: matchScore, match_reasons: matchReasons,
    })),
  })
}

export async function findProviderCandidates(message: string, jobId: number | null, history: string[], signal?: AbortSignal) {
  return apiRequest<ProviderMatchResponse>("/api/provider/ai/matches", {
    method: "POST",
    body: JSON.stringify({ message, jobId, history: history.slice(-10) }),
    signal,
  })
}

export async function askProviderAssistant(
  message: string,
  history: ChatTurn[],
  language: ChatLanguage,
  jobId: number | null = null,
  signal?: AbortSignal,
): Promise<ProviderReply> {
  const matches = await findProviderCandidates(message, jobId, history.filter((turn) => turn.role === "user").map((turn) => turn.text), signal)
  if (matches.needsJobSelection) {
    return { answer: "You have several open jobs. Choose the job you mean, then ask me again.", matches }
  }
  const reply = await sendChatMessage(message, null, history.slice(-12), language, signal, [], "provider", providerContext(matches))
  const answer = reply.fallback_active && matches.candidates.length
    ? `I found ${matches.candidates.length} worker profile${matches.candidates.length === 1 ? "" : "s"} from the authenticated worker search${matches.selectedJob ? ` for “${matches.selectedJob.title}”` : ""}. The available profile details and indicative matches are shown here.`
    : reply.answer
  return { answer, matches }
}
