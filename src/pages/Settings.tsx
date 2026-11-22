import { useEffect, useState } from "react"
import { useApp } from "../store/AppContext"

type Preferences = {
  applicationUpdates: boolean
  messages: boolean
}

const PREFERENCES_KEY = "shrama-notification-preferences-v1"

export default function Settings() {
  const { state, navigate } = useApp()
  const user = state.currentUser
  const isProvider = user?.role === "provider"
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY)
      return stored
        ? { applicationUpdates: true, messages: true, ...JSON.parse(stored) }
        : { applicationUpdates: true, messages: true }
    } catch {
      return { applicationUpdates: true, messages: true }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    } catch {
      // Keep the current preferences usable for this session if storage is unavailable.
    }
  }, [preferences])

  const togglePreference = (key: keyof Preferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-7 font-sans sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8">
        <p className="mb-3 inline-flex border border-[#553421]/20 bg-gradient-to-br from-[#fffdfa] to-[#ecdfd4] px-3 py-1.5 font-heading text-sm font-medium tracking-[0.04em] text-[#553421] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_3px_8px_-6px_rgba(85,52,33,0.55)]">
          Your account
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.04em] text-stone-950 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-600">
          Manage your account details and notification preferences.
        </p>
      </header>

      <section className="mb-6 overflow-hidden rounded-sm border border-stone-200 bg-white shadow-[0_8px_22px_-18px_rgba(85,52,33,0.5)]">
        <div className="border-b border-stone-200 bg-gradient-to-r from-[#fffdfa] to-[#f8f4f1] px-5 py-5 sm:px-7">
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-stone-900">
            Account information
          </h2>
          <p className="mt-1 text-base leading-relaxed text-stone-600">
            Your Shrama sign-in and profile details.
          </p>
        </div>
        <div className="grid gap-6 px-5 py-6 sm:grid-cols-2 sm:px-7 sm:py-7">
          <div>
            <p className="font-heading text-sm font-medium uppercase tracking-[0.08em] text-stone-500">
              Email address
            </p>
            <p className="mt-2 break-all text-lg font-normal leading-relaxed text-stone-900">
              {user?.email ?? "Not available"}
            </p>
          </div>
          <div>
            <p className="font-heading text-sm font-medium uppercase tracking-[0.08em] text-stone-500">
              Account type
            </p>
            <p className="mt-2 text-lg font-normal capitalize text-stone-900">
              {user?.role ?? "Member"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={() =>
                navigate(
                  user?.role === "provider"
                    ? "provider-profile"
                    : "worker-profile",
                )
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-[#553421]/25 bg-gradient-to-b from-white to-[#f8f4f1] px-4 py-2.5 font-heading text-base font-medium text-[#553421] shadow-[0_3px_8px_-6px_rgba(85,52,33,0.55)] transition-colors hover:border-[#553421] hover:from-[#fffaf6] hover:to-[#ecdfd4]"
            >
              Edit profile <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-sm border border-stone-200 bg-white shadow-[0_8px_22px_-18px_rgba(85,52,33,0.5)]">
        <div className="border-b border-stone-200 bg-gradient-to-r from-[#fffdfa] to-[#f8f4f1] px-5 py-5 sm:px-7">
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-stone-900">My reports</h2>
          <p className="mt-1 text-base leading-relaxed text-stone-600">Check the latest status of reports you submitted.</p>
        </div>
        <div className="divide-y divide-stone-200 px-5 sm:px-7">
          {state.myReports.length ? state.myReports.map((report) => (
            <article key={report.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-medium text-stone-900">{report.reportedUserName ? `Account: ${report.reportedUserName}` : report.jobId ? "Job listing report" : "Safety report"}</h3>
                <span className="rounded-sm border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-200 px-3 py-1.5 text-sm font-medium capitalize text-stone-700">{report.status === "submitted" ? "Pending" : report.status === "reviewing" ? "Under review" : report.status === "dismissed" ? "Rejected" : "Resolved"}</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">{report.reason.replace(/_/g, " ")} · {report.date}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{report.details}</p>
              {report.adminNote && <p className="mt-2 text-xs text-stone-500">Admin update: {report.adminNote}</p>}
            </article>
          )) : <p className="py-6 text-base text-stone-600">You haven’t submitted any reports.</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-sm border border-stone-200 bg-white shadow-[0_8px_22px_-18px_rgba(85,52,33,0.5)]">
        <div className="border-b border-stone-200 bg-gradient-to-r from-[#fffdfa] to-[#f8f4f1] px-5 py-5 sm:px-7">
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-stone-900">Notifications</h2>
          <p className="mt-1 text-base leading-relaxed text-stone-600">
            Choose which updates you want to see in Shrama.
          </p>
        </div>
        <div className="divide-y divide-stone-200 px-5 sm:px-7">
          <PreferenceRow
            title={isProvider ? "New applicant updates" : "Application updates"}
            description={
              isProvider
                ? "Get updates when someone applies to one of your job listings."
                : "Get updates when an employer reviews or changes your application status."
            }
            checked={preferences.applicationUpdates}
            onChange={() => togglePreference("applicationUpdates")}
          />
          <PreferenceRow
            title="Messages"
            description="Get notified when you receive a new message."
            checked={preferences.messages}
            onChange={() => togglePreference("messages")}
          />
        </div>
      </section>
    </main>
  )
}

function PreferenceRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-6">
      <div>
        <p className="text-lg font-medium text-stone-900">{title}</p>
        <p className="mt-1.5 max-w-xl text-base leading-relaxed text-stone-600">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          checked ? "bg-primary" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
