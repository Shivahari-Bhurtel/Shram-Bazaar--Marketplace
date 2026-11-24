import { useEffect, useState } from "react"
import { useApp } from "../../store/AppContext"
import { apiRequest } from "../../services/backendApi"
import { VerifiedBadge } from "../../components/StatusBadge"
import { DISTRICTS } from "../../data/mockData"
import { isValidNepalPan, isValidPhoneNumber } from "../../utils/validation"
import type { KycDocumentType } from "../../types"

export default function ProviderProfile() {
  const { state, navigate, updateProviderProfile, submitProviderVerification } = useApp()
  const { providerProfile } = state
  const [editing, setEditing] = useState(false)
  const [tempData, setTempData] = useState<any>({})
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState("")
  const [verificationFront, setVerificationFront] = useState<{ name: string; data: string } | null>(null)
  const [verificationBack, setVerificationBack] = useState<{ name: string; data: string } | null>(null)
  const [identityDocumentType, setIdentityDocumentType] = useState<KycDocumentType>("national-id")
  const [businessDocumentType, setBusinessDocumentType] = useState<"BUSINESS_REGISTRATION" | "PAN_CERTIFICATE">("BUSINESS_REGISTRATION")
  const [verificationBusy, setVerificationBusy] = useState(false)
  const [receivedReviews, setReceivedReviews] = useState<Array<{ id: string; reviewerName: string; rating: number; comment?: string; createdAt?: string }>>([])
  const [activeTab, setActiveTab] = useState<"overview" | "reviews" | "workers">("overview")

  useEffect(() => {
    if (!providerProfile) return
    if (import.meta.env.VITE_DEMO_MODE === "true") {
      setReceivedReviews(state.applications.filter((app) => app.providerId === providerProfile.id && app.providerRating).map((app) => ({ id: app.id, reviewerName: app.workerName, rating: app.providerRating || 0, comment: app.providerReview, createdAt: app.providerReviewDate })))
      return
    }
    let active = true
    void apiRequest<Array<{ id: number; reviewerName: string; rating: number; comment?: string; createdAt?: string }>>(`/api/users/${providerProfile.id}/reviews`)
      .then((reviews) => { if (active) setReceivedReviews(reviews.map((review) => ({ ...review, id: String(review.id) }))) })
      .catch(() => { if (active) setReceivedReviews([]) })
    return () => { active = false }
  }, [providerProfile?.id, providerProfile?.reviewCount, state.applications])

  if (!providerProfile) return null
  const organizationWorkers = state.applications
    .filter((application) => application.providerId === providerProfile.id && Boolean(application.engagementId) && !["declined", "rejected", "withdrawn"].includes(application.status))
    .map((application) => ({ application, job: state.jobs.find((job) => job.id === application.jobId) }))
    .filter((item) => item.job)
  const organizationHireCount = new Set(organizationWorkers
    .filter(({ application }) => application.status === "accepted" && application.engagementStatus !== "AWAITING_RESPONSE")
    .map(({ application }) => application.workerId)).size
  const providerApplications = state.applications.filter((application) => application.providerId === providerProfile.id)
  const providerJobs = state.jobs.filter((job) => job.providerId === providerProfile.id)
  const jobStages = [
    { label: "Received", value: providerApplications.length, color: "bg-violet-500" },
    { label: "Shortlisted", value: providerApplications.filter((application) => application.shortlisted).length, color: "bg-teal-400" },
    { label: "Hired", value: providerApplications.filter((application) => ["accepted", "completed"].includes(application.status)).length, color: "bg-sky-500" },
    { label: "Closed", value: providerApplications.filter((application) => ["rejected", "declined", "withdrawn"].includes(application.status)).length, color: "bg-rose-400" },
  ]
  const maxJobStage = Math.max(1, ...jobStages.map((stage) => stage.value))
  const openJobsCount = providerJobs.filter((job) => job.status === "active").length
  const closedJobsCount = providerJobs.filter((job) => job.status === "closed" || job.status === "filled").length

  const readVerificationFile = (file: File | undefined, side: "front" | "back") => {
    if (!file) return
    const extension = file.name.split(".").pop()?.toLowerCase()
    const validType = file.type === "application/pdf" || file.type === "image/png" || file.type === "image/jpeg"
    const validExtension = ["pdf", "png", "jpg", "jpeg"].includes(extension || "")
    if ((!validType && !validExtension) || !file.size || file.size > 1_000_000) {
      setVerificationMessage("Choose a non-empty PDF, PNG or JPG file smaller than 1 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") return setVerificationMessage("Could not read that document.")
      const value = { name: file.name, data: reader.result }
      if (side === "front") setVerificationFront(value)
      else setVerificationBack(value)
      setVerificationMessage("")
    }
    reader.onerror = () => setVerificationMessage("Could not read that document. Please select it again.")
    reader.readAsDataURL(file)
  }

  const submitVerificationFiles = async () => {
    if (!verificationFront) return setVerificationMessage("Choose the required verification document.")
    if (providerProfile.providerType === "individual" && !verificationBack) return setVerificationMessage("Upload both sides of your National ID.")
    setVerificationBusy(true)
    const error = await submitProviderVerification(verificationFront.name, verificationFront.data, verificationBack?.name, verificationBack?.data, identityDocumentType, businessDocumentType)
    setVerificationBusy(false)
    setVerificationMessage(error || "Document submitted for administrator review.")
    if (!error) { setVerificationFront(null); setVerificationBack(null) }
  }

  const startEdit = () => {
    setEditing(true)
    setSaved(false)
    setProfileError("")
    setTempData({
      orgName: providerProfile.orgName,
      providerType: providerProfile.providerType || "business",
      contactName: providerProfile.contactName,
      phone: providerProfile.phone,
      location: providerProfile.location,
      district: providerProfile.district,
      industry: providerProfile.industry,
      description: providerProfile.description,
      pan: providerProfile.pan,
      website: providerProfile.website || "",
      socialLinks: providerProfile.socialLinks || "",
      operatingHours: providerProfile.operatingHours || "",
      yearsOperating: providerProfile.yearsOperating || "",
    })
  }

  const saveEdit = async () => {
    const orgName = String(tempData.orgName ?? "").trim()
    const contactName = String(tempData.contactName ?? "").trim()
    const phone = String(tempData.phone ?? "").trim()
    const location = String(tempData.location ?? "").trim()
    const district = String(tempData.district ?? "").trim()
    const industry = String(tempData.industry ?? "").trim()
    const pan = String(tempData.pan ?? "").trim()
    const providerType = tempData.providerType || providerProfile.providerType || "business"
    const description = String(tempData.description ?? "").trim()

    if (
      !orgName ||
      !contactName ||
      !phone ||
      !location ||
      !district ||
      !industry ||
      (providerType !== "individual" && !pan)
    ) {
      setProfileError(
        "Complete all required organisation details before saving.",
      )
      return
    }
    if (!isValidPhoneNumber(phone)) {
      setProfileError("Enter a valid phone number with 7 to 15 digits.")
      return
    }
    if (pan && !isValidNepalPan(pan)) {
      setProfileError("Enter a valid 9-digit PAN number, or leave it blank for an individual account.")
      return
    }
    if (description.length > 1000) {
      setProfileError("Keep the description under 1,000 characters.")
      return
    }

    setProfileSaving(true)
    try {
    await updateProviderProfile({
      ...tempData,
      providerType,
      orgName,
      contactName,
      phone,
      location,
      district,
      industry,
      pan,
      description,
    })
    setProfileError("")
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save the provider profile.")
    } finally {
      setProfileSaving(false)
    }
  }

  const industries = [
    "Information Technology",
    "Hospitality & Tourism",
    "Healthcare",
    "Construction",
    "Events & Entertainment",
    "Retail",
    "Manufacturing",
    "Education",
    "Finance & Banking",
    "NGO / INGO",
    "Household / individual hiring",
    "Other",
  ]

  const uploadPicture = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      setProfileError("Choose a PNG, JPG, or WebP image smaller than 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") void updateProviderProfile({ logo: reader.result }).catch((error: unknown) => setProfileError(error instanceof Error ? error.message : "Unable to update profile picture."))
    }
    reader.onerror = () => setProfileError("Could not read the selected image.")
    reader.readAsDataURL(file)
  }

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "reviews" as const, label: `Reviews (${receivedReviews.length})` },
    { id: "workers" as const, label: `Hired workers (${organizationWorkers.length})` },
  ]

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,0.98fr)]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="relative h-36 overflow-hidden bg-[#d6e2df] sm:h-48">
            <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(35deg,transparent_0,transparent_42px,rgba(255,255,255,0.42)_44px,transparent_48px),linear-gradient(110deg,#cadbd8,#e4ece8_55%,#bfd1ce)]" />
            <div aria-hidden="true" className="absolute -right-12 -top-32 h-72 w-72 rounded-full border border-white/50" />
            <div aria-hidden="true" className="absolute right-24 -top-40 h-80 w-80 rounded-full border border-white/40" />
          </div>
          <div className="relative px-5 pb-5 pt-12 sm:px-8 sm:pb-7 sm:pt-14">
            <div className="absolute -top-12 left-5 grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#f4f1e8] text-2xl font-bold text-[#553421] shadow-sm sm:-top-16 sm:left-8 sm:h-32 sm:w-32 sm:text-3xl">
              {providerProfile.logo ? <img src={providerProfile.logo} alt={`${providerProfile.orgName} logo`} className="h-full w-full object-cover" /> : (providerProfile.orgName.trim()[0] || "S").toUpperCase()}
              <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/55 py-1 text-center text-[9px] font-semibold text-white sm:text-[10px]">
                Change logo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { uploadPicture(event.target.files?.[0]); event.target.value = "" }} />
              </label>
            </div>
            <button type="button" onClick={startEdit} className="absolute right-5 top-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-stone-100 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200 sm:right-8 sm:top-7">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /></svg>
              Edit info
            </button>
            <div className="pr-0 sm:pr-36">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-[#17212b] sm:text-3xl">{providerProfile.orgName}</h1>
                {providerProfile.verified && <VerifiedBadge small />}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 sm:text-base">{providerProfile.description || "Add a short description to help workers understand your organisation and the work you offer."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ProfilePill>{providerProfile.industry || "Industry not set"}</ProfilePill>
                <ProfilePill>{providerProfile.location || "Location not set"}{providerProfile.district ? `, ${providerProfile.district}` : ""}</ProfilePill>
                <ProfilePill>{providerProfile.providerType === "individual" ? "Individual provider" : providerProfile.providerType === "organization" ? "Organisation" : "Business provider"}</ProfilePill>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500">
                <span>{organizationHireCount} workers hired</span><span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1"><span className="text-amber-500">★</span><strong className="font-semibold text-stone-800">{Number(providerProfile.rating || 0).toFixed(1)}</strong><span>({providerProfile.reviewCount} reviews)</span></span>
              </div>
            </div>
            {saved && <p role="status" className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">✓ Profile saved</p>}
            {profileError && !editing && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{profileError}</p>}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <h2 className="text-lg font-semibold tracking-tight text-[#17212b]">Worker rating</h2>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div><span className="text-4xl font-semibold tracking-tight text-[#17212b]">{Number(providerProfile.rating || 0).toFixed(1)}</span><span className="ml-2 text-sm text-stone-400">({providerProfile.reviewCount})</span></div>
              <div className="text-xl tracking-wide text-amber-400" aria-label={`${providerProfile.rating} out of 5 stars`}>{"★".repeat(Math.max(0, Math.min(5, Math.round(providerProfile.rating || 0))))}{"☆".repeat(5 - Math.max(0, Math.min(5, Math.round(providerProfile.rating || 0))))}</div>
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <h2 className="text-lg font-semibold tracking-tight text-[#17212b]">Job post performance</h2>
            <div className="mt-4 space-y-4">
              {jobStages.map((stage) => <div key={stage.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm"><span className="text-stone-600">{stage.label}</span><span className="h-1.5 overflow-hidden rounded-full bg-stone-100"><span className={`block h-full rounded-full ${stage.color}`} style={{ width: `${Math.max(stage.value ? 5 : 0, stage.value / maxJobStage * 100)}%` }} /></span><span className="text-right tabular-nums text-stone-700">{stage.value}</span></div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight text-[#17212b]">Hiring statistics</h2><span className="text-xs text-stone-400">From your account</span></div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
              <ProfileStat label="Open jobs" value={openJobsCount} />
              <ProfileStat label="Closed jobs" value={closedJobsCount} />
              <ProfileStat label="Workers hired" value={organizationHireCount} />
              <ProfileStat label="Applicants" value={providerApplications.length} />
            </div>
          </section>
        </div>
      </div>

      <nav aria-label="Organisation profile sections" className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => setActiveTab(tab.id)} className={`min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition ${activeTab === tab.id ? "bg-stone-100 text-[#17212b]" : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"}`}>{tab.label}</button>)}
      </nav>

      {activeTab === "overview" && <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.8fr)]">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-semibold text-[#17212b]">Organisation details</h2><p className="mt-1 text-sm text-stone-500">Information shown to workers considering your jobs.</p></div>
            {!editing ? <button type="button" onClick={startEdit} className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Edit info</button> : <div className="flex gap-2"><button type="button" onClick={() => { setProfileError(""); setEditing(false) }} className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">Cancel</button><button type="button" onClick={saveEdit} disabled={profileSaving} className="rounded-full bg-[#176B4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10563D] disabled:cursor-wait disabled:opacity-60">{profileSaving ? "Saving…" : "Save changes"}</button></div>}
          </div>
          {editing && profileError && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{profileError}</p>}
          {editing ? <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Provider type"><select value={tempData.providerType || "business"} onChange={(event) => { setProfileError(""); setTempData((current: any) => ({ ...current, providerType: event.target.value })) }} className="input-style"><option value="individual">Individual / household</option><option value="business">Business</option><option value="organization">Organisation</option></select></ProfileField>
            {[
              { label: tempData.providerType === "individual" ? "Display name" : "Organisation name", key: "orgName", type: "text" },
              { label: "Contact person", key: "contactName", type: "text" },
              { label: "Phone", key: "phone", type: "tel" },
              { label: "Location", key: "location", type: "text" },
              { label: tempData.providerType === "individual" ? "PAN number (optional)" : "PAN number", key: "pan", type: "text" },
              { label: "Website (optional)", key: "website", type: "url" },
              { label: "Social links (optional)", key: "socialLinks", type: "text" },
              { label: "Operating hours (optional)", key: "operatingHours", type: "text" },
              { label: "Years operating (optional)", key: "yearsOperating", type: "number" },
            ].map((field) => <ProfileField key={field.key} label={field.label}><input type={field.type} value={tempData[field.key] ?? ""} onChange={(event) => { setProfileError(""); setTempData((current: any) => ({ ...current, [field.key]: field.key === "yearsOperating" ? Number(event.target.value) : event.target.value })) }} inputMode={field.key === "pan" ? "numeric" : undefined} pattern={field.key === "phone" ? "[+]?[0-9\\s\\(\\)\\x2d]{7,20}" : field.key === "pan" ? "[0-9]{9}" : undefined} maxLength={field.key === "phone" ? 20 : field.key === "pan" ? 9 : field.key === "orgName" || field.key === "contactName" ? 120 : undefined} className="input-style" /></ProfileField>)}
            <ProfileField label="District"><select value={tempData.district} onChange={(event) => { setProfileError(""); setTempData((current: any) => ({ ...current, district: event.target.value })) }} className="input-style">{DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}</select></ProfileField>
            <ProfileField label="Industry"><select value={tempData.industry} onChange={(event) => { setProfileError(""); setTempData((current: any) => ({ ...current, industry: event.target.value })) }} className="input-style">{industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select></ProfileField>
            <ProfileField label="Description" className="sm:col-span-2"><textarea value={tempData.description} rows={4} maxLength={1000} onChange={(event) => { setProfileError(""); setTempData((current: any) => ({ ...current, description: event.target.value })) }} className="input-style resize-y" /><span className="mt-1 text-right text-xs text-stone-400">{String(tempData.description || "").length}/1,000</span></ProfileField>
          </div> : <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {[
              { label: "Organisation", value: providerProfile.orgName }, { label: "Contact person", value: providerProfile.contactName },
              { label: "Phone", value: providerProfile.phone }, { label: "Email", value: providerProfile.email },
              { label: "Location", value: providerProfile.location }, { label: "District", value: providerProfile.district },
              { label: "Industry", value: providerProfile.industry }, { label: "Provider type", value: providerProfile.providerType || "Business" },
              { label: "PAN number", value: providerProfile.pan || "Not provided" }, { label: "Website", value: providerProfile.website || "Not added" },
              { label: "Social links", value: providerProfile.socialLinks || "Not added" }, { label: "Operating hours", value: providerProfile.operatingHours || "Not added" },
              { label: "Years operating", value: providerProfile.yearsOperating ? String(providerProfile.yearsOperating) : "Not added" },
            ].map((field) => <div key={field.label}><p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-400">{field.label}</p><p className="mt-1 break-words text-sm text-stone-800">{field.value || "Not added"}</p></div>)}
            <div className="sm:col-span-2"><p className="text-xs font-medium uppercase tracking-[0.08em] text-stone-400">Description</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-stone-600">{providerProfile.description || "No description added yet."}</p></div>
          </div>}
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#17212b]">Verification</h2><p className="mt-1 text-xs text-stone-500">Build trust with workers using reviewed documents.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${providerProfile.verified ? "bg-emerald-50 text-emerald-800" : providerProfile.verificationStatus === "pending" ? "bg-amber-50 text-amber-800" : providerProfile.verificationStatus === "rejected" ? "bg-rose-50 text-rose-800" : "bg-stone-100 text-stone-600"}`}>{providerProfile.verified ? "Verified" : providerProfile.verificationStatus === "pending" ? "In review" : providerProfile.verificationStatus === "rejected" ? "Action needed" : "Not verified"}</span></div>
            <p className="mt-3 text-sm leading-5 text-stone-600">{providerProfile.verified ? `Your account was verified${providerProfile.verifiedDate ? ` on ${providerProfile.verifiedDate}` : ""}.` : providerProfile.verificationStatus === "pending" ? `${providerProfile.verificationDocumentName || "Your document"} is awaiting administrator review.` : providerProfile.verificationStatus === "rejected" ? providerProfile.verificationReviewNote || "Your document was not accepted. Upload a corrected document to resubmit." : providerProfile.providerType === "individual" ? "Submit both sides of your National ID or citizenship certificate." : "Submit your business registration certificate or PAN certificate."}</p>
            {!providerProfile.verified && providerProfile.verificationStatus !== "pending" && <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
              {providerProfile.providerType === "individual" ? <><ProfileField label="Identity document"><select value={identityDocumentType} onChange={(event) => setIdentityDocumentType(event.target.value as KycDocumentType)} className="input-style"><option value="national-id">National ID (NID)</option><option value="citizenship">Citizenship certificate</option></select></ProfileField><VerificationUpload id="provider-verification-front" label={`${identityDocumentType === "citizenship" ? "Citizenship" : "National ID"} front side`} onChange={(file) => readVerificationFile(file, "front")} /><VerificationUpload id="provider-verification-back" label={`${identityDocumentType === "citizenship" ? "Citizenship" : "National ID"} back side`} onChange={(file) => readVerificationFile(file, "back")} />{verificationFront && <p className="text-xs text-emerald-700">Front: {verificationFront.name}</p>}{verificationBack && <p className="text-xs text-emerald-700">Back: {verificationBack.name}</p>}</> : <><ProfileField label="Business document"><select value={businessDocumentType} onChange={(event) => setBusinessDocumentType(event.target.value as typeof businessDocumentType)} className="input-style"><option value="BUSINESS_REGISTRATION">Business registration certificate</option><option value="PAN_CERTIFICATE">PAN certificate</option></select></ProfileField><VerificationUpload id="provider-verification-front" label="Select document" onChange={(file) => readVerificationFile(file, "front")} />{verificationFront && <p className="text-xs text-emerald-700">Selected: {verificationFront.name}</p>}</>}
              {verificationMessage && <p role="status" className="text-xs text-stone-600">{verificationMessage}</p>}
              <button type="button" disabled={verificationBusy || !verificationFront || (providerProfile.providerType === "individual" && !verificationBack)} onClick={() => void submitVerificationFiles()} className="w-full rounded-lg bg-[#176B4D] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10563D] disabled:cursor-not-allowed disabled:opacity-50">{verificationBusy ? "Submitting…" : providerProfile.verificationStatus === "rejected" ? "Resubmit for verification" : "Submit for verification"}</button>
            </div>}
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#17212b]">Build worker trust</h2>
            <div className="mt-3 space-y-2 text-sm text-stone-600">
              <TrustItem complete={Boolean(providerProfile.description?.trim())}>Add an organisation description</TrustItem>
              <TrustItem complete={providerProfile.verified}>Complete provider verification</TrustItem>
              <TrustItem complete={providerJobs.length > 0}>Post a job with clear details</TrustItem>
              <TrustItem complete={receivedReviews.length > 0}>Earn worker reviews</TrustItem>
            </div>
          </section>
        </div>
      </div>}

      {activeTab === "reviews" && <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#17212b]">Reviews from workers</h2><p className="mt-1 text-sm text-stone-500">Feedback from workers after completed engagements.</p></div><span className="text-sm font-medium text-stone-500">{providerProfile.reviewCount} total</span></div>
        {receivedReviews.length ? <div className="mt-5 divide-y divide-stone-100">{receivedReviews.map((review) => <article key={review.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-stone-800">{review.reviewerName}</strong><span className="text-sm font-semibold text-amber-600">{review.rating} / 5 ★</span></div>{review.comment && <p className="mt-2 text-sm leading-6 text-stone-600">{review.comment}</p>}<p className="mt-2 text-xs text-stone-400">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "Completed work review"}</p></article>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-stone-200 px-4 py-12 text-center"><p className="text-sm font-medium text-stone-700">No worker reviews yet</p><p className="mt-1 text-sm text-stone-500">Reviews appear here after completed work.</p></div>}
      </section>}

      {activeTab === "workers" && <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#17212b]">Hired workers</h2><p className="mt-1 text-sm text-stone-500">Workers hired or invited to work with {providerProfile.orgName}.</p></div><button type="button" onClick={() => navigate("provider-operations")} className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Manage team</button></div>
        {organizationWorkers.length ? <div className="mt-5 divide-y divide-stone-100">{organizationWorkers.map(({ application, job }) => {
          const status = application.showcaseHire ? "Showcase hire" : application.engagementStatus === "AWAITING_RESPONSE" ? "Offer sent" : application.engagementStatus === "COMPLETED" ? "Completed" : application.engagementStatus === "DECLINED" || application.engagementStatus === "CANCELLED" ? "Closed" : "On team"
          return <div key={application.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-stone-100 text-sm font-semibold text-stone-700">{application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-full w-full object-cover" /> : application.workerName.trim().charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-stone-900">{application.workerName}</p><p className="truncate text-sm text-stone-500">{job?.title || application.jobTitle}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{status}</span></div>
        })}</div> : <div className="mt-5 rounded-xl border border-dashed border-stone-200 px-4 py-12 text-center"><p className="text-sm font-medium text-stone-700">No workers on your team yet</p><p className="mt-1 text-sm text-stone-500">Send a hire offer from Find Workers and the worker will appear here.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => navigate("provider-hire")} className="rounded-lg bg-[#176B4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10563D]">Find workers</button><button type="button" onClick={() => navigate("provider-operations")} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Team &amp; Operations</button></div></div>}
      </section>}
    </main>
  )
}

function ProfilePill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-lg bg-[#eef5ff] px-3 py-2 text-xs font-medium text-[#1768bd] sm:text-sm">{children}</span>
}

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-xs text-stone-500">{label}</p><p className="mt-1 inline-flex rounded-lg bg-[#eef5ff] px-3 py-1.5 text-sm font-semibold text-[#1768bd]">{value}</p></div>
}

function ProfileField({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`block text-xs font-medium text-stone-600 ${className}`}>{label}<div className="mt-1">{children}</div></label>
}

function VerificationUpload({ id, label, onChange }: { id: string; label: string; onChange: (file: File | undefined) => void }) {
  return <label htmlFor={id} className="block cursor-pointer rounded-lg border border-dashed border-stone-300 px-3 py-2.5 text-xs font-medium text-stone-600 hover:border-[#176B4D] hover:bg-emerald-50/40">{label}<input id={id} type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-stone-100 file:px-2.5 file:py-1.5 file:font-semibold file:text-stone-700" onChange={(event) => { onChange(event.target.files?.[0]); event.target.value = "" }} /></label>
}

function TrustItem({ complete, children }: { complete: boolean; children: React.ReactNode }) {
  return <p className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${complete ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`} aria-hidden="true">{complete ? "✓" : "·"}</span><span>{children}</span></p>
}
