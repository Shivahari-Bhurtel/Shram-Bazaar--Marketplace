import { useApp } from "../store/AppContext"
import type { Job } from "../types"
import { formatNepalDate } from "../utils/dates"
import { formatJobBudget } from "../utils/jobBudget"

const categoryConfig = {
  qualified: { label: "Qualified / Professional" },
  "skill-based": { label: "Skill Based" },
  "beginner-friendly": { label: "Beginner Friendly" },
}

const workTypeLabel: Record<string, string> = {
  "full-day": "Full Day",
  "half-day": "Half Day",
  hourly: "Hourly",
  "multi-day": "Multi-Day",
}

interface Props {
  job: Job
  compact?: boolean
}

export default function JobCard({ job, compact = false }: Props) {
  const {
    navigate,
    hasApplied,
    isSaved,
    saveJob,
    unsaveJob,
    browseSkill,
    state,
  } = useApp()
  const isWorker = state.currentUser?.role === "worker"
  const applied = hasApplied(job.id)
  const saved = isSaved(job.id)
  const cat = categoryConfig[job.category as keyof typeof categoryConfig] || { label: job.category }
  const isExternal = job.externalSource === "himalayas" || job.externalSource === "jsearch"
  const location = isExternal && job.location !== "Worldwide remote"
    ? `Remote · ${job.location.replace(/^Remote\s*[·-]\s*/i, "").split(",").map((country) => country.trim()).filter(Boolean).slice(0, 2).join(", ")}`
    : job.location.split(",").slice(-2).join(",").trim()

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    saved ? unsaveJob(job.id) : saveJob(job.id)
  }

  return (
    <div
      onClick={() => {
        if (isExternal && !state.currentUser) {
          if (job.externalUrl)
            window.open(job.externalUrl, "_blank", "noopener,noreferrer")
          return
        }
        navigate("job-detail", job.id)
      }}
      className={`bg-white border border-stone-300 rounded-none p-5 shadow-sm cursor-pointer hover:border-stone-500 hover:shadow-md transition-all group animate-fade-in ${compact ? "flex h-full flex-col" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`${isExternal ? "font-heading text-lg font-medium tracking-tight" : "font-heading text-xl font-bold tracking-tight"} leading-snug text-stone-950 group-hover:text-primary-ink transition-colors line-clamp-2`}>
              {isExternal ? job.title.replace(/^#\s*/, "") : job.title}
            </h3>
            {isWorker && (
              <button
                onClick={handleSave}
                className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-50 hover:text-primary-ink transition-colors"
                title={saved ? "Unsave" : "Save job"}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-5 h-5 text-primary-ink"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category + status */}
      <div className={`${compact ? "mt-1 gap-x-1" : "mt-3 min-h-[2.5rem] gap-x-2.5"} flex flex-wrap items-center gap-y-1 text-sm ${isExternal ? "font-medium" : compact ? "font-normal" : "font-semibold"} text-stone-900`}>
        <span>
          {isExternal ? job.externalCategory || "Remote role" : cat.label}
        </span>
        {!compact && <span aria-hidden="true" className="text-[#553421]">·</span>}
        <span>{job.employmentType || workTypeLabel[job.workType]}</span>
        {isExternal && (
          <>
            <span aria-hidden="true" className="text-[#553421]">
              ·
            </span>
            <span>External Opportunity</span>
          </>
        )}
        {job.status === "filled" && (
          <>
            <span aria-hidden="true" className="text-[#553421]">
              ·
            </span>
            <span>Filled</span>
          </>
        )}
      </div>

      {/* Meta info */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-stone-500 flex-shrink-0"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className={`text-sm ${compact ? "font-normal" : "font-medium"} text-stone-800 truncate`}>
            {location}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-stone-500 flex-shrink-0"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={`text-sm ${compact ? "font-normal" : "font-medium"} text-stone-800`}>
            {job.date
              ? formatNepalDate(job.date, {
                  month: "short",
                  day: "numeric",
                })
              : "Date not listed"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-stone-500 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className={`text-sm ${compact ? "font-normal" : "font-medium"} text-stone-800`}>
            {job.duration ||
              (job.seniority
                ? `Seniority: ${job.seniority}`
                : "Details on source")}
          </span>
        </div>
        {(!isExternal || job.salaryText) && <div className="col-span-2 flex items-center">
          <span className={`text-base ${isExternal ? "font-medium" : compact ? "font-normal" : "font-bold"} tracking-tight text-stone-950 tabular-nums`}>
            {isExternal ? (
              job.salaryText
            ) : (
              <>
                {compact
                  ? formatJobBudget(job).replace(" / per day", " / day").replace(" / per hour", " / hour")
                  : formatJobBudget(job)}
              </>
            )}
          </span>
        </div>}
      </div>

      {/* Skills */}
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(isExternal
            ? (job.externalCategories ?? []).slice(0, 3)
            : job.skillsRequired.slice(0, 3)
          ).map((skill) =>
            isExternal ? (
              <span
                key={skill}
                className="min-h-8 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-[13px] text-stone-800"
              >
                {skill}
              </span>
            ) : (
              <button
                key={skill}
                onClick={(event) => {
                  event.stopPropagation()
                  browseSkill(skill)
                }}
                className="min-h-8 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-[13px] text-stone-800 hover:border-primary hover:text-primary-ink"
              >
                {skill}
              </button>
            ),
          )}
          {(isExternal
            ? (job.externalCategories?.length ?? 0)
            : job.skillsRequired.length) > 3 && (
            <span className="text-[13px] px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full">
              +
              {(isExternal
                ? (job.externalCategories?.length ?? 0)
                : job.skillsRequired.length) - 3}{" "}
              more
            </span>
          )}
        </div>
      )}

      {isExternal && !compact && job.description && job.description !== "Description not listed." && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <p className="line-clamp-2 text-sm leading-5 text-stone-700">
            {job.description}
          </p>
          <p className="mt-2 text-[11px] font-mono-data uppercase tracking-wider text-stone-500">
            <a
              href={job.externalSource === "jsearch" ? "https://www.openwebninja.com/api/real-time-jobs-data" : "https://himalayas.app"}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="underline underline-offset-2 hover:text-primary-ink"
            >
              Source: {job.externalSource === "jsearch" ? "OpenWebNinja" : "Himalayas"}
            </a>
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={`${compact ? "mt-auto" : "mt-4"} pt-3 border-t border-stone-200 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {isExternal ? (
            <span className="text-[13px] text-stone-600 font-mono-data">
              {job.publishedDate
                ? `Updated ${formatNepalDate(job.publishedDate, { month: "short", day: "numeric" })}`
                : "Update date not listed"}
            </span>
          ) : (
            <>
              <span className="text-[13px] text-stone-600 font-mono-data">
                {job.applicantCount} applicant
                {job.applicantCount !== 1 ? "s" : ""}
              </span>
              <span className="text-[13px] text-stone-600 font-mono-data">
                {job.workersNeeded - job.workersHired} spot
                {job.workersNeeded - job.workersHired !== 1 ? "s" : ""} left
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {applied ? (
            <span className="text-xs font-semibold text-stone-900 px-2.5 py-1 bg-primary-50 rounded-full border border-primary-100">
              Applied
            </span>
          ) : (
            <span className="text-xs font-semibold text-primary-ink group-hover:underline">
              {isExternal ? "View Original →" : "View Details →"}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
