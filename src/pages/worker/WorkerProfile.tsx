import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react"
import { useApp } from "../../store/AppContext"
import { ALL_SKILLS, DISTRICTS } from "../../data/mockData"
import type {
  AvailabilitySlot,
  Experience,
  Qualification,
  Weekday,
} from "../../types"

const presetAvatars = [
  {
    src: "/images/profile-avatars/worker-avatar-1.jpeg",
    label: "Traditional cap portrait",
  },
  {
    src: "/images/profile-avatars/worker-avatar-2.png",
    label: "Short hair portrait",
  },
  {
    src: "/images/profile-avatars/worker-avatar-3.jpeg",
    label: "Long hair portrait",
  },
]

const weekdays: { value: Weekday label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
]

export default function WorkerProfile() {
  const { state, updateWorkerProfile, notifyProfileUpdated, navigate } =
    useApp()
  const { workerProfile } = state
  const [editing, setEditing] = useState<string | null>(null)
  const [tempData, setTempData] = useState<any>({})
  const [skillInput, setSkillInput] = useState("")
  const [dateInput, setDateInput] = useState("")
  const [saved, setSaved] = useState(false)
  const [editError, setEditError] = useState("")
  const [photoMessage, setPhotoMessage] = useState("")
  const [photoError, setPhotoError] = useState(false)
  const [photoChoicesOpen, setPhotoChoicesOpen] = useState(false)
  const [availabilityDay, setAvailabilityDay] = useState<Weekday>("monday")
  const [availabilityStart, setAvailabilityStart] = useState("18:00")
  const [availabilityEnd, setAvailabilityEnd] = useState("21:00")
  const [editingAvailabilityId, setEditingAvailabilityId] =
    useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState("")
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoPickerRef = useRef<HTMLDivElement>(null)

  const showProfileUpdate = (message: string) => {
    setPhotoError(false)
    setPhotoMessage(message)
    window.setTimeout(() => {
      notifyProfileUpdated(message)
      setPhotoMessage("")
    }, 2000)
  }

  useEffect(() => {
    if (!photoChoicesOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !photoPickerRef.current?.contains(event.target)
      ) {
        setPhotoChoicesOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhotoChoicesOpen(false)
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [photoChoicesOpen])

  if (!workerProfile) return null

  const startEdit = (section: string) => {
    setEditing(section)
    setSaved(false)
    setEditError("")
    if (section === "basic") {
      setTempData({
        name: workerProfile.name,
        professionalTitle: workerProfile.professionalTitle ?? "",
        phone: workerProfile.phone,
        location: workerProfile.location,
        district: workerProfile.district,
        bio: workerProfile.bio,
        availability: workerProfile.availability,
      })
    } else if (section === "skills") {
      setTempData({ skills: [...workerProfile.skills] })
    } else if (section === "qualifications") {
      setTempData({
        qualifications: workerProfile.qualifications.length
          ? workerProfile.qualifications.map((qualification) => ({
              ...qualification,
            }))
          : [
              {
                id: `q-${Date.now()}`,
                degree: "",
                institution: "",
                year: new Date().getFullYear(),
                field: "",
              },
            ],
      })
    } else if (section === "experience") {
      setTempData({
        experience: workerProfile.experience.length
          ? workerProfile.experience.map((experience) => ({ ...experience }))
          : [
              {
                id: `e-${Date.now()}`,
                title: "",
                company: "",
                duration: "",
                description: "",
              },
            ],
      })
    }
  }

  const saveEdit = () => {
    if (editing === "basic") {
      const name = String(tempData.name ?? "").trim()
      const phone = String(tempData.phone ?? "").trim()
      const phoneDigits = phone.replace(/\D/g, "")
      const location = String(tempData.location ?? "").trim()
      const district = String(tempData.district ?? "").trim()
      if (!name || !phone || !location || !district) {
        setEditError("Name, phone, location, and district are required.")
        return
      }
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        setEditError("Enter a valid phone number with 7 to 15 digits.")
        return
      }
      if (String(tempData.bio ?? "").length > 600) {
        setEditError("Keep your bio under 600 characters.")
        return
      }
      updateWorkerProfile({
        ...tempData,
        name,
        phone,
        location,
        district,
        professionalTitle: String(tempData.professionalTitle ?? "").trim(),
        bio: String(tempData.bio ?? "").trim(),
      })
    } else if (editing === "skills") {
      updateWorkerProfile({ skills: tempData.skills })
    } else if (editing === "qualifications") {
      const qualifications =
        (tempData.qualifications as Qualification[]).filter((item) =>
          [item.degree, item.institution, item.field].some((value) =>
            value.trim(),
          ),
        )
      const invalidYear = qualifications.some(
        (item) =>
          !Number.isInteger(Number(item.year)) ||
          Number(item.year) < 1900 ||
          Number(item.year) > new Date().getFullYear(),
      )
      if (qualifications.some((item) => !item.degree.trim()) || invalidYear) {
        setEditError(
          "Add a qualification name and a valid completion year for each entry.",
        )
        return
      }
      updateWorkerProfile({
        qualifications: qualifications.map((item) => ({
          ...item,
          year: Number(item.year),
        })),
      })
    } else if (editing === "experience") {
      const experience = (tempData.experience as Experience[]).filter((item) =>
        [item.title, item.company, item.duration, item.description].some(
          (value) => value.trim(),
        ),
      )
      if (experience.some((item) => !item.title.trim())) {
        setEditError("Add a role title for each work experience entry.")
        return
      }
      updateWorkerProfile({ experience })
    }
    const sectionNames: Record<string, string> = {
      basic: "Basic information",
      skills: "Skills",
      qualifications: "Qualifications",
      experience: "Work experience",
    }
    if (editing && sectionNames[editing])
      showProfileUpdate(`${sectionNames[editing]} saved successfully.`)
    setEditError("")
    setEditing(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleSkill = (skill: string) => {
    setTempData((previous: any) => {
      const skills: string[] = previous.skills ?? []
      const existing = skills.find(
        (item) => item.toLowerCase() === skill.toLowerCase(),
      )
      return {
        ...previous,
        skills: existing
          ? skills.filter((item) => item !== existing)
          : [...skills, skill.trim()],
      }
    })
  }

  const filteredSkills = ALL_SKILLS.filter(
    (s) =>
      s.toLowerCase().includes(skillInput.toLowerCase()) &&
      !(tempData.skills ?? []).some(
        (selected: string) => selected.toLowerCase() === s.toLowerCase(),
      ),
  ).slice(0, 15)
  const kycStatus = workerProfile.kycStatus ?? "not-verified"
  const todayInKathmandu = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  const addWeeklyAvailability = () => {
    if (availabilityEnd <= availabilityStart) {
      setAvailabilityError("End time must be later than start time.")
      return
    }
    const slots = workerProfile.weeklyAvailability ?? []
    const start = availabilityStart
      .split(":")
      .reduce(
        (hours, part, index) => hours + Number(part) * (index === 0 ? 60 : 1),
        0,
      )
    const end = availabilityEnd
      .split(":")
      .reduce(
        (hours, part, index) => hours + Number(part) * (index === 0 ? 60 : 1),
        0,
      )
    const overlaps = slots.some((slot) => {
      if (slot.id === editingAvailabilityId || slot.day !== availabilityDay)
        return false
      const existingStart = slot.startTime
        .split(":")
        .reduce(
          (hours, part, index) => hours + Number(part) * (index === 0 ? 60 : 1),
          0,
        )
      const existingEnd = slot.endTime
        .split(":")
        .reduce(
          (hours, part, index) => hours + Number(part) * (index === 0 ? 60 : 1),
          0,
        )
      return start < existingEnd && end > existingStart
    })
    if (overlaps) {
      setAvailabilityError("This overlaps another time slot on that day.")
      return
    }
    const nextSlots: AvailabilitySlot[] = [
      ...slots.filter((slot) => slot.id !== editingAvailabilityId),
      {
        id: editingAvailabilityId ?? `availability-${Date.now()}`,
        day: availabilityDay,
        startTime: availabilityStart,
        endTime: availabilityEnd,
      },
    ].sort(
      (a, b) =>
        weekdays.findIndex((day) => day.value === a.day) -
          weekdays.findIndex((day) => day.value === b.day) ||
        a.startTime.localeCompare(b.startTime),
    )
    updateWorkerProfile({ weeklyAvailability: nextSlots })
    setEditingAvailabilityId(null)
    setAvailabilityError("")
    showProfileUpdate(
      `Weekly hours ${editingAvailabilityId ? "updated" : "added"}.`,
    )
  }

  const handleProfilePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoChoicesOpen(false)
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError(true)
      setPhotoMessage("Choose a JPG, PNG, or WebP image.")
      event.target.value = ""
      return
    }
    if (file.size > 1_000_000) {
      setPhotoError(true)
      setPhotoMessage("Choose an image smaller than 1 MB.")
      event.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updateWorkerProfile({ photo: String(reader.result) })
      showProfileUpdate("Your profile photo was updated.")
      event.target.value = ""
    }
    reader.onerror = () => {
      setPhotoError(true)
      setPhotoMessage("The image could not be read. Choose another file.")
      event.target.value = ""
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="worker-profile-page w-full max-w-[1600px] px-4 py-7 font-sans sm:px-6 sm:py-8 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-stone-950 mb-1">
            My Profile
          </h1>
        </div>
        {saved && (
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fade-in">
            ✓ Saved
          </span>
        )}
      </div>

      {/* Profile hero */}
      <div className="mb-6 flex flex-wrap items-stretch justify-between gap-5 rounded-2xl bg-gradient-to-r from-[#553421] to-[#80502F] px-6 py-7 sm:px-7 sm:py-8">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5">
          <div ref={photoPickerRef} className="group relative shrink-0">
            {workerProfile.photo ? (
              <img
                src={workerProfile.photo}
                alt={`${workerProfile.name} profile`}
                className="h-24 w-24 rounded-full border border-white/20 object-cover bg-stone-700"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 font-sans text-2xl font-semibold text-white">
                {workerProfile.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPhotoChoicesOpen((open) => !open)}
              aria-label={
                workerProfile.photo
                  ? "Change profile photo"
                  : "Choose profile photo"
              }
              aria-expanded={photoChoicesOpen}
              title={
                workerProfile.photo
                  ? "Change profile photo"
                  : "Choose profile photo"
              }
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/20 text-white opacity-100 transition-all sm:bg-black/0 sm:opacity-0 sm:group-hover:bg-black/45 sm:group-hover:opacity-100 sm:group-focus-within:bg-black/45 sm:group-focus-within:opacity-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path d="M4 7h3l2-2h6l2 2h3v12H4V7Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </button>
            <input
              ref={photoInputRef}
              id="worker-profile-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleProfilePhoto}
              className="sr-only"
            />
            {photoChoicesOpen && (
              <div
                className="absolute left-0 top-[calc(100%+0.75rem)] z-30 w-72 rounded-xl border border-stone-200 bg-stone-50 p-4 text-stone-900 shadow-lg"
                role="dialog"
                aria-label="Choose a profile image"
              >
                <div className="mb-3">
                  <p className="text-sm font-medium text-stone-900">
                    Choose an avatar
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {presetAvatars.map((avatar) => (
                    <button
                      key={avatar.src}
                      type="button"
                      onClick={() => {
                        updateWorkerProfile({ photo: avatar.src })
                        showProfileUpdate("Your profile photo was updated.")
                        setPhotoChoicesOpen(false)
                      }}
                      aria-label={`Use ${avatar.label}`}
                      title={avatar.label}
                      className="flex flex-col items-center gap-1.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-700"
                    >
                      <img
                        src={avatar.src}
                        alt=""
                        className={`h-14 w-14 rounded-full object-cover transition-shadow hover:shadow-[0_0_0_2px_white,0_0_0_4px_#553421] ${
                          workerProfile.photo === avatar.src
                            ? "shadow-[0_0_0_2px_white,0_0_0_4px_#553421]"
                            : ""
                        }`}
                      />
                      <span className="text-[11px] font-medium leading-tight text-stone-600">
                        {avatar.label.replace(" portrait", "")}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:border-[#553421] hover:text-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#553421]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" />
                  </svg>
                  Upload from computer
                </button>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-sans text-[1.7rem] font-semibold leading-tight tracking-[-0.025em] text-white">
                {workerProfile.name}
              </h2>
              {kycStatus === "verified" && (
                <span
                  role="img"
                  title="Verified account"
                  aria-label="Verified account"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.25)] ring-1 ring-emerald-200/20"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                </span>
              )}
            </div>
            {workerProfile.professionalTitle && (
              <p className="mt-1 text-base font-medium text-white/80">
                {workerProfile.professionalTitle}
              </p>
            )}
            <p className="mt-1 text-base text-white/60">
              {workerProfile.location}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-white/85">
                <span
                  className="inline-flex items-center gap-0.5"
                  aria-label={`${
                    workerProfile.rating > 0
                      ? workerProfile.rating.toFixed(1)
                      : "No"
                  } out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <svg
                      key={index}
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 ${
                        index < Math.round(workerProfile.rating)
                          ? "fill-amber-300 text-amber-300"
                          : "fill-none text-white/55"
                      }`}
                      aria-hidden="true"
                    >
                      <path
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m12 3 2.75 5.58 6.16.9-4.45 4.34 1.05 6.13L12 17.06l-5.51 2.89 1.05-6.13-4.45-4.34 6.16-.9L12 3Z"
                      />
                    </svg>
                  ))}
                </span>
                {workerProfile.rating > 0
                  ? `${workerProfile.rating.toFixed(1)} average rating`
                  : "No ratings yet"}
              </span>
              {kycStatus !== "verified" && (
                <button
                  type="button"
                  onClick={() => navigate("kyc-verification")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm py-1 text-base font-medium text-white/90 transition-colors hover:text-white hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {kycStatus === "pending" ? "Check status" : "Verify identity"}
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M4.5 11.5 11.5 4.5M5 4.5h6.5V11" />
                  </svg>
                </button>
              )}
            </div>
            {kycStatus !== "verified" && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-200/90">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                  aria-hidden="true"
                />
                {kycStatus === "pending"
                  ? "Verification Pending"
                  : "Account Unverified"}
              </p>
            )}
          </div>
        </div>
      </div>
      {photoError && photoMessage && (
        <div
          role="alert"
          className="-mt-3 mb-5 flex items-center gap-2.5 text-sm"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
            aria-hidden="true"
          >
            !
          </span>
          <span className="text-stone-900">{photoMessage}</span>
        </div>
      )}

      <div className="grid items-start gap-5 md:grid-cols-3 md:gap-6">
        <div className="space-y-5 md:col-span-2">
          {/* Basic Info */}
          <Section
            title="Basic Information"
            onEdit={() => startEdit("basic")}
            editing={editing === "basic"}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            error={editing === "basic" ? editError : ""}
          >
            {editing === "basic" ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <input
                    value={tempData.name}
                    onChange={(e) =>
                      setTempData((p: any) => ({ ...p, name: e.target.value }))
                    }
                    className="input-style"
                  />
                </Field>
                <Field label="Professional title">
                  <input
                    maxLength={80}
                    value={tempData.professionalTitle}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        professionalTitle: e.target.value,
                      }))
                    }
                    placeholder="e.g. Electrician, Python developer"
                    className="input-style"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={tempData.phone}
                    onChange={(e) =>
                      setTempData((p: any) => ({ ...p, phone: e.target.value }))
                    }
                    className="input-style"
                  />
                </Field>
                <Field label="Location">
                  <input
                    value={tempData.location}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g. Baneshwor, Kathmandu"
                    className="input-style"
                  />
                </Field>
                <Field label="District">
                  <select
                    value={tempData.district}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        district: e.target.value,
                      }))
                    }
                    className="input-style"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Availability">
                  <select
                    value={tempData.availability}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        availability: e.target.value,
                      }))
                    }
                    className="input-style"
                  >
                    <option value="morning">Mornings only</option>
                    <option value="afternoon">Afternoons only</option>
                    <option value="full-day">Full day</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                  <textarea
                    value={tempData.bio}
                    onChange={(e) =>
                      setTempData((p: any) => ({ ...p, bio: e.target.value }))
                    }
                    rows={4}
                    maxLength={600}
                    placeholder="Share a little about your experience, strengths, and the work you do best."
                    className="input-style min-h-28 resize-y"
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <Info label="Name" value={workerProfile.name} />
                <Info
                  label="Professional title"
                  value={
                    workerProfile.professionalTitle ||
                    workerProfile.experience[0]?.title ||
                    workerProfile.skills.slice(0, 2).join(" · ")
                  }
                />
                <Info label="Phone" value={workerProfile.phone} />
                <Info label="Location" value={workerProfile.location} />
                <Info label="District" value={workerProfile.district} />
                <Info
                  label="Availability"
                  value={
                    {
                      morning: "Mornings only",
                      afternoon: "Afternoons",
                      "full-day": "Full day",
                      flexible: "Flexible",
                    }[workerProfile.availability]
                  }
                />
                <div className="sm:col-span-2 border-t border-stone-100 pt-3">
                  <Info label="Bio" value={workerProfile.bio} />
                </div>
              </div>
            )}
          </Section>

          {/* Skills */}
          <Section
            title="Skills"
            onEdit={() => startEdit("skills")}
            editing={editing === "skills"}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
          >
            {editing === "skills" ? (
              <div>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && skillInput.trim()) {
                      event.preventDefault()
                      const customSkill = skillInput.trim()
                      const alreadyAdded = (tempData.skills ?? []).some(
                        (skill: string) =>
                          skill.toLowerCase() === customSkill.toLowerCase(),
                      )
                      if (!alreadyAdded) toggleSkill(customSkill)
                      setSkillInput("")
                    }
                  }}
                  aria-label="Search or add a skill"
                  placeholder="Search skills to add…"
                  className="input-style mb-3 w-full"
                />
                <div className="flex flex-wrap gap-2 mb-3">
                  {(tempData.skills ?? []).map((s: string) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      aria-label={`Remove skill ${s}`}
                      className="text-sm px-3 py-1.5 bg-primary-50 text-primary-ink rounded-full border border-primary-100 flex items-center gap-1 hover:bg-primary-100"
                    >
                      {s}
                      <span aria-hidden="true" className="font-bold">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredSkills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        toggleSkill(s)
                        setSkillInput("")
                      }}
                      className="text-sm px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full border border-stone-200 hover:bg-stone-200 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                  {skillInput.trim() &&
                    !ALL_SKILLS.some(
                      (skill) =>
                        skill.toLowerCase() === skillInput.trim().toLowerCase(),
                    ) &&
                    !(tempData.skills ?? []).some(
                      (skill: string) =>
                        skill.toLowerCase() === skillInput.trim().toLowerCase(),
                    ) && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleSkill(skillInput.trim())
                          setSkillInput("")
                        }}
                        className="text-sm px-3 py-1.5 bg-primary-50 text-primary-ink rounded-full border border-primary-100 hover:bg-primary-100"
                      >
                        + Add “{skillInput.trim()}”
                      </button>
                    )}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workerProfile.skills.length > 0 ? (
                  workerProfile.skills.map((s) => (
                    <span
                      key={s}
                      className="text-base px-3 py-1.5 bg-stone-100 text-stone-700 rounded-full border border-stone-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit("skills")}
                    className="inline-flex items-center gap-2 text-base font-normal text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-black hover:decoration-black"
                  >
                    <span className="text-lg" aria-hidden="true">
                      +
                    </span>
                    Add key skills
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* Qualifications */}
          <Section
            title="Qualifications"
            onEdit={() => startEdit("qualifications")}
            editing={editing === "qualifications"}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            error={editing === "qualifications" ? editError : ""}
          >
            {editing === "qualifications" ? (
              <div className="space-y-4">
                {(tempData.qualifications as Qualification[]).map(
                  (qualification, index) => (
                    <div
                      key={qualification.id}
                      className="relative rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-stone-800">
                          Qualification {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setTempData((previous: any) => ({
                              ...previous,
                              qualifications: previous.qualifications.filter(
                                (item: Qualification) =>
                                  item.id !== qualification.id,
                              ),
                            }))
                          }
                          aria-label={`Remove qualification ${index + 1}`}
                          className="rounded-lg px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Qualification">
                          <input
                            value={qualification.degree}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                qualifications: previous.qualifications.map(
                                  (item: Qualification) =>
                                    item.id === qualification.id
                                      ? { ...item, degree: event.target.value }
                                      : item,
                                ),
                              }))
                            }
                            className="input-style"
                            placeholder="e.g. Diploma in Electrical Engineering"
                          />
                        </Field>
                        <Field label="Field of study">
                          <input
                            value={qualification.field}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                qualifications: previous.qualifications.map(
                                  (item: Qualification) =>
                                    item.id === qualification.id
                                      ? { ...item, field: event.target.value }
                                      : item,
                                ),
                              }))
                            }
                            className="input-style"
                            placeholder="e.g. Electrical"
                          />
                        </Field>
                        <Field label="Institution">
                          <input
                            value={qualification.institution}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                qualifications: previous.qualifications.map(
                                  (item: Qualification) =>
                                    item.id === qualification.id
                                      ? {
                                          ...item,
                                          institution: event.target.value,
                                        }
                                      : item,
                                ),
                              }))
                            }
                            className="input-style"
                            placeholder="School or training provider"
                          />
                        </Field>
                        <Field label="Completion year">
                          <input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={qualification.year || ""}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                qualifications: previous.qualifications.map(
                                  (item: Qualification) =>
                                    item.id === qualification.id
                                      ? {
                                          ...item,
                                          year: Number(event.target.value),
                                        }
                                      : item,
                                ),
                              }))
                            }
                            className="input-style"
                          />
                        </Field>
                      </div>
                    </div>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setTempData((previous: any) => ({
                      ...previous,
                      qualifications: [
                        ...previous.qualifications,
                        {
                          id: `q-${Date.now()}`,
                          degree: "",
                          institution: "",
                          year: new Date().getFullYear(),
                          field: "",
                        },
                      ],
                    }))
                  }
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-50"
                >
                  + Add another qualification
                </button>
              </div>
            ) : workerProfile.qualifications.length > 0 ? (
              <div className="space-y-3">
                {workerProfile.qualifications.map((q) => (
                  <div key={q.id} className="flex gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{q.degree}</p>
                      <p className="text-base text-stone-600">{q.field}</p>
                      <p className="text-sm text-stone-400">
                        {q.institution} · {q.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit("qualifications")}
                className="inline-flex items-center gap-2 text-base font-normal text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-black hover:decoration-black"
              >
                <span className="text-lg" aria-hidden="true">
                  +
                </span>
                Add a qualification
              </button>
            )}
          </Section>

          {/* Experience */}
          <Section
            title="Work Experience"
            onEdit={() => startEdit("experience")}
            editing={editing === "experience"}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            error={editing === "experience" ? editError : ""}
          >
            {editing === "experience" ? (
              <div className="space-y-4">
                {(tempData.experience as Experience[]).map(
                  (experience, index) => (
                    <div
                      key={experience.id}
                      className="rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-stone-800">
                          Experience {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setTempData((previous: any) => ({
                              ...previous,
                              experience: previous.experience.filter(
                                (item: Experience) => item.id !== experience.id,
                              ),
                            }))
                          }
                          aria-label={`Remove experience ${index + 1}`}
                          className="rounded-lg px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Role">
                          <input
                            value={experience.title}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                experience: previous.experience.map(
                                  (item: Experience) =>
                                    item.id === experience.id
                                      ? { ...item, title: event.target.value }
                                      : item,
                                ),
                              }))
                            }
                            className="input-style"
                            placeholder="e.g. Electrician"
                          />
                        </Field>
                        <Field label="Company or client">
                          <input
                            value={experience.company}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                experience: previous.experience.map(
                                  (item: Experience) =>
                                    item.id === experience.id
                                      ? { ...item, company: event.target.value }
                                      : item,
                                ),
                              }))
                            }
                            className="input-style"
                            placeholder="Company or client name"
                          />
                        </Field>
                        <Field label="Duration">
                          <input
                            value={experience.duration}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                experience: previous.experience.map(
                                  (item: Experience) =>
                                    item.id === experience.id
                                      ? {
                                          ...item,
                                          duration: event.target.value,
                                        }
                                      : item,
                                ),
                              }))
                            }
                            placeholder="e.g. 2021–2024 or 3 years"
                            className="input-style"
                          />
                        </Field>
                        <Field label="What you did" className="sm:col-span-2">
                          <textarea
                            value={experience.description}
                            onChange={(event) =>
                              setTempData((previous: any) => ({
                                ...previous,
                                experience: previous.experience.map(
                                  (item: Experience) =>
                                    item.id === experience.id
                                      ? {
                                          ...item,
                                          description: event.target.value,
                                        }
                                      : item,
                                ),
                              }))
                            }
                            rows={3}
                            maxLength={800}
                            placeholder="Describe your responsibilities, tools, or results."
                            className="input-style resize-y"
                          />
                        </Field>
                      </div>
                    </div>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setTempData((previous: any) => ({
                      ...previous,
                      experience: [
                        ...previous.experience,
                        {
                          id: `e-${Date.now()}`,
                          title: "",
                          company: "",
                          duration: "",
                          description: "",
                        },
                      ],
                    }))
                  }
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-50"
                >
                  + Add another role
                </button>
              </div>
            ) : workerProfile.experience.length > 0 ? (
              <div className="space-y-4">
                {workerProfile.experience.map((ex) => (
                  <div key={ex.id} className="flex gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{ex.title}</p>
                      <p className="text-base text-stone-600">
                        {ex.company} · {ex.duration}
                      </p>
                      <p className="text-base text-stone-500 mt-1 leading-relaxed">
                        {ex.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit("experience")}
                className="inline-flex items-center gap-2 text-base font-normal text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-black hover:decoration-black"
              >
                <span className="text-lg" aria-hidden="true">
                  +
                </span>
                Add work experience
              </button>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <div className="grid content-start gap-5 sm:grid-cols-2 md:grid-cols-1">
          {/* Work history */}
          <div className="min-h-52 rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 font-sans text-xl font-semibold tracking-tight text-stone-900">
              Work History
            </h3>
            {workerProfile.workHistory.length > 0 ? (
              <div className="space-y-4">
                {workerProfile.workHistory.map((wh, i) => (
                  <div
                    key={wh.jobId}
                    className="pb-4 border-b border-stone-100 last:border-0 last:pb-0"
                  >
                    <p className="text-base font-normal text-stone-900 line-clamp-1">
                      {wh.jobTitle}
                    </p>
                    <p className="text-sm text-stone-500">{wh.providerName}</p>
                    <p className="text-sm text-stone-400 mt-0.5">{wh.date}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < wh.rating ? "text-amber" : "text-stone-200"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-mono-data text-stone-600">
                        NPR {wh.payment.toLocaleString()}
                      </span>
                    </div>
                    {wh.review && (
                      <p className="text-sm text-stone-500 italic mt-1.5 leading-relaxed">
                        "{wh.review}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-base leading-relaxed text-stone-600">
                Completed jobs and provider feedback will appear here.
              </p>
            )}
          </div>

          {/* Availability */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="font-sans text-xl font-semibold tracking-tight text-stone-900">
              Availability
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-500">
              Add regular weekly hours and optional dates when you can take
              work. Matching jobs use your weekly hours.
            </p>

            <div className="mt-4 rounded-xl bg-stone-50 p-3.5">
              <h4 className="text-sm font-semibold text-stone-800">
                Weekly hours
              </h4>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="col-span-2 text-xs font-medium text-stone-600">
                  Day
                  <select
                    value={availabilityDay}
                    onChange={(event) =>
                      setAvailabilityDay(event.target.value as Weekday)
                    }
                    className="input-style mt-1"
                  >
                    {weekdays.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-stone-600">
                  From
                  <input
                    type="time"
                    value={availabilityStart}
                    onChange={(event) =>
                      setAvailabilityStart(event.target.value)
                    }
                    className="input-style mt-1"
                  />
                </label>
                <label className="text-xs font-medium text-stone-600">
                  Until
                  <input
                    type="time"
                    value={availabilityEnd}
                    onChange={(event) => setAvailabilityEnd(event.target.value)}
                    className="input-style mt-1"
                  />
                </label>
              </div>
              {availabilityError && (
                <p role="alert" className="mt-2 text-xs text-red-700">
                  {availabilityError}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                {editingAvailabilityId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAvailabilityId(null)
                      setAvailabilityError("")
                      setAvailabilityDay("monday")
                      setAvailabilityStart("18:00")
                      setAvailabilityEnd("21:00")
                    }}
                    className="rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={addWeeklyAvailability}
                  className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                >
                  {editingAvailabilityId ? "Save changes" : "Add weekly hours"}
                </button>
              </div>
            </div>

            {(workerProfile.weeklyAvailability ?? []).length > 0 ? (
              <ul
                className="mt-3 space-y-2"
                aria-label="Weekly availability schedule"
              >
                {(workerProfile.weeklyAvailability ?? []).map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-stone-700">
                      {weekdays.find((day) => day.value === slot.day)?.label}:{" "}
                      <span className="font-normal text-stone-500">
                        {slot.startTime}–{slot.endTime}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAvailabilityId(slot.id)
                          setAvailabilityDay(slot.day)
                          setAvailabilityStart(slot.startTime)
                          setAvailabilityEnd(slot.endTime)
                          setAvailabilityError("")
                        }}
                        aria-label={`Edit ${slot.day} ${slot.startTime} to ${slot.endTime}`}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-primary-ink hover:bg-primary-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateWorkerProfile({
                            weeklyAvailability: (
                              workerProfile.weeklyAvailability ?? []
                            ).filter((item) => item.id !== slot.id),
                          })
                          if (editingAvailabilityId === slot.id)
                            setEditingAvailabilityId(null)
                          showProfileUpdate(
                            "Your weekly availability was updated.",
                          )
                        }}
                        aria-label={`Remove ${slot.day} ${slot.startTime} to ${slot.endTime}`}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-red-50 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-stone-300 px-3 py-3 text-sm text-stone-500">
                No weekly hours saved yet.
              </p>
            )}

            <div className="mt-5 border-t border-stone-100 pt-4">
              <h4 className="text-sm font-semibold text-stone-800">
                Specific available dates
              </h4>
              <div className="mt-2 flex gap-2">
                <input
                  type="date"
                  min={todayInKathmandu}
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  aria-label="Add an available date"
                  className="input-style min-w-0"
                />
                <button
                  type="button"
                  disabled={
                    !dateInput ||
                    dateInput < todayInKathmandu ||
                    workerProfile.availableDates.includes(dateInput)
                  }
                  onClick={() => {
                    if (
                      !dateInput ||
                      dateInput < todayInKathmandu ||
                      workerProfile.availableDates.includes(dateInput)
                    )
                      return
                    updateWorkerProfile({
                      availableDates: [
                        ...workerProfile.availableDates,
                        dateInput,
                      ].sort(),
                    })
                    showProfileUpdate("Your available dates were updated.")
                    setDateInput("")
                  }}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {workerProfile.availableDates.length ? (
                <ul
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label="Specific available dates"
                >
                  {workerProfile.availableDates.map((date) => (
                    <li key={date}>
                      <button
                        type="button"
                        onClick={() => {
                          updateWorkerProfile({
                            availableDates: workerProfile.availableDates.filter(
                              (item) => item !== date,
                            ),
                          })
                          showProfileUpdate(
                            "Your available dates were updated.",
                          )
                        }}
                        className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-ink hover:border-primary"
                        aria-label={`Remove available date ${date}`}
                      >
                        {new Date(`${date}T12:00:00`).toLocaleDateString(
                          "en-NP",
                          { month: "short", day: "numeric" },
                        )}{" "}
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-stone-500">
                  Use these for one-off dates; weekly hours remain your regular
                  schedule.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  onEdit,
  editing,
  onSave,
  onCancel,
  error = "",
  children,
  editable = true,
}: {
  title: string
  onEdit: () => void
  editing: boolean
  onSave: () => void
  onCancel: () => void
  error?: string
  children: React.ReactNode
  editable?: boolean
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans text-xl font-semibold tracking-tight text-stone-900">
          {title}
        </h3>
        {!editing ? (
          editable && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${title.toLowerCase()}`}
              title={`Edit ${title.toLowerCase()}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" />
              </svg>
            </button>
          )
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="text-[13px] text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Save
            </button>
          </div>
        )}
      </div>
      {editing && error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string value: string | undefined }) {
  return (
    <div>
      <p className="mb-1.5 text-base font-normal text-stone-500">{label}</p>
      <p className="text-lg font-normal leading-7 text-zinc-800">
        {value ?? "—"}
      </p>
    </div>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  const fieldId = useId()
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id: fieldId })
    : children
  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-base font-medium text-stone-700"
      >
        {label}
      </label>
      {control}
    </div>
  )
}
