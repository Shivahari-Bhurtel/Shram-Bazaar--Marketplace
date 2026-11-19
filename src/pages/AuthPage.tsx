import { useState } from "react"
import { useApp } from "../store/AppContext"
import { DISTRICTS } from "../data/mockData"
import { useSkillCatalog } from "../hooks/useSkillCatalog"
import { LanguageSwitch } from "../i18n/LanguageContext"
import { nepalDateString } from "../utils/dates"

type AuthMode = "login" | "register-choice" | "worker-signup" | "provider-signup"

interface Props {
  mode: AuthMode
}

export default function AuthPage({ mode }: Props) {
  const { navigate, login, signupWorker, signupProvider, loginAsAdmin } =
    useApp()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    district: "",
    location: "",
    orgName: "",
    pan: "",
    industry: "",
    businessDescription: "",
    businessWebsite: "",
    contactName: "",
    providerType: "individual" as "individual" | "business" | "organization",
    skills: [] as string[],
  })
  const [skillInput, setSkillInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const skillCatalog = useSkillCatalog()

  const isLogin = mode === "login"
  const isRegisterChoice = mode === "register-choice"
  const isWorker = mode === "worker-signup"
  const isProvider = mode === "provider-signup"

  if (isRegisterChoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
        <section className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-sm sm:p-10" aria-labelledby="register-choice-title">
          <button type="button" onClick={() => navigate("landing")} className="mb-8 text-sm font-medium text-stone-600 hover:text-stone-900">← Back to homepage</button>
          <h1 id="register-choice-title" className="font-display text-3xl font-bold text-stone-900">Create your account</h1>
          <p className="mt-2 text-sm text-stone-600">Choose how you want to use Shram Bazzar.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <button type="button" onClick={() => navigate("worker-signup")} className="rounded-2xl border border-stone-200 p-5 text-left transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
              <span className="block text-lg font-bold text-stone-900">I’m looking for work</span><span className="mt-2 block text-sm leading-relaxed text-stone-600">Create a worker profile, find suitable jobs, and manage applications.</span>
            </button>
            <button type="button" onClick={() => navigate("provider-signup")} className="rounded-2xl border border-stone-200 p-5 text-left transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
              <span className="block text-lg font-bold text-stone-900">I want to hire</span><span className="mt-2 block text-sm leading-relaxed text-stone-600">Register as a provider and find workers for your jobs.</span>
            </button>
          </div>
          <p className="mt-7 text-center text-sm text-stone-600">Already have an account? <button type="button" onClick={() => navigate("login")} className="font-semibold text-primary-ink hover:underline">Sign in</button></p>
        </section>
      </main>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (isLogin) {
      setLoading(true)
      const result = await login(formData.email, formData.password)
      if (result) setError(result)
      setLoading(false)
    } else if (step < 2) {
      if (formData.password.length < 8) {
        setError("Use a password with at least 8 characters.")
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.")
        return
      }
      setStep((s) => s + 1)
    } else {
      const resultPromise = isWorker
        ? signupWorker({
            email: formData.email,
            password: formData.password,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            dateOfBirth: formData.dateOfBirth,
            gender: (formData.gender ||
              undefined) as "female" | "male" | "non-binary" | "prefer-not-to-say" | undefined,
            address: formData.address.trim(),
            district: formData.district,
            location: formData.location,
            skills: formData.skills,
          })
        : signupProvider({
            email: formData.email,
            password: formData.password,
            contactName: formData.contactName,
            providerType: formData.providerType,
            dateOfBirth: formData.dateOfBirth,
            address: formData.address,
            phone: formData.phone,
            orgName: formData.orgName || formData.contactName,
            pan: formData.pan,
            industry: "Other",
            description: formData.businessDescription,
            website: formData.businessWebsite,
            district: formData.district,
            location: formData.location,
          })
      setLoading(true)
      const result = await resultPromise
      if (result) setError(result)
      setLoading(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const filteredSkills = skillCatalog.filter(
    (s) =>
      s.toLowerCase().includes(skillInput.toLowerCase()) &&
      !formData.skills.includes(s),
  ).slice(0, 12)

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
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=1200&fit=crop&auto=format')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute left-12 top-12 z-10">
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5A2A27]">
              <span className="font-brand text-white text-lg font-semibold">
                S
              </span>
            </div>
            <span className="font-brand text-2xl text-white font-semibold">
              Shrama
            </span>
          </button>
        </div>
        <div className="relative my-auto w-full">
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
          <div className="mt-8 space-y-2">
            {(isWorker
              ? [
                  "Discover jobs matched to your skills",
                  "Track all your applications in one place",
                  "Build your work history and rating",
                ]
              : isProvider
                ? [
                    "Verified provider badge builds trust",
                    "Review ranked applicant profiles",
                    "Manage all hirings from your dashboard",
                  ]
                : [
                    "Your profile and applications",
                    "New matching jobs in your district",
                    "Messages from providers",
                  ]
            ).map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 py-1 text-sm text-white/85"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="h-4 w-4 flex-shrink-0 text-emerald-400"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {item}
              </div>
            ))}
          </div>
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
                  onClick={() => navigate("login")}
                  className="flex-1 rounded-lg bg-white py-2.5 text-sm font-medium text-stone-900 shadow-sm transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("register-choice")}
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
              {!isLogin && (
                <p className="text-stone-500 text-sm leading-relaxed">
                  {isWorker
                    ? step === 1
                      ? "Add your full name, email address, and password to get started."
                      : "Step 2 of 2 · Contact, location, and skills. This helps us match you with relevant work nearby."
                    : `Step ${step} of 2 — ${
                        step === 1 ? "Contact information" : "Business details"
                      }`}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-ink"
              >
                {error}
              </div>
            )}

            {!isLogin && step === 2 && (
              <button
                type="button"
                onClick={() => {
                  setError("")
                  setStep(1)
                }}
                className="mb-3 text-sm font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
              >
                ← Back to account details
              </button>
            )}

            <form onSubmit={handleSubmit} className="auth-form space-y-4">
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
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
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
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
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
                      className="w-full px-4 py-3 pr-12 border border-stone-200 rounded-xl text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
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
                        className="w-full px-4 py-2.5 pr-12 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
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
                  <Field label="Gender (optional)">
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, gender: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="prefer-not-to-say">
                        Prefer not to say
                      </option>
                    </select>
                  </Field>
                  <Field label="Street, ward, or tole address">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Optional; not shown to employers"
                      autoComplete="street-address"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
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
                  <Field label="Local address">
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, location: e.target.value }))
                      }
                      placeholder="e.g. Baneshwor, Kathmandu"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  <Field label="Your skills" hint="Select all that apply">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Search skills…"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white mb-2"
                    />
                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {formData.skills.map((s) => (
                          <span
                            key={s}
                            className="text-xs px-2 py-1 bg-primary-50 text-primary-ink rounded-full border border-primary-100 flex items-center gap-1"
                          >
                            {s}
                            <button
                              type="button"
                              onClick={() => toggleSkill(s)}
                              className="text-primary-ink/60 hover:text-primary-ink"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {filteredSkills.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            toggleSkill(s)
                            setSkillInput("")
                          }}
                          className="text-xs px-2 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200 hover:bg-stone-200 transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
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
                  <Field label="Street, ward, or tole address">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="e.g. Shiva Chowk"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                      required
                    />
                  </Field>
                  {formData.providerType !== "individual" && <>
                    <Field label={formData.providerType === "business" ? "Business name" : "Organization name"}>
                      <input type="text" value={formData.orgName} onChange={(e) => setFormData((p) => ({ ...p, orgName: e.target.value }))} placeholder="e.g. HimTech Solutions Pvt. Ltd." className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                    </Field>
                    <Field label="Business or organization address">
                      <input type="text" value={formData.location} onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. New Baneshwor" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
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
                className="min-h-12 w-full rounded-lg bg-[#5A2A27] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#451f1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A2A27]"
              >
                {isLogin ? (
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
            {isLogin ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-xs text-stone-600">
                <span>Don’t have an account?</span>
                <button
                  onClick={() => navigate("register-choice")}
                  className="font-semibold text-[#5A2A27] hover:underline"
                >
                  Register as Worker
                </button>
                <span aria-hidden="true" className="text-stone-400">
                  ·
                </span>
                <button
                  onClick={() => navigate("provider-signup")}
                  className="font-semibold text-[#5A2A27] hover:underline"
                >
                  Register as Provider
                </button>
              </div>
            ) : (
              <div className="mt-6 text-center">
                <p className="text-[13px] text-stone-600">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("login")}
                    className="font-semibold text-[#5A2A27] hover:underline"
                  >
                    Sign in
                  </button>
                </p>
                <div className="mt-4 border-t border-stone-200 pt-4">
                  {isWorker ? (
                    <p className="text-sm text-stone-600">
                      Looking to hire?{" "}
                      <button
                        onClick={() => navigate("provider-signup")}
                        className="ml-1 font-semibold text-[#5A2A27] underline-offset-4 hover:underline"
                      >
                        Register as a provider
                      </button>
                    </p>
                  ) : (
                    <p className="text-sm text-stone-600">
                      Looking for work?{" "}
                      <button
                        onClick={() => navigate("worker-signup")}
                        className="ml-1 font-semibold text-[#5A2A27] underline-offset-4 hover:underline"
                      >
                        Register as a worker
                      </button>
                    </p>
                  )}
                </div>
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
    <button type="button" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      {visible ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 7 9 7a15.7 15.7 0 0 1-3.1 3.8M6.2 6.2C4.1 7.6 3 10 3 12c0 0 3.5 7 9 7 1 0 1.9-.2 2.8-.6" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  )
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
