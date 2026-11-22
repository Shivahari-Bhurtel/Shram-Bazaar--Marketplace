import { useState } from "react"
import { useApp } from "../../store/AppContext"
import { DISTRICTS } from "../../data/mockData"
import { useSkillCatalog } from "../../hooks/useSkillCatalog"
import type { Job, JobCategory, WorkType, PaymentType } from "../../types"
import { formatNepalDate, isDateOnlyString, nepalDateString } from "../../utils/dates"
import { isValidTime } from "../../utils/validation"
import { getConfiguredJobCategories } from "../../utils/categories"
import { parseRequiredExperienceMonths } from "../../utils/experience"
import { getCurrentCoordinates } from "../../utils/geolocation"

interface Props {
  editJobId?: string | null
}

export default function CreateEditJob({ editJobId }: Props) {
  const skillCatalog = useSkillCatalog()
  const { state, navigate, postJob, updateJob } = useApp()
  const existingJob = editJobId
    ? state.jobs.find((j) => j.id === editJobId)
    : null

  const [form, setForm] = useState({
    title: existingJob?.title ?? "",
    description: existingJob?.description ?? "",
    responsibilities: existingJob?.responsibilities ?? "",
    category: (existingJob?.category ?? "skill-based") as JobCategory,
    skillsRequired: existingJob?.skillsRequired ?? [] as string[],
    qualificationRequired: existingJob?.qualificationRequired ?? "",
    experienceRequired: existingJob ? String(parseRequiredExperienceMonths(existingJob.experienceRequired)) : "",
    workType: (existingJob?.workType ?? "full-day") as WorkType,
    workersNeeded: existingJob?.workersNeeded ?? 1,
    date: existingJob?.date ?? "",
    endDate: existingJob?.endDate ?? "",
    startTime: existingJob?.startTime ?? "08:00",
    endTime: existingJob?.endTime ?? "17:00",
    duration: existingJob?.duration ?? "",
    location: existingJob?.address ?? existingJob?.location ?? "",
    municipality: existingJob?.municipality ?? "",
    district: existingJob?.district ?? "",
    province: existingJob?.province ?? "",
    latitude: existingJob?.latitude,
    longitude: existingJob?.longitude,
    payment: existingJob?.payment ?? 0,
    paymentMax: existingJob?.paymentMax ?? 0,
    budgetMode: (existingJob?.budgetNegotiable ? "open" : existingJob?.paymentMax ? "range" : "fixed") as "fixed" | "range" | "open",
    paymentType: (existingJob?.paymentType ?? "per-day") as PaymentType,
    paymentMethod: existingJob?.paymentMethod ?? "CASH",
    deadline: existingJob?.deadline ?? "",
  })

  const [skillInput, setSkillInput] = useState("")
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [locationMessage, setLocationMessage] = useState("")
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationAttribution, setLocationAttribution] = useState(false)
  const [jobCategories] = useState(getConfiguredJobCategories)

  const filteredSkills = skillCatalog.filter(
    (s) =>
      s.toLowerCase().includes(skillInput.toLowerCase()) &&
      !form.skillsRequired.includes(s),
  ).slice(0, 12)

  const toggleSkill = (skill: string) => {
    setForm((p) => ({
      ...p,
      skillsRequired: p.skillsRequired.includes(skill)
        ? p.skillsRequired.filter((s) => s !== skill)
        : [...p.skillsRequired, skill],
    }))
  }

  const addCustomSkill = () => {
    const skill = skillInput.trim().replace(/\s+/g, " ")
    if (!skill) return
    if (!form.skillsRequired.some((selected) => selected.toLocaleLowerCase() === skill.toLocaleLowerCase())) {
      setForm((previous) => ({ ...previous, skillsRequired: [...previous.skillsRequired, skill] }))
    }
    setSkillInput("")
  }

  const continueToNextStep = () => {
    if (step === 2 && skillInput.trim()) {
      const typedSkill = skillInput.trim().replace(/\s+/g, " ")
      const skillsRequired = form.skillsRequired.some((skill) => skill.toLocaleLowerCase() === typedSkill.toLocaleLowerCase())
        ? form.skillsRequired
        : [...form.skillsRequired, typedSkill]
      const nextForm = { ...form, skillsRequired }
      setForm(nextForm)
      setSkillInput("")
      if (validateStep(step, nextForm)) setStep((current) => current + 1)
      return
    }
    if (validateStep(step)) setStep((current) => current + 1)
  }

  const useCurrentJobLocation = async () => {
    if (locationLoading) return
    setLocationLoading(true)
    setLocationMessage("Finding your location…")
    try {
      const coordinates = await getCurrentCoordinates()
      let locationName = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
      let municipality = ""
      let district = ""
      let province = ""
      let hasAddress = false

      try {
        const query = new URLSearchParams({
          format: "jsonv2",
          lat: String(coordinates.latitude),
          lon: String(coordinates.longitude),
          zoom: "16",
          addressdetails: "1",
        })
        const reverseController = new AbortController()
        const reverseTimeout = window.setTimeout(() => reverseController.abort(), 7000)
        let response: Response
        try {
          response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
            headers: { Accept: "application/json" },
            signal: reverseController.signal,
          })
        } finally {
          window.clearTimeout(reverseTimeout)
        }
        if (response.ok) {
          const result = await response.json() as { address?: Record<string, string>; display_name?: string }
          const address = result.address || {}
          const locality = address.neighbourhood || address.suburb || address.village || address.hamlet || address.town || address.city || address.municipality || result.display_name?.split(",")[0]
          municipality = address.municipality || address.city || address.town || address.village || ""
          const districtName = address.state_district || address.county || ""
          const provinceName = address.state || ""
          district = DISTRICTS.find((item) => districtName.toLocaleLowerCase().includes(item.toLocaleLowerCase())) || ""
          province = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"].find((item) => provinceName.toLocaleLowerCase().includes(item.toLocaleLowerCase())) || ""
          if (locality) {
            locationName = [address.road || address.pedestrian, locality, district || districtName].filter(Boolean).join(", ")
            hasAddress = true
          }
        }
      } catch {
        // Keep the exact coordinates as a useful editable location fallback.
      }

      setForm((previous) => ({
        ...previous,
        ...coordinates,
        location: locationName,
        ...(municipality ? { municipality } : {}),
        ...(district ? { district } : {}),
        ...(province ? { province } : {}),
      }))
      setLocationAttribution(hasAddress)
      setLocationMessage("")
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "Could not get your location.")
    } finally {
      setLocationLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (isSaving || !validateStep(3)) return
    setIsSaving(true)
    try {
      const { budgetMode, ...jobPayload } = form
      if (existingJob) {
        await updateJob(existingJob.id, { ...jobPayload, budgetNegotiable: budgetMode === "open" })
      } else {
        await postJob({ ...jobPayload, budgetNegotiable: budgetMode === "open" })
      }
      setSubmitted(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this job.")
    } finally {
      setIsSaving(false)
    }
  }

  const validateStep = (stepToValidate: number, formData = form) => {
    let message = ""
    if (stepToValidate === 1) {
      if (!form.title.trim()) message = "Enter a job title."
      else if (!form.description.trim())
        message = "Add a description of the work."
      else if (!form.responsibilities.trim())
        message = "List the main responsibilities for this work."
      else if (
        !Number.isInteger(form.workersNeeded) ||
        form.workersNeeded < 1 ||
        form.workersNeeded > 100
      )
        message = "Enter a whole number of workers between 1 and 100."
      else if (existingJob && form.workersNeeded < existingJob.workersHired)
        message = `This job already has ${existingJob.workersHired} accepted workers. Keep the requested positions at ${existingJob.workersHired} or more.`
    } else if (stepToValidate === 2) {
      if (formData.category === "skill-based" && formData.skillsRequired.length === 0)
        message = "Add at least one skill or trade required for this job."
      else if (formData.experienceRequired && (!Number.isInteger(Number(formData.experienceRequired)) || Number(formData.experienceRequired) < 0 || Number(formData.experienceRequired) > 1200))
        message = "Enter minimum experience as a whole number from 0 to 1200 months."
      else if (!formData.location.trim()) message = "Enter the work location."
      else if (!formData.municipality.trim()) message = "Enter the municipality or city."
      else if (!formData.district) message = "Select the work district."
      else if (!formData.province.trim()) message = "Enter the province."
    } else {
      const today = nepalDateString()
      if (!isDateOnlyString(form.date)) message = "Choose a valid start date."
      else if (!existingJob && form.date < today)
        message = "Choose today or a future start date."
      else if (form.workType === "multi-day" && !isDateOnlyString(form.endDate))
        message = "Choose a valid end date for multi-day work."
      else if (form.endDate && !isDateOnlyString(form.endDate))
        message = "Choose a valid end date."
      else if (form.endDate && form.endDate < form.date)
        message = "The end date must be on or after the start date."
      else if (form.deadline && !isDateOnlyString(form.deadline))
        message = "Choose a valid application deadline."
      else if (form.deadline && !existingJob && form.deadline < today)
        message = "Choose today or a future application deadline."
      else if (form.deadline && form.deadline > form.date)
        message =
          "The application deadline must be on or before the start date."
      else if (!isValidTime(form.startTime))
        message = "Choose a valid start time."
      else if (!isValidTime(form.endTime))
        message = "Choose a valid end time."
      else if (form.workType !== "multi-day" && form.endTime <= form.startTime)
        message = "The end time must be later than the start time."
      else if (form.budgetMode !== "open" && (!Number.isFinite(form.payment) || form.payment <= 0))
        message = "Enter a task budget greater than zero."
      else if (form.budgetMode === "range" && (!Number.isFinite(form.paymentMax) || form.paymentMax < form.payment))
        message = "The maximum budget must be at least the minimum budget."
    }
    setFormError(message)
    return !message
  }

  const selectCategory = (category: JobCategory) => {
    setForm((previous) => ({
      ...previous,
      category,
      ...(category === "beginner-friendly" ? { experienceRequired: "0" } : {}),
    }))
    setFormError("")
  }

  if (submitted) {
    return (
      <div className="provider-page provider-post-job mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-2xl font-bold text-stone-900 mb-2">
          {existingJob ? "Job Updated!" : "Job Posted Successfully!"}
        </h2>
        <p className="text-stone-500 mb-8">
          {existingJob
            ? "Your job listing has been updated."
            : "Your job is now live. Matching workers will be notified and can start applying."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("my-jobs")}
            className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
          >
            View My Jobs
          </button>
          <button
            onClick={() => navigate("provider-dashboard")}
            className="px-5 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  const steps = [
    { n: 1, label: "Job Basics" },
    { n: 2, label: "Requirements" },
    { n: 3, label: "Schedule & Pay" },
  ]

  return (
    <div className="provider-page provider-post-job mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <button
        onClick={() => navigate(existingJob ? "my-jobs" : "provider-dashboard")}
        className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="mb-7 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-stone-900">
            {existingJob ? "Edit Job Posting" : "Post a New Job"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">Describe the work clearly so workers can decide whether to apply.</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-7 grid grid-cols-3 gap-2 sm:gap-3" aria-label="Job posting progress">
        {steps.map((s, i) => (
          <div key={s.n} className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step > s.n && setStep(s.n)}
                aria-current={step === s.n ? "step" : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step === s.n
                    ? "bg-primary text-white"
                    : step > s.n
                      ? "bg-green text-white cursor-pointer"
                      : "bg-stone-200 text-stone-500"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </button>
              <span
                className={`truncate text-sm font-medium ${
                  step === s.n ? "text-stone-900" : "text-stone-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200"><div className={`h-full rounded-full transition-all ${step >= s.n ? "w-full bg-primary" : "w-0"}`} /></div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(25,44,34,0.03)] sm:p-5 lg:p-6">
        {formError && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            aria-live="polite"
          >
            {formError}
          </p>
        )}
        {/* Step 1: Job Basics */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="mb-4 font-heading text-xl font-bold text-stone-900">
              Job Information
            </h2>
            <div>
              <label htmlFor="job-title" className="text-sm font-semibold text-stone-700 block mb-1.5">
                Job title <span className="text-red-700">*</span>
              </label>
              <input
                id="job-title"
                value={form.title}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, title: e.target.value }))
                }}
                placeholder="e.g. Electrician for Office Renovation"
                className="input-style"
                maxLength={100}
                required
                aria-required="true"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-stone-400">{form.title.length}/100</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-1.5">
                What kind of worker do you need? <span className="text-red-700">*</span>
              </label>
              <p className="mb-2.5 text-xs leading-5 text-stone-500">Choose the experience level that best describes this job.</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {jobCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    aria-pressed={form.category === cat.value}
                    onClick={() => selectCategory(cat.value as JobCategory)}
                    className={`min-h-32 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                      form.category === cat.value
                        ? "border-primary bg-primary-50 shadow-sm"
                        : "border-stone-200 bg-white hover:border-primary/40 hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-base font-bold leading-snug text-stone-800">{cat.label}</span>
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.category === cat.value ? "border-primary bg-primary text-white" : "border-stone-300 text-transparent"}`} aria-hidden="true">✓</span>
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-stone-600">
                      {cat.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="job-description" className="text-sm font-semibold text-stone-700 block mb-1.5">
                Job description <span className="text-red-700">*</span>
              </label>
              <textarea
                id="job-description"
                value={form.description}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, description: e.target.value }))
                }}
                placeholder="Describe the role, responsibilities, and what you expect from workers. The more detail, the better the match."
                rows={4}
                className="input-style resize-y"
                maxLength={4000}
                required
                aria-required="true"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-stone-400">{form.description.length}/4000</p>
            </div>
            <div>
              <label htmlFor="job-responsibilities" className="text-sm font-semibold text-stone-700 block mb-1.5">Main responsibilities <span className="text-red-700">*</span></label>
              <textarea id="job-responsibilities" value={form.responsibilities} onChange={(event) => { setFormError(""); setForm((previous) => ({ ...previous, responsibilities: event.target.value })) }} placeholder="List the main tasks the worker will complete. Add one responsibility per line for clarity." rows={3} maxLength={4000} className="input-style resize-y" required aria-required="true" />
              <p className="mt-1 text-right text-xs tabular-nums text-stone-400">{form.responsibilities.length}/4000</p>
            </div>
            <div>
              <label htmlFor="workers-needed" className="text-sm font-semibold text-stone-700 block mb-1.5">
                Number of workers needed <span className="text-red-700">*</span>
              </label>
              <input
                id="workers-needed"
                type="number"
                min={Math.max(1, existingJob?.workersHired || 1)}
                max="100"
                step="1"
                value={form.workersNeeded}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({
                    ...p,
                    workersNeeded: Number(e.target.value),
                  }))
                }}
                className="input-style w-48"
                required
                aria-required="true"
              />
            </div>
          </div>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-semibold text-stone-900 text-lg mb-1">
              Skills & Requirements
            </h2>
            <p className="-mt-3 mb-2 text-sm leading-6 text-stone-500">Add relevant skills and experience.</p>
            <div>
              <label htmlFor="required-skills" className="text-sm font-semibold text-stone-700 block mb-1.5">
                Skills required {form.category === "skill-based" && <span className="text-red-700">*</span>}
              </label>
              <div className="flex gap-2">
              <input
                id="required-skills"
                type="text"
                value={skillInput}
                onChange={(e) => { setFormError(""); setSkillInput(e.target.value) }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomSkill() } }}
                placeholder="Search or enter a skill"
                className="input-style"
              />
              <button type="button" onClick={addCustomSkill} disabled={!skillInput.trim()} className="shrink-0 rounded-lg border border-stone-200 px-4 text-sm font-semibold text-primary-ink transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50">Add</button>
              </div>
              <p className="mt-1.5 text-sm text-stone-500">{form.category === "skill-based" ? "Type a skill or choose a suggestion. Typed skills are saved when you continue." : "Add skills to help workers understand the job."}</p>
              {form.skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.skillsRequired.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary-100 bg-primary-50 px-2.5 py-1.5 text-xs text-primary-ink"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => toggleSkill(s)}
                        aria-label={`Remove ${s}`}
                        className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-primary-ink/60 hover:bg-white hover:text-primary-ink"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {filteredSkills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      toggleSkill(s)
                      setSkillInput("")
                    }}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 transition-colors hover:border-primary/40 hover:bg-primary-50"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">
                Qualification <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                value={form.qualificationRequired}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({
                    ...p,
                    qualificationRequired: e.target.value,
                  }))
                }}
                placeholder="e.g. SLC/SEE passed, Diploma in Electrical Engineering"
                className="input-style"
                maxLength={300}
              />
            </div>
            {form.category === "beginner-friendly" ? (
              <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
                <p className="text-sm font-semibold text-primary-ink">No previous experience required</p>
                <p className="mt-1 text-xs leading-5 text-stone-600">This job will be shown as beginner friendly. Workers can learn the task on site.</p>
              </div>
            ) : <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">
                Minimum experience (months) <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                max="1200"
                value={form.experienceRequired}
                onChange={(e) => { setFormError(""); setForm((p) => ({ ...p, experienceRequired: e.target.value })) }}
                placeholder="0 for no previous experience"
                className="input-style"
              />
            </div>}
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">
                Work location <span className="text-red-700">*</span>
              </label>
              <input
                value={form.location}
                onChange={(e) => {
                  setFormError("")
                  setLocationAttribution(false)
                  setForm((p) => ({ ...p, location: e.target.value, latitude: undefined, longitude: undefined }))
                }}
                placeholder="e.g. Durbar Marg, Kathmandu"
                className="input-style"
                maxLength={120}
                required
                aria-required="true"
              />
              <div className="mt-3 rounded-md border border-primary-100 bg-primary-50 p-4 sm:p-5">
                <h3 className="font-heading text-base font-bold text-primary-ink">Pin the job location</h3>
                <p className="mt-1 text-sm leading-6 text-stone-600">Add a nearby place and optional map coordinates for distance matching.</p>
                <button type="button" disabled={locationLoading} onClick={() => void useCurrentJobLocation()} className="mt-3 min-h-11 rounded-md border border-primary-100 bg-white px-4 py-2.5 text-sm font-semibold text-primary-ink transition hover:bg-primary-50 disabled:cursor-wait disabled:opacity-60">{locationLoading ? "Finding location…" : "Use my current location"}</button>
                {locationMessage && <p role="status" className="mt-3 rounded-md bg-white/80 px-3 py-2 text-sm text-stone-700">{locationMessage}</p>}
                {Number.isFinite(form.latitude) && Number.isFinite(form.longitude) && <div className="mt-3 rounded-md border border-primary-100 bg-white px-3 py-2.5 text-sm text-primary-ink"><span className="font-semibold">Location saved:</span> {form.location || `${form.latitude?.toFixed(5)}, ${form.longitude?.toFixed(5)}`}<span className="mt-1 block text-xs text-stone-500">Coordinates are ready for distance-based matching.</span>{locationAttribution && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="mt-1 block text-[10px] text-stone-500 underline">© OpenStreetMap contributors</a>}</div>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">
                District <span className="text-red-700">*</span>
              </label>
              <select
                value={form.district}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, district: e.target.value }))
                }}
                className="input-style"
                required
                aria-required="true"
              >
                <option value="">Select district</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="job-municipality" className="text-sm font-medium text-stone-700 block mb-1.5">Municipality / city <span className="text-red-700">*</span></label>
              <input id="job-municipality" value={form.municipality} onChange={(event) => { setFormError(""); setForm((previous) => ({ ...previous, municipality: event.target.value })) }} maxLength={120} className="input-style" placeholder="e.g. Pokhara Metropolitan City" required aria-required="true" />
            </div>
            <div>
              <label htmlFor="job-province" className="text-sm font-medium text-stone-700 block mb-1.5">Province <span className="text-red-700">*</span></label>
              <select id="job-province" value={form.province} onChange={(event) => { setFormError(""); setForm((previous) => ({ ...previous, province: event.target.value })) }} className="input-style" required aria-required="true"><option value="">Select province</option>{["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"].map((province) => <option key={province} value={province}>{province}</option>)}</select>
            </div>
          </div>
        )}

        {/* Step 3: Schedule & Pay */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-semibold text-stone-900 text-lg mb-4">
              Schedule & Payment
            </h2>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">
                Work type <span className="text-red-700">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: "full-day", label: "Full Day" },
                  { value: "half-day", label: "Half Day" },
                  { value: "multi-day", label: "Multi-Day" },
                  { value: "hourly", label: "Hourly" },
                ].map((wt) => (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, workType: wt.value as WorkType }))
                    }
                    className={`min-h-14 rounded-md border px-4 py-3 text-base font-semibold transition-colors ${
                      form.workType === wt.value
                        ? "border-primary bg-primary-50 text-primary-ink"
                        : "border-stone-200 text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  Start date <span className="text-red-700">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  min={!existingJob ? nepalDateString() : undefined}
                  onChange={(e) => {
                    setFormError("")
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }}
                  className="input-style"
                  required
                  aria-required="true"
                />
              </div>
              {form.workType === "multi-day" && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">
                    End date <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.date || undefined}
                    onChange={(e) => {
                      setFormError("")
                      setForm((p) => ({ ...p, endDate: e.target.value }))
                    }}
                    className="input-style"
                    required
                    aria-required="true"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  Start time <span className="text-red-700">*</span>
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => {
                    setFormError("")
                    setForm((p) => ({ ...p, startTime: e.target.value }))
                  }}
                  className="input-style"
                  required
                  aria-required="true"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  End time <span className="text-red-700">*</span>
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => {
                    setFormError("")
                    setForm((p) => ({ ...p, endTime: e.target.value }))
                  }}
                  className="input-style"
                  required
                  aria-required="true"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  Duration
                </label>
                <input
                  value={form.duration}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, duration: e.target.value }))
                  }
                  placeholder="e.g. 1 day, 3 days, 2 weeks"
                  className="input-style"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  max={form.date || undefined}
                  onChange={(e) => {
                    setFormError("")
                    setForm((p) => ({ ...p, deadline: e.target.value }))
                  }}
                  className="input-style"
                />
              </div>
            </div>
            <div className="mb-4 rounded-xl border border-[#E4E9E3] bg-[#F7F8F5] p-4">
              <label htmlFor="budget-mode" className="text-sm font-semibold text-[#202923]">Budget setup <span className="text-red-700">*</span></label>
              <select id="budget-mode" value={form.budgetMode} onChange={(event) => { setFormError(""); setForm((previous) => ({ ...previous, budgetMode: event.target.value as typeof previous.budgetMode, ...(event.target.value === "open" ? { payment: 0, paymentMax: 0 } : {}) })) }} className="input-style mt-1.5 w-full sm:max-w-sm" required><option value="fixed">Fixed budget</option><option value="range">Budget range</option><option value="open">Open to offers</option></select>
              <p className="mt-1.5 text-xs text-[#68736B]">Workers can suggest their own price.</p>
            </div>
            {form.budgetMode === "open" ? <div className="mb-1 rounded-lg border border-[#E4E9E3] bg-white p-4 text-sm text-[#68736B]">No fixed budget set. Workers will submit their prices for you to compare.</div> : <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">
                  {form.budgetMode === "range" ? <>Minimum budget (NPR) <span className="text-red-700">*</span></> : <>Task budget (NPR) <span className="text-red-700">*</span></>}
                </label>
                <input type="number" min="1" step="1" value={form.payment || ""} onChange={(e) => { setFormError(""); setForm((p) => ({ ...p, payment: Number(e.target.value) })) }} placeholder="e.g. 1500" className="input-style" required />
              </div>
              {form.budgetMode === "range" && <div><label className="text-sm font-medium text-stone-700 block mb-1.5">Maximum budget (NPR) <span className="text-red-700">*</span></label><input type="number" min={form.payment || 1} step="1" value={form.paymentMax || ""} onChange={(e) => { setFormError(""); setForm((p) => ({ ...p, paymentMax: Number(e.target.value) })) }} placeholder="e.g. 2500" className="input-style" required /></div>}
            </div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Payment type <span className="text-red-700">*</span></label>
                <select value={form.paymentType} onChange={(event) => { setFormError(""); setForm((previous) => ({ ...previous, paymentType: event.target.value as PaymentType })) }} className="input-style" required><option value="per-day">Per day</option><option value="per-hour">Per hour</option><option value="fixed">Fixed total</option></select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Payment method <span className="text-red-700">*</span></label>
                <select value={form.paymentMethod} onChange={(event) => { setFormError(""); setForm((previous) => ({ ...previous, paymentMethod: event.target.value as typeof previous.paymentMethod })) }} className="input-style" required><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="DIGITAL_WALLET">Digital wallet</option><option value="OTHER">Other</option></select>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <p className="text-sm font-bold text-stone-600 uppercase tracking-wide mb-3">
                Job Summary Preview
              </p>
              <h3 className="text-lg font-bold tracking-tight text-stone-950">
                {form.title || "Untitled Job"}
              </h3>
              <div className="flex flex-wrap gap-2 mt-2 text-sm text-stone-600">
                {form.district && <span>{form.district}</span>}
                {form.date && (
                  <span>
                    {formatNepalDate(form.date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                {form.budgetMode === "open" ? <span className="font-semibold text-[#286B50]">Open to offers</span> : form.payment > 0 && (
                  <span className="font-mono-data text-base font-bold text-stone-900">
                    NPR {form.payment.toLocaleString()}{form.budgetMode === "range" ? `–${form.paymentMax.toLocaleString()}` : ""} / {form.paymentType.replace("per-", "")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-stone-100">
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              step === 1
                ? navigate("provider-dashboard")
                : (setFormError(""), setStep((s) => s - 1))
            }
            className="px-5 py-2.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          {step < 3 ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={continueToNextStep}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              aria-busy={isSaving}
              className="min-w-36 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Saving…" : existingJob ? "Save changes" : "Post job →"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
