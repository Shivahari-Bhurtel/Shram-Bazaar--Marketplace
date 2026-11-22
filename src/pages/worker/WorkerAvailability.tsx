import { useEffect, useMemo, useState } from "react"
import { useApp } from "../../store/AppContext"
import type { AvailabilitySlot, Weekday, WorkerServiceListing } from "../../types"
import { apiRequest } from "../../services/backendApi"
import { formatNepalDate, nepalDateString } from "../../utils/dates"
import FindingTaskerAnimation from "../../components/FindingTaskerAnimation"

type CalendarStatus = "AVAILABLE" | "UNAVAILABLE" | "OCCUPIED" | "PENDING"
type CalendarEntry = {
  date: string
  startTime: string
  endTime: string
  type: CalendarStatus
  title?: string | null
  availabilityId?: string
  serviceListingId?: string
}
type RawCalendarEntry = Omit<CalendarEntry, "type" | "availabilityId" | "serviceListingId"> & {
  status?: CalendarStatus
  type?: CalendarStatus
  jobTitle?: string | null
  serviceTitle?: string | null
  availabilityId?: string | number | null
  serviceListingId?: string | number | null
}
type TimeBlock = { startTime: string; endTime: string }
type PaymentChoice = "PER_HOUR" | "PER_DAY" | "FIXED"
type AvailabilityDraft = {
  serviceId?: string
  category: string
  title: string
  description: string
  date: string
  endDate: string
  timeBlocks: TimeBlock[]
  paymentType: PaymentChoice
  amount: string
  negotiable: boolean
}

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: "Sunday", value: "sunday" },
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
]
const EMPTY_SLOTS: AvailabilitySlot[] = []
const serviceStorageKey = (workerId: string) => `shram-worker-services:${workerId}`
const usesLocalAvailability = () => import.meta.env.VITE_DEMO_MODE === "true" || (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname))
const friendlySyncError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : ""
  return /request failed\s*\(\d{3}\)|\b[45]\d{2}\b/i.test(message) ? fallback : (message || fallback)
}
const dateAtNoon = (value: string) => new Date(`${value}T12:00:00Z`)
const dateString = (value: Date) => value.toISOString().slice(0, 10)
const shiftDate = (value: string, amount: number) => {
  const next = dateAtNoon(value)
  next.setUTCDate(next.getUTCDate() + amount)
  return dateString(next)
}
const weekdayForDate = (value: string): Weekday => ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dateAtNoon(value).getUTCDay()] as Weekday
const minutes = (value: string) => {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number)
  return hour * 60 + minute
}
const timeText = (value: string) => {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number)
  const suffix = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`
}
const servicePriceText = (service: WorkerServiceListing) => {
  const amount = `Rs. ${Number(service.price || 0).toLocaleString()}`
  const period = service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : service.pricingType === "NEGOTIABLE" ? " · quote" : "+"
  return `${amount}${period}${service.negotiable ? " · negotiable" : ""}`
}
const readDemoServices = (workerId: string): WorkerServiceListing[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(serviceStorageKey(workerId)) || "[]")
    return Array.isArray(value) ? value : []
  } catch { return [] }
}
const defaultDraft = (date = ""): AvailabilityDraft => ({
  category: "",
  title: "",
  description: "",
  date,
  endDate: date,
  timeBlocks: [{ startTime: "08:00", endTime: "12:00" }],
  paymentType: "PER_HOUR",
  amount: "",
  negotiable: false,
})
const normalizeCalendarEntry = (entry: RawCalendarEntry): CalendarEntry => ({
  date: entry.date,
  startTime: entry.startTime.slice(0, 5),
  endTime: entry.endTime.slice(0, 5),
  type: entry.status || entry.type || "AVAILABLE",
  title: entry.serviceTitle || entry.jobTitle || entry.title || null,
  availabilityId: entry.availabilityId == null ? undefined : String(entry.availabilityId),
  serviceListingId: entry.serviceListingId == null ? undefined : String(entry.serviceListingId),
})
const availabilityEntriesForDates = (dates: string[], slots: AvailabilitySlot[], services: WorkerServiceListing[]): CalendarEntry[] => dates.flatMap((date) => {
  const dateSlots = slots.filter((slot) => slot.date && date >= slot.date && date <= (slot.endDate || slot.date))
  const daySlots = dateSlots.length ? dateSlots : slots.filter((slot) => !slot.date && slot.day === weekdayForDate(date))
  return daySlots.map((slot) => {
    const service = slot.serviceListingId ? services.find((item) => item.id === slot.serviceListingId) : undefined
    return { date, startTime: slot.startTime, endTime: slot.endTime, type: "AVAILABLE", title: service?.title || "Available work", availabilityId: slot.id, serviceListingId: slot.serviceListingId }
  })
})

export default function WorkerAvailability() {
  const { state, updateWorkerProfile, removeWorkerAvailability } = useApp()
  const profile = state.workerProfile
  const slots = profile?.weeklyAvailability ?? EMPTY_SLOTS
  const today = nepalDateString()
  const [cursor, setCursor] = useState(today)
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [services, setServices] = useState<WorkerServiceListing[]>([])
  const [serviceLoading, setServiceLoading] = useState(false)
  const [serviceError, setServiceError] = useState("")
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0)
  const [dashboardTab, setDashboardTab] = useState<"listings" | "requests" | "work" | "reviews">("listings")
  const [dashboardExpanded, setDashboardExpanded] = useState(true)
  const [notice, setNotice] = useState("")
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<AvailabilityDraft>(() => defaultDraft())
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null)
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const monthStart = `${cursor.slice(0, 7)}-01`
  const monthStartOffset = dateAtNoon(monthStart).getUTCDay()
  const calendarStart = shiftDate(monthStart, -monthStartOffset)
  const calendarDates = useMemo(() => Array.from({ length: 42 }, (_, index) => shiftDate(calendarStart, index)), [calendarStart])
  const calendarEnd = calendarDates[41]
  const monthTitle = formatNepalDate(monthStart, { month: "long", year: "numeric" })
  useEffect(() => {
    if (!profile) return
    let active = true
    setServiceLoading(true)
    setServiceError("")
    const load = usesLocalAvailability()
      ? Promise.resolve(readDemoServices(profile.id))
      : apiRequest<Array<Omit<WorkerServiceListing, "id"> & { id: number; skills?: string[] }>>("/api/seeker/services")
          .then((items) => items.map((item) => ({ ...item, id: String(item.id), skills: item.skills || [] })))
    void load.then((items) => {
      if (!active) return
      setServices(items)
      try { localStorage.setItem(serviceStorageKey(profile.id), JSON.stringify(items)) } catch { /* Keep the live service list in memory when storage is unavailable. */ }
    }).catch((error: unknown) => {
      if (!active) return
      const cached = readDemoServices(profile.id)
      if (cached.length) {
        setServices(cached)
        setServiceError("Showing your saved service details while live listings reconnect.")
      } else {
        setServiceError(friendlySyncError(error, "Couldn’t refresh your published work just now. Your saved schedule is still here."))
      }
    }).finally(() => { if (active) setServiceLoading(false) })
    return () => { active = false }
  }, [profile?.id, serviceRefreshKey])

  useEffect(() => {
    if (!profile) return
    let active = true
    setCalendarLoading(true)
    if (usesLocalAvailability()) {
      const entries: CalendarEntry[] = []
      calendarDates.forEach((date) => {
        let daySlots = slots.filter((slot) => slot.date ? date >= slot.date && date <= (slot.endDate || slot.date) : slot.day === weekdayForDate(date))
        if (slots.some((slot) => slot.date && date >= slot.date && date <= (slot.endDate || slot.date))) daySlots = daySlots.filter((slot) => Boolean(slot.date))
        daySlots.forEach((slot) => {
          const service = services.find((item) => item.id === slot.serviceListingId)
          entries.push({ date, startTime: slot.startTime, endTime: slot.endTime, type: "AVAILABLE", title: service?.title, availabilityId: slot.id, serviceListingId: slot.serviceListingId })
        })
        state.applications.filter((application) => application.workerId === profile.id && application.status === "accepted" && application.engagementStatus !== "AWAITING_RESPONSE").forEach((application) => {
          const job = state.jobs.find((item) => item.id === application.jobId)
          if (job && date >= job.date && date <= (job.endDate || job.date)) entries.push({ date, startTime: job.startTime, endTime: job.endTime, type: "OCCUPIED", title: job.title })
        })
      })
      const pending = state.applications.filter((application) => application.workerId === profile.id && application.engagementStatus === "AWAITING_RESPONSE").flatMap((application) => {
        const job = state.jobs.find((item) => item.id === application.jobId)
        return job && job.date >= calendarStart && job.date <= calendarEnd ? [{ date: job.date, startTime: job.startTime, endTime: job.endTime, type: "PENDING" as const, title: job.title }] : []
      })
      setCalendarEntries([...entries, ...pending])
      setCalendarLoading(false)
      return () => { active = false }
    }
    const params = new URLSearchParams({ startDate: calendarStart, endDate: calendarEnd })
    void apiRequest<RawCalendarEntry[]>(`/api/seeker/calendar?${params}`).then((result) => {
      if (!active) return
      const pending = state.applications.filter((application) => application.workerId === profile.id && application.engagementStatus === "AWAITING_RESPONSE").flatMap((application) => {
        const job = state.jobs.find((item) => item.id === application.jobId)
        return job && job.date >= calendarStart && job.date <= calendarEnd ? [{ date: job.date, startTime: job.startTime, endTime: job.endTime, type: "PENDING" as const, title: job.title }] : []
      })
      const available = result.map(normalizeCalendarEntry).map((entry) => {
        if (entry.type !== "AVAILABLE") return entry
        const slot = slots.find((item) => {
          const dateMatches = item.date
            ? entry.date >= item.date && entry.date <= (item.endDate || item.date)
            : item.day === weekdayForDate(entry.date)
          return dateMatches && item.startTime < entry.endTime && item.endTime > entry.startTime
        })
        const service = slot?.serviceListingId ? services.find((item) => item.id === slot.serviceListingId) : undefined
        return slot ? { ...entry, title: service?.title || entry.title || "Available work", availabilityId: slot.id, serviceListingId: slot.serviceListingId } : entry
      })
      setCalendarEntries([...available, ...pending])
    }).catch((error: unknown) => {
      if (!active) return
      const savedEntries = availabilityEntriesForDates(calendarDates, slots, services)
      setCalendarEntries(savedEntries)
    }).finally(() => { if (active) setCalendarLoading(false) })
    return () => { active = false }
  }, [profile?.id, slots, services, calendarStart, calendarEnd, state.applications, state.jobs])

  if (!profile) return null

  const persistServices = (next: WorkerServiceListing[]) => {
    setServices(next)
    try { localStorage.setItem(serviceStorageKey(profile.id), JSON.stringify(next)) } catch { /* Keep the service details in memory when storage is unavailable. */ }
    window.dispatchEvent(new Event("shram-worker-services-updated"))
  }
  const openWizard = (date = "", entry?: CalendarEntry, existingService?: WorkerServiceListing) => {
    const selectedService = existingService || services.find((item) => item.id === entry?.serviceListingId)
    const selectedSlot = entry?.availabilityId ? slots.find((item) => item.id === entry.availabilityId) : undefined
    setDraft({
      ...defaultDraft(selectedSlot?.date || date || entry?.date || ""),
      category: profile.preferredCategories?.[0] || "",
      ...(selectedService ? {
        serviceId: selectedService.id,
        category: selectedService.category,
        title: selectedService.title,
        description: selectedService.description,
        paymentType: selectedService.pricingType === "PER_DAY" ? "PER_DAY" : selectedService.pricingType === "FIXED" ? "FIXED" : "PER_HOUR",
        amount: selectedService.price == null ? "" : String(selectedService.price),
        negotiable: Boolean(selectedService.negotiable),
      } : {}),
      ...(entry ? {
        date: selectedSlot?.date || entry.date,
        endDate: selectedSlot?.endDate || selectedSlot?.date || entry.date,
        timeBlocks: [{ startTime: selectedSlot?.startTime || entry.startTime, endTime: selectedSlot?.endTime || entry.endTime }],
        ...(!selectedService && entry.title ? { title: entry.title } : {}),
      } : {}),
      ...(selectedSlot?.serviceListingId && !selectedService ? { serviceId: selectedSlot.serviceListingId } : {}),
    })
    setEditingAvailabilityId(selectedSlot?.date ? entry?.availabilityId || null : null)
    setStep(1)
    setFormError("")
    setWizardOpen(true)
  }
  const updateDraft = <K extends keyof AvailabilityDraft>(key: K, value: AvailabilityDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const validateStep = (current: number) => {
    if (current === 1) {
      if (!draft.category) return "Choose a work category."
      if (!draft.title.trim()) return "Add a short title for this work."
      if (!draft.description.trim()) return "Describe the work you can do."
    }
    if (current === 2) {
      if (!draft.date) return "Choose the date you are available."
      if (draft.date < today) return "Choose today or a future start date."
      if (!draft.endDate || draft.endDate < draft.date) return "The end date must be on or after the start date."
      if ((dateAtNoon(draft.endDate).getTime() - dateAtNoon(draft.date).getTime()) / 86400000 > 365) return "Choose a date range within one year."
      if (!draft.timeBlocks.length) return "Add at least one time slot."
      for (const block of draft.timeBlocks) {
        if (!block.startTime || !block.endTime || block.endTime <= block.startTime) return "Each end time must be later than its start time."
      }
      const ordered = [...draft.timeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime))
      if (ordered.some((block, index) => index > 0 && block.startTime < ordered[index - 1].endTime)) return "Your time slots overlap. Adjust the times and try again."
      const collisions = calendarEntries.filter((entry) => entry.date >= draft.date && entry.date <= draft.endDate && entry.availabilityId !== editingAvailabilityId && (entry.type === "OCCUPIED" || (entry.type === "AVAILABLE" && Boolean(entry.serviceListingId))))
      if (draft.timeBlocks.some((block) => collisions.some((entry) => block.startTime < entry.endTime && block.endTime > entry.startTime))) return "A saved time or confirmed job already overlaps this date range. Adjust the dates or times."
    }
    if (current === 3 && (!Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0)) return "Enter an expected amount greater than zero."
    return ""
  }
  const continueStep = () => {
    const error = validateStep(step)
    if (error) { setFormError(error); return }
    setFormError("")
    setStep((current) => Math.min(4, current + 1))
  }
  const backStep = () => { setFormError(""); setStep((current) => Math.max(1, current - 1)) }

  const publishAvailability = async () => {
    const error = validateStep(1) || validateStep(2) || validateStep(3)
    if (error) { setFormError(error); return }
    setSaving(true)
    setFormError("")
    let savedService: WorkerServiceListing | undefined
    const savedSlots: AvailabilitySlot[] = []
    try {
      const previous = draft.serviceId ? services.find((item) => item.id === draft.serviceId) : undefined
      const existing = previous || services.find((item) => item.category.trim().toLowerCase() === draft.category.trim().toLowerCase() && item.title.trim().toLowerCase() === draft.title.trim().toLowerCase())
      const servicePayload = {
        category: draft.category.trim(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        skills: existing?.skills || profile.skills.slice(0, 12),
        pricingType: draft.paymentType,
        price: Number(draft.amount),
        minimumDurationHours: draft.paymentType === "PER_HOUR" ? existing?.minimumDurationHours || 1 : undefined,
        serviceArea: existing?.serviceArea || profile.location || profile.district || "",
        active: true,
        negotiable: draft.negotiable,
      }
      let serviceToUse: WorkerServiceListing
      if (usesLocalAvailability()) {
        serviceToUse = { ...servicePayload, id: existing?.id || `service-${Date.now()}`, skills: servicePayload.skills, active: true }
      } else {
        const raw = await apiRequest<Omit<WorkerServiceListing, "id"> & { id: number }>(existing ? `/api/seeker/services/${existing.id}` : "/api/seeker/services", {
          method: existing ? "PUT" : "POST",
          body: JSON.stringify(servicePayload),
        })
        serviceToUse = { ...raw, id: String(raw.id), skills: raw.skills || [], negotiable: raw.negotiable }
      }
      savedService = serviceToUse
      const nextServices = [serviceToUse, ...services.filter((item) => item.id !== serviceToUse.id)]
      persistServices(nextServices)

      for (const [index, block] of draft.timeBlocks.entries()) {
        const priorSlot = index === 0 && editingAvailabilityId ? slots.find((item) => item.id === editingAvailabilityId) : undefined
        let savedId = `availability-${Date.now()}-${index}`
        if (!usesLocalAvailability()) {
          const payload = {
            dayOfWeek: null,
            startDate: draft.date,
            endDate: draft.endDate,
            startTime: `${block.startTime}:00`,
            endTime: `${block.endTime}:00`,
            serviceListingId: Number(serviceToUse.id),
          }
          const saved = await apiRequest<{ id: number }>(priorSlot && /^\d+$/.test(priorSlot.id) ? `/api/seeker/availability/${priorSlot.id}` : "/api/seeker/availability", {
            method: priorSlot && /^\d+$/.test(priorSlot.id) ? "PUT" : "POST",
            body: JSON.stringify(payload),
          })
          savedId = String(saved.id)
        } else if (priorSlot) savedId = priorSlot.id
        savedSlots.push({
          id: savedId,
          day: weekdayForDate(draft.date),
          date: draft.date,
          endDate: draft.endDate,
          startTime: block.startTime,
          endTime: block.endTime,
          serviceListingId: serviceToUse.id,
        })
      }

      const replacedId = editingAvailabilityId
      const nextSlots = [
        ...slots.filter((item) => item.id !== replacedId),
        ...savedSlots,
      ]
      updateWorkerProfile({ weeklyAvailability: nextSlots, availableDates: [...new Set(nextSlots.flatMap((item) => item.date ? [item.date] : []))].sort() })
      const newEntries = savedSlots.flatMap((item) => {
        const entries: CalendarEntry[] = []
        for (let date = item.date!; date <= (item.endDate || item.date!); date = shiftDate(date, 1)) {
          if (date >= calendarStart && date <= calendarEnd) entries.push({ date, startTime: item.startTime, endTime: item.endTime, type: "AVAILABLE", title: serviceToUse.title, availabilityId: item.id, serviceListingId: serviceToUse.id })
        }
        return entries
      })
      setCalendarEntries((current) => [...current.filter((entry) => entry.availabilityId !== replacedId), ...newEntries])
      setCursor(draft.date)
      setWizardOpen(false)
      setEditingAvailabilityId(null)
      setNotice("")
    } catch (error) {
      if (savedSlots.length) {
        const nextSlots = [...slots.filter((item) => item.id !== editingAvailabilityId), ...savedSlots]
        updateWorkerProfile({ weeklyAvailability: nextSlots, availableDates: [...new Set(nextSlots.flatMap((item) => item.date ? [item.date] : []))].sort() })
      }
      setFormError(savedService
        ? `Your work listing is saved, but its availability could not be fully saved. ${friendlySyncError(error, "Please try publishing the time again.")}`
        : friendlySyncError(error, "Could not publish this availability. Please try again."))
    } finally { setSaving(false) }
  }

  const removeAvailability = async () => {
    if (!editingAvailabilityId) return
    setSaving(true)
    setFormError("")
    try {
      await removeWorkerAvailability(editingAvailabilityId)
      setCalendarEntries((current) => current.filter((entry) => entry.availabilityId !== editingAvailabilityId))
      setWizardOpen(false)
      setEditingAvailabilityId(null)
      setNotice("This availability was removed. Your work listing is still available to edit or schedule again.")
    } catch (error) {
      setFormError(friendlySyncError(error, "Could not remove this availability. Please try again."))
    } finally { setSaving(false) }
  }

  const removeAvailabilityById = async (availabilityId: string) => {
    try {
      await removeWorkerAvailability(availabilityId)
      setCalendarEntries((current) => current.filter((entry) => entry.availabilityId !== availabilityId))
      setNotice("Availability deleted. The service listing is still saved.")
    } catch (error) {
      setNotice(friendlySyncError(error, "Could not delete this availability. Please try again."))
    }
  }

  const toggleServiceActive = async (service: WorkerServiceListing) => {
    const active = !service.active
    try {
      if (!usesLocalAvailability()) {
        await apiRequest(`/api/seeker/services/${service.id}`, { method: "PUT", body: JSON.stringify({ ...service, active }) })
      }
      persistServices(services.map((item) => item.id === service.id ? { ...item, active } : item))
      setNotice(active ? `${service.title} is active again.` : `${service.title} is paused. Employers can’t request it while it’s paused.`)
    } catch (error) {
      setNotice(friendlySyncError(error, "Could not update this service. Please try again."))
    }
  }

  const moveMonth = (direction: number) => {
    const current = dateAtNoon(monthStart)
    const target = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + direction, 1, 12))
    setCursor(dateString(target))
  }
  // The calendar API is loaded only for the visible month. Build listing cards
  // from the worker's saved slots instead, so future ranges remain visible even
  // when they fall outside the currently displayed calendar grid.
  const upcomingListingEntries = (serviceId: string): CalendarEntry[] => slots
    .filter((slot) => slot.serviceListingId === serviceId && slot.date && (slot.endDate || slot.date) >= today)
    .map((slot) => ({
      date: slot.date!,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: "AVAILABLE" as const,
      availabilityId: slot.id,
      serviceListingId: serviceId,
    }))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const selectedDayEntries = calendarEntries.filter((entry) => entry.date === cursor && (entry.type !== "AVAILABLE" || services.some((service) => service.id === entry.serviceListingId && service.active))).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const selectedAvailabilityHours = selectedDayEntries.filter((entry) => entry.type === "AVAILABLE").reduce((hours, entry) => hours + (minutes(entry.endTime) - minutes(entry.startTime)) / 60, 0)
  const workerApplications = state.applications.filter((application) => application.workerId === profile?.id)
  const workRequests = workerApplications.filter((application) => application.status === "pending")
  const activeJobs = workerApplications.filter((application) => application.status === "accepted")
  const workReviews = profile?.workHistory.filter((item) => item.rating > 0) || []
  const totalEarned = profile?.workHistory.reduce((sum, item) => sum + (item.payment || 0), 0) || 0

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="relative isolate mb-5 flex min-h-36 items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#4A3025] via-[#704B35] to-[#956B4D] px-5 py-5 shadow-sm sm:px-7">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <span aria-hidden="true" className="pointer-events-none absolute right-20 -bottom-32 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="min-w-0 py-1">
          <p style={{ fontFamily: "var(--font-script)" }} className="text-lg font-semibold leading-tight tracking-normal text-amber-100 sm:text-xl">Your services, your schedule</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Work Schedule</h1>
          <p className="mt-2 max-w-xl text-base font-medium leading-relaxed tracking-[0.01em] text-orange-50 sm:text-lg">Share what work you offer, what you charge, and when employers can book you.</p>
        </div>
        <div className="shrink-0 rounded-full bg-white/10 p-1 ring-1 ring-white/15"><FindingTaskerAnimation /></div>
      </header>

      {notice && <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice("")} className="rounded px-1 font-semibold">×</button></div>}

      <section className="grid items-start gap-4 rounded-2xl border border-[#E4E9E3] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(18rem,0.42fr)_minmax(0,0.58fr)]">
        <div className="h-[27rem] min-w-0 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-[#202923]">{monthTitle}</h2>
            <div className="flex items-center gap-1"><button type="button" onClick={() => setCursor(today)} aria-label="Go to today" className="mr-1 rounded-md px-2 py-1 text-sm font-medium text-[#286B50] hover:bg-[#E2F0E7]">Today</button><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="grid h-8 w-8 place-items-center rounded-md text-xl text-[#286B50] hover:bg-[#E2F0E7]">‹</button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="grid h-8 w-8 place-items-center rounded-md text-xl text-[#286B50] hover:bg-[#E2F0E7]">›</button></div>
          </div>
          <div className="grid grid-cols-7 border-b border-[#E5E8EB] pb-2">{WEEKDAYS.map((day) => <div key={day.value} className="py-1 text-center text-xs font-semibold text-[#71808D]">{day.label.slice(0, 1)}</div>)}</div>
          <div className="grid grid-cols-7">
            {calendarDates.map((date) => {
              const outsideMonth = date.slice(0, 7) !== cursor.slice(0, 7)
              const selected = date === cursor
              const hasAvailability = calendarEntries.some((entry) => entry.date === date && entry.type === "AVAILABLE" && services.some((service) => service.id === entry.serviceListingId && service.active))
              const hasBooking = calendarEntries.some((entry) => entry.date === date && (entry.type === "OCCUPIED" || entry.type === "PENDING"))
              return <button key={date} type="button" onClick={() => setCursor(date)} aria-pressed={selected} aria-label={`${formatNepalDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${hasAvailability ? ", availability published" : ""}${hasBooking ? ", scheduled work" : ""}`} className={`relative mx-auto my-1 grid h-9 w-9 place-items-center rounded-md text-sm transition sm:h-10 sm:w-10 ${selected ? "bg-[#286B50] font-semibold text-white" : outsideMonth ? "text-[#B5BEC6] hover:bg-[#F3F6F7]" : "text-[#26343D] hover:bg-[#E2F0E7]"} ${date === today && !selected ? "ring-1 ring-[#286B50]" : ""}`}>{formatNepalDate(date, { day: "numeric" })}{(hasAvailability || hasBooking) && <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${hasBooking ? "bg-amber-400" : selected ? "bg-white" : "bg-[#12B981]"}`} />}</button>
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E5E8EB] pt-3 text-xs text-[#71808D]"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#12B981]" />Published availability</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-400" />Scheduled work</span></div>
        </div>

        <div className="h-[27rem] min-w-0 overflow-y-auto border-t border-[#E5E8EB] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => openWizard(cursor)} className="rounded-none bg-[#286B50] px-4 py-3 font-ui text-sm font-bold tracking-tight text-white shadow-sm transition hover:bg-[#20563F]">+ Publish Work &amp; Availability</button></div>
          {calendarLoading && <p role="status" className="mt-3 animate-pulse rounded-lg bg-[#F7F8F5] p-3 text-sm text-[#68736B]">Loading this date…</p>}
          {selectedDayEntries.length ? <><div className="mt-5 space-y-5">{(["Morning", "Afternoon", "Evening"] as const).map((period) => {
            const entries = selectedDayEntries.filter((entry) => period === "Morning" ? minutes(entry.startTime) < 12 * 60 : period === "Afternoon" ? minutes(entry.startTime) >= 12 * 60 && minutes(entry.startTime) < 17 * 60 : minutes(entry.startTime) >= 17 * 60)
            if (!entries.length) return null
            return <section key={period}><div className="grid min-w-0 grid-cols-1 gap-3">{entries.map((entry, index) => {
              const available = entry.type === "AVAILABLE"
              const slot = entry.availabilityId ? slots.find((item) => item.id === entry.availabilityId) : undefined
              const service = entry.serviceListingId ? services.find((item) => item.id === entry.serviceListingId) : undefined
              const label = entry.title || (available ? "Available work" : entry.type === "OCCUPIED" ? "Confirmed job" : entry.type === "PENDING" ? "Pending request" : "Unavailable")
              return <article key={`${entry.type}-${entry.startTime}-${entry.availabilityId || index}`} className={`relative min-w-0 rounded-xl border border-[#E8E2D5] border-l-4 bg-white p-4 shadow-sm sm:p-5 ${available ? "border-l-[#356B45]" : entry.type === "PENDING" ? "border-l-amber-400" : "border-l-[#315B87]"}`}><div className="absolute right-0 top-0 z-10 flex"><button type="button" onClick={() => openWizard(cursor, entry)} aria-label={`Edit ${label}`} title="Edit availability" className="grid h-8 w-9 place-items-center border-b border-l border-transparent bg-transparent text-[#405A46] hover:border-[#B8C8B6] hover:bg-[#F0F5EE]">✎</button><button type="button" onClick={() => void removeAvailabilityById(entry.availabilityId || "")} aria-label="Delete availability" title="Delete availability" className="grid h-8 w-9 place-items-center border-b border-l border-transparent bg-transparent text-[#A6423A] hover:border-[#E3C5C2] hover:bg-[#FCF0EF]">⌫</button></div><div className="flex min-w-0 flex-col gap-2 pt-7"><div className="min-w-0"><p className="font-ui text-base font-semibold leading-snug tracking-tight text-[#332A22]">{service?.category || (available ? "Available work" : entry.type)}</p><p className="mt-1 min-w-0 break-words font-ui text-sm font-normal leading-relaxed text-[#424A44]">{service?.title || label}</p>{available && <p className="mt-2 inline-flex w-fit items-center rounded-full bg-[#EDF5EF] px-2.5 py-1 font-ui text-xs font-medium text-[#315E3D]">Available · {Number.isInteger((minutes(entry.endTime) - minutes(entry.startTime)) / 60) ? (minutes(entry.endTime) - minutes(entry.startTime)) / 60 : ((minutes(entry.endTime) - minutes(entry.startTime)) / 60).toFixed(1)} hours</p>}<p className="mt-2 font-ui text-sm font-semibold text-[#49483F]">{period} <span className="mx-1 text-[#A8A08F]">·</span> {timeText(entry.startTime)} – {timeText(entry.endTime)}</p>{service && <p className="mt-3 inline-flex rounded-md border border-[#D8D0C2] bg-white px-3 py-1.5 font-ui text-sm font-medium text-[#315E3D]">{servicePriceText(service).replace(" · negotiable", "")}{service.negotiable ? " · Negotiable" : ""}</p>}<p className="mt-3 font-ui text-sm font-medium text-[#716D61]">Location <span className="ml-1 font-semibold text-[#3F453B]">{service?.serviceArea || profile.location || profile.district || "Kathmandu"}</span></p></div></div>{service?.description && <p className="mt-2 line-clamp-2 max-w-prose border-t border-[#E9E3D8] pt-2 font-ui text-xs font-normal leading-relaxed text-[#49483F]">{service.description}</p>}{slot?.endDate && slot.endDate !== slot.date && <p className="mt-2 font-ui text-xs font-medium text-[#716D61]">Published through {formatNepalDate(slot.endDate, { month: "short", day: "numeric", year: "numeric" })}</p>}</article>
          })}</div></section>
          })}</div></> : !calendarLoading && <div className="mt-7 border border-dashed border-[#D6DEE4] bg-[#FAFBFC] px-5 py-6"><h3 className="font-display text-lg font-bold tracking-tight text-[#26343D]">No work published for this date</h3><p className="mt-1.5 max-w-lg font-ui text-sm leading-relaxed text-[#71808D]">Choose a date and publish a service with your price and working hours. Employers can then find and request your work.</p></div>}
        </div>
      </section>

      <section aria-label="Worker dashboard summary" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { value: `Rs. ${totalEarned.toLocaleString()}`, label: "Total earned", tone: "bg-amber-50 text-amber-700" },
          { value: String(profile?.totalJobs || 0), label: "Completed jobs", tone: "bg-sky-50 text-sky-700" },
          { value: String(workRequests.length), label: "Work requests", tone: "bg-indigo-50 text-indigo-700" },
          { value: `${Number(profile?.rating || 0).toFixed(1)} ★`, label: `Rating · ${workReviews.length} reviews`, tone: "bg-rose-50 text-rose-700" },
        ].map((metric) => <article key={metric.label} className="flex min-h-24 items-center justify-between rounded-none border border-[#E8E9E7] bg-white px-5 py-4 shadow-sm"><div><p className="font-display text-2xl font-bold leading-none tracking-tight text-[#222A26]">{metric.value}</p><p className="mt-2 font-ui text-xs font-semibold uppercase tracking-[0.08em] text-[#707872]">{metric.label}</p></div><span className={`h-3 w-3 shrink-0 ${metric.tone.split(" ")[0]}`} aria-hidden="true" /></article>)}
      </section>

      <div className="mt-5 border-b border-stone-200">
        <nav role="tablist" aria-label="Worker dashboard sections" className="mb-3 flex items-center gap-2 overflow-x-auto">
          {([ ["listings", "My Work Listings"], ["requests", "Work Requests"], ["work", "My Work"], ["reviews", "Reviews"] ] as const).map(([tab, label]) => <button key={tab} type="button" role="tab" aria-selected={dashboardTab === tab} aria-expanded={dashboardTab === tab && dashboardExpanded} aria-controls="worker-dashboard-content" onClick={() => { if (dashboardTab === tab) setDashboardExpanded((expanded) => !expanded); else { setDashboardTab(tab); setDashboardExpanded(true) } }} className={`-mb-px shrink-0 rounded-t-lg border-b-2 px-3 pb-3 pt-2 font-ui text-sm font-semibold transition-colors ${dashboardTab === tab ? "border-[#70472F] bg-[#EAE3D5] text-[#70472F]" : "border-transparent bg-[#FAF8F5] text-stone-600 hover:bg-[#EFECE6] hover:text-[#70472F]"}`}>{label}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`ml-1 inline h-3.5 w-3.5 transition-transform ${dashboardTab === tab && dashboardExpanded ? "rotate-180" : ""}`} aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg></button>)}
        </nav>
      </div>

      {dashboardExpanded && <div id="worker-dashboard-content">{dashboardTab === "listings" && <section className="mt-4 rounded-2xl border border-[#E4E9E3] bg-white p-5 shadow-sm sm:p-6">

        {serviceError && <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-emerald-600 bg-[#F1F7F1] px-4 py-3 text-sm text-[#344A38]"><span className="flex items-center gap-2.5"><i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" /><span className="font-ui font-medium leading-relaxed">{serviceError}</span></span><button type="button" onClick={() => setServiceRefreshKey((key) => key + 1)} className="border border-[#54775A] px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-[0.08em] text-[#36583B] transition hover:bg-emerald-50">Refresh</button></div>}
        {serviceLoading ? <p className="mt-4 animate-pulse rounded-lg bg-[#F7F8F5] p-5 text-sm text-[#68736B]">Loading your listings…</p> : services.length ? <div className="mt-3">{services.map((service) => {
          const entries = upcomingListingEntries(service.id)
          return <article key={service.id} className="flex min-w-0 flex-col border-b border-[#E7E2D9] py-3 last:border-b-0">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 break-words font-ui text-base font-semibold leading-snug tracking-normal text-[#202923]">{service.category}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${!entries.length ? "bg-slate-100 text-slate-600" : service.active ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{!entries.length ? "No upcoming dates" : service.active ? "Active" : "Paused"}</span>
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="min-w-0 break-words font-ui text-sm font-normal leading-relaxed tracking-normal text-[#424A44]">{service.title}</h3>
                <strong className="shrink-0 whitespace-nowrap font-sans text-sm font-medium text-[#286B50]">{servicePriceText(service)}</strong>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 max-w-4xl break-words font-sans text-xs font-normal leading-relaxed text-[#59645C]">{service.description}</p><div className="mt-3 w-full space-y-2">{entries.filter((entry) => entry.availabilityId).map((entry) => { const slot = slots.find((item) => item.id === entry.availabilityId); const dateRange = slot?.date ? `${formatNepalDate(slot.date, { month: "short", day: "numeric", year: "numeric" })}${slot.endDate && slot.endDate !== slot.date ? ` – ${formatNepalDate(slot.endDate, { month: "short", day: "numeric", year: "numeric" })}` : ""}` : formatNepalDate(entry.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" }); return <div key={`actions-${entry.availabilityId}`} className="flex w-full flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-words font-sans text-sm font-medium leading-relaxed text-[#58635B]"><span className="block">{dateRange}</span><span className="block">{timeText(entry.startTime)}–{timeText(entry.endTime)}</span></p><div className="flex shrink-0 items-center gap-1.5"><button type="button" onClick={() => openWizard(entry.date, entry)} aria-label="Edit availability" title="Edit" className="grid h-9 w-9 place-items-center border border-[#D8D0C2] bg-white text-[#704B35] hover:bg-[#F8F5F0]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m15 5 4 4M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"/></svg></button><button type="button" onClick={() => void removeAvailabilityById(entry.availabilityId!)} aria-label="Delete availability" title="Delete" className="grid h-9 w-9 place-items-center border border-[#E3C5C2] bg-white text-rose-700 hover:bg-[#FCF0EF]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div></div>})}</div>
          </article>
        })}</div> : !serviceError && <div className="mt-4 rounded-xl border border-dashed border-[#C9D3C8] bg-[#F7F8F5] p-6 text-center"><p className="text-sm font-semibold text-[#202923]">No active work listings yet</p><p className="mt-1 text-sm text-[#68736B]">Add a skill like Painter, Plumber, or Mason, set your rate in rupees, and choose when employers can book you.</p></div>}
      </section>}

      {dashboardTab === "requests" && <section className="mt-4 space-y-3">{workRequests.length ? workRequests.map((application) => <article key={application.id} className="rounded-xl border border-[#E4E9E3] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#202923]">{application.jobTitle}</h2><p className="mt-1 text-sm text-[#68736B]">Employer: {application.providerName} · {application.workerLocation || "Nepal"}</p><p className="mt-2 text-xs text-[#71808D]">Requested {application.appliedDate ? formatNepalDate(application.appliedDate, { month: "short", day: "numeric", year: "numeric" }) : "recently"}</p></div>{application.offeredAmount != null && <strong className="text-sm text-[#704B35]">Rs. {Number(application.offeredAmount).toLocaleString()}</strong>}</div></article>) : <div className="rounded-xl border border-dashed border-[#D6DEE4] bg-white p-8 text-center"><h2 className="font-semibold text-[#26343D]">No work requests yet</h2><p className="mt-1 text-sm text-[#71808D]">New employer requests will appear here.</p></div>}</section>}

      {dashboardTab === "work" && <section className="mt-4 space-y-3">{activeJobs.length ? activeJobs.map((application) => <article key={application.id} className="rounded-xl border border-[#E4E9E3] bg-white p-4 shadow-sm"><h2 className="font-semibold text-[#202923]">{application.jobTitle}</h2><p className="mt-1 text-sm text-[#68736B]">Employer: {application.providerName} · {application.engagementStatus || "Accepted"}</p><p className="mt-2 text-xs text-[#71808D]">{application.offeredAmount != null ? `Rs. ${Number(application.offeredAmount).toLocaleString()}` : "Pay details are confirmed with the employer."}</p></article>) : <div className="rounded-xl border border-dashed border-[#D6DEE4] bg-white p-8 text-center"><h2 className="font-semibold text-[#26343D]">No active jobs</h2><p className="mt-1 text-sm text-[#71808D]">Jobs you accept will appear here.</p></div>}</section>}

      {dashboardTab === "reviews" && <section className="mt-4 space-y-3">{workReviews.length ? workReviews.map((review, index) => <article key={`${review.jobId}-${index}`} className="rounded-xl border border-[#E4E9E3] bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-[#202923]">{review.jobTitle}</h2><p className="mt-1 text-sm text-[#68736B]">{review.providerName}</p></div><strong className="text-amber-600">{review.rating.toFixed(1)} ★</strong></div>{review.review && <p className="mt-3 text-sm leading-relaxed text-[#5E6861]">{review.review}</p>}</article>) : <div className="rounded-xl border border-dashed border-[#D6DEE4] bg-white p-8 text-center"><h2 className="font-semibold text-[#26343D]">No reviews yet</h2><p className="mt-1 text-sm text-[#71808D]">Reviews from completed work will appear here.</p></div>}</section>}</div>}

      {wizardOpen && <AvailabilityWizard
        draft={draft}
        step={step}
        error={formError}
        saving={saving}
        editing={Boolean(editingAvailabilityId)}
        onClose={() => { if (!saving) { setWizardOpen(false); setFormError("") } }}
        onChange={updateDraft}
        onStepBack={backStep}
        onStepContinue={continueStep}
        onPublish={() => void publishAvailability()}
        onRemove={() => void removeAvailability()}
        onAddTime={() => { if (draft.timeBlocks.length < 2) updateDraft("timeBlocks", [...draft.timeBlocks, { startTime: "13:00", endTime: "17:00" }]) }}
        onChangeTime={(index, key, value) => updateDraft("timeBlocks", draft.timeBlocks.map((block, current) => current === index ? { ...block, [key]: value } : block))}
        onRemoveTime={(index) => updateDraft("timeBlocks", draft.timeBlocks.filter((_, current) => current !== index))}
      />}
    </main>
  )
}

function AvailabilityWizard({
  draft, step, error, saving, editing, onClose, onChange, onStepBack, onStepContinue,
  onPublish, onRemove, onAddTime, onChangeTime, onRemoveTime,
}: {
  draft: AvailabilityDraft
  step: number
  error: string
  saving: boolean
  editing: boolean
  onClose: () => void
  onChange: <K extends keyof AvailabilityDraft>(key: K, value: AvailabilityDraft[K]) => void
  onStepBack: () => void
  onStepContinue: () => void
  onPublish: () => void
  onRemove: () => void
  onAddTime: () => void
  onChangeTime: (index: number, key: keyof TimeBlock, value: string) => void
  onRemoveTime: (index: number) => void
}) {
  const labels = ["Your work", "Your schedule", "Your price", "Review"]
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#202923]/45 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="availability-wizard-title" className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
      <div className="sticky top-0 z-10 border-b border-[#E4E9E3] bg-white px-5 py-4 sm:px-7"><div className="flex items-start justify-between gap-4"><div><h2 id="availability-wizard-title" className="text-xl font-bold text-[#202923]">{step === 1 ? "What work can you do?" : step === 2 ? "When are you available?" : step === 3 ? "How much do you charge?" : "Review and publish"}</h2></div><button type="button" aria-label="Close availability form" disabled={saving} onClick={onClose} className="rounded-md px-2 py-1 text-xl text-[#68736B] hover:bg-[#F2F5F1] disabled:opacity-40">×</button></div>
        <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Availability steps">{labels.map((label, index) => { const active = index + 1 === step; const complete = index + 1 < step; return <li key={label} className="min-w-0"><span className={`block truncate font-display text-sm font-bold sm:text-base ${active ? "text-[#286B50]" : "text-[#68736B]"}`}>{label}</span><div className={`mt-2 h-1.5 rounded-full ${active || complete ? "bg-[#286B50]" : "bg-[#E4E9E3]"}`} /></li> })}</ol>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        {step === 1 && <div className="availability-step-one space-y-4"><div><label htmlFor="availability-category" className="text-sm font-semibold text-[#202923]">Work category</label><input id="availability-category" type="text" value={draft.category} maxLength={100} onChange={(event) => onChange("category", event.target.value)} placeholder="Type a work category, such as plumbing or cleaning" className="input-style mt-1.5 w-full" /></div><div><label htmlFor="availability-title" className="text-sm font-semibold text-[#202923]">Describe your service</label><input id="availability-title" value={draft.title} maxLength={140} onChange={(event) => onChange("title", event.target.value)} placeholder="For example, Plumbing repair" className="input-style mt-1.5 w-full" /></div><div><label htmlFor="availability-description" className="text-sm font-semibold text-[#202923]">Short Description</label><textarea id="availability-description" rows={3} maxLength={1200} value={draft.description} onChange={(event) => onChange("description", event.target.value)} placeholder="Describe your service, the tasks you can do, and what employers can expect." className="input-style mt-1.5 w-full" /></div></div>}

        {step === 2 && <div className="availability-step-two space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label htmlFor="availability-date" className="availability-date-label text-sm font-medium text-[#202923]">Available from<input id="availability-date" type="date" min={nepalDateString()} value={draft.date} onChange={(event) => { const nextDate = event.target.value; onChange("date", nextDate); if (draft.endDate < nextDate) onChange("endDate", nextDate) }} className="input-style mt-1.5 w-full" /></label><label htmlFor="availability-end-date" className="availability-date-label text-sm font-medium text-[#202923]">Available through<input id="availability-end-date" type="date" min={draft.date || nepalDateString()} value={draft.endDate} onChange={(event) => onChange("endDate", event.target.value)} className="input-style mt-1.5 w-full" /></label></div><div className="space-y-3">{draft.timeBlocks.map((block, index) => <div key={index} className="availability-time-slot rounded-none border border-[#E4E9E3] bg-[#FAFBF9] p-3.5"><div className="mb-2 flex items-center justify-between"><span className="font-display text-base font-bold tracking-tight text-[#26352D]">Time slot {index + 1}</span>{draft.timeBlocks.length > 1 && <button type="button" onClick={() => onRemoveTime(index)} className="availability-slot-remove border border-red-200 px-3 py-1.5 font-display text-sm font-bold text-red-700 transition hover:bg-red-50">Remove</button>}</div><div className="grid grid-cols-2 gap-3"><label className="font-display text-base font-bold text-[#26352D]">Start time<input type="time" value={block.startTime} onChange={(event) => onChangeTime(index, "startTime", event.target.value)} className="input-style mt-1.5 w-full" /></label><label className="font-display text-base font-bold text-[#26352D]">End time<input type="time" value={block.endTime} onChange={(event) => onChangeTime(index, "endTime", event.target.value)} className="input-style mt-1.5 w-full" /></label></div></div>)}</div>{draft.timeBlocks.length < 2 && <button type="button" onClick={onAddTime} className="rounded-none border-2 border-[#286B50] px-5 py-3 font-display text-base font-bold tracking-wide text-[#286B50] transition hover:bg-[#E2F0E7]">+ Add time slot</button>}</div>}

        {step === 3 && <div className="availability-step-three space-y-4"><div><label htmlFor="availability-payment-type" className="text-sm font-semibold text-[#202923]">Payment type</label><select id="availability-payment-type" value={draft.paymentType} onChange={(event) => onChange("paymentType", event.target.value as PaymentChoice)} className="input-style mt-1.5 w-full"><option value="PER_HOUR">Hourly</option><option value="PER_DAY">Daily</option><option value="FIXED">Fixed price</option></select></div><div><label htmlFor="availability-amount" className="text-sm font-semibold text-[#202923]">Expected amount</label><div className="availability-amount-control mt-1.5 flex rounded-none border border-[#D5DDD4] focus-within:ring-2 focus-within:ring-[#286B50]"><span className="inline-flex items-center rounded-none border-r border-[#E4E9E3] bg-[#F7F8F5] px-3 text-base font-bold text-[#405047]">NPR (Rs.)</span><input id="availability-amount" type="number" inputMode="numeric" min="1" step="1" value={draft.amount} onChange={(event) => onChange("amount", event.target.value)} placeholder="600" className="min-w-0 flex-1 rounded-none border-0 px-3 py-2.5 text-base font-medium outline-none" /></div></div><label className="availability-price-note flex items-start gap-3 rounded-none border border-[#E4E9E3] p-4"><input type="checkbox" checked={draft.negotiable} onChange={(event) => onChange("negotiable", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#286B50]" /><span><span className="availability-price-title block text-base font-bold text-[#26352D]">Price is negotiable</span><span className="availability-price-help mt-1 block text-sm text-[#52625A]">Employers can discuss the final amount with you.</span></span></label></div>}

        {step === 4 && <div className="availability-step-four space-y-4">
          <div className="border-l-4 border-[#286B50] pl-4 py-1">
            <h3 style={{ fontFamily: "var(--font-script)" }} className="text-4xl font-bold leading-tight tracking-wide text-[#174A36] sm:text-5xl">{draft.category}</h3>
          </div>
          <div className="availability-review-card space-y-4 border border-[#D5DDD4] bg-[#FAFBF9] p-5">
            <div className="border-b border-[#E4E9E3] pb-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#718078]">Service</p>
              <h4 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#202923]">{draft.title}</h4>
            </div>
            <p className="whitespace-pre-line text-sm font-normal leading-relaxed text-[#68736B]">{draft.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-[#E4E9E3] bg-white p-3.5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#68736B]">Work dates</p>
                <p className="mt-1.5 text-base font-semibold text-[#26352D]">{draft.date ? formatNepalDate(draft.date, { month: "short", day: "numeric", year: "numeric" }) : "Choose a start date"} – {draft.endDate ? formatNepalDate(draft.endDate, { month: "short", day: "numeric", year: "numeric" }) : "Choose an end date"}</p>
              </div>
              <div className="border border-[#E4E9E3] bg-white p-3.5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#68736B]">Payment</p>
                <p className="mt-1.5 text-base font-semibold text-[#26352D]">NPR {Number(draft.amount || 0).toLocaleString()} {draft.paymentType === "PER_HOUR" ? "/ hour" : draft.paymentType === "PER_DAY" ? "/ day" : " fixed"}{draft.negotiable ? " · negotiable" : ""}</p>
              </div>
            </div>
            <div className="border-t border-[#E4E9E3] pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#68736B]">Available times</p>
              <ul className="mt-2 flex flex-wrap gap-2">{draft.timeBlocks.map((block, index) => <li key={index} className="border border-[#BBD6C3] bg-[#EAF4ED] px-3 py-2 text-sm font-semibold text-[#20563F]">{timeText(block.startTime)} – {timeText(block.endTime)}</li>)}</ul>
            </div>
          </div>
        </div>}

        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</p>}
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E9E3] bg-white px-5 py-4 sm:px-7">{step > 1 ? <button type="button" disabled={saving} onClick={onStepBack} className="rounded-lg border border-[#D5DDD4] px-4 py-2.5 text-sm font-semibold text-[#405047] hover:bg-[#F7F8F5] disabled:opacity-50">Back</button> : <span />}{step < 4 ? <button type="button" onClick={onStepContinue} className="min-w-28 rounded-none bg-[#286B50] px-6 py-2.5 font-display text-base font-bold tracking-wide text-white hover:bg-[#20563F]">Next</button> : <div className="flex flex-wrap items-center gap-2">{editing && <button type="button" disabled={saving} onClick={onRemove} className="mr-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Remove this time</button>}<button type="button" disabled={saving} onClick={onPublish} className="rounded-lg bg-[#286B50] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#20563F] disabled:cursor-wait disabled:opacity-60">{saving ? "Publishing…" : "Publish Availability"}</button></div>}</footer>
    </section>
  </div>
}
