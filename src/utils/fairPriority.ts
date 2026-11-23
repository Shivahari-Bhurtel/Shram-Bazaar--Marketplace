import type { Application, Job, WorkerProfile } from "../types"

export interface FairPriorityResult {
  fitScore: number
  opportunityBoost: number
  completedPlatformJobs: number
  reasons: string[]
}

function normalized(value: string | undefined) {
  return (value || "").trim().toLocaleLowerCase()
}

function timeInMinutes(value: string | undefined) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
}

function completedJobs(application: Application, profile?: WorkerProfile) {
  return Math.max(
    application.applicantProfile?.completedJobHistory?.length || 0,
    application.workerTotalJobs || 0,
    profile?.totalJobs || 0,
  )
}

function opportunityBoost(jobs: number) {
  if (jobs === 0) return 8
  if (jobs <= 2) return 5
  if (jobs <= 5) return 2
  return 0
}

function scheduleFit(job: Job, application: Application, profile?: WorkerProfile) {
  const backendSlots = (application.applicantProfile?.availability || []).filter((slot) => slot.active !== false)
  const profileSlots = profile?.weeklyAvailability || []
  if (!backendSlots.length && !profileSlots.length) return { points: 12, reason: "Availability not listed (neutral)" }

  const start = new Date(`${job.date.slice(0, 10)}T00:00:00Z`)
  const finish = new Date(`${(job.endDate || job.date).slice(0, 10)}T00:00:00Z`)
  const jobStart = timeInMinutes(job.startTime)
  const jobEnd = timeInMinutes(job.endTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime()) || finish < start || jobStart === null || jobEnd === null || jobEnd <= jobStart) {
    return { points: 12, reason: "Schedule details unavailable (neutral)" }
  }

  let days = 0
  let matchedDays = 0
  for (const date = new Date(start); date <= finish; date.setUTCDate(date.getUTCDate() + 1)) {
    days += 1
    if (days > 366) return { points: 12, reason: "Schedule range unavailable (neutral)" }
    const dateString = date.toISOString().slice(0, 10)
    const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getUTCDay()]
    const backendMatch = backendSlots.some((slot) => {
      const dateMatch = slot.dayOfWeek
        ? normalized(slot.dayOfWeek) === weekday
        : dateString >= slot.startDate.slice(0, 10) && dateString <= (slot.endDate || slot.startDate).slice(0, 10)
      const slotStart = timeInMinutes(slot.startTime)
      const slotEnd = timeInMinutes(slot.endTime)
      return dateMatch && slotStart !== null && slotEnd !== null && slotStart <= jobStart && slotEnd >= jobEnd
    })
    const profileMatch = profileSlots.some((slot) => {
      const dateMatch = slot.date
        ? dateString >= slot.date.slice(0, 10) && dateString <= (slot.endDate || slot.date).slice(0, 10)
        : slot.day === weekday
      const slotStart = timeInMinutes(slot.startTime)
      const slotEnd = timeInMinutes(slot.endTime)
      return dateMatch && slotStart !== null && slotEnd !== null && slotStart <= jobStart && slotEnd >= jobEnd
    })
    if (backendMatch || profileMatch) matchedDays += 1
  }
  const ratio = days ? matchedDays / days : 0
  return {
    points: Math.round(25 * ratio),
    reason: ratio === 1 ? "Schedule covers all job hours" : `${matchedDays} of ${days} scheduled days covered`,
  }
}

function estimateExperienceYears(application: Application, profile?: WorkerProfile) {
  const backendEntries = application.applicantProfile?.workExperience || []
  const profileEntries = profile?.experience || []
  const spans = [
    ...backendEntries.map((entry) => ({ start: entry.startDate, end: entry.endDate, current: entry.currentlyWorking })),
    ...profileEntries.map((entry) => ({ start: entry.startDate, end: entry.endDate, current: entry.currentlyWorking })),
  ]
  const today = new Date()
  const intervals = spans.flatMap(({ start, end, current }) => {
    if (!start) return []
    const from = new Date(`${start.slice(0, 10)}T00:00:00Z`)
    const to = new Date(`${(current ? today.toISOString().slice(0, 10) : end || start).slice(0, 10)}T00:00:00Z`)
    return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from ? [] : [{ from, to }]
  }).sort((a, b) => a.from.getTime() - b.from.getTime())
  if (!intervals.length) return 0
  let totalDays = 0
  let rangeStart = intervals[0].from.getTime()
  let rangeEnd = intervals[0].to.getTime()
  for (const interval of intervals.slice(1)) {
    if (interval.from.getTime() <= rangeEnd) rangeEnd = Math.max(rangeEnd, interval.to.getTime())
    else {
      totalDays += rangeEnd - rangeStart
      rangeStart = interval.from.getTime()
      rangeEnd = interval.to.getTime()
    }
  }
  totalDays += rangeEnd - rangeStart
  return totalDays / (365.25 * 24 * 60 * 60 * 1000)
}

function requiredYears(value: string) {
  const text = normalized(value)
  if (!text || /no experience|beginner|entry.level/.test(text)) return 0
  const amount = Number(text.match(/\d+(?:\.\d+)?/)?.[0] || 0)
  if (/year|\byrs?\b/.test(text)) return amount
  return amount / 12
}

