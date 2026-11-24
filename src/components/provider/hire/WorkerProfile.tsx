import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { HireWorker } from "../../../types/hireWorker"
import type { WorkerServiceListing } from "../../../types"
import { formatHirePrice, workerLocation } from "./WorkerCard"
import RatingStars from "./RatingStars"

export default function WorkerProfile({ worker, onClose, service, onHire, onMessage }: { worker: HireWorker; onClose: () => void; service?: WorkerServiceListing | null; onHire?: () => void; onMessage?: () => void }) {
  const [imageSource, setImageSource] = useState(worker.profileImage || worker.avatarUrl || "")
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  const status = worker.availability?.status
  const statusLabel = worker.availability?.statusLabel || (status === "available" ? "Available" : status === "busy" ? "Busy" : status === "available-soon" || status === "available_soon" ? "Available soon" : "Availability unknown")
  const skills = worker.skills ?? []
  const servicePrice = service?.pricingType === "NEGOTIABLE" ? "Quote on request" : service ? `Rs. ${Number(service.price || 0).toLocaleString()}${service.pricingType === "PER_HOUR" ? "/hour" : service.pricingType === "PER_DAY" ? "/day" : service.pricingType === "FIXED" ? " fixed" : " starting"}${service.negotiable ? " · negotiable" : ""}` : ""

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17221B]/45 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="hire-profile-title" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-[#E2E8E3] bg-white font-sans shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5EAE6] bg-white px-5 py-4 sm:px-7">
          <p className="font-heading text-base font-semibold text-[#4E5D53]">Worker profile</p>
          <button type="button" onClick={onClose} aria-label="Close worker profile" className="flex h-10 w-10 items-center justify-center rounded-sm text-2xl leading-none text-[#526057] hover:bg-[#F3F6F3]">×</button>
        </div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center self-center overflow-hidden rounded-full border border-[#E5EAE6] bg-[#F3F6F3] sm:self-auto">
              {imageSource && !imageFailed ? <img src={imageSource} alt={`${worker.name} profile`} className="h-full w-full object-cover" onError={() => { if (worker.avatarUrl && imageSource !== worker.avatarUrl) setImageSource(worker.avatarUrl); else setImageFailed(true) }} /> : <span className="text-4xl font-semibold text-[#164E38]">{worker.name.trim().charAt(0).toUpperCase() || "W"}</span>}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h1 id="hire-profile-title" className="font-heading text-2xl font-semibold tracking-tight text-[#1A2420]">{worker.name}</h1>
              <p className="mt-1 font-heading text-base font-medium text-[#4E5D53]">{worker.profession || worker.category || "Profession not listed"}</p>
              {worker.isDemo && <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Showcase sample profile</span>}
              <p className="mt-2 text-sm text-[#717C74]">{workerLocation(worker)}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#46534A]"><span className={`h-2 w-2 rounded-full ${status === "available" ? "bg-[#236B4B]" : status === "busy" ? "bg-stone-500" : status === "available-soon" || status === "available_soon" ? "bg-amber-600" : "bg-stone-400"}`} />{statusLabel}</span>
              <div className="mt-2"><RatingStars rating={worker.rating} count={worker.ratingCount} /></div>
            </div>
          </div>

          <div className="mt-7 grid divide-y divide-[#E5EAE6] border-y border-[#E5EAE6] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <section className="py-4 sm:pr-6"><h2 className="font-heading text-xs font-semibold uppercase tracking-wide text-[#717C74]">Expected payment</h2><p className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-[#164E38]">{formatHirePrice(worker)}</p><p className="mt-1 text-sm text-[#626D65]">{worker.pricing?.type ? `Payment type: ${worker.pricing.type}` : "Payment type not listed"}</p></section>
            <section className="py-4 sm:pl-6"><h2 className="font-heading text-xs font-semibold uppercase tracking-wide text-[#717C74]">Experience</h2><p className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-[#1A2420]">{typeof worker.experience?.years === "number" ? `${worker.experience.years} ${worker.experience.years === 1 ? "year" : "years"}` : worker.experience?.level || "Not listed"}</p><p className="mt-1 text-sm text-[#626D65]">{worker.experience?.level || "Experience level not listed"}</p></section>
          </div>

          <section className="mt-6 border-b border-[#E5EAE6] pb-5"><h2 className="font-heading text-lg font-medium tracking-tight text-[#1A2420]">Professional introduction</h2><p className="mt-2 whitespace-pre-line text-base leading-7 tracking-[0.005em] text-[#48443F]">{worker.description?.trim() || "No introduction provided."}</p></section>
          {service && <section className="mt-5 border-b border-[#E5EAE6] pb-5"><h2 className="font-heading text-lg font-medium tracking-tight text-[#1A2420]">Published service</h2><p className="mt-3 font-heading text-xs font-medium uppercase tracking-wide text-[#717C74]">{service.category}</p><h3 className="mt-1 font-heading text-base font-medium leading-relaxed text-[#1A2420]">{service.title}</h3><p className="mt-2 whitespace-pre-line text-base font-normal leading-7 tracking-[0.005em] text-[#48443F]">{service.description || "No service description provided."}</p><p className="mt-3 text-sm font-medium text-[#164E38]">{servicePrice}{service?.serviceArea ? ` · ${service.serviceArea}` : ""}</p></section>}
          <section className="mt-5 border-b border-[#E5EAE6] pb-5"><h2 className="font-heading text-lg font-medium tracking-tight text-[#1A2420]">Skills</h2><div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-base leading-7 text-[#48443F]">{skills.length ? skills.map((skill, index) => <span key={skill} className="inline-flex items-center gap-2">{skill}{index < skills.length - 1 && <span className="text-[#A2ACA4]" aria-hidden="true">·</span>}</span>) : <span className="text-sm text-[#717C74]">No skills listed.</span>}</div></section>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <section><h2 className="font-heading text-base font-medium text-[#1A2420]">Availability schedule</h2><p className="mt-2 text-base leading-7 text-[#48443F]">{worker.availability?.days?.length ? worker.availability.days.join(", ") : "Days not listed"}{worker.availability?.hours ? ` · ${worker.availability.hours}` : ""}</p><p className="mt-1 text-sm text-[#626D65]">{worker.availability?.preference || "Work preference not listed"}</p></section>
            <section><h2 className="font-heading text-base font-medium text-[#1A2420]">Work types accepted</h2><p className="mt-2 text-base leading-7 text-[#48443F]">{worker.workTypes?.length ? worker.workTypes.join(", ") : "Work types not listed"}</p></section>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[#E5EAE6] pt-5 sm:flex-row sm:justify-end">
            {onMessage && <button type="button" onClick={onMessage} className="min-h-11 rounded-sm border border-[#164E38] px-5 text-sm font-semibold text-[#164E38] hover:bg-[#F3F6F3]">Message Worker</button>}
            {onHire && <button type="button" onClick={onHire} className="min-h-11 rounded-sm bg-[#164E38] px-5 text-sm font-semibold text-white hover:bg-[#236B4B]">Hire Worker</button>}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  )
}
