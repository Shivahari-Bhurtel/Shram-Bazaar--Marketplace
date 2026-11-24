import { useState } from "react"
import { useApp } from "../store/AppContext"
import NotificationPanel from "./NotificationPanel"
import type { Page } from "../store/AppContext"

type WorkerPage = Page
type IconName = "home" | "search" | "applications" | "saved" | "ai" | "echo" | "learn" | "notifications" | "logout" | "settings" | "calendar" | "help" | "messages"

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
      strokeWidth={name === "messages" ? "2.1" : name === "home" || name === "applications" ? "1.7" : "1.5"}
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
      {name === "messages" && <><path d="M9.1 13.5a6.2 6.2 0 0 1-4.2 4.6l-3.2 1 1-3.2a6.3 6.3 0 0 1 5.8-9.1"/><path d="M21.4 10.5a8.1 8.1 0 1 0-4 7l4.1 1.4-1.3-4.1a8 8 0 0 0 1.2-4.3Z"/><path d="M9.4 8.2h7.4M9.4 11.1h7.4M9.4 14h4.4" strokeWidth="1.6"/></>}
    </svg>
  )
}

const navGroups: { heading: string; items: { label: string; page: WorkerPage; icon: IconName }[] }[] = [
  { heading: "Workspace", items: [
    { label: "Home", page: "worker-dashboard", icon: "home" },
    { label: "Find Jobs", page: "job-discovery", icon: "search" },
    { label: "Work Schedule", page: "worker-availability", icon: "calendar" },
    { label: "Offers & applications", page: "my-applications", icon: "applications" },
    { label: "Messages", page: "messages", icon: "messages" },
    { label: "Saved Jobs", page: "saved-jobs", icon: "saved" },
  ] },
  { heading: "Manage", items: [
    { label: "Learn & Grow", page: "learn", icon: "learn" },
    { label: "Shram AI", page: "shram-ai", icon: "ai" },
    { label: "Help & Support", page: "worker-help", icon: "help" },
  ] },
]

export default function WorkerSidebar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const workerProfile = state.workerProfile
  const userName = workerProfile?.name || state.currentUser?.name || "Worker"
  const initials = userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
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
    setNotificationsOpen(false)
    navigate(page)
  }

  return (
    <aside
      className="worker-workspace-rail fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#D8DADD] bg-[#E8E9EA] lg:flex"
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

        <button type="button" onClick={() => openPage("worker-profile")} aria-label={`Open worker profile for ${userName}`} className="mt-4 flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#F5EDCF] text-sm font-semibold text-[#705719] shadow-sm ring-1 ring-[#D5D7D9]">
            {workerProfile?.photo ? <img src={workerProfile.photo} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          <span className="min-w-0"><span className="block truncate text-base font-semibold text-[#3A2A20] underline underline-offset-4">{userName}</span><span className="mt-0.5 block truncate text-xs font-medium text-[#766B61]">Worker workspace</span></span>
        </button>

        <nav className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Worker navigation">
          {navGroups.map((group) => (
            <section key={group.items[0]?.label} className="border-b border-[#D5D7D9] pb-5 last:border-b-0 last:pb-0">
              {group.heading && <h2 className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[.12em] text-[#625D52]">{group.heading}</h2>}
              <div className="space-y-1.5">
                {group.items.map((link) => {
                  const active = state.currentPage === link.page
                  const logoLink = link.icon === "ai"
                  return <button key={`${link.label}-${link.page}`} type="button" onClick={() => openPage(link.page)} aria-current={active ? "page" : undefined} className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D3AA35]/50 ${logoLink ? `worker-assistant-nav ${active ? "is-active" : ""}` : active ? "border border-[#6B4B32] bg-[#4A3528] font-semibold text-[#FFFEFA] shadow-sm" : "font-medium text-[#5B554D] hover:bg-white/75 hover:text-[#3A2A20]"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5 ${logoLink ? "text-[#8F6C12]" : active ? "text-[#F2D56D]" : "text-[#625D52]"}`}><WorkspaceIcon name={link.icon} /></span>
                    {logoLink ? <span className="leading-snug">Shram <span className="relative">AI<svg viewBox="0 0 20 20" className="shrama-ai-star absolute -right-3 -top-2 h-4 w-4 text-[#B8873B]" fill="currentColor" aria-hidden="true"><path d="M10 1.5 12.2 7.8 18.5 10l-6.3 2.2L10 18.5l-2.2-6.3L1.5 10l6.3-2.2L10 1.5Z"/><circle cx="16.5" cy="3.5" r="1"/></svg></span></span> : <span className="leading-snug">{link.label}</span>}
                  </button>
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-[#D5D7D9] pt-3">
          <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#625D52] transition-colors hover:bg-white/80 hover:text-[#25231F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40">
            <span className="relative"><WorkspaceIcon name="notifications" />{unreadNotificationsCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#D3AA35] ring-2 ring-[#E8E9EA]" />}</span>
            Notifications
            {unreadNotificationsCount > 0 && <span className="ml-auto text-xs tabular-nums text-[#625D52]">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>}
          </button>
          <button type="button" onClick={() => openPage("settings")} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#625D52] transition-colors hover:bg-white/80 hover:text-[#25231F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40"><WorkspaceIcon name="settings" />Settings</button>
          <button type="button" onClick={logout} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#625D52] transition-colors hover:bg-white/80 hover:text-[#25231F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40"><WorkspaceIcon name="logout" />Log out</button>
        </div>
        {notificationsOpen && <NotificationPanel placement="floating" onClose={() => setNotificationsOpen(false)} />}
      </div>
    </aside>
  )
}
