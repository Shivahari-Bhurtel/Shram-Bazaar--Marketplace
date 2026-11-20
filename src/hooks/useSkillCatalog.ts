import { useEffect, useState } from "react"
import { ALL_SKILLS } from "../data/mockData"
import { apiRequest } from "../services/backendApi"

export function useSkillCatalog() {
  const [skills, setSkills] = useState<string[]>(ALL_SKILLS)
  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true") return
    let active = true
    void apiRequest<Array<{ name: string; active?: boolean }>>("/api/skills")
      .then((records) => { if (active) setSkills(records.filter((record) => record.active !== false).map((record) => record.name)) })
      .catch(() => { /* Keep the bundled starter catalog usable during server outages. */ })
    return () => { active = false }
  }, [])
  return skills
}
