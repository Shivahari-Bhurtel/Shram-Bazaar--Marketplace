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
import { DISTRICTS } from "../../data/mockData"
import { useSkillCatalog } from "../../hooks/useSkillCatalog"
import type {
  Experience,
  Qualification,
} from "../../types"
import { formatNepalDate, isDateOnlyString, nepalDateString, nepalYear } from "../../utils/dates"
import { isValidPhoneNumber } from "../../utils/validation"
import { getConfiguredJobCategories } from "../../utils/categories"

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
  { src: "/avatars/dara.svg", label: "Dara illustration" },
  { src: "/avatars/ilse.svg", label: "Ilse illustration" },
  { src: "/avatars/caspar.svg", label: "Caspar illustration" },
  { src: "/avatars/erik.svg", label: "Erik illustration" },
  { src: "/avatars/berta.svg", label: "Berta illustration" },
  { src: "/avatars/emil.svg", label: "Emil illustration" },
  { src: "/avatars/alia.svg", label: "Alia illustration" },
  { src: "/avatars/regina.svg", label: "Regina illustration" },
]

export default function WorkerProfile() {
  const skillCatalog = useSkillCatalog()
  const { state, updateWorkerProfile, notifyProfileUpdated, navigate } =
    useApp()
  const { workerProfile } = state
  useEffect(() => {
    try {
      const target = sessionStorage.getItem("worker-profile-scroll-target")
      sessionStorage.removeItem("worker-profile-scroll-target")
      if (target) window.requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }))
    } catch { /* Profile remains usable without session storage. */ }
  }, [])
  const preferredCategoryOptions = getConfiguredJobCategories()
  const [editing, setEditing] = useState<string | null>(null)
  const [tempData, setTempData] = useState<any>({})
  const [skillInput, setSkillInput] = useState("")
  const [saved, setSaved] = useState(false)
  const [editError, setEditError] = useState("")
  const [photoMessage, setPhotoMessage] = useState("")
  const [photoError, setPhotoError] = useState(false)
  const [photoChoicesOpen, setPhotoChoicesOpen] = useState(false)
  const [publicPreviewOpen, setPublicPreviewOpen] = useState(false)
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
    if (!publicPreviewOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPublicPreviewOpen(false)
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [publicPreviewOpen])

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
        dateOfBirth: workerProfile.dateOfBirth ?? "",
        gender: workerProfile.gender ?? "",
        address: workerProfile.address ?? "",
        phone: workerProfile.phone,
        location: workerProfile.location,
        district: workerProfile.district,
        latitude: workerProfile.latitude,
        longitude: workerProfile.longitude,
        preferredTravelDistanceKm: workerProfile.preferredTravelDistanceKm ?? 10,
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
                credentialType: "education",
                degree: "",
                institution: "",
                year: nepalYear(),
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
      const location = String(tempData.location ?? "").trim()
      const district = String(tempData.district ?? "").trim()
      const dateOfBirth = String(tempData.dateOfBirth ?? "")
      if (!name || !phone || !location || !district) {
        setEditError("Name, phone, location, and district are required.")
        return
      }
      if (!isValidPhoneNumber(phone)) {
        setEditError("Enter a valid phone number with 7 to 15 digits.")
        return
      }
      if (dateOfBirth && !isDateOnlyString(dateOfBirth)) {
        setEditError("Enter a valid date of birth.")
        return
      }
      if (dateOfBirth && dateOfBirth > nepalDateString()) {
        setEditError("Date of birth cannot be in the future.")
        return
      }
      if (String(tempData.bio ?? "").length > 600) {
        setEditError("Keep your bio under 600 characters.")
        return
      }
      const preferredTravelDistanceKm = Number(tempData.preferredTravelDistanceKm)
      if (!Number.isFinite(preferredTravelDistanceKm) || preferredTravelDistanceKm < 0 || preferredTravelDistanceKm > 500) {
        setEditError("Travel distance must be between 0 and 500 km.")
        return
      }
      updateWorkerProfile({
        ...tempData,
        name,
        phone,
        dateOfBirth: dateOfBirth || undefined,
        gender: tempData.gender || undefined,
        address: String(tempData.address ?? "").trim(),
        location,
        district,
        preferredTravelDistanceKm,
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
          Number(item.year) > nepalYear(),
      )
      const invalidDates = qualifications.some((item) => !isDateOnlyString(item.startDate || `${item.year}-01-01`) || (!item.currentlyStudying && item.endDate && !isDateOnlyString(item.endDate)) || (item.endDate && item.startDate && item.endDate < item.startDate))
      if (qualifications.some((item) => !item.degree.trim()) || invalidYear || invalidDates) {
        setEditError(
          "Add a qualification name and valid start and completion dates for each entry.",
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
      if (experience.some((item) => !isDateOnlyString(item.startDate || "") || (!item.currentlyWorking && !isDateOnlyString(item.endDate || "")) || (item.endDate && item.startDate && item.endDate < item.startDate))) {
        setEditError("Add valid start and end dates. Mark the role as current to leave its end date blank.")
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

  const filteredSkills = skillCatalog.filter(
    (s) =>
      s.toLowerCase().includes(skillInput.toLowerCase()) &&
      !(tempData.skills ?? []).some(
        (selected: string) => selected.toLowerCase() === s.toLowerCase(),
      ),
  ).slice(0, 15)
  const kycStatus = workerProfile.kycStatus ?? "not-verified"
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
    if (file.size > 512 * 1024) {
      setPhotoError(true)
      setPhotoMessage("Choose an image smaller than 512 KB for browser storage.")
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
    <div className="worker-profile-page mx-auto w-full max-w-[1600px] px-4 py-7 font-sans sm:px-6 sm:py-8 lg:px-8">
      {saved && (
        <div className="mb-4 flex justify-end">
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fade-in">
            ✓ Saved
          </span>
        </div>
      )}

      {/* Profile hero */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-6 rounded-sm border border-stone-200 bg-white px-6 py-7 shadow-[0_2px_8px_rgba(28,25,23,0.04)] sm:px-8 sm:py-9">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5 sm:gap-7">
          <div ref={photoPickerRef} className="group relative shrink-0">
            {workerProfile.photo ? (
              <img
                src={workerProfile.photo}
                alt={`${workerProfile.name} profile`}
                className="h-28 w-28 rounded-full border-4 border-[#553421]/10 object-cover bg-stone-100 shadow-sm sm:h-32 sm:w-32"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#553421]/10 bg-[#f4eee9] font-sans text-3xl font-semibold text-[#553421] sm:h-32 sm:w-32">
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
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-sans text-2xl font-semibold leading-tight tracking-[-0.025em] text-stone-950 sm:text-3xl">
                {workerProfile.name}
              </h2>
              {kycStatus === "verified" && (
                <span
                  role="img"
                  title="Verified account"
                  aria-label="Verified account"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
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
              <p className="mt-1.5 text-sm font-medium text-stone-600">
                {workerProfile.professionalTitle}
              </p>
            )}
            <p className="mt-1.5 inline-flex items-center gap-2 text-sm text-stone-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-[#80502F]" aria-hidden="true">
                <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              <span>{workerProfile.location}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-start gap-x-3 gap-y-1.5 text-xs">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
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
                          : "fill-none text-stone-300"
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
                <span className="inline-flex min-h-7 items-center gap-1.5 border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                  {kycStatus === "pending" ? "Verification Pending" : "Account Unverified"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 self-center sm:w-48">
          {kycStatus !== "verified" && (
            <button
              type="button"
              onClick={() => navigate("kyc-verification")}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-[#553421]/25 bg-[#f8f4f1] px-3 font-sans text-sm font-medium tracking-[-0.005em] text-[#553421] transition-colors hover:border-[#553421] hover:bg-[#f1e8e1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#553421]"
            >
              {kycStatus === "pending" ? "Check status" : "Verify identity"}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M4.5 11.5 11.5 4.5M5 4.5h6.5V11" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPublicPreviewOpen(true)}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-stone-300 bg-white px-3 font-sans text-sm font-medium tracking-[-0.005em] text-stone-700 transition-colors hover:border-[#553421] hover:bg-stone-50 hover:text-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#553421]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
            <span className="whitespace-nowrap">Public Preview</span>
          </button>
        </div>
      </div>
      {publicPreviewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-stone-950/55 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPublicPreviewOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Public profile preview"
            className="relative my-3 w-full max-w-5xl border border-slate-300 bg-white shadow-2xl sm:my-8"
          >
            <header className="relative flex flex-wrap items-center gap-5 border-b border-slate-200 px-6 py-6 pr-16 sm:gap-6 sm:px-8 sm:py-8 sm:pr-20">
              {workerProfile.photo ? (
                <img src={workerProfile.photo} alt={`${workerProfile.name} profile`} className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-200 text-2xl font-medium text-slate-700 sm:h-24 sm:w-24">{workerProfile.name.slice(0, 1).toUpperCase()}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-sans text-xl font-medium leading-tight tracking-[-0.03em] text-stone-950 sm:text-2xl">{workerProfile.name}</h2>
                  {kycStatus === "verified" && (
                    <span title="Verified profile" aria-label="Verified profile" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>
                    </span>
                  )}
                </div>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>
                  {workerProfile.location}{workerProfile.district && workerProfile.district !== workerProfile.location ? `, ${workerProfile.district}` : ""}
                </p>
                <p className="mt-2 text-xs text-slate-600 sm:text-sm">{workerProfile.rating > 0 ? `★ ${workerProfile.rating.toFixed(1)} rating` : "No ratings yet"}</p>
              </div>
              <button type="button" onClick={() => setPublicPreviewOpen(false)} aria-label="Close public profile preview" className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-2xl leading-none text-slate-700 transition-colors hover:border-[#553421] hover:text-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#553421] sm:right-8 sm:top-8">×</button>
            </header>

            <div className="grid lg:grid-cols-[minmax(220px,0.82fr)_minmax(0,1.72fr)]">
              <aside className="space-y-6 px-6 py-6 sm:px-8 sm:py-7 lg:border-r lg:border-slate-200">
                <section>
                  <p className="text-base text-slate-700">{{ morning: "Mornings only", afternoon: "Afternoons", "full-day": "Full day", flexible: "Flexible" }[workerProfile.availability]}</p>
                </section>
                {(workerProfile.preferredCategories || []).length > 0 && (
                  <section className="border-t border-slate-200 pt-6">
                    <div className="flex flex-wrap gap-2">
                      {preferredCategoryOptions.filter((category) => workerProfile.preferredCategories?.includes(category.value)).map((category) => <span key={category.value} className="border border-slate-200 bg-slate-100 px-3 py-1.5 text-base text-slate-800">{category.label}</span>)}
                    </div>
                  </section>
                )}
                {(workerProfile.qualifications || []).length > 0 && (
                  <PreviewSection title="Education">
                    <div className="space-y-4">{workerProfile.qualifications.map((qualification) => <div key={qualification.id}><p className="text-lg font-medium text-stone-900">{qualification.degree}</p><p className="mt-1 text-base leading-relaxed text-slate-600">{qualification.field}{qualification.field && qualification.institution ? " · " : ""}{qualification.institution}</p><p className="mt-1 text-sm text-slate-500">{qualification.year}</p></div>)}</div>
                  </PreviewSection>
                )}
              </aside>

              <div className="min-w-0 px-6 py-6 sm:px-8 sm:py-7">
                {(workerProfile.professionalTitle || workerProfile.experience[0]?.title || workerProfile.skills.length > 0 || workerProfile.bio) && (
                  <section className="pb-6">
                    {(workerProfile.professionalTitle || workerProfile.experience[0]?.title || workerProfile.skills.length > 0) && <h3 className="font-sans text-2xl font-medium leading-tight tracking-[-0.03em] text-stone-950 sm:text-3xl">{workerProfile.professionalTitle || workerProfile.experience[0]?.title || workerProfile.skills.slice(0, 2).join(" · ")}</h3>}
                    {workerProfile.bio && <p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-800">{workerProfile.bio}</p>}
                  </section>
                )}
                {workerProfile.skills.length > 0 && (
                  <section className="flex flex-wrap gap-2.5 border-t border-slate-200 py-6">
                    {workerProfile.skills.map((skill) => <span key={skill} className="border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm text-slate-800">{skill}</span>)}
                  </section>
                )}
                {(workerProfile.experience || []).length > 0 && <PreviewSection title="Work experience"><div className="space-y-5">{workerProfile.experience.map((experience) => <div key={experience.id} className="border-t border-slate-200 pt-4 first:border-0 first:pt-0"><p className="text-lg font-medium text-stone-900">{experience.title}</p><p className="mt-1 text-base text-slate-600">{experience.company}{experience.company && experience.duration ? " · " : ""}{experience.duration}</p>{experience.description && <p className="mt-3 text-base leading-relaxed text-slate-700">{experience.description}</p>}</div>)}</div></PreviewSection>}
                {(workerProfile.workHistory || []).length > 0 && <PreviewSection title="Work history"><div className="space-y-5">{workerProfile.workHistory.map((work) => <div key={work.jobId} className="border-t border-slate-200 pt-4 first:border-0 first:pt-0"><p className="text-lg font-medium text-stone-900">{work.jobTitle}</p><p className="mt-1 text-base text-slate-600">{work.providerName}</p>{work.review && <p className="mt-3 text-base italic leading-relaxed text-slate-700">“{work.review}”</p>}</div>)}</div></PreviewSection>}
              </div>
            </div>
          </section>
        </div>
      )}
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

      <div className="grid items-start gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-5 lg:col-span-2">
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
                <Field label="Date of birth">
                  <input
                    type="date"
                    max={nepalDateString()}
                    value={tempData.dateOfBirth}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        dateOfBirth: e.target.value,
                      }))
                    }
                    className="input-style"
                  />
                </Field>
                <Field label="Gender (optional)">
                  <select
                    value={tempData.gender}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        gender: e.target.value,
                      }))
                    }
                    className="input-style"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </Field>
                <Field
                  label="Street, ward, or tole address"
                  className="sm:col-span-2"
                >
                  <input
                    value={tempData.address}
                    onChange={(e) =>
                      setTempData((p: any) => ({
                        ...p,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Private; shown only on your account"
                    autoComplete="street-address"
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
                <Field label="Maximum travel distance (km)">
                  <input type="number" min="0" max="500" value={tempData.preferredTravelDistanceKm} onChange={(e) => setTempData((p: any) => ({ ...p, preferredTravelDistanceKm: e.target.value }))} className="input-style" />
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
                <Info
                  label="Date of birth"
                  value={workerProfile.dateOfBirth || "Not added"}
                />
                <Info
                  label="Gender"
                  value={
                    workerProfile.gender?.replace(/-/g, " ") || "Not provided"
                  }
                />
                <Info
                  label="Street address"
                  value={workerProfile.address || "Not added"}
                />
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
                      className="text-sm px-3 py-1.5 bg-primary-50 text-primary-ink rounded-sm border border-primary-100 flex items-center gap-1 hover:bg-primary-100"
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
                      className="text-sm px-3 py-1.5 bg-stone-100 text-stone-700 rounded-sm border border-stone-200 hover:bg-stone-200 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                  {skillInput.trim() &&
                    !skillCatalog.some(
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
                        className="text-sm px-3 py-1.5 bg-primary-50 text-primary-ink rounded-sm border border-primary-100 hover:bg-primary-100"
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
                      className="text-sm px-2.5 py-1 bg-stone-100 text-stone-700 rounded-sm border border-stone-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit("skills")}
                    className="inline-flex items-center gap-2 text-base font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-black hover:decoration-black"
                  >
                    <span className="text-base" aria-hidden="true">
                      +
                    </span>
                    Add key skills
                  </button>
                )}
              </div>
            )}
          </Section>

          <section className="rounded-sm border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6">
            <h3 className="font-display text-xl font-medium tracking-[-0.025em] text-stone-900">Preferred work category</h3>
            <p className="mt-1 text-sm leading-5 text-stone-600">Choose one category to tailor your recommendations.</p>
            <div role="radiogroup" aria-label="Preferred work category" className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {preferredCategoryOptions.map((category) => {
                const selected = workerProfile.preferredCategories?.[0] === category.value
                return (
                  <label key={category.value} className={`inline-flex min-h-10 cursor-pointer items-center gap-2.5 border px-3 py-2 font-heading text-sm font-medium tracking-[0.005em] transition-colors ${selected ? "border-[#553421] bg-[#f8f4f1] text-[#553421]" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"}`}>
                    <input
                      type="radio"
                      name="worker-preferred-category"
                      value={category.value}
                      checked={selected}
                      onChange={() => updateWorkerProfile({ preferredCategories: [category.value] })}
                      className="h-4 w-4 shrink-0 accent-[#553421]"
                    />
                    <span>{category.label}</span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Qualifications */}
          <Section
            title="Education, certificates & training"
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
                      className="relative rounded-sm border border-stone-200 bg-stone-50/70 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-base font-medium text-stone-800">
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
                          className="rounded-sm px-2 py-1 text-base font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Credential type">
                          <select
                            value={qualification.credentialType || "education"}
                            onChange={(event) => setTempData((previous: any) => ({ ...previous, qualifications: previous.qualifications.map((item: Qualification) => item.id === qualification.id ? { ...item, credentialType: event.target.value as Qualification["credentialType"] } : item) }))}
                            className="input-style"
                          >
                            <option value="education">Education</option>
                            <option value="certificate">Certificate</option>
                            <option value="training">Training</option>
                          </select>
                        </Field>
                        <Field label={qualification.credentialType === "certificate" ? "Certificate name" : qualification.credentialType === "training" ? "Training program" : "Qualification"}>
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
                            max={nepalYear()}
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
                        <Field label="Start date">
                          <input type="date" max={nepalDateString()} value={qualification.startDate || `${qualification.year}-01-01`} onChange={(event) => setTempData((previous: any) => ({ ...previous, qualifications: previous.qualifications.map((item: Qualification) => item.id === qualification.id ? { ...item, startDate: event.target.value } : item) }))} className="input-style" />
                        </Field>
                        {!qualification.currentlyStudying && <Field label="Completion date">
                          <input type="date" min={qualification.startDate || `${qualification.year}-01-01`} max={nepalDateString()} value={qualification.endDate || `${qualification.year}-12-31`} onChange={(event) => setTempData((previous: any) => ({ ...previous, qualifications: previous.qualifications.map((item: Qualification) => item.id === qualification.id ? { ...item, endDate: event.target.value, year: Number(event.target.value.slice(0, 4)) || item.year } : item) }))} className="input-style" />
                        </Field>}
                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700"><input type="checkbox" checked={Boolean(qualification.currentlyStudying)} onChange={(event) => setTempData((previous: any) => ({ ...previous, qualifications: previous.qualifications.map((item: Qualification) => item.id === qualification.id ? { ...item, currentlyStudying: event.target.checked, endDate: event.target.checked ? undefined : item.endDate } : item) }))} />Currently studying</label>
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
                          credentialType: "education",
                          degree: "",
                          institution: "",
                          year: nepalYear(),
                          field: "",
                        },
                      ],
                    }))
                  }
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-base font-semibold text-primary-ink hover:bg-primary-50"
                >
                  + Add another qualification
                </button>
              </div>
            ) : workerProfile.qualifications.length > 0 ? (
              <div className="space-y-3">
                {workerProfile.qualifications.map((q) => (
                  <div key={q.id} className="flex gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-ink">{(q.credentialType || "education").replace(/^./, (letter) => letter.toUpperCase())}</p>
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
                className="inline-flex items-center gap-2 text-lg font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-black hover:decoration-black"
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
                      className="rounded-sm border border-stone-200 bg-stone-50/70 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-base font-medium text-stone-800">
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
                          className="rounded-sm px-2 py-1 text-base font-medium text-red-700 hover:bg-red-50"
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
                        <Field label="Start date">
                          <input type="date" max={nepalDateString()} value={experience.startDate || ""} onChange={(event) => setTempData((previous: any) => ({ ...previous, experience: previous.experience.map((item: Experience) => item.id === experience.id ? { ...item, startDate: event.target.value } : item) }))} className="input-style" />
                        </Field>
                        {!experience.currentlyWorking && <Field label="End date">
                          <input type="date" min={experience.startDate || undefined} max={nepalDateString()} value={experience.endDate || ""} onChange={(event) => setTempData((previous: any) => ({ ...previous, experience: previous.experience.map((item: Experience) => item.id === experience.id ? { ...item, endDate: event.target.value } : item) }))} className="input-style" />
                        </Field>}
                        <label className="flex items-center gap-2 text-sm font-medium text-stone-700"><input type="checkbox" checked={Boolean(experience.currentlyWorking)} onChange={(event) => setTempData((previous: any) => ({ ...previous, experience: previous.experience.map((item: Experience) => item.id === experience.id ? { ...item, currentlyWorking: event.target.checked, endDate: event.target.checked ? undefined : item.endDate } : item) }))} />I currently work here</label>
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
                          startDate: "",
                          endDate: "",
                          currentlyWorking: false,
                        },
                      ],
                    }))
                  }
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-base font-semibold text-primary-ink hover:bg-primary-50"
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
                className="inline-flex items-center gap-2 text-lg font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-black hover:decoration-black"
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
        <div className="grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1">
          {/* Work history */}
          <div className="min-h-52 min-w-0 rounded-sm border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6">
            <h3 className="mb-3 font-display text-xl font-medium tracking-[-0.025em] text-stone-900">
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
                    <p className="text-sm text-stone-400 mt-0.5">{wh.startDate && wh.endDate ? `${wh.startDate} – ${wh.endDate}` : wh.date}</p>
                    {wh.location && <p className="text-xs text-stone-500 mt-1">{wh.location}</p>}
                    {wh.description && <p className="mt-1 text-xs leading-relaxed text-stone-600">{wh.description}</p>}
                    {wh.completedAt && <p className="mt-1 text-xs text-stone-400">Completed {new Date(wh.completedAt).toLocaleString()}</p>}
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
                      {wh.payment !== undefined && <span className="text-sm font-mono-data text-stone-600">NPR {wh.payment.toLocaleString()}</span>}
                    </div>
                    {wh.review && (
                      <p className="text-sm text-stone-500 italic mt-1.5 leading-relaxed">
                        "{wh.review}"
                      </p>
                    )}
                    {wh.reviewedAt && <p className="mt-1 text-[11px] text-stone-400">Reviewed {new Date(wh.reviewedAt).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-sm leading-5 text-stone-600">
                Completed jobs and provider feedback will appear here.
              </p>
            )}
          </div>


        </div>
      </div>
    </div>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-slate-200 py-7 first:border-t-0">
      <h3 className="mb-3 font-sans text-xl font-medium tracking-[-0.02em] text-stone-900">{title}</h3>
      {children}
    </section>
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
    <div className="min-w-0 rounded-sm border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl font-medium tracking-[-0.025em] text-stone-900">
          {title}
        </h3>
        {!editing ? (
          editable && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${title.toLowerCase()}`}
              title={`Edit ${title.toLowerCase()}`}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-sm border border-[#553421]/25 bg-white px-3 font-heading text-sm font-medium tracking-[0.005em] text-[#553421] transition-colors hover:border-[#553421] hover:bg-[#553421]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#553421]"
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
              <span>Edit</span>
            </button>
          )
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="min-h-9 rounded-sm px-3 font-heading text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="min-h-9 rounded-sm bg-primary px-3 py-1.5 font-heading text-sm font-medium tracking-[0.005em] text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

function Info({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="mb-1 font-heading text-sm font-normal tracking-[0.01em] text-stone-600">{label}</p>
      <p className="font-sans text-base font-normal leading-6 text-stone-900">
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
        className="mb-1.5 block font-heading text-base font-normal tracking-[0.005em] text-stone-800"
      >
        {label}
      </label>
      {control}
    </div>
  )
}
