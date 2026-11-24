import { useState } from "react"
import { useApp } from "../store/AppContext"
import NotificationPanel from "./NotificationPanel"
import type { Page } from "../store/AppContext"

type ProviderNavItem = { label: string; page: Page; icon: "dashboard" | "jobs" | "applicants" | "user-search" | "operations" | "organisation" | "ai" | "messages" | "help" }

const primaryItems: ProviderNavItem[] = [
  { label: "Dashboard", page: "provider-dashboard", icon: "dashboard" },
  { label: "Hire", page: "provider-hire", icon: "user-search" },
  { label: "My Jobs", page: "my-jobs", icon: "jobs" },
  { label: "Applicants", page: "applicant-management", icon: "applicants" },
  { label: "Messages", page: "messages", icon: "messages" },
]

const secondaryItems: ProviderNavItem[] = [
  { label: "Shram AI", page: "chat", icon: "ai" },
  { label: "Team & Operations", page: "provider-operations", icon: "operations" },
  { label: "Help & Support", page: "provider-help", icon: "help" },
]

function ProviderIcon({ name }: { name: ProviderNavItem["icon"] | "bell" | "settings" | "logout" }) {
  if (name === "settings") {
    return <img src="/images/worker/settings-icon.png" alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "messages" ? "2.1" : "1.8"} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
      {name === "dashboard" && <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></>}
      {name === "jobs" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>}
      {name === "applicants" && <><circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20M16 5.2a3.2 3.2 0 0 1 0 6.1M18 14.5a4.4 4.4 0 0 1 3 4.2V20"/></>}
      {name === "user-search" && <><circle cx="10" cy="8" r="3.2"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h3M16 16l4.5 4.5M20.5 16.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></>}
      {name === "operations" && <><path d="M4 6h6M14 6h6M4 18h6M14 18h6M10 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM10 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM8 12h12M4 12h1"/><circle cx="7" cy="12" r="2"/></>}
      {name === "organisation" && <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M9 21v-5h6v5"/></>}
      {name === "help" && <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-1.2 1-1.8 1.4-1.8 3m0 3v.1"/></>}
      {name === "ai" && <><path d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/><circle cx="12" cy="12" r="5"/><path d="m10.5 12 1 1 2-2"/></>}
      {name === "messages" && <><path d="M9.1 13.5a6.2 6.2 0 0 1-4.2 4.6l-3.2 1 1-3.2a6.3 6.3 0 0 1 5.8-9.1"/><path d="M21.4 10.5a8.1 8.1 0 1 0-4 7l4.1 1.4-1.3-4.1a8 8 0 0 0 1.2-4.3Z"/><path d="M9.4 8.2h7.4M9.4 11.1h7.4M9.4 14h4.4" strokeWidth="1.6"/></>}
      {name === "bell" && <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 8-3 9h18s-3-2-3-9M10 21h4"/></>}
      {name === "logout" && <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>}
    </svg>
  )
}

export default function ProviderSidebar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const provider = state.providerProfile
  const initials = (provider?.orgName || state.currentUser?.name || "SB")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  const renderItem = (item: ProviderNavItem) => {
    const active = state.currentPage === item.page
    return (
      <button
        key={item.page}
        type="button"
        onClick={() => navigate(item.page)}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D3AA35]/50 ${active ? "border border-[#6B4B32] bg-[#4A3528] font-semibold text-[#FFFEFA] shadow-sm" : "font-medium text-[#5B554D] hover:bg-white/75 hover:text-[#3A2A20]"}`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/10 text-[#F2D56D]" : "text-[#625D52]"}`}><ProviderIcon name={item.icon} /></span>
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <aside className="provider-sidebar fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#D8DADD] bg-[#E8E9EA] text-[#3A2A20] lg:flex" aria-label="Provider workspace">
      <div className="flex h-full w-full flex-col px-3 py-4">
      <div className="flex min-h-12 items-center px-2 leading-none">
        <button type="button" onClick={() => navigate("provider-dashboard")} aria-label="Shram Bazaar home" className="flex items-baseline gap-1 text-left leading-none">
          <span className="text-[1.8rem] font-semibold text-[#553421]" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>श्रम</span>
          <span className="font-script text-[1.8rem] font-semibold text-[#261C14]">Bazaar</span>
        </button>
      </div>

      <div className="relative mt-4 w-full">
      <button type="button" onClick={() => navigate("provider-profile")} aria-label="Open provider profile" className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#F5EDCF] text-sm font-semibold text-[#705719] shadow-sm ring-1 ring-[#D5D7D9]">
          {provider?.logo ? <img src={provider.logo} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-[#3A2A20] underline">{provider?.orgName || state.currentUser?.name || "Provider"}</span>
          <span className="mt-0.5 block truncate text-xs font-medium text-[#766B61] underline">Provider workspace</span>
        </span>
      </button>
      </div>

      <nav className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Provider navigation">
        <section className="border-b border-[#D5D7D9] pb-5">
          <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[.12em] text-[#625D52]">Workspace</p>
          <div className="space-y-1.5">{primaryItems.map(renderItem)}</div>
        </section>
        <section className="pb-5">
          <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[.12em] text-[#625D52]">Manage</p>
          <div className="space-y-1.5">{secondaryItems.map(renderItem)}</div>
        </section>
      </nav>

      <div className="mt-auto space-y-1.5 border-t border-[#D5D7D9] pt-3">
        <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#625D52] transition-colors hover:bg-white/80 hover:text-[#25231F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40">
          <span className="relative"><ProviderIcon name="bell" />{unreadNotificationsCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#D3AA35] ring-2 ring-[#E8E9EA]" />}</span>
          Notifications
          {unreadNotificationsCount > 0 && <span className="ml-auto text-xs tabular-nums text-[#625D52]">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>}
        </button>
        <button type="button" onClick={() => navigate("settings")} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#625D52] transition-colors hover:bg-white/80 hover:text-[#25231F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40"><ProviderIcon name="settings" />Settings</button>
        <button type="button" onClick={logout} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#625D52] transition-colors hover:bg-white/80 hover:text-[#25231F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99020]/40"><ProviderIcon name="logout" />Log out</button>
      </div>
      </div>
      {notificationsOpen && <NotificationPanel placement="floating" onClose={() => setNotificationsOpen(false)} />}
    </aside>
  )
}
