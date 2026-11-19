import { useEffect, useState } from "react"
import { apiRequest } from "../../services/backendApi"

type SkillRecord = { id: number; name: string; active: boolean }

export default function SkillManagementPanel({ initialSkills, onLocalChange }: { initialSkills: string[]; onLocalChange: (skills: string[]) => void }) {
  const demo = import.meta.env.VITE_DEMO_MODE === "true"
  const [skills, setSkills] = useState<SkillRecord[]>([])
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (demo) {
      setSkills(initialSkills.map((name, index) => ({ id: -(index + 1), name, active: true })))
      return
    }
    let active = true
    void apiRequest<SkillRecord[]>("/api/admin/skills").then((result) => { if (active) setSkills(result) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load skills.") })
    return () => { active = false }
  }, [demo, initialSkills])

  const addSkill = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = draft.trim()
    if (!name || busy) return
    setBusy(true); setError(""); setNotice("")
    try {
      if (demo) {
        if (skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase())) throw new Error("That skill already exists.")
        const next = [...skills, { id: -Date.now(), name, active: true }]
        setSkills(next); onLocalChange(next.map((skill) => skill.name))
      } else {
        const created = await apiRequest<SkillRecord>("/api/admin/skills", { method: "POST", body: JSON.stringify({ name }) })
        setSkills((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setDraft(""); setNotice("Skill added.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add this skill.") }
    finally { setBusy(false) }
  }

  const saveName = async (skill: SkillRecord) => {
    const name = editingName.trim()
    if (!name || busy) return
    setBusy(true); setError("")
    try {
      if (demo) {
        const next = skills.map((item) => item.id === skill.id ? { ...item, name } : item)
        setSkills(next); onLocalChange(next.map((item) => item.name))
      } else {
        const updated = await apiRequest<SkillRecord>(`/api/admin/skills/${skill.id}`, { method: "PUT", body: JSON.stringify({ name }) })
        setSkills((current) => current.map((item) => item.id === skill.id ? updated : item).sort((a, b) => a.name.localeCompare(b.name)))
      }
      setEditingId(null); setNotice("Skill updated.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update this skill.") }
    finally { setBusy(false) }
  }

  const toggleActive = async (skill: SkillRecord) => {
    if (busy) return
    setBusy(true); setError("")
    try {
      if (demo) {
        const next = skills.map((item) => item.id === skill.id ? { ...item, active: !item.active } : item)
        setSkills(next); onLocalChange(next.filter((item) => item.active).map((item) => item.name))
      } else {
        const updated = await apiRequest<SkillRecord>(`/api/admin/skills/${skill.id}/${skill.active ? "deactivate" : "activate"}`, { method: "PATCH" })
        setSkills((current) => current.map((item) => item.id === skill.id ? updated : item))
      }
      setNotice(skill.active ? "Skill deactivated." : "Skill reactivated.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change skill status.") }
    finally { setBusy(false) }
  }

  return <article className="rounded-2xl border border-stone-200 bg-white p-5">
    <h3 className="font-semibold text-stone-900">Skills taxonomy</h3>
    <p className="mt-1 text-xs text-stone-500">Skills are shared with worker profiles and job forms. Press Enter to add one.</p>
    <form className="mt-3 flex gap-2" onSubmit={addSkill}>
      <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. Washing dishes" maxLength={100} className="input-style min-w-0 flex-1" aria-label="New skill name" />
      <button disabled={busy || !draft.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add skill</button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-teal-800">{notice}</p>}
    <div className="mt-4 space-y-2">
      {skills.map((skill) => <div key={skill.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-2.5">
        {editingId === skill.id ? <>
          <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} className="input-style min-w-0 flex-1" aria-label={`Edit ${skill.name}`} />
          <button type="button" disabled={busy || !editingName.trim()} onClick={() => void saveName(skill)} className="text-xs font-semibold text-teal-800">Save</button>
          <button type="button" onClick={() => setEditingId(null)} className="text-xs text-stone-500">Cancel</button>
        </> : <>
          <span className={`min-w-0 flex-1 text-sm ${skill.active ? "text-stone-800" : "text-stone-400 line-through"}`}>{skill.name}</span>
          <span className="text-[10px] uppercase tracking-wide text-stone-400">{skill.active ? "Active" : "Inactive"}</span>
          <button type="button" disabled={busy} onClick={() => { setEditingId(skill.id); setEditingName(skill.name); setError("") }} className="text-xs font-semibold text-primary-ink">Edit</button>
          <button type="button" disabled={busy} onClick={() => void toggleActive(skill)} className="text-xs font-semibold text-stone-600">{skill.active ? "Deactivate" : "Reactivate"}</button>
        </>}
      </div>)}
      {!skills.length && !error && <p className="text-sm text-stone-500">No skills available yet.</p>}
    </div>
  </article>
}
