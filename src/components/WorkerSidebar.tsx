import { useRef, useState } from "react"
import { useApp } from "../store/AppContext"
import { useDismissOnOutside } from "../hooks/useDismissOnOutside"
import NotificationPanel from "./NotificationPanel"

type WorkerPage = "worker-dashboard" | "worker-profile" | "job-discovery" | "my-applications" | "saved-jobs" | "learn" | "chat" | "shram-ai" | "voice-assistant" | "settings"
type IconName = "home" | "search" | "applications" | "saved" | "ai" | "echo" | "learn" | "profile" | "notifications" | "logout"

function WorkspaceIcon({ name }: { name: IconName }) {
  if (name === "ai")
    return (
      <img
        src="/images/worker/shram-ai-logo.png"
        alt=""
        className="h-8 w-8 object-contain"
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
    </svg>
  )
}

const links: { label: string; page: WorkerPage; icon: IconName }[] = [
  { label: "Home", page: "worker-dashboard", icon: "home" },
  { label: "Find work", page: "job-discovery", icon: "search" },
  { label: "Learn", page: "learn", icon: "learn" },
  { label: "AI", page: "shram-ai", icon: "ai" },
  { label: "Voice AI", page: "voice-assistant", icon: "echo" },
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
  ]

  return (
    <aside
      className="worker-workspace-rail fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#E8E2D5] bg-[#D4C8AE] lg:flex"
      aria-label="Worker workspace"
    >
      <div className="flex h-full w-full flex-col px-3 py-4">
        <button
          type="button"
          onClick={() => openPage("worker-dashboard")}
          aria-label="Shram Bazaar home"
          className="flex items-baseline gap-1 px-2 text-left leading-none"
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
              className="absolute left-[calc(100%+1rem)] top-0 z-50 w-[19rem] max-w-[calc(100vw-18rem)] rounded-2xl border border-[#E1DAD3] bg-[#FFFEFC] p-4 text-stone-800 shadow-[0_16px_40px_rgba(83,52,33,0.14)]"
              aria-label="Profile menu"
            >
              <div className="flex items-center gap-3 border-b border-[#ECE7E1] pb-4">
                {workerProfile?.photo ? (
                  <img
                    src={workerProfile.photo}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#96613A] text-sm font-bold text-white">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {userName}
                  </p>
                </div>
              </div>
              <nav
                className="space-y-1 py-3"
                aria-label="Profile navigation"
              >
                {accountLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.action === "notifications" ? setNotificationsOpen((open) => !open) : item.page && openPage(item.page)}
                    aria-current={item.page && state.currentPage === item.page ? "page" : undefined}
                    aria-expanded={item.action === "notifications" ? notificationsOpen : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${item.page === state.currentPage ? "bg-[#F7F1EB] font-semibold text-[#553421]" : "font-medium text-stone-700 hover:bg-[#F7F1EB] hover:text-[#553421]"}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${item.page === state.currentPage ? "text-[#70472F]" : item.action === "notifications" && unreadNotificationsCount > 0 ? "text-[#80502F]" : "text-stone-500"}`}><WorkspaceIcon name={item.icon} /></span>
                    <span className="flex-1">{item.label}</span>
                    {item.action === "notifications" && unreadNotificationsCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#80502F] px-1.5 text-[10px] font-bold text-white">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>}
                  </button>
                ))}
              </nav>
              <div className="border-t border-[#ECE7E1] pt-3">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-[#FBEFEC]"
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

        <nav
          className="mt-4 flex flex-col gap-1"
          aria-label="Worker navigation"
        >
          {links.map((link) => {
            const active = state.currentPage === link.page
            const logoLink = link.icon === "ai" || link.icon === "echo"
            return (
              <button
                key={link.icon}
                type="button"
                onClick={() => openPage(link.page)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[0.95rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  logoLink
                    ? `worker-assistant-nav ${active ? "is-active" : ""}`
                    : active
                      ? "bg-[#EEDFD2] font-semibold text-[#553421]"
                      : "font-medium text-stone-700 hover:bg-white/75 hover:text-[#553421]"
                }`}
              >
                <span
                  className={`flex shrink-0 items-center justify-center [&>svg]:h-[1.35rem] [&>svg]:w-[1.35rem] ${
                    logoLink ? "h-8 w-8" : "h-7 w-7"
                  }`}
                >
                  <WorkspaceIcon name={link.icon} />
                </span>
                <span className={logoLink ? "font-semibold" : "font-medium"}>
                  {link.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <a
            href="mailto:support@shrama.com"
            className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-[0.95rem] font-medium text-stone-700 transition-colors hover:bg-white/75 hover:text-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <img
              src="/images/worker/help-icon.png"
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
            Guidance
          </a>
          <button
            type="button"
            onClick={() => openPage("settings")}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[0.95rem] font-medium text-stone-700 transition-colors hover:bg-white/75 hover:text-[#553421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <img
              src="/images/worker/settings-icon.png"
              alt=""
              className="h-5 w-5 shrink-0 object-contain"
            />
            Settings
          </button>
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
