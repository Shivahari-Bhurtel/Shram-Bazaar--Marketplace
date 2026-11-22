import { useState } from "react"
import { useApp } from "../../store/AppContext"
import { isValidEmail, isValidPhoneNumber } from "../../utils/validation"
import type { ApiApplication } from "../../services/backendApi"
import { CategoryBadge, VerifiedBadge } from "../../components/StatusBadge"
import { formatNepalDate } from "../../utils/dates"
import { formatJobBudget } from "../../utils/jobBudget"

function splitExternalDescription(value: string) {
  const sourceMatch = value.match(/Originally posted on ([^.]+)\.?/i)
  const content = value
    .replace(/Originally posted on [^.]+\.?/i, "")
    .replace(/’/g, "'")
    .replace(/(?:^|\n)\s*#{1,6}\s*(?=What you'll do|Requirements)/gi, "\n")
    .trim()
  const whatIndex = content.search(/What you'll do/i)
  const requirementsIndex = content.search(/Requirements/i)
  const sectionIndexes = [whatIndex, requirementsIndex].filter((index) => index >= 0)
  const introEnd = sectionIndexes.length ? Math.min(...sectionIndexes) : content.length
  const intro = content.slice(0, introEnd).trim()
  const getSection = (start: number, end: number) => {
    if (start < 0) return { lead: "", bullets: [] as string[] }
    const labelMatch = content.slice(start).match(/^(What you'll do|Requirements)/i)
    const body = content.slice(start + (labelMatch?.[0].length ?? 0), end).trim()
    const pieces = body.split(/(?:\n\s*[-*•]\s+|\s*•\s*)/).map((part) => part.trim()).filter(Boolean)
    return {
      lead: pieces.length ? pieces[0] : body,
      bullets: pieces.length > 1 ? pieces.slice(1).map((item) => item.replace(/[.;]+$/, "")) : [],
    }
  }
  const what = getSection(whatIndex, requirementsIndex >= 0 ? requirementsIndex : content.length)
  const requirements = getSection(requirementsIndex, content.length)
  return { intro, what, requirements, source: sourceMatch?.[1]?.trim() }
}

export default function JobDetail() {
  const {
    state,
    navigate,
    applyToJob,
    hasApplied,
    saveJob,
    unsaveJob,
    isSaved,
    reportJob,
    reportUser,
  } = useApp()
  const { jobs, externalJobs, workerProfile, currentUser } = state

  const job =
    jobs.find((j) => j.id === state.currentJobId) ||
    externalJobs.find((j) => j.id === state.currentJobId)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applicationError, setApplicationError] = useState("")
  const [applying, setApplying] = useState(false)
  const [applicationStep, setApplicationStep] = useState<1 | 2>(1)
  const [reviewingApplication, setReviewingApplication] = useState(false)
  const [applicantName, setApplicantName] = useState(workerProfile?.name || currentUser?.name || "")
  const [applicantEmail, setApplicantEmail] = useState(workerProfile?.email || currentUser?.email || "")
  const [applicantPhone, setApplicantPhone] = useState(workerProfile?.phone || "")
  const [applicantLocation, setApplicantLocation] = useState(workerProfile?.location || workerProfile?.district || "")
  const [applicationSkills, setApplicationSkills] = useState(workerProfile?.skills.join(", ") || "")
  const [experienceLevel, setExperienceLevel] = useState<"No Experience" | "Beginner" | "Experienced">("No Experience")
  const [introduction, setIntroduction] = useState("")
  const [applicationResult, setApplicationResult] = useState<ApiApplication | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [showProviderReport, setShowProviderReport] = useState(false)
  const [providerReportReason, setProviderReportReason] = useState("FAKE_ACCOUNT")
  const [providerReportDetails, setProviderReportDetails] = useState("")
  const [providerReportMessage, setProviderReportMessage] = useState("")
  const [reportReason, setReportReason] = useState(
    "Incorrect or misleading information",
  )
  const [reportDetails, setReportDetails] = useState("")
  const [reportMessage, setReportMessage] = useState("")
  const [showKycRequirement, setShowKycRequirement] = useState(false)

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-500">Job not found.</p>
        <button
          onClick={() => navigate("job-discovery")}
          className="mt-4 text-primary-ink hover:underline"
        >
          Back to jobs
        </button>
      </div>
    )
  }

  const applied = hasApplied(job.id)
  const saved = isSaved(job.id)
  const isWorker = currentUser?.role === "worker"
  const isExternal = job.externalSource === "himalayas" || job.externalSource === "jsearch"
  const externalSourceName = job.externalSource === "jsearch" ? "OpenWebNinja" : "Himalayas"
  const taskBudget = formatJobBudget(job)
  const externalLocation = job.location === "Worldwide remote"
    ? job.location
    : `Remote · ${job.location.replace(/^Remote\s*[·-]\s*/i, "").split(",").map((country) => country.trim()).filter(Boolean).slice(0, 2).join(", ")}`
  const externalDescription = isExternal ? splitExternalDescription(job.description || "Description not listed on the original posting.") : null

  const handleApply = async () => {
    setApplying(true)
    setApplicationError("")
    try {
      const result = await applyToJob(job.id, {
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
        applicantPhone: applicantPhone.trim(),
        applicantLocation: applicantLocation.trim(),
        skills: applicationSkills.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean),
        experienceLevel,
        introduction: introduction.trim(),
      })
      setApplicationResult(result)
      setShowApplyForm(false)
      setSubmitted(true)
    } catch (error) {
      setApplicationError(error instanceof Error ? error.message : "Unable to submit your application. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  const isNepalMobile = (value: string) => /^(?:\+?977[- ]?)?9\d{9}$/.test(value.trim())
  const validatePersonalDetails = () => {
    if (!applicantName.trim()) return "Enter your full name."
    if (!isValidEmail(applicantEmail)) return "Enter a valid email address."
    if (!isValidPhoneNumber(applicantPhone) || !isNepalMobile(applicantPhone)) return "Enter a valid Nepali mobile number, such as 98XXXXXXXX."
    if (!applicantLocation.trim()) return "Enter your current city or location."
    return ""
  }
  const parsedApplicationSkills = applicationSkills.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean).slice(0, 20)
  const validateApplicationDetails = () => {
    if (!parsedApplicationSkills.length) return "Add at least one skill relevant to this job."
    if (parsedApplicationSkills.some((skill) => skill.length > 80)) return "Keep each skill under 80 characters."
    if (applicationSkills.split(/[,;\n]/).filter((skill) => skill.trim()).length > 20) return "Add no more than 20 skills."
    if (introduction.trim().length < 20) return "Write a short introduction of at least 20 characters."
    if (introduction.trim().length > 1200) return "Keep your introduction under 1,200 characters."
    return ""
  }

  const spotsLeft = job.workersNeeded - job.workersHired

  const workTypeLabel: Record<string, string> = {
    "full-day": "Full Day",
    "half-day": "Half Day",
    hourly: "Hourly",
    "multi-day": "Multi-Day",
  }

  return (
    <div className={`w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 ${isExternal ? "external-job-detail" : ""}`}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate("job-discovery")}
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
        Back to jobs
      </button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className={`${isExternal ? "rounded-sm border border-stone-200 bg-white p-5 shadow-[0_2px_8px_rgba(28,25,23,0.04)] sm:p-6" : "border-b border-stone-300 bg-white pb-6"}`}>
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className={`font-heading tracking-tight text-stone-950 leading-snug ${isExternal ? "text-2xl font-medium" : "text-3xl font-bold"}`}>
                      {isExternal ? job.title.replace(/^#\s*/, "") : job.title}
                    </h1>
                  </div>
                  {isWorker && (
                    <button
                      onClick={() =>
                        saved ? unsaveJob(job.id) : saveJob(job.id)
                      }
                      title={saved ? "Remove saved job" : "Save job"}
                      className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
                        saved
                          ? "bg-primary-50 border-primary-100 text-primary-ink"
                          : "bg-white border-stone-200 text-stone-400 hover:text-primary-ink"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill={saved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-5 h-5"
                      >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  )}
                </div>
                {isExternal ? (
                  <div className="mt-3 flex flex-col items-start gap-0.5">
                    <span className="font-script text-xl leading-tight text-[#70472F]">
                      External Opportunity
                    </span>
                    <span className="font-script text-xl leading-tight text-stone-700">
                      {job.employmentType || workTypeLabel[job.workType]}
                    </span>
                    <span className="mt-1 text-xs text-stone-500">
                      Source: {externalSourceName}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CategoryBadge category={job.category} />
                    <span className="rounded-none bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700">
                      {job.employmentType || workTypeLabel[job.workType]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Simple rule-based match explanation */}
            {isWorker && job.matchScore !== undefined && (
              <div className="mt-5 border-l-2 border-[#70472F] bg-[#F8F5F1] px-4 py-3">
                <span className="text-base font-bold text-stone-900">
                  Why this job may fit
                </span>
                <div className="space-y-1">
                  {job.matchReasons?.map((reason, i) => (
                    <p key={i} className="mt-2 text-sm font-medium leading-relaxed text-stone-700">
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className={`${isExternal ? "rounded-sm border border-stone-200 bg-white p-5 shadow-[0_2px_8px_rgba(28,25,23,0.04)] sm:p-6" : "border-b border-stone-200 bg-white pb-6"}`}>
            <h2 className={`font-heading text-xl tracking-tight text-stone-950 mb-3 ${isExternal ? "font-normal" : "font-bold"}`}>
              Job Description
            </h2>
            {isExternal && externalDescription ? (
              <div className="max-w-prose space-y-5 text-base font-normal leading-7 tracking-[0.005em] text-[#48443F]">
                {externalDescription.intro.split(/\n\s*\n/).map((paragraph, index) => paragraph.trim() && <p key={`intro-${index}`}>{paragraph.trim()}</p>)}
                {externalDescription.what.lead && <section>
                  <h3 className="mb-1 text-base font-medium text-stone-900">What you’ll do</h3>
                  <p>{externalDescription.what.lead}</p>
                  {externalDescription.what.bullets.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-[#986744]">
                    {externalDescription.what.bullets.map((item, index) => <li key={`what-${index}`}>{item}</li>)}
                  </ul>}
                </section>}
                {externalDescription.requirements.lead && <section>
                  <h3 className="mb-1 text-base font-medium text-stone-900">Requirements</h3>
                  {externalDescription.requirements.bullets.length > 0 ? <ul className="list-disc space-y-1 pl-5 marker:text-[#986744]">
                    {externalDescription.requirements.bullets.map((item, index) => <li key={`requirement-${index}`}>{item}</li>)}
                  </ul> : <p>{externalDescription.requirements.lead}</p>}
                </section>}
                {externalDescription.source && <p className="border-t border-stone-200 pt-3 text-xs leading-5 text-stone-500">Originally posted on {externalDescription.source}.</p>}
              </div>
            ) : (
              <p className="text-base leading-7 text-stone-700">{job.description || "Description not listed on the original posting."}</p>
            )}
            {job.responsibilities && <div className="mt-5 border-t border-stone-200 pt-5">
              <h3 className="font-heading text-lg font-bold text-stone-950 mb-2">Responsibilities</h3>
              <p className="whitespace-pre-line text-base leading-7 text-stone-700">{job.responsibilities}</p>
            </div>}
          </div>

          {/* Requirements */}
          <div className={`${isExternal ? "rounded-sm border border-stone-200 bg-white p-5 shadow-[0_2px_8px_rgba(28,25,23,0.04)] sm:p-6" : "border-y border-stone-200 bg-white py-6"}`}>
            <h2 className="font-heading text-xl font-bold tracking-tight text-stone-950 mb-4">
              {isExternal ? "Role details" : "Requirements"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {!isExternal && <div>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Payment method</h3>
                <p className="text-sm text-stone-700">{{ CASH: "Cash", BANK_TRANSFER: "Bank transfer", DIGITAL_WALLET: "Digital wallet", OTHER: "Other" }[job.paymentMethod || "CASH"]}</p>
              </div>}
              <div>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  {isExternal ? "Job categories" : "Skills Required"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {isExternal ? (
                    job.externalCategories?.length ? (
                      <p className="text-sm font-normal leading-6 text-stone-600">
                        {job.externalCategories.join(" · ")}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-500">
                        No categories listed.
                      </p>
                    )
                  ) : job.skillsRequired.length > 0 ? (
                    job.skillsRequired.map((skill) => {
                      const workerHasIt = workerProfile?.skills.some(
                        (s) => s.toLowerCase() === skill.toLowerCase(),
                      )
                      return (
                        <span
                          key={skill}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                            workerHasIt
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-stone-100 text-stone-600 border-stone-200"
                          }`}
                        >
                          {workerHasIt && "✓ "}
                          {skill}
                        </span>
                      )
                    })
                  ) : (
                    <p className="text-sm text-stone-500">
                      No specific skills listed.
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className={`text-xs text-stone-500 uppercase tracking-wider mb-1 ${isExternal ? "font-normal" : "font-semibold"}`}>
                    Qualification
                  </h3>
                  <p className={`text-sm text-stone-700 ${isExternal ? "font-normal leading-relaxed" : ""}`}>
                    {job.qualificationRequired ||
                      (isExternal ? "See original listing" : "Not specified")}
                  </p>
                </div>
                <div>
                  <h3 className={`text-xs text-stone-500 uppercase tracking-wider mb-1 ${isExternal ? "font-normal" : "font-semibold"}`}>
                    Experience
                  </h3>
                  <p className={`text-sm text-stone-700 ${isExternal ? "font-normal leading-relaxed" : ""}`}>
                    {job.experienceRequired ||
                      (isExternal ? "See original listing" : "Not specified")}
                  </p>
                </div>
              </div>
            </div>
            {isExternal && (job.externalPublisher || job.externalPostedLabel || job.externalTimezoneRestrictions?.length || job.externalBenefits?.length || job.externalIsRemote !== undefined) && (
              <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-stone-200 pt-4 text-sm sm:grid-cols-2">
                {job.externalIsRemote !== undefined && <div><dt className="text-xs uppercase tracking-wide text-stone-500">Work arrangement</dt><dd className="mt-1 font-normal text-stone-700">{job.externalIsRemote ? "Remote" : "Not marked as remote"}</dd></div>}
                {job.externalDirectApply !== undefined && <div><dt className="text-xs uppercase tracking-wide text-stone-500">Application route</dt><dd className="mt-1 font-normal text-stone-700">{job.externalDirectApply ? "Direct application" : "External application site"}</dd></div>}
                {(job.externalCity || job.externalRegion || job.externalCountry) && <div><dt className="text-xs uppercase tracking-wide text-stone-500">Location details</dt><dd className="mt-1 font-normal text-stone-700">{[job.externalCity, job.externalRegion, job.externalCountry].filter(Boolean).join(", ")}</dd></div>}
                {job.externalPublisher && <div><dt className="text-xs uppercase tracking-wide text-stone-500">Listed on</dt><dd className="mt-1 font-normal text-stone-700">{job.externalPublisher}</dd></div>}
                {job.externalPostedLabel && <div><dt className="text-xs uppercase tracking-wide text-stone-500">Posted</dt><dd className="mt-1 font-normal text-stone-700">{job.externalPostedLabel}</dd></div>}
                {job.externalTimezoneRestrictions?.length ? <div><dt className="text-xs uppercase tracking-wide text-stone-500">Time zone eligibility</dt><dd className="mt-1 font-normal text-stone-700">{job.externalTimezoneRestrictions.join(", ")}</dd></div> : null}
                {job.externalBenefits?.length ? <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-stone-500">Benefits</dt><dd className="mt-1 font-normal leading-6 text-stone-700">{job.externalBenefits.join(" · ")}</dd></div> : null}
              </dl>
            )}
            {isExternal && job.externalHighlights && Object.entries(job.externalHighlights).some(([, items]) => items?.length) && (
              <div className="mt-5 space-y-4 border-t border-stone-200 pt-4">
                {Object.entries(job.externalHighlights).filter(([, items]) => items?.length).map(([heading, items]) => (
                  <section key={heading}>
                    <h3 className="text-sm font-medium text-stone-800">{heading}</h3>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm font-normal leading-6 text-stone-600 marker:text-[#986744]">{items.map((item, index) => <li key={`${heading}-${index}`}>{item}</li>)}</ul>
                  </section>
                ))}
              </div>
            )}
          </div>

          {/* Apply form */}
          {isWorker &&
            !isExternal &&
            showApplyForm &&
            !applied && (
              <section aria-labelledby="application-form-title" className="bg-white border-2 border-primary rounded-none p-5 sm:p-6 animate-fade-in">
                <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 id="application-form-title" className="font-semibold text-stone-900">Apply for {job.title}</h2></div>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-ink">Step {reviewingApplication ? 2 : applicationStep} of 2{reviewingApplication ? " · Review" : ""}</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full bg-primary transition-all ${applicationStep === 1 && !reviewingApplication ? "w-1/2" : "w-full"}`} /></div>
                {applicationError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{applicationError}</p>}

                {!reviewingApplication && applicationStep === 1 && <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-stone-700">Full name<input autoComplete="name" maxLength={120} value={applicantName} onChange={(event) => setApplicantName(event.target.value)} className="input-style mt-1.5 w-full" /></label>
                  <label className="text-xs font-semibold text-stone-700">Email address<input type="email" autoComplete="email" maxLength={254} value={applicantEmail} onChange={(event) => setApplicantEmail(event.target.value)} className="input-style mt-1.5 w-full" /></label>
                  <label className="text-xs font-semibold text-stone-700">Phone number<input type="tel" autoComplete="tel" maxLength={32} value={applicantPhone} onChange={(event) => setApplicantPhone(event.target.value)} placeholder="98XXXXXXXX" className="input-style mt-1.5 w-full" /></label>
                  <label className="text-xs font-semibold text-stone-700">Current city or location<input autoComplete="address-level2" maxLength={255} value={applicantLocation} onChange={(event) => setApplicantLocation(event.target.value)} placeholder="e.g. Kathmandu" className="input-style mt-1.5 w-full" /></label>
                </div>}

                {!reviewingApplication && applicationStep === 2 && <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-stone-700 sm:col-span-2">Relevant skills<input maxLength={1700} value={applicationSkills} onChange={(event) => setApplicationSkills(event.target.value)} placeholder="Separate skills with commas" className="input-style mt-1.5 w-full" /><span className="mt-1 block font-normal text-stone-500">Add up to 20 skills relevant to this job.</span></label>
                  <label className="text-xs font-semibold text-stone-700">Experience level<select value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value as typeof experienceLevel)} className="input-style mt-1.5 w-full"><option>No Experience</option><option>Beginner</option><option>Experienced</option></select></label>
                  <label className="text-xs font-semibold text-stone-700 sm:col-span-2">Short introduction<textarea rows={4} maxLength={1200} value={introduction} onChange={(event) => setIntroduction(event.target.value)} placeholder="Briefly explain why you are suitable for this job." className="input-style mt-1.5 w-full" /><span className="mt-1 block text-right font-normal text-stone-500">{introduction.length}/1200</span></label>
                </div>}

                {reviewingApplication && <dl className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-medium text-stone-500">Full name</dt><dd className="mt-0.5 font-medium text-stone-900">{applicantName}</dd></div>
                  <div><dt className="text-xs font-medium text-stone-500">Email</dt><dd className="mt-0.5 break-all font-medium text-stone-900">{applicantEmail}</dd></div>
                  <div><dt className="text-xs font-medium text-stone-500">Phone</dt><dd className="mt-0.5 font-medium text-stone-900">{applicantPhone}</dd></div>
                  <div><dt className="text-xs font-medium text-stone-500">Location</dt><dd className="mt-0.5 font-medium text-stone-900">{applicantLocation}</dd></div>
                  <div><dt className="text-xs font-medium text-stone-500">Experience</dt><dd className="mt-0.5 font-medium text-stone-900">{experienceLevel}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-medium text-stone-500">Skills</dt><dd className="mt-0.5 font-medium text-stone-900">{parsedApplicationSkills.join(", ")}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-medium text-stone-500">Introduction</dt><dd className="mt-0.5 whitespace-pre-wrap font-medium text-stone-900">{introduction}</dd></div>
                </dl>}

                <div className="mt-5 flex flex-wrap justify-between gap-3">
                  <button type="button" disabled={applying} onClick={() => { setApplicationError(""); if (reviewingApplication) { setReviewingApplication(false); setApplicationStep(2) } else if (applicationStep === 2) setApplicationStep(1); else setShowApplyForm(false) }} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">{reviewingApplication || applicationStep === 2 ? "Back" : "Cancel"}</button>
                  {!reviewingApplication && applicationStep === 1 && <button type="button" onClick={() => { const error = validatePersonalDetails(); setApplicationError(error); if (!error) { setApplicationError(""); setApplicationStep(2) } }} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Continue</button>}
                  {!reviewingApplication && applicationStep === 2 && <button type="button" onClick={() => { const error = validateApplicationDetails(); setApplicationError(error); if (!error) { setApplicationError(""); setReviewingApplication(true) } }} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">Review application</button>}
                  {reviewingApplication && <button type="button" disabled={applying} onClick={() => { void handleApply() }} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">{applying ? "Submitting…" : "Submit application"}</button>}
                </div>
              </section>
            )}

          {submitted && (
            <div className="border border-green-200 bg-green-50 p-6 text-center animate-fade-in">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-800" aria-hidden="true">✓</div>
              <h3 className="font-semibold text-green-900">Application Submitted Successfully</h3>
              <dl className="mx-auto mt-4 grid max-w-md gap-2 text-left text-sm sm:grid-cols-2"><div><dt className="text-xs text-green-800/70">Job</dt><dd className="font-medium text-green-950">{job.title}</dd></div><div><dt className="text-xs text-green-800/70">Application ID</dt><dd className="font-medium text-green-950">{applicationResult?.applicationId ?? "—"}</dd></div><div><dt className="text-xs text-green-800/70">Status</dt><dd className="font-medium text-green-950">Pending</dd></div></dl>
              {applicationResult?.confirmationEmailSent ? <p className="mt-4 text-sm text-green-800">Confirmation email sent to <strong>{applicationResult.applicantEmail || applicantEmail}</strong>.</p> : <p role="status" className="mt-4 text-sm text-amber-900">Your application is saved, but a confirmation email could not be delivered. Please check back in My Applications.</p>}
              <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => navigate("my-applications")} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">View My Applications</button><button type="button" onClick={() => navigate("job-discovery")} className="rounded-lg border border-green-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-900">Back to Jobs</button></div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick info */}
          <div className="bg-white border border-stone-300 rounded-none p-5">
            {(!isExternal || job.salaryText) && <div className="mb-4 border border-[#E7C66B] bg-[#FFF6D9] px-4 py-4 text-center">
              <div className="font-heading text-3xl font-bold tracking-tight text-[#765016] tabular-nums">
                {isExternal
                  ? job.salaryText
                  : taskBudget}
              </div>
              {!isExternal && !job.budgetNegotiable && !job.paymentMax && job.workType === "multi-day" && (
                <div className="mt-1 font-mono-data text-xs text-[#8A6A2B]">
                  ≈ NPR{" "}
                  {(job.payment * parseInt(job.duration)).toLocaleString()}{" "}
                  total
                </div>
              )}
            </div>}

            <div className="space-y-3">
              {(isExternal
                ? [
                    { label: "Location", value: externalLocation },
                    ...(job.seniority
                      ? [{ label: "Seniority", value: job.seniority }]
                      : []),
                    ...(job.publishedDate
                      ? [
                          {
                            label: "Updated",
                            value: formatNepalDate(job.publishedDate, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }),
                          },
                        ]
                      : []),
                  ]
                : [
                    {
                      label: "Date",
                      value: job.endDate && job.endDate !== job.date
                        ? `${formatNepalDate(job.date, { month: "short", day: "numeric" })} – ${formatNepalDate(job.endDate, { month: "short", day: "numeric" })}`
                        : formatNepalDate(job.date, {
                            weekday: "short",
                            month: "long",
                            day: "numeric",
                          }),
                    },
                    {
                      label: "Time",
                      value: `${job.startTime} – ${job.endTime}`,
                    },
                    { label: "Duration", value: job.duration },
                    { label: "Location", value: job.location },
                    {
                      label: "Workers Needed",
                      value: `${job.workersNeeded} workers (${spotsLeft} spots left)`,
                    },
                    {
                      label: "Applications",
                      value: `${job.applicantCount} applicants`,
                    },
                    ...(job.deadline ? [{
                      label: "Apply By",
                      value: formatNepalDate(job.deadline, { month: "short", day: "numeric" }),
                    }] : []),
                  ]
              ).map((item) => (
                <div key={item.label}>
                  <div>
                    <p className={`text-xs tracking-wide text-stone-500 uppercase ${isExternal ? "font-normal" : "font-semibold"}`}>
                      {item.label}
                    </p>
                    <p title={isExternal && item.label === "Location" && job.externalLocationRestrictions?.length ? `All eligible countries: ${job.externalLocationRestrictions.join(", ")}` : undefined} className={`text-base text-stone-900 ${isExternal ? "font-normal leading-relaxed" : "font-semibold"}`}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply / Applied button */}
            {isWorker && !isExternal && (
              <div className="mt-5">
                {applied ? (
                  <div className="w-full py-2.5 bg-teal-50 text-teal text-sm font-semibold rounded-none text-center border border-teal-100">
                    ✓ Application Submitted
                  </div>
                ) : job.status === "filled" ? (
                  <div className="w-full py-2.5 bg-stone-100 text-stone-500 text-sm font-medium rounded-none text-center">
                    Position Filled
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (
                        import.meta.env.VITE_DEMO_MODE !== "true" ||
                        workerProfile?.kycStatus === "verified"
                      ) {
                        setShowApplyForm(true)
                        setShowKycRequirement(false)
                      } else {
                        setShowKycRequirement(true)
                      }
                    }}
                    className="w-full py-3 bg-primary text-white text-base font-bold rounded-none hover:bg-primary-dark transition-colors"
                  >
                    Apply for this Job
                  </button>
                )}
                {showKycRequirement && !applied && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-left">
                    <p className="text-sm font-semibold text-amber-800">
                      Identity verification required
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {workerProfile?.kycStatus === "pending"
                        ? "Your KYC is pending verification. You can apply after it is approved."
                        : "Complete identity verification in your profile before applying for jobs."}
                    </p>
                    <button
                      onClick={() => navigate("worker-profile")}
                      className="mt-3 text-xs font-semibold text-primary-ink hover:underline"
                    >
                      Complete KYC
                    </button>
                  </div>
                )}
              </div>
            )}
            {isExternal &&
              (job.externalUrl ? (
                <a
                  href={job.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 block w-full rounded-xl bg-[#2F6B45] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#27583A]"
                >
                  View Original Job / Apply
                </a>
              ) : (
                <p className="mt-5 rounded-xl bg-stone-100 px-4 py-2.5 text-center text-sm text-stone-500">
                  Original application link not listed.
                </p>
              ))}
            {isExternal && job.externalApplyOptions?.some((option) => option.link !== job.externalUrl) && (
              <div className="mt-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-stone-500">Other application links</p>
                {job.externalApplyOptions.filter((option) => option.link !== job.externalUrl).map((option) => (
                  <a key={option.link} href={option.link} target="_blank" rel="noreferrer" className="block text-sm font-normal text-[#2F6B45] underline decoration-[#B7D2BE] underline-offset-4 hover:text-[#27583A]">
                    {option.publisher || "Apply through listing source"}{option.isDirect ? " · Direct application" : ""}
                  </a>
                ))}
              </div>
            )}
            {isExternal && job.externalGoogleUrl && <a href={job.externalGoogleUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-stone-500 underline underline-offset-2 hover:text-stone-700">View Google Jobs result</a>}
          </div>

          {/* About provider */}
          <div className="bg-white border border-stone-300 rounded-none p-5">
            <h3 className={`font-heading text-lg tracking-tight text-stone-950 mb-3 ${isExternal ? "font-normal" : "font-bold"}`}>
              About the Provider
            </h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100">
                {job.providerLogo ? (
                  <img
                    src={job.providerLogo}
                    alt={job.providerName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`flex h-full w-full items-center justify-center font-display text-stone-500 ${isExternal ? "font-normal" : "font-bold"}`}>
                    {job.providerName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className={`font-heading text-base text-stone-950 ${isExternal ? "font-medium" : "font-bold"}`}>
                  {job.externalEmployerWebsite ? <a href={job.externalEmployerWebsite} target="_blank" rel="noreferrer" className="underline decoration-stone-300 underline-offset-4 hover:text-[#2F6B45]">{job.providerName}</a> : job.providerName}
                </p>
                {job.providerVerified && <VerifiedBadge small />}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-sm text-stone-700 ${isExternal ? "font-normal" : "font-medium"}`}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-3.5 h-3.5"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {isExternal ? externalLocation : job.district}
            </div>
            {isExternal && <p className="mt-3 text-sm font-normal leading-relaxed text-stone-600">This opportunity is hosted on {externalSourceName}. Review the original listing before applying.</p>}
            {isWorker && !isExternal && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-4">
                <button onClick={() => setShowReport((value) => !value)} className="min-h-10 rounded-none border border-stone-400 px-3.5 text-sm font-semibold text-stone-800 hover:border-stone-700 hover:bg-stone-50">Report this job</button>
                <button onClick={() => setShowProviderReport((value) => !value)} className="min-h-10 rounded-none border border-red-300 px-3.5 text-sm font-semibold text-red-800 hover:border-red-500 hover:bg-red-50">Report provider</button>
              </div>
            )}
            {showProviderReport && isWorker && (
              <div className="mt-3 space-y-2 rounded-none border border-red-200 bg-red-50/50 p-3">
                <label className="block text-xs font-semibold text-stone-700">Reason<select value={providerReportReason} onChange={(event) => setProviderReportReason(event.target.value)} className="input-style mt-1 w-full"><option value="SUSPICIOUS_JOB">Suspicious job or activity</option><option value="FAKE_ACCOUNT">Fake account</option><option value="MISCONDUCT">Misconduct</option><option value="HARASSMENT">Harassment</option><option value="PAYMENT_ISSUE">Payment issue</option><option value="OTHER">Other</option></select></label>
                <label className="block text-xs font-semibold text-stone-700">Description<textarea value={providerReportDetails} onChange={(event) => setProviderReportDetails(event.target.value)} maxLength={2000} rows={3} className="input-style mt-1 w-full" placeholder="Briefly explain the concern" /></label>
                <button type="button" disabled={!providerReportDetails.trim()} onClick={() => { void reportUser(job.providerId, providerReportReason, providerReportDetails).then((error) => { setProviderReportMessage(error || "Report submitted for review."); if (!error) { setShowProviderReport(false); setProviderReportDetails("") } }) }} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit report</button>
                {providerReportMessage && <p role="status" className="text-xs text-stone-600">{providerReportMessage}</p>}
              </div>
            )}
            {showReport && (
              <div className="mt-3 space-y-2">
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="input-style"
                >
                  <option>Incorrect or misleading information</option>
                  <option>Unsafe or inappropriate work</option>
                  <option>Suspicious payment request</option>
                  <option>Other</option>
                </select>
                <textarea
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  placeholder="Optional details"
                  rows={3}
                  className="input-style resize-none"
                />
                <button
                  onClick={() => {
                    void reportJob(job.id, reportReason, reportDetails).then((error) => {
                      setReportMessage(error ?? "Report submitted. Thank you.")
                      if (!error) setShowReport(false)
                    })
                  }}
                  className="w-full py-2 bg-primary text-white text-xs font-medium rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Submit report
                </button>
              </div>
            )}
            {reportMessage && (
              <p className="text-xs text-stone-500 mt-2">{reportMessage}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
