import type { Experience, Qualification } from "../types"
import type { ResumeExtraction } from "../services/shramAi"

export function uniqueResumeValues(existing: string[], incoming: string[]) {
  const seen = new Set(existing.map((value) => value.trim().toLocaleLowerCase()))
  return [...existing, ...incoming.map((value) => value.trim()).filter((value) => {
    const key = value.toLocaleLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })]
}

export function resumeQualifications(resume: ResumeExtraction): Qualification[] {
  return uniqueQualifications(resume.qualifications.filter((item) => item.name.trim() && item.year).map((item, index) => ({
    id: `resume-qualification-${Date.now()}-${index}`,
    credentialType: "education",
    degree: item.name.trim(),
    institution: item.institution.trim(),
    field: item.field.trim(),
    year: item.year!,
  })))
}

function qualificationKey(item: Qualification) {
  const normalize = (value: string | number | boolean | undefined) => String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")
  return [item.credentialType || "education", item.degree, item.institution, item.field, item.year, item.startDate, item.endDate, item.currentlyStudying]
    .map(normalize)
    .join("|")
}

export function uniqueQualifications(items: Qualification[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = qualificationKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function resumeExperience(resume: ResumeExtraction): Experience[] {
  return resume.experience.filter((item) => item.title.trim()).map((item, index) => ({
    id: `resume-experience-${Date.now()}-${index}`,
    title: item.title.trim(),
    company: item.company.trim(),
    description: item.description.trim(),
    startDate: item.startDate || undefined,
    endDate: item.endDate || undefined,
    currentlyWorking: item.currentlyWorking === true,
    duration: [item.startDate, item.endDate || (item.startDate ? "Present" : "")].filter(Boolean).join(" – "),
  }))
}

export function sameExperience(a: Experience, b: Experience) {
  return `${a.title}|${a.company}|${a.startDate || ""}|${a.endDate || ""}`.toLocaleLowerCase().replace(/\s+/g, " ") ===
    `${b.title}|${b.company}|${b.startDate || ""}|${b.endDate || ""}`.toLocaleLowerCase().replace(/\s+/g, " ")
}

export function uniqueExperience(existing: Experience[], incoming: Experience[]) {
  const result = [...existing]
  for (const item of incoming) if (!result.some((current) => sameExperience(current, item))) result.push(item)
  return result
}
