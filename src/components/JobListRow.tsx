import { useState } from "react"
import { useApp } from "../store/AppContext"
import type { Job } from "../types"

const categoryLabels: Record<Job["category"], string> = {
  qualified: "Professional",
  "skill-based": "Skill based",
  "beginner-friendly": "Entry level",
}

function locationLabel(job: Job) {
  if (!job.externalSource || job.location === "Worldwide remote")
    return job.location

  const countries = job.location
    .replace(/^Remote\s*[·-]\s*/i, "")
    .split(",")
    .map((country) => country.trim())
    .filter(Boolean)
  if (countries.some((country) => country.toLowerCase() === "nepal"))
    return "Remote · Nepal"
  if (countries.length > 2)
    return `Remote · ${countries.slice(0, 2).join(", ")} +${countries.length - 2}`
  return `Remote · ${countries.join(", ")}`
}

export default function JobListRow({ job }: { job: Job }) {
  const { state, navigate, hasApplied, isSaved, saveJob, unsaveJob } = useApp()
  const [logoFailed, setLogoFailed] = useState(false)
  const isExternal = job.externalSource === "himalayas"
  const isWorker = state.currentUser?.role === "worker"
  const saved = isSaved(job.id)
  const applied = hasApplied(job.id)
  const description = job.externalExcerpt || job.description
  const tags = isExternal
    ? (job.externalCategories ?? []).slice(0, 3)
    : job.skillsRequired.slice(0, 3)
  const details = [
    isExternal ? job.employmentType : categoryLabels[job.category],
    isExternal ? job.seniority : job.workType.replaceAll("-", " "),
    !isExternal && job.duration ? job.duration : "",
  ].filter(Boolean)

  const openJob = () => {
    if (isExternal && !state.currentUser && job.externalUrl) {
      window.open(job.externalUrl, "_blank", "noopener,noreferrer")
      return
    }
    navigate("job-detail", job.id)
  }

  return (
    <article className="group border-b border-[#EBE7E2] px-4 py-5 transition-colors last:border-b-0 hover:bg-[#FCFAF8] sm:px-6 sm:py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EBE7E2] bg-[#F8F3EE] text-base font-semibold text-[#70472F]">
          {job.providerLogo && !logoFailed ? (
            <img
              src={job.providerLogo}
              alt=""
              loading="lazy"
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            job.providerName.trim().slice(0, 1).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={openJob}
                className="font-heading text-left text-lg font-semibold leading-snug text-[#1C1C1C] underline decoration-black underline-offset-4 transition-colors hover:text-[#70472F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#986744] sm:text-xl"
              >
                {job.title}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#646B73]">
                <span className="font-medium text-[#343A40]">
                  {job.providerName}
                </span>
                {job.providerVerified && (
                  <span className="rounded-full bg-[#F0E5DB] px-2 py-0.5 text-xs font-semibold text-[#70472F]">
                    Verified
                  </span>
                )}
                {isExternal && (
                  <span className="rounded-full bg-[#F1F3F5] px-2 py-0.5 text-xs font-medium text-[#646B73]">
                    Himalayas
                  </span>
                )}
              </div>
            </div>

            {isWorker && (
              <button
                type="button"
                onClick={() => (saved ? unsaveJob(job.id) : saveJob(job.id))}
                aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
                aria-pressed={saved}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744] ${
                  saved
                    ? "bg-[#E7D7C8] text-[#70472F]"
                    : "bg-[#F8F3EE] text-[#70472F] hover:bg-[#F0E5DB]"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
          </div>

          {details.length > 0 && (
            <p className="mt-2 font-ui text-sm font-medium text-[#646B73]">
              {details.join(" · ")}
            </p>
          )}

          {description && (
            <p className="mt-2 line-clamp-2 max-w-5xl font-ui text-sm leading-relaxed text-[#646B73]">
              {description}
            </p>
          )}

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-[#EBE7E2] bg-[#F8F9FA] px-2.5 py-1 font-ui text-xs font-medium text-[#555D65]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-ui text-sm text-[#555D65]">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-4 w-4 shrink-0 text-[#70472F]"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {locationLabel(job)}
              </span>
              <span className="font-semibold text-[#343A40]">
                {isExternal
                  ? job.salaryText || "Salary not listed"
                  : `NPR ${job.payment.toLocaleString()} / ${job.paymentType.replace("per-", "")}`}
              </span>
              {!isExternal && job.date && (
                <span>
                  {new Date(`${job.date}T12:00:00`).toLocaleDateString(
                    "en-NP",
                    {
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {applied && (
                <span className="rounded-full border border-[#E4D3C3] bg-[#F8F3EE] px-2.5 py-1 text-xs font-semibold text-[#70472F]">
                  Applied
                </span>
              )}
              <button
                type="button"
                onClick={openJob}
                className="inline-flex min-h-10 items-center rounded-lg border border-[#E4D3C3] bg-[#F0E5DB] px-4 text-sm font-semibold text-[#70472F] transition-colors hover:bg-[#E7D7C8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#986744]"
              >
                View job
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
