import { useState, type FormEvent, type ChangeEvent } from "react"
import { useApp } from "../../store/AppContext"
import type { KycDocumentType } from "../../types"
import { nepalDateString } from "../../utils/dates"
import { isValidPhoneNumber } from "../../utils/validation"

const documentHelp: Record<KycDocumentType, string> = {
  "national-id": "Enter the number shown on your Nepal National ID.",
  citizenship: "Enter the certificate number exactly as printed.",
  passport: "Enter the number shown on your current passport.",
  "driving-licence": "Enter the licence number shown on your driving licence.",
}

export default function KycVerification() {
  const { state, navigate, updateWorkerProfile, submitKyc } = useApp()
  const profile = state.workerProfile
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [contactMessage, setContactMessage] = useState("")
  const [codes, setCodes] = useState<Partial<Record<"phone" | "email", {
    value: string
    recipient: string
    expiresAt: number
  }>>>({})
  const [codeInputs, setCodeInputs] =
    useState<Partial<Record<"phone" | "email", string>>>({})
  const [form, setForm] = useState({
    documentType: "national-id" as KycDocumentType,
    documentNumber: "",
    fileName: "",
    documentData: "",
    backFileName: "",
    backDocumentData: "",
    documentExpiryDate: "",
    selfieFileName: "",
    selfieData: "",
  })
  const [formMessage, setFormMessage] = useState("")
  const [readingFile, setReadingFile] = useState(false)

  if (!profile) return null

  const status = profile.kycStatus ?? "not-verified"
  const contactsVerified = !!profile.phoneVerified && !!profile.emailVerified
  const requiresDemoContactVerification = import.meta.env.VITE_DEMO_MODE === "true"
  const maskedNumber = profile.kycDocumentNumber
    ? `••••${profile.kycDocumentNumber.slice(-4)}`
    : ""

  const sendCode = (method: "phone" | "email") => {
    const normalizedPhone = phone.trim()
    if (method === "phone" && !isValidPhoneNumber(normalizedPhone)) {
      setContactMessage("Enter a valid phone number before requesting a code.")
      return
    }
    if (
      method === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
    ) {
      setContactMessage(
        "Add a valid email address to your account before requesting a code.",
      )
      return
    }
    if (method === "phone") updateWorkerProfile({ phone: normalizedPhone })
    const random = new Uint32Array(1)
    crypto.getRandomValues(random)
    const code = String(100000 + (random[0] % 900000))
    setCodes((current) => ({
      ...current,
      [method]: {
        value: code,
        recipient: method === "phone" ? normalizedPhone : profile.email,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
    }))
    setCodeInputs((current) => ({ ...current, [method]: "" }))
    setContactMessage(
      `Demo code generated for ${method}. No SMS or email was sent.`,
    )
  }

  const verifyCode = (method: "phone" | "email") => {
    const pending = codes[method]
    if (!pending) {
      setContactMessage("Request a new demo code first.")
      return
    }
    if (Date.now() > pending.expiresAt) {
      setCodes((current) => ({ ...current, [method]: undefined }))
      setContactMessage("That code expired. Request a new demo code.")
      return
    }
    const currentRecipient = method === "phone" ? phone.trim() : profile.email
    if (currentRecipient !== pending.recipient) {
      setCodes((current) => ({ ...current, [method]: undefined }))
      setContactMessage(
        "The contact changed. Generate a new code for the updated contact.",
      )
      return
    }
    if ((codeInputs[method] ?? "").trim() !== pending.value) {
      setContactMessage(
        "That code does not match. Check the demo code and try again.",
      )
      return
    }
    updateWorkerProfile(
      method === "phone" ? { phoneVerified: true } : { emailVerified: true },
    )
    setCodes((current) => ({ ...current, [method]: undefined }))
    setContactMessage(
      `${
        method === "phone" ? "Phone number" : "Email address"
      } verified in this demo.`,
    )
  }

  const handleDocumentFile = (
    event: ChangeEvent<HTMLInputElement>,
    kind: "document" | "back" | "selfie" = "document",
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    const clearSelectedFile = () =>
      setForm((current) =>
        kind === "document" ? { ...current, fileName: "", documentData: "" }
          : kind === "back" ? { ...current, backFileName: "", backDocumentData: "" }
            : { ...current, selfieFileName: "", selfieData: "" },
      )
    const acceptedTypes =
      kind !== "selfie"
        ? ["image/jpeg", "image/png", "application/pdf"]
        : ["image/jpeg", "image/png"]
    const extension = file.name.split(".").pop()?.toLowerCase()
    const supportedExtension = kind !== "selfie"
      ? ["jpg", "jpeg", "png", "pdf"].includes(extension || "")
      : ["jpg", "jpeg", "png"].includes(extension || "")
    if (!acceptedTypes.includes(file.type) && !supportedExtension) {
      clearSelectedFile()
      setFormMessage(
        kind !== "selfie"
          ? "Choose a JPG, PNG, or PDF identity document."
          : "Choose a JPG or PNG selfie image.",
      )
      event.target.value = ""
      return
    }
    if (file.size === 0) {
      clearSelectedFile()
      setFormMessage("The selected file is empty. Choose another file.")
      event.target.value = ""
      return
    }
    const maxSize = kind !== "selfie" ? 1 * 1024 * 1024 : 512 * 1024
    if (file.size > maxSize) {
      clearSelectedFile()
      setFormMessage(kind !== "selfie" ? "Choose an identity document smaller than 1 MB for browser storage." : "Choose a selfie image smaller than 512 KB for browser storage.")
      event.target.value = ""
      return
    }
    clearSelectedFile()
    setReadingFile(true)
    const reader = new FileReader()
    reader.onload = () => {
      setReadingFile(false)
      if (typeof reader.result !== "string") {
        clearSelectedFile()
        setFormMessage("The file could not be read. Choose another file.")
        event.target.value = ""
        return
      }
      setForm((current) =>
        kind === "document" ? {
              ...current,
              fileName: file.name,
              documentData: String(reader.result),
            } : kind === "back" ? {
              ...current,
              backFileName: file.name,
              backDocumentData: String(reader.result),
            } : {
              ...current,
              selfieFileName: file.name,
              selfieData: String(reader.result),
            },
      )
      setFormMessage("")
    }
    reader.onerror = () => {
      setReadingFile(false)
      clearSelectedFile()
      setFormMessage("The file could not be read. Choose another file.")
      event.target.value = ""
    }
    try {
      reader.readAsDataURL(file)
    } catch {
      setReadingFile(false)
      clearSelectedFile()
      setFormMessage("The file could not be read. Choose another file.")
      event.target.value = ""
    }
  }

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const error = submitKyc(form)
    const result = await error
    setFormMessage(result ?? "Your identity document was submitted for review.")
  }

  return (
    <main className="w-full max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <button
        onClick={() => navigate("worker-profile")}
        className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-stone-600 transition-colors hover:text-primary-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 12H5m7 7-7-7 7-7"
          />
        </svg>
        Back to profile
      </button>

      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary-ink">
          Account security
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
          Verify your account
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Confirm your contact details and submit an identity document for
          review.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5h16v14H4zM8 9h.01M11 9h5M8 13h8M8 16h5"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-stone-900">Phone number</p>
            <p
              className={`text-xs font-medium ${
                profile.phoneVerified ? "text-teal" : "text-stone-500"
              }`}
            >
              {profile.phoneVerified ? "Verified" : "Not verified"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              status === "verified"
                ? "bg-teal-50 text-teal"
                : status === "pending"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-stone-100 text-stone-500"
            }`}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 3h10l4 4v14H3V3h4Zm5 7v6m-3-3h6"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-stone-900">
              Identity document
            </p>
            <p
              className={`text-xs font-medium ${
                status === "verified"
                  ? "text-teal"
                  : status === "pending"
                    ? "text-amber-700"
                    : "text-stone-500"
              }`}
            >
              {status === "verified"
                ? "Verified"
                : status === "pending"
                  ? "In review"
                  : status === "expired"
                    ? "Expired"
                    : "Not submitted"}
            </p>
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="font-display text-xl font-bold text-stone-900">
            Contact verification
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            Verify the phone and email saved to your account with a one-time
            code.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(["phone", "email"] as const).map((method) => {
            const verified =
              method === "phone" ? profile.phoneVerified : profile.emailVerified
            const value = method === "phone" ? phone : profile.email
            return (
              <div
                key={method}
                className="rounded-xl border border-stone-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold capitalize text-stone-900">
                    {method === "phone" ? "Phone number" : "Email address"}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      verified
                        ? "bg-teal-50 text-teal"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {verified ? "Verified" : "Not verified"}
                  </span>
                </div>
                {method === "phone" ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    placeholder="+977 98XXXXXXXX"
                    className="input-style"
                    aria-label="Mobile number"
                  />
                ) : (
                  <input
                    type="email"
                    value={value}
                    readOnly
                    className="input-style bg-stone-50"
                    aria-label="Account email"
                  />
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sendCode(method)}
                    className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    Generate demo code
                  </button>
                  {verified && (
                    <span className="self-center text-xs text-teal">
                      Contact confirmed
                    </span>
                  )}
                </div>
                {codes[method] && (
                  <div className="mt-3 space-y-2 rounded-lg bg-amber-50 p-3">
                    <p className="text-xs text-amber-900">
                      Demo code (valid for 5 minutes):{" "}
                      <strong className="font-mono">
                        {codes[method]?.value}
                      </strong>
                    </p>
                    <div className="flex gap-2">
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={codeInputs[method] ?? ""}
                        onChange={(event) =>
                          setCodeInputs((current) => ({
                            ...current,
                            [method]: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                          }))
                        }
                        placeholder="6-digit code"
                        className="input-style min-w-0"
                        aria-label={`${method} verification code`}
                      />
                      <button
                        type="button"
                        onClick={() => verifyCode(method)}
                        className="rounded-xl border border-amber-300 px-3 text-sm font-semibold text-amber-900"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            Local demo only
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Codes are generated and shown on this page; no SMS or email is sent.
            A trusted server and delivery provider are needed for real contact
            verification.
          </p>
        </div>
        {contactMessage && (
          <p role="status" className="mt-3 text-sm font-medium text-stone-600">
            {contactMessage}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900">
              Identity document
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
              Submit both sides of your current Nepal National ID. Your document details are
              not displayed on your public profile.
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
              status === "verified"
                ? "bg-teal-50 text-teal"
                : status === "pending"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {status === "verified"
              ? "Verified"
              : status === "pending"
                ? "In review"
                : status === "expired"
                  ? "Expired · resubmit"
                  : "Not verified"}
          </span>
        </div>

        {status === "verified" ? (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
            <p className="text-sm font-semibold text-teal">Identity verified</p>
            <p className="mt-1 text-sm text-teal/80">
              Verified {profile.kycVerifiedDate || "successfully"}.
            </p>
            {maskedNumber && (
              <p className="mt-2 text-xs text-stone-600">
                Document ending in {maskedNumber.slice(-4)}
              </p>
            )}
          </div>
        ) : status === "pending" ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Your document is being reviewed
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Submitted {profile.kycSubmittedDate || "recently"}. You can leave
              this page while the review is pending.
            </p>
            {profile.kycDocumentFileName && (
              <p className="mt-2 text-xs text-amber-800">
                {profile.kycDocumentFileName} · document ending in{" "}
                {maskedNumber.slice(-4)}
              </p>
            )}
          </div>
        ) : (
          <>
            {status === "expired" && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Your identity document has expired
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Submit a current document to restore your verified status and
                  apply for work.
                </p>
              </div>
            )}
            {status === "rejected" && profile.kycReviewNote && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900">
                  An update is needed
                </p>
                <p className="mt-1 text-sm text-red-800">
                  {profile.kycReviewNote}
                </p>
              </div>
            )}
            <form
              onSubmit={submitDocument}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">Document type</span>
                <select value={form.documentType} onChange={(event) => setForm((current) => ({ ...current, documentType: event.target.value as KycDocumentType }))} className="input-style">
                  <option value="national-id">National ID (NID)</option>
                  <option value="citizenship">Citizenship certificate</option>
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Document number
                </span>
                <input
                  value={form.documentNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      documentNumber: event.target.value,
                    }))
                  }
                  minLength={4}
                  maxLength={40}
                  placeholder="Enter the number on your document"
                  className="input-style"
                  required
                />
                <span className="mt-1 block text-xs text-stone-500">
                  {documentHelp[form.documentType]}
                </span>
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Document expiry date (if shown)
                </span>
                <input
                  type="date"
                  min={nepalDateString()}
                  value={form.documentExpiryDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      documentExpiryDate: event.target.value,
                    }))
                  }
                  className="input-style"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Leave blank for documents without an expiry date.
                </span>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">Upload front of {form.documentType === "citizenship" ? "citizenship certificate" : "National ID"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleDocumentFile}
                  disabled={readingFile}
                  className="input-style"
                  required
                />
                <span className="mt-1 block text-xs text-stone-500">
                  JPG, PNG, or PDF · Maximum 1 MB in this browser prototype · Ensure the full document is
                  readable.
                </span>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">Upload back of {form.documentType === "citizenship" ? "citizenship certificate" : "National ID"}</span>
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => handleDocumentFile(event, "back")} disabled={readingFile} className="input-style" required={import.meta.env.VITE_DEMO_MODE !== "true"} />
                <span className="mt-1 block text-xs text-stone-500">JPG, PNG, or PDF · Maximum 1 MB.</span>
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-stone-700">
                  Selfie for identity confirmation (optional)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="user"
                  onChange={(event) => handleDocumentFile(event, "selfie")}
                  disabled={readingFile}
                  className="input-style"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  JPG or PNG · Maximum 512 KB in this browser prototype · Add this only if requested for
                  review.
                </span>
              </label>
              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-stone-500">
                  {form.fileName
                    ? `Front: ${form.fileName}`
                    : "No document selected."}
                  {form.backFileName ? ` · Back: ${form.backFileName}` : ""}
                  {form.selfieFileName
                    ? ` · Selfie: ${form.selfieFileName}`
                    : ""}
                </p>
                <button
                  type="submit"
                  disabled={(requiresDemoContactVerification && !contactsVerified) || readingFile}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {readingFile ? "Reading file…" : "Submit for review"}
                </button>
              </div>
              {requiresDemoContactVerification && !contactsVerified && (
                <p className="text-xs text-amber-800 sm:col-span-2">
                  Verify both your phone and email above to submit your identity
                  document.
                </p>
              )}
            </form>
          </>
        )}
        {formMessage && (
          <p
            role={formMessage.includes("submitted") ? "status" : "alert"}
            className={`mt-4 text-sm font-medium ${
              formMessage.includes("submitted")
                ? "text-teal"
                : "text-primary-ink"
            }`}
          >
            {formMessage}
          </p>
        )}
      </section>

      <p className="mt-5 text-xs leading-relaxed text-stone-500">
        This prototype stores verification details in the browser. A secure
        server-side review and SMS service are required before using this flow
        for real identity or phone verification.
      </p>
    </main>
  )
}