export function scoreApplicantForJob(job: Job, application: Application, profile?: WorkerProfile): FairPriorityResult {
  const skills = application.applicantProfile?.skills?.length
    ? application.applicantProfile.skills
    : application.workerSkills.length ? application.workerSkills : profile?.skills || []
  const requiredSkills = job.skillsRequired || []
  const matchingSkills = requiredSkills.filter((required) => skills.some((skill) => normalized(skill) === normalized(required)))
  const skillPoints = requiredSkills.length ? Math.round((matchingSkills.length / requiredSkills.length) * 35) : 28

  const profileLocation = normalized([profile?.district, profile?.location, application.workerLocation, application.applicantProfile?.address].filter(Boolean).join(" "))
  const jobLocation = normalized([job.district, job.location, job.address].filter(Boolean).join(" "))
  const workerDistrict = normalized(profile?.district)
  const jobDistrict = normalized(job.district)
  const exactPlaceMatch = Boolean(profile?.location && job.location && normalized(profile.location) === normalized(job.location))
  const sameArea = Boolean(profileLocation && jobLocation && (
    (workerDistrict && jobDistrict && (workerDistrict === jobDistrict || profileLocation.includes(jobDistrict)))
    || exactPlaceMatch
  ))
  const locationKnown = Boolean(profileLocation && jobLocation)
  const locationPoints = sameArea ? 15 : locationKnown ? 5 : 9

  const background = [
    ...(application.applicantProfile?.qualifications || []).map((item) => `${item.qualificationName} ${item.fieldOfStudy || ""}`),
    ...(application.applicantProfile?.workExperience || []).map((item) => `${item.jobTitle} ${item.description || ""}`),
    ...(profile?.qualifications || []).map((item) => `${item.degree} ${item.field}`),
    ...(profile?.experience || []).map((item) => `${item.title} ${item.description}`),
  ].join(" ").toLocaleLowerCase()
  const relevantEvidence = requiredSkills.some((skill) => background.includes(normalized(skill)))
  const hasEvidence = Boolean(background.trim())
  const evidencePoints = relevantEvidence ? 15 : hasEvidence ? 10 : 7

  const schedule = scheduleFit(job, application, profile)
  const required = requiredYears(job.experienceRequired)
  const years = estimateExperienceYears(application, profile)
  const experiencePoints = required === 0 ? 10 : years > 0 ? Math.round(10 * Math.min(1, years / required)) : 5
  const fitScore = Math.min(100, skillPoints + schedule.points + locationPoints + evidencePoints + experiencePoints)
  const jobs = completedJobs(application, profile)
  const boost = opportunityBoost(jobs)

  return {
    fitScore,
    opportunityBoost: boost,
    completedPlatformJobs: jobs,
    reasons: [
      `${matchingSkills.length} of ${requiredSkills.length} required skills match`,
      schedule.reason,
      sameArea ? "Job is in your listed area" : locationKnown ? "Job location differs from listed area" : "Location details incomplete (neutral)",
      relevantEvidence ? "Relevant training or experience listed" : hasEvidence ? "Profile background listed" : "No background listed (beginner boost applies)",
    ],
  }
}

function tieRotation(workerId: string, jobId: string, day: string) {
  let hash = 2166136261
  for (const character of `${workerId}:${jobId}:${day}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function prioritizeApplicants<T extends Application>(
  applications: T[],
  job: Job,
  profiles: WorkerProfile[],
  day: string,
) {
  const scored = applications.map((application) => {
    const profile = profiles.find((item) => item.id === application.workerId)
    return { application, score: scoreApplicantForJob(job, application, profile) }
  })
  const pending = scored.filter(({ application }) => application.status === "pending")
    .sort((a, b) => b.score.fitScore - a.score.fitScore)

  // Within a close-fit band, rotate workers with fewer completed platform jobs
  // toward the top. Scores outside the band retain their match ordering.
  const balanced: typeof pending = []
  while (pending.length) {
    const leaderScore = pending[0].score.fitScore
    const band = pending.filter((item) => leaderScore - item.score.fitScore <= 10)
    const bandIds = new Set(band.map(({ application }) => application.id))
    pending.splice(0, pending.length, ...pending.filter(({ application }) => !bandIds.has(application.id)))
    band.sort((a, b) => b.score.opportunityBoost - a.score.opportunityBoost
      || tieRotation(a.application.workerId, job.id, day) - tieRotation(b.application.workerId, job.id, day))
    balanced.push(...band)
  }

  const orderedPendingIds = new Map(balanced.map((item, index) => [item.application.id, index]))
  scored.sort((a, b) => {
    if (a.application.status === "pending" && b.application.status === "pending") {
      return (orderedPendingIds.get(a.application.id) || 0) - (orderedPendingIds.get(b.application.id) || 0)
    }
    if (a.application.status === "pending") return -1
    if (b.application.status === "pending") return 1
    return (b.application.appliedDate || "").localeCompare(a.application.appliedDate || "")
  })
  return scored
}
