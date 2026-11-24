import { useRef, useState } from "react"
import { useApp } from "../store/AppContext"
import { DISTRICTS } from "../data/mockData"
import { LanguageSwitch } from "../i18n/LanguageContext"
import { nepalDateString } from "../utils/dates"
import { isValidAuthPasswordLength, isValidEmail, isValidPhoneNumber } from "../utils/validation"
import LoginIllustration from "../components/LoginIllustration"
import WorkerSignupIllustration from "../components/WorkerSignupIllustration"
import ProviderSignupIllustration from "../components/ProviderSignupIllustration"
import { sendResumeAnalysis, type ResumeExtraction } from "../services/shramAi"
import { resumeExperience, resumeQualifications } from "../utils/resumeProfile"

type AuthMode = "login" | "register-choice" | "worker-signup" | "provider-signup"

interface Props {
  mode: AuthMode
}

export default function AuthPage({ mode: initialMode }: Props) {
  const { navigate, login, signupWorker, signupProvider, loginAsAdmin } =
    useApp()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    dateOfBirth: "",
    district: "",
    orgName: "",
    pan: "",
    industry: "",
    businessDescription: "",
    businessWebsite: "",
    contactName: "",
    providerType: "individual" as "individual" | "business" | "organization",
  })
  const [skillInput, setSkillInput] = useState("")
  const [loading, setLoading] = useState(false)
  const submitInFlight = useRef(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeNotice, setResumeNotice] = useState("")
  const [resumeImported, setResumeImported] = useState<ResumeExtraction | null>(null)

  const importSignupResume = async (file?: File) => {
    if (!file) return
    setResumeLoading(true)
    setResumeNotice("")
    try {
      const resume = await sendResumeAnalysis(file)
      setResumeImported(resume)
      const extractedDistrict = DISTRICTS.find((district) => (resume.location || "").toLocaleLowerCase().includes(district.toLocaleLowerCase()))
      setFormData((current) => ({
        ...current,
        name: resume.fullName || current.name,
        phone: resume.phone || current.phone,
        district: current.district || extractedDistrict || "",
      }))
      if (resume.skills.length) setSkillInput((current) => [...new Set([...parseSkillInput(current), ...resume.skills])].join(", "))
      setResumeNotice(`Imported details from ${file.name}. Review the extracted details and edit the prefilled fields before creating your account.`)
    } catch (cause) {
      setResumeNotice(cause instanceof Error ? cause.message : "Could not read that resume. You can continue with manual signup.")
    } finally {
      setResumeLoading(false)
    }
  }

  const changeAuthMode = (nextMode: AuthMode) => {
    setError("")
    setStep(1)
    setLoading(false)
    submitInFlight.current = false
    setResumeImported(null)
    setResumeNotice("")
    setMode(nextMode)
  }

  const isLogin = mode === "login"
  const isRegisterChoice = mode === "register-choice"
  const isWorker = mode === "worker-signup"
  const isProvider = mode === "provider-signup"

  if (isRegisterChoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
        <section className="w-full max-w-5xl rounded-sm bg-[#5A2A27] px-7 py-11 text-white shadow-lg sm:px-14 sm:py-14" aria-labelledby="register-choice-title">
          <header className="mx-auto max-w-2xl text-center">
            <h1 id="register-choice-title" className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Create your account</h1>
            <p className="mt-4 font-serif text-base italic leading-relaxed text-[#F7E9D7] sm:text-lg">Choose how you want to use Shram Bazzar.</p>
          </header>
          <div className="mt-9 grid sm:mt-12 sm:grid-cols-2">
            <button type="button" onClick={() => changeAuthMode("worker-signup")} className="group flex min-h-48 flex-col items-center justify-center border-b border-white/25 px-4 py-8 text-center transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:border-b-0 sm:border-r sm:px-8">
              <span className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8C7A8] sm:text-sm">I’m looking for work</span>
              <span className="font-display text-4xl font-bold leading-tight tracking-tight text-white transition group-hover:text-amber-200 sm:text-5xl">Job Seeker</span>
            </button>
            <button type="button" onClick={() => changeAuthMode("provider-signup")} className="group flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-8">
              <span className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8C7A8] sm:text-sm">I’m hiring</span>
              <span className="font-display text-4xl font-bold leading-tight tracking-tight text-white transition group-hover:text-amber-200 sm:text-5xl">Employer</span>
            </button>
          </div>
          <p className="mt-9 border-t border-white/30 pt-7 text-center text-base font-semibold text-[#F7E9D7]">Already have an account? <button type="button" onClick={() => changeAuthMode("login")} className="font-bold text-white underline-offset-4 hover:text-amber-200 hover:underline">Sign in</button></p>
        </section>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (isLogin) {
      if (!isValidEmail(formData.email)) {
        setError("Enter a valid email address.")
        return
      }
      if (!formData.password) {
        setError("Enter your password.")
        return
      }
      if (submitInFlight.current) return
      submitInFlight.current = true
      setLoading(true)
      try {
        const result = await login(formData.email, formData.password)
        if (result) setError(result)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Sign in failed. Please try again.")
      } finally {
        submitInFlight.current = false
        setLoading(false)
      }
    } else if (step < 2) {
      if (isWorker && !formData.name.trim()) {
        setError("Enter your full name.")
        return
      }
      if (isProvider && !formData.contactName.trim()) {
        setError("Enter a contact person name.")
        return
      }
      if (!isValidEmail(formData.email)) {
        setError("Enter a valid email address.")
        return
      }
      if (isProvider && !isValidPhoneNumber(formData.phone)) {
        setError("Enter a phone number with 7 to 15 digits.")
        return
      }
      if (formData.password.length < 8) {
        setError("Use a password with at least 8 characters.")
        return
      }
      if (!isValidAuthPasswordLength(formData.password)) {
        setError("Use a password of 72 UTF-8 bytes or fewer.")
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.")
        return
      }
      setStep((s) => s + 1)
    } else {
      if (submitInFlight.current) return
      submitInFlight.current = true
      const resultPromise = isWorker
        ? signupWorker({
            email: formData.email,
            password: formData.password,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            dateOfBirth: formData.dateOfBirth,
            address: resumeImported?.location || formData.district,
            district: formData.district,
            location: resumeImported?.location || formData.district,
            skills: parseSkillInput(skillInput),
            bio: resumeImported?.bio || "",
            qualifications: resumeImported ? resumeQualifications(resumeImported) : [],
            experience: resumeImported ? resumeExperience(resumeImported).filter((item) => Boolean(item.startDate && (item.endDate || item.currentlyWorking))) : [],
            languages: resumeImported?.languages || [],
            certifications: resumeImported?.certifications || [],
            contactEmail: resumeImported?.email || "",
            employmentPreferences: resumeImported?.employmentPreferences || [],
            preferredShifts: resumeImported?.preferredShifts || [],
            weekendsAvailable: resumeImported?.weekendsAvailable ?? null,
            availableStart: resumeImported?.availableStart || "",
            preferredWorkLocation: resumeImported?.preferredWorkLocation || "",
            referenceNote: resumeImported?.referenceNote || "",
          })
        : signupProvider({
            email: formData.email,
            password: formData.password,
            contactName: formData.contactName,
            providerType: formData.providerType,
            dateOfBirth: formData.dateOfBirth,
            address: formData.district,
            phone: formData.phone,
            orgName: formData.orgName || formData.contactName,
            pan: formData.pan,
            industry: "Other",
            description: formData.businessDescription,
            website: formData.businessWebsite,
            district: formData.district,
            location: formData.district,
          })
      setLoading(true)
      try {
        const result = await resultPromise
        if (result) setError(result)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not create your account. Please try again.")
      } finally {
        submitInFlight.current = false
        setLoading(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderWidth: "3px" }}
          />
          <p className="text-stone-600 font-medium">Setting up your account…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left panel */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-[#3C3431] p-12 lg:flex lg:w-5/12">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-[#302825] to-[#49403C]"
        />
        <div className="relative my-auto w-full -translate-y-3 lg:-translate-y-8">
          <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            {isLogin
              ? "Welcome back to Shrama"
              : isWorker
                ? "Find work that fits your life"
                : "Hire the right people, fast"}
          </h2>
          <p className="text-white/75 leading-relaxed">
            {isLogin
              ? "Sign in to your account to continue your journey on Nepal's flexible work platform."
              : isWorker
                ? "Thousands of flexible jobs across Nepal. Match your skills and availability with the right opportunity."
                : "Post jobs, review qualified applicants, and build your flexible workforce with confidence."}
          </p>
          {isLogin ? (
            <LoginIllustration />
          ) : isWorker ? (
            <WorkerSignupIllustration />
          ) : (
            <ProviderSignupIllustration />
          )}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex min-h-screen flex-1 flex-col bg-white px-6 pb-8 pt-24 sm:px-10 lg:px-14">
        <div className="absolute inset-x-6 top-5 sm:inset-x-10 lg:inset-x-14">
          <div className="mx-auto flex w-full max-w-md items-center justify-between">
            <button
              onClick={() => navigate("landing")}
              className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              >
                <path d="M19 12H5m7 7-7-7 7-7" />
              </svg>
              Back to homepage
            </button>
            <div className="translate-x-3">
              <LanguageSwitch inline />
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="my-auto mx-auto w-full max-w-md lg:-translate-y-3">
            {/* Mode toggle (login page) */}
            {isLogin && (
              <div className="mb-8 flex rounded-xl bg-stone-100 p-1">
                <button
                  type="button"
                  onClick={() => changeAuthMode("login")}
                  className="flex-1 rounded-lg bg-white py-2.5 text-sm font-medium text-stone-900 shadow-sm transition-colors"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => changeAuthMode("register-choice")}
                  className="flex-1 rounded-lg py-2.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
                >
                  Register
                </button>
              </div>
            )}

            <div className="mb-8">
              <h1 className="mb-3 font-sans text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                {isLogin
                  ? "Sign in to your account"
                  : isWorker
                    ? step === 1
                      ? "Create Account"
                      : "Tell us about your skills"
                    : step === 1
                      ? "Create Provider Account"
                      : "Organisation Details"}
              </h1>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-ink"
              >
                {error}
                {!isLogin && /already registered|already exists/i.test(error) && (
                  <button
                    type="button"
                    onClick={() => changeAuthMode("login")}
                    className="ml-2 font-semibold underline underline-offset-2"
                  >
                    Go to sign in
                  </button>
                )}
              </div>
            )}

            {!isLogin && isWorker && step === 2 && (
              <p className="mb-4 text-sm text-stone-600">
                Already have an account?{" "}
                <button type="button" onClick={() => changeAuthMode("login")} className="font-semibold text-[#5A2A27] hover:underline">
                  Sign in
                </button>
              </p>
            )}

            <form noValidate onSubmit={handleSubmit} className="auth-form space-y-4">
              {/* Login fields */}
              {isLogin && (
                <>
                  <Field label="Email address">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-12 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                    <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                    </div>
                  </Field>
                </>
              )}

              {/* Worker signup: email and password only */}
              {isWorker && step === 1 && (
                <>
                  <Field label="Full name">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Hariom Sharma"
                      className="w-full rounded-md border border-stone-300 bg-white px-4 py-3.5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      autoComplete="name"
                      required
                    />
                  </Field>
                  <Field label="Email address">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="you@example.com"
                      className="w-full rounded-md border border-stone-300 bg-white px-4 py-3.5 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      autoComplete="email"
                      required
                    />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="At least 8 characters"
                      className="w-full rounded-md border border-stone-300 bg-white px-4 py-3.5 pr-12 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                    </div>
                  </Field>
                  <Field label="Confirm password">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="Re-enter your password"
                        className="w-full rounded-md border border-stone-300 bg-white px-4 py-3.5 pr-12 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                      <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                    </div>
                  </Field>
                </>
              )}

              {/* Worker signup step 2 */}
              {isWorker && step === 2 && (
                <>
                  {resumeNotice.startsWith("Imported details") && <Field label="Full name"><input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20" required /></Field>}
                  <div className="rounded-xl border border-[#176B4D]/20 bg-[#176B4D]/5 p-4">
                    <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-[#176B4D]/30 bg-white px-4 text-sm font-semibold text-[#176B4D] hover:bg-[#176B4D]/5">
                      {resumeLoading ? "Importing resume…" : "Import from CV (optional)"}
                      <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" disabled={resumeLoading} onChange={(event) => { void importSignupResume(event.target.files?.[0]); event.currentTarget.value = "" }} />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-stone-600">PDF or DOCX, up to 4 MB. Imported details stay editable and are saved only when you submit signup.</p>
                    {resumeNotice && <p role="status" className="mt-2 text-sm text-stone-700">{resumeNotice}</p>}
                    {resumeImported && <div className="mt-3 space-y-1 border-t border-[#176B4D]/15 pt-3 text-xs leading-5 text-stone-700"><p><strong>Profile details found:</strong> {resumeImported.qualifications.length} qualifications · {resumeImported.experience.length} work entries · {resumeImported.languages.length} languages · {resumeImported.certifications.length} certifications</p>{resumeImported.email && <p>Resume email: {resumeImported.email} · the account email above remains unchanged</p>}{resumeImported.qualifications.map((item, index) => <p key={`q-${index}`}>Education: {item.name}{item.institution ? ` · ${item.institution}` : ""}{item.year ? ` · ${item.year}` : ""}</p>)}{resumeImported.experience.map((item, index) => <p key={`e-${index}`}>Experience: {item.title}{item.company ? ` · ${item.company}` : ""}{item.startDate ? ` · ${item.startDate}` : ""}{item.endDate ? `–${item.endDate}` : item.currentlyWorking ? "–Present" : ""}</p>)}{resumeImported.languages.length > 0 && <p>Languages: {resumeImported.languages.join(", ")}</p>}{resumeImported.certifications.length > 0 && <p>Certifications: {resumeImported.certifications.join(", ")}</p>}<p>Imported details remain unverified. Edit the visible fields now; after signup, edit qualifications and experience in Worker Profile.</p><button type="button" onClick={() => { setResumeImported(null); setResumeNotice("Resume details removed. Continue with manual signup or import another CV.") }} className="mt-2 font-semibold text-[#176B4D] underline underline-offset-2">Remove imported CV details</button></div>}
                  </div>
                  <Field label="Date of birth">
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      max={nepalDateString()}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          dateOfBirth: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Phone number">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setError("")
                        setFormData((p) => ({ ...p, phone: e.target.value }))
                      }}
                      placeholder="+977 98XXXXXXXX"
                      autoComplete="tel"
                      pattern="[+]?[0-9\s\(\)\x2d]{7,20}"
                      maxLength={20}
                      required
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    />
                  </Field>
                  <Field label="Your district">
                    <select
                      value={formData.district}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, district: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    >
                      <option value="">Select district</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Your skills" hint="Type skills; press Enter to separate them">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          setSkillInput((value) => {
                            const trimmed = value.trimEnd()
                            if (!trimmed || trimmed.endsWith(",")) return trimmed
                            return `${trimmed}, `
                          })
                        }
                      }}
                      placeholder="e.g. Frontend development, plumbing"
                      aria-label="Type your skills, separated by commas"
                      autoComplete="off"
                      className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-base transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </Field>
                </>
              )}

              {/* Provider signup step 1 */}
              {isProvider && step === 1 && (
                <>
                  <Field label="Your name or contact person">
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          contactName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Sanjay Manandhar"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Email address">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="org@example.com"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setError("")
                        setFormData((p) => ({ ...p, phone: e.target.value }))
                      }}
                      placeholder="+977-01XXXXXXX"
                      autoComplete="tel"
                      pattern="[+]?[0-9\s\(\)\x2d]{7,20}"
                      maxLength={20}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-2.5 pr-12 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      minLength={8}
                      required
                    />
                    <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                    </div>
                  </Field>
                  <Field label="Confirm password">
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Re-enter your password" className="w-full px-4 py-2.5 pr-12 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" autoComplete="new-password" minLength={8} required />
                      <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                    </div>
                  </Field>
                </>
              )}

              {/* Provider signup step 2 */}
              {isProvider && step === 2 && (
                <>
                  <Field label="Date of birth">
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      max={nepalDateString()}
                      onChange={(e) => setFormData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Do you have a business or organization?">
                    <select
                      value={formData.providerType}
                      onChange={(e) => setFormData((p) => ({ ...p, providerType: e.target.value as typeof p.providerType, orgName: e.target.value === "individual" ? "" : p.orgName }))}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    >
                      <option value="individual">No — personal or household hiring</option>
                      <option value="business">Business</option>
                      <option value="organization">Organization</option>
                    </select>
                  </Field>
                  <Field label="District">
                    <select
                      value={formData.district}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, district: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    >
                      <option value="">Select district</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {formData.providerType !== "individual" && <>
                    <Field label={formData.providerType === "business" ? "Business name" : "Organization name"}>
                      <input type="text" value={formData.orgName} onChange={(e) => setFormData((p) => ({ ...p, orgName: e.target.value }))} placeholder="e.g. HimTech Solutions Pvt. Ltd." className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                    </Field>
                    <Field label="Business description">
                      <textarea value={formData.businessDescription} onChange={(e) => setFormData((p) => ({ ...p, businessDescription: e.target.value }))} rows={3} maxLength={1000} placeholder="What does your organization do?" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" />
                    </Field>
                    <Field label="Website (optional)">
                      <input type="url" value={formData.businessWebsite} onChange={(e) => setFormData((p) => ({ ...p, businessWebsite: e.target.value }))} placeholder="https://example.com" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" />
                    </Field>
                  </>}
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="min-h-14 w-full rounded-md bg-[#5A2A27] px-6 py-4 text-base font-semibold tracking-wide text-white transition-colors hover:bg-[#451f1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A2A27] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (isLogin ? "Signing in…" : "Creating account…") : isLogin ? (
                  "Sign In"
                ) : step < 2 ? (
                  <>
                    Continue <span aria-hidden="true">→</span>
                  </>
                ) : isWorker ? (
                  "Create my account"
                ) : (
                  "Create provider account"
                )}
              </button>
            </form>

            {isLogin && import.meta.env.VITE_DEMO_MODE === "true" && import.meta.env.DEV && (
              <button
                type="button"
                onClick={loginAsAdmin}
                className="mt-3 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                Open local admin preview
              </button>
            )}

            {/* Footer links */}
            {!isLogin && !(isWorker && step === 2) && (
              <div className="mt-6 text-center">
                <p className="text-[13px] text-stone-600">
                  Already have an account?{" "}
                  <button
                    onClick={() => changeAuthMode("login")}
                    className="font-semibold text-[#5A2A27] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PasswordVisibilityButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      title={visible ? "Hide password" : "Show password"}
      className="password-visibility-button absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-[#F7F3EE] hover:text-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {visible ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[1.2rem] w-[1.2rem]" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 7 9 7a15.7 15.7 0 0 1-3.1 3.8M6.2 6.2C4.1 7.6 3 10 3 12c0 0 3.5 7 9 7 1 0 1.9-.2 2.8-.6" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[1.2rem] w-[1.2rem]" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  )
}

function parseSkillInput(value: string): string[] {
  const seen = new Set<string>()
  return value.split(",").map((skill) => skill.trim()).filter((skill) => {
    if (!skill) return false
    const key = skill.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between">
        <label className="text-sm font-semibold text-stone-700">{label}</label>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
