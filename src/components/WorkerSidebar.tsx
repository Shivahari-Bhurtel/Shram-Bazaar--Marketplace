import { useRef, useState } from "react"
import { useApp } from "../store/AppContext"
import { useDismissOnOutside } from "../hooks/useDismissOnOutside"
import NotificationPanel from "./NotificationPanel"

type WorkerPage = "worker-dashboard" | "worker-profile" | "job-discovery" | "my-applications" | "saved-jobs" | "chat" | "voice-assistant" | "settings"
type IconName = "home" | "search" | "applications" | "saved" | "ai" | "echo"

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
    </svg>
  )
}

const links: { label: string page: WorkerPage icon: IconName }[] = [
  { label: "Home", page: "worker-dashboard", icon: "home" },
  { label: "Find work", page: "job-discovery", icon: "search" },
  { label: "AI", page: "chat", icon: "ai" },
  { label: "Echo", page: "voice-assistant", icon: "echo" },
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
  const userTitle =
    workerProfile?.professionalTitle ||
    workerProfile?.skills.slice(0, 2).join(" · ") ||
    "Worker"
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
  const accountLinks: { label: string page: WorkerPage icon?: IconName }[] = [
    { label: "My profile", page: "worker-profile" },
    { label: "My applications", page: "my-applications", icon: "applications" },
    { label: "Saved jobs", page: "saved-jobs", icon: "saved" },
  ]

  return (
    <aside
      className="worker-workspace-rail fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#EBE7E2] bg-[#F8F3EE] lg:flex"
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
          <span className="font-script text-[1.8rem] font-semibold text-black">
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
                  <p className="truncate text-xs text-stone-500">{userTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="flex w-full items-center justify-between rounded-lg border-b border-[#ECE7E1] px-2 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-[#F7F1EB] hover:text-[#553421]"
              >
                <span>Notifications</span>
                <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F1EB] text-[#80502F]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#80502F] px-1 text-[9px] font-bold text-white ring-2 ring-[#FFFEFC]">
                      {unreadNotificationsCount > 9
                        ? "9+"
                        : unreadNotificationsCount}
                    </span>
                  )}
                </span>
              </button>
              <nav
                className="space-y-0.5 border-b border-[#ECE7E1] py-2"
                aria-label="Account links"
              >
                {accountLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => openPage(item.page)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-[#F7F1EB] hover:text-[#553421]"
                  >
                    {item.icon && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F7F1EB] text-[#80502F]">
                        <WorkspaceIcon name={item.icon} />
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="space-y-0.5 pt-2">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 transition-colors hover:bg-[#FBEFEC]"
                >
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
