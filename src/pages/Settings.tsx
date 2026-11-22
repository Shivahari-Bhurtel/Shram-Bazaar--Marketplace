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
    <main className="mx-auto w-full max-w-5xl px-4 py-7 font-ui sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 border-b border-[#DCE5DE] pb-4">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] text-[#1A2420]">Settings</h1>
      </header>

      <section className="divide-y divide-[#E1E7E2] border border-[#D5DED7] bg-white">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium tracking-[-0.01em] text-[#1A2420]">Account information</h2>
            <button type="button" onClick={() => navigate(user?.role === "provider" ? "provider-profile" : "worker-profile")} className="inline-flex min-h-9 items-center gap-2 border border-[#164E38] px-3 text-sm font-medium tracking-[0.005em] text-[#164E38] transition-colors hover:bg-[#EAF3ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236B4B]">Edit profile <span aria-hidden="true">↗</span></button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.09em] text-[#69756D]">Email address</p><p className="mt-1 break-all text-base font-normal tracking-[0.005em] text-[#202923]">{user?.email ?? "Not available"}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-[0.09em] text-[#69756D]">Account type</p><p className="mt-1 text-base font-normal capitalize tracking-[0.005em] text-[#202923]">{user?.role ?? "Member"}</p></div>
          </div>
        </div>

        <div className="px-5 py-4 sm:px-6">
          <h2 className="text-lg font-medium tracking-[-0.01em] text-[#1A2420]">My reports</h2>
          <div className="mt-2 divide-y divide-[#EEF1EE]">
            {state.myReports.length ? state.myReports.map((report) => (
              <article key={report.id} className="py-3 first:pt-1 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-[#202923]">{report.reportedUserName ? `Account: ${report.reportedUserName}` : report.jobId ? "Job listing report" : "Safety report"}</h3>
                  <span className="border border-[#DCE5DE] bg-[#F6F8F6] px-2 py-0.5 text-[11px] font-medium capitalize text-[#46534A]">{report.status === "submitted" ? "Pending" : report.status === "reviewing" ? "Under review" : report.status === "dismissed" ? "Rejected" : "Resolved"}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-[#69756D]">{report.reason.replace(/_/g, " ")} · {report.date}</p>
                <p className="mt-1.5 text-sm leading-5 text-[#34443A]">{report.details}</p>
                {report.adminNote && <p className="mt-1.5 text-xs leading-5 text-[#657168]">Admin update: {report.adminNote}</p>}
              </article>
            )) : <p className="py-1 text-base text-[#69756D]">No reports submitted.</p>}
          </div>
        </div>

        <div className="px-5 py-4 sm:px-6">
          <h2 className="text-lg font-medium tracking-[-0.01em] text-[#1A2420]">Notification preferences</h2>
          <div className="mt-2 divide-y divide-[#EEF1EE]">
          <PreferenceRow
            icon="application"
            title={isProvider ? "Applicant status" : "Application status"}
            description={
              isProvider
                ? "Updates when someone applies to your job"
                : "Updates when an employer changes your status"
            }
            checked={preferences.applicationUpdates}
            onChange={() => togglePreference("applicationUpdates")}
          />
          <PreferenceRow
            icon="message"
            title="Messages"
            description="Alerts when a new message arrives"
            checked={preferences.messages}
            onChange={() => togglePreference("messages")}
          />
          </div>
        </div>
      </section>
    </main>
  )
}

function PreferenceRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: "application" | "message"
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#DCE5DE] bg-[#F5F8F5] text-[#236B4B]" aria-hidden="true">
          {icon === "application" ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M8 4h8M9 3h6v3H9zM6 5H5v16h14V5h-1"/><path d="m8 13 2.5 2.5L16 10"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.4A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01"/></svg>}
        </span>
        <span className="min-w-0">
        <p className="text-base font-medium leading-5 tracking-[0.005em] text-[#1A2420]">{title}</p>
        <p className="mt-1 max-w-xl text-sm leading-5 text-[#657168]">
          {description}
        </p></span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#236B4B] ${
          checked ? "bg-[#236B4B]" : "bg-[#C8D0CA]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
