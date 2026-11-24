import { useState } from "react"
import type { HireWorker } from "../../../types/hireWorker"
import RatingStars from "./RatingStars"

function availabilityLabel(status?: string | null) {
  if (status === "available") return "Available"
  if (status === "busy") return "Busy"
  if (status === "available-soon" || status === "available_soon") return "Soon"
  return "Unknown"
}

function availabilityColor(status?: string | null) {
  if (status === "available") return "bg-transparent text-[#164E38]"
  if (status === "busy") return "bg-transparent text-stone-700"
  if (status === "available-soon" || status === "available_soon") return "bg-transparent text-amber-800"
  return "bg-transparent text-[#626A64]"
}

export function formatHirePrice(worker: HireWorker) {
  const pricing = worker.pricing
  if (!pricing) return "Payment not listed"
  if (pricing.display?.trim()) return pricing.display
  if (typeof pricing.amount !== "number" || !Number.isFinite(pricing.amount)) return "Payment not listed"
  const amount = new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(pricing.amount)
  const currency = pricing.currency || "NPR"
  const unit: Record<string, string> = { hourly: "/hour", daily: "/day", weekly: "/week", monthly: "/month", project: "/project", fixed: "" }
  const suffix = pricing.type ? unit[pricing.type] ?? `/${pricing.type}` : ""
  return `${currency} ${amount}${suffix}`
}

export function workerLocation(worker: HireWorker) {
  return [worker.location?.city || worker.location?.district, worker.location?.city && worker.location?.district !== worker.location?.city ? worker.location?.district : null, worker.location?.country]
    .filter((part, index, values): part is string => Boolean(part?.trim()) && values.indexOf(part) === index)
    .join(", ") || "Location not provided"
}

export default function WorkerCard({ worker, layout = "grid", onViewProfile }: {
  worker: HireWorker
  layout?: "grid" | "list"
  onViewProfile: (worker: HireWorker) => void
}) {
  const [imageSource, setImageSource] = useState(worker.profileImage || worker.avatarUrl || "")
  const [imageFailed, setImageFailed] = useState(false)
  const skills = worker.skills ?? []
  const shownSkills = skills.slice(0, 3)
  const isList = layout === "list"

  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E8E3] bg-white shadow-[0_1px_3px_rgba(20,45,31,0.04)] transition hover:border-[#B8CDBD] hover:shadow-[0_8px_24px_rgba(20,45,31,0.08)] ${isList ? "sm:flex-row sm:items-center sm:gap-6 sm:p-5" : "p-5"}`}>
      <div className={`flex shrink-0 flex-col items-center ${isList ? "sm:w-36" : ""}`}>
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#E5EAE6] bg-[#F3F6F3] shadow-sm">
          {imageSource && !imageFailed
            ? <img src={imageSource} alt={`${worker.name} profile`} className="h-full w-full object-cover" onError={() => {
                if (worker.avatarUrl && imageSource !== worker.avatarUrl) setImageSource(worker.avatarUrl)
                else setImageFailed(true)
              }} />
            : <span className="text-3xl font-semibold text-[#164E38]" aria-label={`${worker.name} avatar fallback`}>{worker.name.trim().charAt(0).toUpperCase() || "W"}</span>}
        </div>
        <span className={`mt-3 inline-flex min-h-7 items-center gap-2 rounded-full px-2.5 text-sm font-semibold ${availabilityColor(worker.availability?.status)}`}>
          <span className={`h-2 w-2 rounded-full ${worker.availability?.status === "available" ? "bg-[#236B4B]" : worker.availability?.status === "busy" ? "bg-stone-500" : worker.availability?.status === "available-soon" || worker.availability?.status === "available_soon" ? "bg-amber-600" : "bg-stone-400"}`} />
          {availabilityLabel(worker.availability?.status)}
        </span>
        <div className="mt-1.5"><RatingStars rating={worker.rating} count={worker.ratingCount} compact /></div>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${isList ? "mt-4 sm:mt-0" : "mt-4 text-center"}`}>
        <h2 className="truncate text-xl font-bold leading-7 tracking-[-0.02em] text-[#1A2420]" title={worker.name}>{worker.name}</h2>
        <p className="mt-1.5 truncate text-[17px] font-bold leading-6 text-black" title={worker.profession || worker.category || "Profession not listed"}>{worker.profession || worker.category || "Profession not listed"}</p>
        <p className={`mt-2 flex items-center gap-1.5 text-[15px] font-semibold text-black ${isList ? "" : "justify-center"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px] shrink-0" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span className="truncate" title={workerLocation(worker)}>{worker.location?.city || worker.location?.district || worker.location?.country || "Location not provided"}</span>
        </p>
        <div className={`mt-3 flex min-h-12 flex-wrap content-start gap-x-2 gap-y-1 text-[11px] leading-4 ${isList ? "" : "justify-center"}`}>
          {shownSkills.map((skill, index) => <span key={skill} className="inline-flex max-w-full items-center gap-2 font-medium text-black" title={skill}><span className="truncate">{skill}</span>{index < shownSkills.length - 1 && <span className="text-[#A2ACA4]" aria-hidden="true">·</span>}</span>)}
          {skills.length > shownSkills.length && <span className="inline-flex items-center gap-2 font-semibold text-black"><span className="font-normal text-[#A2ACA4]" aria-hidden="true">·</span>+{skills.length - shownSkills.length} more</span>}
          {skills.length === 0 && <span className="text-xs text-[#8A938C]">No skills listed</span>}
        </div>
        <div className={`mt-4 flex gap-3 border-t border-[#E7ECE8] pt-4 ${isList ? "items-end justify-between" : "flex-col items-stretch text-left"}`}>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold leading-6 tabular-nums text-[#164E38]" title={formatHirePrice(worker)}>{formatHirePrice(worker)}</p>
            <p className="mt-1.5 text-sm font-medium text-[#657168]">{typeof worker.experience?.years === "number" ? `${worker.experience.years} ${worker.experience.years === 1 ? "year" : "years"} experience` : worker.experience?.level || "Experience not listed"}</p>
          </div>
          <button type="button" onClick={() => onViewProfile(worker)} className={`min-h-10 shrink-0 rounded-xl border border-[#164E38] px-4 text-sm font-bold text-[#164E38] transition hover:bg-[#EAF3ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236B4B] ${isList ? "" : "w-full"}`}>View Profile</button>
        </div>
      </div>
    </article>
  )
}
