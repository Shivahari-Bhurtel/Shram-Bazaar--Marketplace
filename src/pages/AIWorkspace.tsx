import { useMemo, useRef, useState } from "react"
import { sendChatMessage } from "../services/shramAi"
import { useLanguage } from "../i18n/LanguageContext"
import { useApp } from "../store/AppContext"
import type { Job, WorkerProfile } from "../types"
import { nepalYear } from "../utils/dates"
import ShramAIRobotAnimation from "../components/ShramAIRobotAnimation"

type ToolId = "profile" | "career" | "hiring"

const MAX_RESUME_BYTES = 10 * 1024 * 1024
const MAX_RESUME_FILES = 5
const RESUME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

function getExperienceYears(profile: WorkerProfile) {
  return profile.experience.reduce((total, experience) => {
    const explicitYears = experience.duration.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i)?.[1]
    if (explicitYears) return total + Number(explicitYears)
    const range = experience.duration.match(/\b((?:19|20)\d{2})\s*(?:–|-|to)\s*((?:19|20)\d{2}|present)/i)
    if (!range) return total
    const endYear = range[2].toLowerCase() === "present" ? nepalYear() : Number(range[2])
    return total + Math.max(0, endYear - Number(range[1]))
  }, 0)
}

function matchWorker(job: Job, worker: WorkerProfile) {
  const skills = job.skillsRequired.filter((required) =>
    worker.skills.some((skill) => skill.toLowerCase() === required.toLowerCase()),
  )
  const skillScore = job.skillsRequired.length
    ? Math.round((skills.length / job.skillsRequired.length) * 55)
    : 25
  const locationScore = worker.district === job.district ? 20 : 0
  const jobWeekday = new Date(`${job.date}T12:00:00.000Z`).getUTCDay()
  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
  const dateScore = worker.availableDates.includes(job.date)
    || worker.weeklyAvailability?.some((slot) =>
      slot.day === weekdayNames[jobWeekday]
      && slot.startTime <= job.startTime
      && slot.endTime >= job.endTime,
    )
    ? 15
    : 0
  const experienceScore = worker.experience.length ? 10 : 0
  return {
    score: Math.min(100, skillScore + locationScore + dateScore + experienceScore),
    skills,
  }
}

function ToolIcon({ kind }: { kind: ToolId }) {
  if (kind === "career") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19V9m5 10V5m6 14v-7m5 7V3" />
        <path d="m3 14 5-5 5 3 7-7" />
      </svg>
    )
  }
  if (kind === "hiring") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0M19 5l1.5 1.5L22 5" />
    </svg>
  )
}

