import type { Experience, Qualification, WorkerProfile } from "../types"
import type { ResumeProfileExtraction } from "../services/shramAi"

export function mapResumeProfile(
  extracted: ResumeProfileExtraction,
  availableSkills: string[],
): Partial<WorkerProfile> {
  const matchedSkills = extracted.skills.flatMap((candidate) => {
    const match = availableSkills.find((skill) => skill.toLowerCase() === candidate.toLowerCase())
    return match ? [match] : []
  })
  const qualifications: Qualification[] = extracted.qualifications.flatMap((item, index) => {
    const year = item.year || Number((item.endDate || item.startDate || "").slice(0, 4))
    if (!item.degree || !year) return []
    return [{
      id: `resume-qualification-${Date.now()}-${index}`,
      credentialType: "education",
      degree: item.degree,
      institution: item.institution,
      field: item.field,
      year,
      startDate: item.startDate,
      endDate: item.endDate,
      currentlyStudying: item.currentlyStudying,
    }]
  })
  const experience: Experience[] = extracted.experience.map((item, index) => ({
    id: `resume-experience-${Date.now()}-${index}`,
    title: item.title,
    company: item.company,
    description: item.description,
    duration: item.duration,
    startDate: item.startDate,
    endDate: item.endDate,
    currentlyWorking: item.currentlyWorking,
  }))
  return {
    skills: [...new Set(matchedSkills)],
    bio: extracted.bio,
    qualifications,
    experience,
  }
}

export function mergeResumeIntoExistingProfile(
  profile: WorkerProfile,
  extracted: ResumeProfileExtraction,
  availableSkills: string[],
): Partial<WorkerProfile> {
  const imported = mapResumeProfile(extracted, availableSkills)
  const existingSkills = profile.skills || []
  const existingQualifications = profile.qualifications || []
  const existingExperience = profile.experience || []
  return {
    ...(profile.name.trim() ? {} : extracted.name ? { name: extracted.name } : {}),
    ...(profile.phone.trim() ? {} : extracted.phone ? { phone: extracted.phone } : {}),
    ...(profile.address?.trim() ? {} : extracted.address ? { address: extracted.address } : {}),
    ...(profile.district.trim() ? {} : extracted.district ? { district: extracted.district } : {}),
    ...(profile.location.trim() ? {} : extracted.localAddress || extracted.address ? { location: extracted.localAddress || extracted.address } : {}),
    ...(profile.bio.trim() ? {} : extracted.bio ? { bio: extracted.bio } : {}),
    skills: [...new Set([...existingSkills, ...(imported.skills || [])])],
    qualifications: [...existingQualifications, ...(imported.qualifications || []).filter((item) => !existingQualifications.some((current) => current.degree.toLowerCase() === item.degree.toLowerCase() && current.institution.toLowerCase() === item.institution.toLowerCase()))],
    experience: [...existingExperience, ...(imported.experience || []).filter((item) => !existingExperience.some((current) => current.title.toLowerCase() === item.title.toLowerCase() && current.company.toLowerCase() === item.company.toLowerCase()))],
  }
}
