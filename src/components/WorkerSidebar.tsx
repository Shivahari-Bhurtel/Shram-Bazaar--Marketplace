import { useRef, useState } from "react"
import { useApp } from "../store/AppContext"
import { useDismissOnOutside } from "../hooks/useDismissOnOutside"
import NotificationPanel from "./NotificationPanel"
import type { Page } from "../store/AppContext"

type WorkerPage = Page
type IconName = "home" | "search" | "applications" | "saved" | "ai" | "echo" | "learn" | "profile" | "notifications" | "logout" | "settings" | "calendar" | "help"

function WorkspaceIcon({ name }: { name: IconName }) {
  if (name === "ai")
    return (
      <img
        src="/images/worker/shram-ai-logo.png"
        alt=""
        className="h-6 w-6 object-contain"
      />
    )
  if (name === "echo")
    return (
      <img
        src="/images/worker/echo-logo.png"
        alt=""
        className="h-6 w-6 object-contain"
      />
    )
  if (name === "settings")
    return <img src="/images/worker/settings-icon.png" alt="" className="h-5 w-5 object-contain" />
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "home" || name === "applications" ? "1.7" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {name === "home" && (
        <>
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </>
      )}
      {name === "search" && (
        <>
          <circle cx="10.8" cy="10.8" r="6.5" />
          <path d="m15.6 15.6 4.6 4.6" />
        </>
      )}
      {name === "applications" && (
        <>
          <path d="M14 2.75H6.5a2 2 0 0 0-2 2v14.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.25l-5.5-5.5Z" />
          <path d="M14 3v5.5h5.5M8.5 14.5l2.25 2.25 4.75-5" />
        </>
      )}
      {name === "saved" && <path d="M6 3.5h12V21l-6-3.8L6 21V3.5Z" />}
      {name === "profile" && <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>}
      {name === "notifications" && <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10 21h4" /></>}
      {name === "logout" && <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>}
      {name === "learn" && (
        <>
          <path d="M3 5.5c3.2-.9 6.2-.5 9 1.3v13c-2.8-1.8-5.8-2.2-9-1.3v-13Z" />
          <path d="M21 5.5c-3.2-.9-6.2-.5-9 1.3v13c2.8-1.8 5.8-2.2 9-1.3v-13Z" />
        </>
      )}
      {name === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h2m4 0h2m-8 3h2"/></>}
      {name === "help" && <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.2 1-1.8 1.4-1.8 3m0 3v.1"/></>}
    </svg>
  )
}

const navGroups: { heading: string; items: { label: string; page: WorkerPage; icon: IconName }[] }[] = [
  { heading: "", items: [
    { label: "Home", page: "worker-dashboard", icon: "home" },
    { label: "Find Jobs", page: "job-discovery", icon: "search" },
    { label: "Learn & Grow", page: "learn", icon: "learn" },
    { label: "Work Schedule", page: "worker-availability", icon: "calendar" },
  ] },
  { heading: "", items: [
    { label: "My Applications", page: "my-applications", icon: "applications" },
    { label: "Saved Jobs", page: "saved-jobs", icon: "saved" },
  ] },
  { heading: "", items: [
    { label: "Shram AI", page: "shram-ai", icon: "ai" },
    { label: "Help & Support", page: "worker-help", icon: "help" },
  ] },
]

export default function WorkerSidebar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  useDismissOnOutside(profileOpen, [profileMenuRef], () =>
    setProfileOpen(false),
  )

  const workerProfile = state.workerProfile
  const userName = workerProfile?.name || state.currentUser?.name || "Worker"
  const initials = userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  const profileFields = workerProfile
    ? [workerProfile.name, workerProfile.phone, workerProfile.email, workerProfile.photo, workerProfile.location, workerProfile.bio, workerProfile.skills?.length, workerProfile.qualifications?.length, workerProfile.experience?.length, workerProfile.availableDates?.length]
    : []
  const profileCompletion = profileFields.length
    ? Math.round(profileFields.filter((value) => Array.isArray(value) ? value.length > 0 : Boolean(value?.toString().trim())).length / profileFields.length * 100)
    : 0
  const applicationCount = state.applications.filter((application) => application.workerId === workerProfile?.id).length
  const savedJobCount = state.savedJobIds.length
  const openPage = (page: WorkerPage) => {
    if (page === "voice-assistant") {
      try {
        sessionStorage.setItem("voice-assistant-return-page", state.currentPage)
      } catch {
        /* Navigation still works without session storage. */
      }
    }
    if (page === "chat") {
      try {
        sessionStorage.setItem("ai-chat-return-page", state.currentPage)
      } catch {
        /* Navigation still works without session storage. */
      }
    }
    setProfileOpen(false)
    setNotificationsOpen(false)
    navigate(page)
  }
  const accountLinks: { label: string; page?: WorkerPage; icon: IconName; action?: "notifications" }[] = [
    { label: "My profile", page: "worker-profile", icon: "profile" },
    { label: "Notifications", icon: "notifications", action: "notifications" },
    { label: "My applications", page: "my-applications", icon: "applications" },
    { label: "Saved jobs", page: "saved-jobs", icon: "saved" },
    { label: "Settings", page: "settings", icon: "settings" },
  ]

  return (
    <aside
      className="worker-workspace-rail fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#C4B69B] bg-[#D4C8AE] lg:flex"
      aria-label="Worker workspace"
    >
      <div className="flex h-full w-full flex-col px-3 py-4">
        <button
          type="button"
          onClick={() => openPage("worker-dashboard")}
          aria-label="Shram Bazaar home"
          className="flex min-h-12 items-baseline gap-1 px-2 text-left leading-none"
        >
          <span
            className="text-[1.8rem] font-semibold text-[#553421]"
            style={{ fontFamily: "'Noto Serif Devanagari', serif" }}
          >
            श्रम
          </span>
          <span className="font-script text-[1.8rem] font-semibold text-[#261C14]">
            Bazaar
          </span>
        </button>

        <div ref={profileMenuRef} className="relative mt-4 w-full">
          {profileOpen && (
            <section
              role="dialog"
              className="absolute left-[calc(100%+1rem)] top-0 z-50 w-[20rem] max-w-[calc(100vw-18rem)] rounded-xl border border-[#E1DAD3] bg-[#FFFEFC] p-2 text-stone-800 shadow-[0_16px_40px_rgba(83,52,33,0.14)] [font-family:Inter,'Noto_Sans_Devanagari',system-ui,sans-serif] antialiased"
              aria-label="Profile menu"
            >
              <div className="flex items-center gap-3 rounded-lg px-2.5 py-2.5">
                <span className="relative h-12 w-12 shrink-0 rounded-full p-[2px]" style={{ background: `conic-gradient(#80502F ${profileCompletion}%, #E8DED3 ${profileCompletion}% 100%)` }} role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileCompletion}>
                  <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white p-[2px]">
                {workerProfile?.photo ? (
                  <img
                    src={workerProfile.photo}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[#80502F] text-sm font-bold tracking-wide text-white">
                    {initials}
                  </span>
                )}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold tracking-[-0.02em] text-stone-950">
                    {userName}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
                    {workerProfile?.verified ? "Verified Worker" : "Worker"} <span aria-hidden="true">·</span> Profile {profileCompletion}%
                  </p>
                </div>
              </div>
              <nav
                className="space-y-0.5 py-1"
                aria-label="Profile navigation"
              >
                {accountLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.action === "notifications" ? setNotificationsOpen((open) => !open) : item.page && openPage(item.page)}
                    aria-current={item.page && state.currentPage === item.page ? "page" : undefined}
                    aria-expanded={item.action === "notifications" ? notificationsOpen : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[15px] leading-5 tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80502F]/40 ${item.page === state.currentPage ? "bg-[#F7F3EE] font-semibold text-[#553421]" : "font-medium text-stone-700 hover:bg-[#F7F3EE] hover:text-[#553421]"}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${item.page === state.currentPage ? "text-[#70472F]" : item.action === "notifications" && unreadNotificationsCount > 0 ? "text-[#80502F]" : "text-stone-500"}`}><WorkspaceIcon name={item.icon} /></span>
                    <span className="flex-1">{item.label}</span>
                    {item.action === "notifications" && unreadNotificationsCount > 0 && <span className="ml-auto min-w-5 text-right text-xs font-semibold tabular-nums text-[#80502F]">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>}
                    {item.page === "my-applications" && applicationCount > 0 && <span className="ml-auto min-w-5 text-right text-xs font-semibold tabular-nums text-stone-500">{applicationCount}</span>}
                    {item.page === "saved-jobs" && savedJobCount > 0 && <span className="ml-auto min-w-5 text-right text-xs font-semibold tabular-nums text-stone-500">{savedJobCount}</span>}
                  </button>
                ))}
              </nav>
              <div className="mt-1 border-t border-[#ECE7E1] pt-1">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[15px] font-semibold leading-5 tracking-[-0.01em] text-[#B91C1C] transition-colors hover:bg-[#FEF2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]/30"
                >
                  <span className="flex h-5 w-5 items-center justify-center"><WorkspaceIcon name="logout" /></span>
                  Log out
                </button>
              </div>
            </section>
          )}
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open)
              setNotificationsOpen(false)
            }}
            aria-label={`Open profile menu for ${userName}`}
            aria-expanded={profileOpen}
            aria-haspopup="dialog"
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-[#D9C4B2] transition hover:ring-2 hover:ring-primary">
              {workerProfile?.photo ? (
                <img
                  src={workerProfile.photo}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#96613A] text-sm font-bold text-white">
                  {initials}
                </span>
              )}
            </span>
            <span className="min-w-0 truncate text-base font-semibold text-stone-800 underline decoration-black underline-offset-4">
              {userName}
            </span>
          </button>
        </div>

        <nav className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Worker navigation">
          {navGroups.map((group) => (
            <section key={group.items[0]?.label} className="border-b border-[#BFAF92] pb-5 last:border-b-0 last:pb-0">
              {group.heading && <h2 className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[.12em] text-[#735B49]">{group.heading}</h2>}
              <div className="space-y-1.5">
                {group.items.map((link) => {
                  const active = state.currentPage === link.page
                  const logoLink = link.icon === "ai"
                  return <button key={`${link.label}-${link.page}`} type="button" onClick={() => openPage(link.page)} aria-current={active ? "page" : undefined} className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80502F]/40 ${logoLink ? `worker-assistant-nav ${active ? "is-active" : ""}` : active ? "bg-[#F2E4D4] font-medium text-[#4E342E] shadow-sm" : "font-medium text-[#543D2E] hover:bg-white/60 hover:text-[#4E342E]"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5 ${logoLink ? "text-[#70472F]" : active ? "text-[#70472F]" : "text-[#80674F]"}`}><WorkspaceIcon name={link.icon} /></span>
                    {logoLink ? <span className="leading-snug">Shram <span className="relative">AI<svg viewBox="0 0 20 20" className="shrama-ai-star absolute -right-3 -top-2 h-4 w-4 text-[#B8873B]" fill="currentColor" aria-hidden="true"><path d="M10 1.5 12.2 7.8 18.5 10l-6.3 2.2L10 18.5l-2.2-6.3L1.5 10l6.3-2.2L10 1.5Z"/><circle cx="16.5" cy="3.5" r="1"/></svg></span></span> : <span className="leading-snug">{link.label}</span>}
                  </button>
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-lg border border-[#C6AA89] bg-[#E9D6BC] px-3 py-2.5">
            <p className="text-xs leading-relaxed text-[#5B4032]">Continue learning and open new work opportunities.</p>
            <button type="button" onClick={() => openPage("learn")} className="mt-1.5 inline-flex min-h-7 items-center gap-1 text-xs font-semibold text-[#70472F] hover:text-[#4E342E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4E342E]">
              Explore courses <span aria-hidden="true">→</span>
            </button>
          </div>
          {notificationsOpen && (
            <NotificationPanel
              placement="floating"
              onClose={() => setNotificationsOpen(false)}
            />
          )}
        </div>
      </div>
    </aside>
  )
}