export default function AIWorkspace() {
  const { state, navigate, updateWorkerProfile } = useApp()
  const { language } = useLanguage()
  const isWorker = state.currentUser?.role === "worker"
  const worker = state.workerProfile
  const provider = state.providerProfile
  const ownJobs = useMemo(
    () => state.jobs.filter((job) => job.providerId === provider?.id),
    [state.jobs, provider?.id],
  )
  const [tool, setTool] = useState<ToolId>(() => {
    try {
      const initialTool = sessionStorage.getItem("shram-ai-initial-tool")
      sessionStorage.removeItem("shram-ai-initial-tool")
      if (isWorker && initialTool === "career") return "career"
    } catch { /* Use the default AI workspace tool. */ }
    return isWorker ? "profile" : "hiring"
  })
  const [goal, setGoal] = useState("")
  const [selectedJobId, setSelectedJobId] = useState(ownJobs[0]?.id || "new")
  const [draftTitle, setDraftTitle] = useState("")
  const [draftSkills, setDraftSkills] = useState("")
  const [draftLocation, setDraftLocation] = useState(provider?.location || "")
  const [draftPayment, setDraftPayment] = useState("")
  const [extraDetails, setExtraDetails] = useState("")
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [resumeError, setResumeError] = useState("")
  const resumeInputRef = useRef<HTMLInputElement>(null)

  const selectedJob = selectedJobId === "new"
    ? undefined
    : ownJobs.find((job) => job.id === selectedJobId) || ownJobs[0]
  const recommendedWorkers = useMemo(
    () => {
      if (isWorker || !selectedJob) return []
      return state.allWorkerProfiles
        .map((profile) => ({ profile, ...matchWorker(selectedJob, profile) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    },
    [isWorker, selectedJob, state.allWorkerProfiles],
  )

  const runAssistant = async (kind: ToolId) => {
    setBusy(true)
    setError("")
    setNotice("")
    setAnswer("")
    setCopied(false)
    try {
      let prompt = ""
      if (kind === "profile" && worker) {
        const profileData = {
          title: worker.professionalTitle,
          skills: worker.skills,
          experience: worker.experience.map(({ title, duration, description }) => ({ title, duration, description })),
          existingBio: worker.bio,
          district: worker.district,
          availability: worker.availability,
        }
        prompt = `Improve this worker profile bio. Use only facts in the supplied profile; do not invent qualifications, employers, years, or achievements. Return only a first-person bio under 100 words, in ${language === "ne" ? "simple Nepali" : "clear English"}. Profile: ${JSON.stringify(profileData)}`
      } else if (kind === "career" && worker) {
        prompt = `Give personalized career and skill guidance for a Shram Bazaar worker. Suggest 3 realistic next skills to learn, possible work paths, and free or practical learning resources. Explain why each fits the profile and goal. Do not claim that a course or job is available on this app. Be concise and use ${language === "ne" ? "simple Nepali" : "clear English"}. Worker profile: ${JSON.stringify({ skills: worker.skills, experience: worker.experience.map(({ title, duration }) => ({ title, duration })), qualifications: worker.qualifications.map(({ degree, field }) => ({ degree, field })), district: worker.district, availability: worker.availability })}. Their goal: ${goal || "Find steadier work and build on existing skills."}`
      } else if (kind === "hiring" && selectedJob) {
        prompt = `Help a provider improve a Shram Bazaar job listing. Return: (1) a clear, inclusive job description, (2) essential skills and qualifications, (3) a practical hiring checklist including a suggested number of workers and interview questions. Do not change stated pay, date, location, or conditions. Do not invent legal requirements. Mark any assumptions clearly. Use ${language === "ne" ? "simple Nepali" : "clear English"}. Existing listing: ${JSON.stringify({ title: selectedJob.title, description: selectedJob.description, skills: selectedJob.skillsRequired, qualification: selectedJob.qualificationRequired, experience: selectedJob.experienceRequired, workersNeeded: selectedJob.workersNeeded, workType: selectedJob.workType, date: selectedJob.date, duration: selectedJob.duration, location: selectedJob.location, district: selectedJob.district, payment: selectedJob.payment, paymentType: selectedJob.paymentType })}. Provider notes: ${extraDetails || "None."}`
      } else if (kind === "hiring") {
        const skills = draftSkills.split(",").map((skill) => skill.trim()).filter(Boolean)
        if (!draftTitle.trim()) throw new Error("Add a working title before asking for hiring guidance.")
        prompt = `Help a provider plan a new Shram Bazaar job listing. Return: (1) a clear, inclusive job description, (2) essential skills and qualifications, (3) a practical hiring checklist including a suggested number of workers and interview questions. Do not invent pay, dates, location, or legal requirements. Mark assumptions clearly. Use ${language === "ne" ? "simple Nepali" : "clear English"}. Provider and job details: ${JSON.stringify({ organization: provider?.orgName, industry: provider?.industry, title: draftTitle.trim(), skills, location: draftLocation || provider?.location, district: provider?.district, payment: draftPayment ? Number(draftPayment) : null, paymentType: "per-day", additionalNotes: extraDetails || "None." })}`
      }
      if (!prompt) throw new Error("Complete the required profile or job details first.")
      const result = await sendChatMessage(prompt, null, [], language)
      setAnswer(result.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shram AI could not complete this request.")
    } finally {
      setBusy(false)
    }
  }

  const applyBio = () => {
    if (!worker || !answer.trim()) return
    updateWorkerProfile({ bio: answer.trim() })
    setCopied(false)
    setError("")
    setNotice("Profile bio updated. Review it in My Profile.")
  }

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
    } catch {
      setError("Clipboard access is unavailable. Select and copy the text instead.")
    }
  }

  const addResumeFiles = (files: FileList | null) => {
    setResumeError("")
    if (!files?.length) return

    const accepted: File[] = []
    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop()?.toLowerCase() || ""
      if (!(extension in RESUME_TYPES) || file.type !== RESUME_TYPES[extension]) {
        setResumeError("Choose valid PDF, DOC, or DOCX resume files.")
        continue
      }
      if (!file.size || file.size > MAX_RESUME_BYTES) {
        setResumeError(file.size ? "Each resume file must be 10 MB or smaller." : "An empty file cannot be added.")
        continue
      }
      accepted.push(file)
    }

    setResumeFiles((current) => {
      const next = [...current]
      for (const file of accepted) {
        if (next.length >= MAX_RESUME_FILES) {
          setResumeError(`You can add up to ${MAX_RESUME_FILES} resume files.`)
          break
        }
        if (!next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) {
          next.push(file)
        }
      }
      return next
    })
  }

  const labels = isWorker
    ? [
        { id: "profile" as const, title: "Profile & resume", subtitle: "Turn your experience into a clear worker profile." },
        { id: "career" as const, title: "Career & skills", subtitle: "Get learning and career suggestions for your goals." },
      ]
    : [{ id: "hiring" as const, title: "Provider hiring assistant", subtitle: "Improve job posts and plan a practical hiring process." }]

  return (
    <main className="ai-workspace-page mx-auto w-full max-w-[84rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-0">
      <header className="ai-workspace-hero mb-6">
        <div className="ai-workspace-hero-copy">
          <h1>Practical help for<br className="hidden sm:block" /> your next step</h1>
          <p className="ai-workspace-description">AI suggestions use the details you provide. Check facts before acting; job and wage data in this prototype may be incomplete.</p>
        </div>
        <div className="ai-workspace-hero-side">
          <ShramAIRobotAnimation />
          <div className="ai-workspace-actions">
            <button type="button" onClick={() => navigate("chat")} className="ai-primary-action">Open AI chat</button>
            {isWorker && <button type="button" onClick={() => {
              try { sessionStorage.setItem("voice-assistant-return-page", state.currentPage) } catch { /* Voice navigation still works without session storage. */ }
              navigate("voice-assistant")
            }} className="ai-secondary-action">Open Voice Assistant</button>}
          </div>
        </div>
      </header>

      <div className={`ai-workspace-grid ${isWorker ? "is-worker-workspace" : ""}`}>
        <section className="min-w-0 space-y-5">
          <div className="ai-tool-grid">
            {labels.map((item) => (
                <button key={item.id} type="button" onClick={() => { setTool(item.id); setAnswer(""); setError("") }} className={`ai-tool-card ${tool === item.id ? "is-active" : ""}`}>
                <span className="ai-tool-icon"><ToolIcon kind={item.id} /></span>
                <span className="min-w-0">
                  <span className="ai-tool-title">{item.title}</span>
                  <span className="ai-tool-subtitle">{item.subtitle}</span>
                </span>
                <span className="ai-tool-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>

          <section className="ai-assistant-panel">
            {tool === "profile" && isWorker && (
              <>
                <h2 className="font-display text-xl font-bold text-stone-900">Improve your profile bio</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">Shram AI uses your saved skills and experience to suggest a short bio. It won’t add qualifications you haven’t entered.</p>
                <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
                  <p><strong>Current bio:</strong> {worker?.bio || "No profile bio yet."}</p>
                  <p className="mt-2"><strong>Skills:</strong> {worker?.skills.join(", ") || "Add skills to your profile for better suggestions."}</p>
                  <p className="mt-1"><strong>Experience:</strong> {worker?.experience.map((item) => item.title).join(", ") || "None added"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void runAssistant("profile")} disabled={busy || !worker?.skills.length} className="rounded-xl bg-[#553421] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Preparing suggestion…" : "Suggest a profile bio"}</button>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    aria-label="Add PDF, DOC, or DOCX resume files"
                    onChange={(event) => {
                      addResumeFiles(event.target.files)
                      event.target.value = ""
                    }}
                  />
                  <button type="button" onClick={() => resumeInputRef.current?.click()} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Add files</button>
                </div>
                {resumeFiles.length > 0 && (
                  <ul className="mt-3 space-y-2" aria-label="Resume files added on this device">
                    {resumeFiles.map((file) => (
                      <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                        <span className="min-w-0 break-all text-stone-700">{file.name}<span className="ml-2 text-xs text-stone-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span></span>
                        <button type="button" onClick={() => setResumeFiles((current) => current.filter((item) => item !== file))} className="shrink-0 text-xs font-semibold text-stone-600 underline underline-offset-2">Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
                {resumeError && <p role="alert" className="mt-2 text-sm text-red-700">{resumeError}</p>}
                <p className="mt-2 text-xs text-stone-500">Files are kept on this device and are not sent to AI yet.</p>
              </>
            )}
            {tool === "career" && isWorker && (
              <>
                <h2 className="font-display text-xl font-bold text-stone-900">Career and skill guidance</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">Get ideas based on your saved skills, work history, and the goal you enter.</p>
                <label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="career-goal">What would you like to achieve?</label>
                <textarea id="career-goal" value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} maxLength={600} placeholder="For example: learn a skill that helps me find more steady work." className="mt-2 w-full resize-y rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                <button type="button" onClick={() => void runAssistant("career")} disabled={busy || !worker} className="mt-3 rounded-xl bg-[#553421] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Finding practical ideas…" : "Get personalized guidance"}</button>
              </>
            )}
            {tool === "hiring" && !isWorker && (
              <>
                <h2 className="font-display text-xl font-bold text-stone-900">AI provider hiring assistant</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">Choose one of your jobs for a clearer description, skill checklist, and hiring suggestions grounded in its current details.</p>
                <>
                    {ownJobs.length > 0 && <>
                      <label htmlFor="hiring-job" className="mt-4 block text-sm font-semibold text-stone-700">Job listing</label>
                      <select id="hiring-job" value={selectedJobId} onChange={(event) => { setSelectedJobId(event.target.value); setAnswer("") }} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm">
                        <option value="new">Create a new job draft</option>
                        {ownJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                      </select>
                    </>}
                    {!selectedJob && <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-stone-700 sm:col-span-2" htmlFor="draft-title">Working title<input id="draft-title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={100} placeholder="For example: Event setup assistant" className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 font-normal" /></label>
                      <label className="text-sm font-semibold text-stone-700 sm:col-span-2" htmlFor="draft-skills">Skills you expect<input id="draft-skills" value={draftSkills} onChange={(event) => setDraftSkills(event.target.value)} maxLength={400} placeholder="Separate skills with commas" className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 font-normal" /></label>
                      <label className="text-sm font-semibold text-stone-700" htmlFor="draft-location">Work location<input id="draft-location" value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)} maxLength={120} placeholder={provider?.location || "Location"} className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 font-normal" /></label>
                      <label className="text-sm font-semibold text-stone-700" htmlFor="draft-payment">Indicative pay (NPR/day)<input id="draft-payment" type="number" min="0" value={draftPayment} onChange={(event) => setDraftPayment(event.target.value)} placeholder="Optional" className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2.5 font-normal" /></label>
                    </div>}
                    <label htmlFor="hiring-notes" className="mt-4 block text-sm font-semibold text-stone-700">What do you want help with?</label>
                    <textarea id="hiring-notes" value={extraDetails} onChange={(event) => setExtraDetails(event.target.value)} rows={3} maxLength={800} placeholder="Add details such as the work environment, team size, or preferred experience." className="mt-2 w-full resize-y rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    <button type="button" onClick={() => void runAssistant("hiring")} disabled={busy || (!selectedJob && !draftTitle.trim())} className="mt-3 rounded-xl bg-[#553421] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Preparing hiring guidance…" : "Draft job and hiring guidance"}</button>
                </>
              </>
            )}
            {answer && (
              <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                <h3 className="text-sm font-bold text-violet-950">Shram AI suggestion</h3>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{answer}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tool === "profile" && isWorker && <button type="button" onClick={applyBio} className="rounded-lg bg-[#553421] px-3 py-2 text-xs font-semibold text-white">Use this bio</button>}
                  <button type="button" onClick={() => void copyAnswer()} className="rounded-lg border border-violet-300 px-3 py-2 text-xs font-semibold text-violet-950">{copied ? "Copied" : "Copy text"}</button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-amber-800">{error}</p>}
            {notice && <p role="status" className="mt-4 text-sm text-teal-800">{notice}</p>}
          </section>
        </section>

        {!isWorker && (
          <aside className="ai-insights-column space-y-5">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-teal-700">Provider worker matching</p><h2 className="mt-1 font-display text-lg font-bold text-stone-900">Potential worker matches</h2></div><button type="button" onClick={() => navigate("my-jobs")} className="text-xs font-semibold text-primary-ink hover:underline">Your jobs</button></div>
              {ownJobs.length > 0 && <select aria-label="Choose job for worker matches" value={selectedJob?.id || ""} onChange={(event) => setSelectedJobId(event.target.value)} className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">{ownJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select>}
              <div className="mt-4 space-y-3">
                {recommendedWorkers.map(({ profile, score, skills }) => <div key={profile.id} className="rounded-xl border border-stone-200 p-3"><div className="flex items-center justify-between gap-3"><strong className="text-sm text-stone-900">{profile.name}</strong><span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">{score}%</span></div><p className="mt-1 text-xs text-stone-500">{profile.district} · {skills.length ? `Skills: ${skills.join(", ")}` : "Related skills not listed"}</p><p className="mt-1 text-xs text-stone-500">{profile.verified ? "Verified worker" : "Verification not complete"} · {getExperienceYears(profile)} years listed experience</p></div>)}
                {!recommendedWorkers.length && <p className="text-sm text-stone-500">Post a job and add public worker profiles to see profile-based suggestions.</p>}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone-500">Suggestions use public skills, location, availability, and experience. Review each application yourself.</p>
            </section>
          </aside>
        )}
      </div>
    </main>
  )
}
