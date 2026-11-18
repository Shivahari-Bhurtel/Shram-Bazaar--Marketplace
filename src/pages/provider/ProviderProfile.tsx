import { useState } from "react"
import { useApp } from "../../store/AppContext"
import { VerifiedBadge } from "../../components/StatusBadge"
import { DISTRICTS } from "../../data/mockData"
import { isValidNepalPan, isValidPhoneNumber } from "../../utils/validation"

export default function ProviderProfile() {
  const { state, updateProviderProfile, submitProviderVerification } = useApp()
  const { providerProfile } = state
  const [editing, setEditing] = useState(false)
  const [tempData, setTempData] = useState<any>({})
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [verificationMessage, setVerificationMessage] = useState("")

  if (!providerProfile) return null

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

  const saveEdit = () => {
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

    updateProviderProfile({
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">
            Organisation Profile
          </h1>
          <p className="text-stone-500">
            Manage your organisation's public profile.
          </p>
        </div>
        {saved && (
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fade-in">
            ✓ Saved
          </span>
        )}
      </div>

      {/* Header card */}
      <div className="bg-gradient-to-r from-primary-dark to-primary rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
          <img
            src={providerProfile.logo}
            alt={providerProfile.orgName}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-xl font-bold text-white">
              {providerProfile.orgName}
            </h2>
            {providerProfile.verified && <VerifiedBadge small />}
          </div>
          <p className="text-white/70 text-sm">
            {providerProfile.industry} · {providerProfile.location}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-white/70 text-sm">
              {providerProfile.totalHires} workers hired
            </span>
            <span className="text-white/30">·</span>
            <div className="flex items-center gap-1">
              <span className="text-amber text-sm">★</span>
              <span className="text-white font-medium">
                {providerProfile.rating}
              </span>
              <span className="text-white/40 text-xs">
                ({providerProfile.reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* Main info */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">
                Organisation Details
              </h3>
              {!editing ? (
                <button
                  onClick={startEdit}
                  className="text-xs text-primary-ink hover:underline font-medium"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setProfileError("")
                      setEditing(false)
                    }}
                    className="text-xs text-stone-500 hover:text-stone-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="text-xs font-medium text-white bg-primary px-2.5 py-1 rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {editing && profileError && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {profileError}
              </p>
            )}

            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Provider type</label>
                  <select value={tempData.providerType || "business"} onChange={(event) => { setProfileError(""); setTempData((current: any) => ({ ...current, providerType: event.target.value })) }} className="input-style">
                    <option value="individual">Individual / household</option>
                    <option value="business">Business</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
                {[
                  { label: tempData.providerType === "individual" ? "Display name" : "Organisation Name", key: "orgName", type: "text" },
                  { label: "Contact Person", key: "contactName", type: "text" },
                  { label: "Phone", key: "phone", type: "tel" },
                  { label: "Location", key: "location", type: "text" },
                  { label: tempData.providerType === "individual" ? "PAN Number (optional)" : "PAN Number", key: "pan", type: "text" },
                  { label: "Website (optional)", key: "website", type: "url" },
                  { label: "Social links (optional)", key: "socialLinks", type: "text" },
                  { label: "Operating hours (optional)", key: "operatingHours", type: "text" },
                  { label: "Years operating (optional)", key: "yearsOperating", type: "number" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-stone-600 block mb-1">
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={tempData[f.key] ?? ""}
                      onChange={(e) => {
                        setProfileError("")
                        setTempData((p: any) => ({
                          ...p,
                          [f.key]: f.key === "yearsOperating" ? Number(e.target.value) : e.target.value,
                        }))
                      }}
                      inputMode={f.key === "pan" ? "numeric" : undefined}
                      pattern={
                        f.key === "phone"
                          ? "[+]?[0-9\\s\\(\\)\\x2d]{7,20}"
                          : f.key === "pan"
                            ? "[0-9]{9}"
                            : undefined
                      }
                      maxLength={
                        f.key === "phone"
                          ? 20
                          : f.key === "pan"
                            ? 9
                            : f.key === "orgName" || f.key === "contactName"
                              ? 120
                              : undefined
                      }
                      className="input-style"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    District
                  </label>
                  <select
                    value={tempData.district}
                    onChange={(e) => {
                      setProfileError("")
                      setTempData((p: any) => ({
                        ...p,
                        district: e.target.value,
                      }))
                    }}
                    className="input-style"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Industry
                  </label>
                  <select
                    value={tempData.industry}
                    onChange={(e) => {
                      setProfileError("")
                      setTempData((p: any) => ({
                        ...p,
                        industry: e.target.value,
                      }))
                    }}
                    className="input-style"
                  >
                    {industries.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-stone-600 block mb-1">
                    Organisation Description
                  </label>
                  <textarea
                    value={tempData.description}
                    rows={4}
                    maxLength={1000}
                    onChange={(e) => {
                      setProfileError("")
                      setTempData((p: any) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }}
                    className="input-style resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Organisation", value: providerProfile.orgName },
                  {
                    label: "Contact Person",
                    value: providerProfile.contactName,
                  },
                  { label: "Phone", value: providerProfile.phone },
                  { label: "Email", value: providerProfile.email },
                  { label: "Location", value: providerProfile.location },
                  { label: "District", value: providerProfile.district },
                  { label: "Industry", value: providerProfile.industry },
                  { label: "Provider type", value: providerProfile.providerType || "Business" },
                  { label: "PAN Number", value: providerProfile.pan || "Not provided" },
                  { label: "Website", value: providerProfile.website || "Not added" },
                  { label: "Social links", value: providerProfile.socialLinks || "Not added" },
                  { label: "Operating hours", value: providerProfile.operatingHours || "Not added" },
                  { label: "Years operating", value: providerProfile.yearsOperating ? String(providerProfile.yearsOperating) : "Not added" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-mono-data mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-sm text-stone-800">{item.value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-mono-data mb-0.5">
                    Description
                  </p>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {providerProfile.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Verification */}
          <div
            className={`rounded-2xl p-5 border ${
              providerProfile.verified
                ? "bg-teal-50 border-teal-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              {providerProfile.verified ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0D7377"
                    strokeWidth="2.5"
                    className="w-5 h-5"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="font-semibold text-teal">
                    Verified Provider
                  </span>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="font-semibold text-amber-800">
                    {providerProfile.verificationStatus === "pending" ? "Verification Pending" : providerProfile.verificationStatus === "rejected" ? "Update Required" : "Not Verified"}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              {providerProfile.verified
                ? `Verified on ${providerProfile.verifiedDate}. Your Verified badge increases worker trust and application rates.`
                : providerProfile.verificationStatus === "pending"
                  ? `Your ${providerProfile.verificationDocumentName || "verification document"} is awaiting admin review.`
                  : providerProfile.verificationStatus === "rejected"
                    ? providerProfile.verificationReviewNote || "Your document was not accepted. Submit an updated document for review."
                    : (providerProfile.providerType || "business") === "individual"
                      ? "Submit a current government identity document. An administrator must review it before your provider badge is verified."
                      : "Submit a business registration document or PAN certificate. An administrator must review it before your provider badge is verified."}
            </p>
            {!providerProfile.verified && providerProfile.verificationStatus !== "pending" && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-medium text-stone-700" htmlFor="provider-verification-file">{(providerProfile.providerType || "business") === "individual" ? "Identity document (citizenship, national ID, or passport; PDF, PNG, JPG; max 1 MB)" : "Business registration or PAN document (PDF, PNG, JPG; max 1 MB for browser storage)"}</label>
                <input id="provider-verification-file" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-stone-700" onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (!file) return
                  const extension = file.name.split(".").pop()?.toLowerCase()
                  const supportedType = file.type === "application/pdf" || file.type === "image/png" || file.type === "image/jpeg"
                  const supportedExtension = extension === "pdf" || extension === "png" || extension === "jpg" || extension === "jpeg"
                  if (!supportedType && !supportedExtension) {
                    setVerificationMessage("Choose a PDF, PNG or JPG verification document.")
                    return
                  }
                  if (!file.size || file.size > 1 * 1024 * 1024) {
                    setVerificationMessage("The document must be between 1 byte and 1 MB in this browser prototype.")
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      submitProviderVerification(file.name, reader.result)
                      setVerificationMessage("Document submitted for administrator review.")
                    } else setVerificationMessage("Could not read that document. Please select it again.")
                  }
                  reader.onerror = () => setVerificationMessage("Could not read that document. Please select it again.")
                  reader.readAsDataURL(file)
                }} />
                {verificationMessage && <p role="status" className="text-xs text-stone-700">{verificationMessage}</p>}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Hiring Stats</h3>
            <div className="space-y-3">
              {[
                {
                  label: "Total Workers Hired",
                  value: providerProfile.totalHires,
                },
                {
                  label: "Provider Rating",
                  value: `${providerProfile.rating} ★`,
                },
                { label: "Worker Reviews", value: providerProfile.reviewCount },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-stone-500">{s.label}</span>
                  <span className="font-semibold text-stone-900 font-mono-data">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust tips */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-3 text-sm">
              Build Worker Trust
            </h3>
            <div className="space-y-2 text-xs text-stone-500">
              <p>✓ Complete organisation description</p>
              <p>✓ Verify your PAN registration</p>
              <p>✓ Post detailed job descriptions</p>
              <p>✓ Respond to applicants promptly</p>
              <p>✓ Maintain high worker ratings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
