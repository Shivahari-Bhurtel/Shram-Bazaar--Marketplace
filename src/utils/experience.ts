/** Convert the job form's experience text into the backend's month value. */
export function parseRequiredExperienceMonths(value: string | number | null | undefined): number {
  const text = String(value ?? "").trim().toLowerCase()
  if (!text || /no experience|beginner|entry[ -]?level|not required/.test(text)) return 0

  // Use the largest number when a requirement is expressed as a range (for
  // example, "6-12 months") so filtering and recommendations stay conservative.
  const amount = Math.max(0, ...[...text.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0])))
  if (!Number.isFinite(amount)) return 0
  if (/year|\byrs?\b/.test(text)) return Math.round(amount * 12)
  if (/month|\bmos?\b/.test(text)) return Math.round(amount)
  return Math.round(amount)
}
