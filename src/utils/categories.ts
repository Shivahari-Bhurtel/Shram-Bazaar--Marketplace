export const DEFAULT_JOB_CATEGORIES = [
  { value: "qualified", label: "Qualified / Professional", desc: "Requires formal qualification or licence" },
  { value: "skill-based", label: "Skill Based", desc: "Requires a specific skill or trade" },
  { value: "beginner-friendly", label: "Beginner Friendly", desc: "No prior experience needed" },
]

export function getConfiguredJobCategories() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem("shram-admin-workspace-v1") || "{}")
    const categories = parsed && typeof parsed === "object" && "categories" in parsed && Array.isArray(parsed.categories)
      ? parsed.categories.filter((value): value is string => typeof value === "string" && !!value.trim())
      : []
    const values = new Set(categories.length ? categories : DEFAULT_JOB_CATEGORIES.map((item) => item.value))
    return [...values].map((value) => DEFAULT_JOB_CATEGORIES.find((item) => item.value === value) || { value, label: value, desc: "Managed marketplace category" })
  } catch {
    return DEFAULT_JOB_CATEGORIES
  }
}
