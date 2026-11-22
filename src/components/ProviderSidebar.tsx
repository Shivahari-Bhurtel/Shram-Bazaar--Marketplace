import { useState } from "react"
import { useApp } from "../store/AppContext"
import NotificationPanel from "./NotificationPanel"
import type { Page } from "../store/AppContext"

type ProviderNavItem = { label: string; page: Page; icon: "dashboard" | "jobs" | "applicants" | "user-search" | "operations" | "organisation" | "ai" | "messages" }

const primaryItems: ProviderNavItem[] = [
  { label: "Dashboard", page: "provider-dashboard", icon: "dashboard" },
  { label: "Shram AI", page: "chat", icon: "ai" },
  { label: "Hire", page: "provider-hire", icon: "user-search" },
  { label: "My Jobs", page: "my-jobs", icon: "jobs" },
  { label: "Applicants", page: "applicant-management", icon: "applicants" },
  { label: "Messages", page: "messages", icon: "messages" },
]

const secondaryItems: ProviderNavItem[] = [
  { label: "Team & Operations", page: "provider-operations", icon: "operations" },
  { label: "Organisation", page: "provider-profile", icon: "organisation" },
]

function ProviderIcon({ name }: { name: ProviderNavItem["icon"] | "bell" | "settings" | "logout" }) {
  if (name === "settings") {
    return <img src="/images/worker/settings-icon.png" alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
      {name === "dashboard" && <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="11" width="7" height="10" rx="1.5"/><rect x="3" y="14" width="8" height="7" rx="1.5"/></>}
      {name === "jobs" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>}
      {name === "applicants" && <><circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20M16 5.2a3.2 3.2 0 0 1 0 6.1M18 14.5a4.4 4.4 0 0 1 3 4.2V20"/></>}
      {name === "user-search" && <><circle cx="10" cy="8" r="3.2"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h3M16 16l4.5 4.5M20.5 16.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></>}
      {name === "operations" && <><path d="M4 6h6M14 6h6M4 18h6M14 18h6M10 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM10 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM8 12h12M4 12h1"/><circle cx="7" cy="12" r="2"/></>}
      {name === "organisation" && <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M9 21v-5h6v5"/></>}
      {name === "ai" && <><path d="M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/><circle cx="12" cy="12" r="5"/><path d="m10.5 12 1 1 2-2"/></>}
      {name === "messages" && <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6a7.5 7.5 0 1 1 17-3.5Z"/><path d="M8 11h8m-8 3h5"/></>}
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
        className={`flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80502F]/40 ${active ? "bg-[#F2E4D4] font-medium text-[#4E342E] shadow-sm" : "font-medium text-[#543D2E] hover:bg-white/60 hover:text-[#4E342E]"}`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/60 text-[#4E342E]" : "text-[#543D2E]"}`}><ProviderIcon name={item.icon} /></span>
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <aside className="provider-sidebar fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#C4B69B] bg-[#D4C8AE] text-[#4E342E] lg:flex" aria-label="Provider workspace">
      <div className="flex h-full w-full flex-col px-3 py-4">
      <div className="flex min-h-12 items-center px-2 leading-none">
        <button type="button" onClick={() => navigate("provider-dashboard")} aria-label="Shram Bazaar home" className="flex items-baseline gap-1 text-left leading-none">
          <span className="text-[1.8rem] font-semibold text-[#553421]" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>श्रम</span>
          <span className="font-script text-[1.8rem] font-semibold text-[#261C14]">Bazaar</span>
        </button>
      </div>

      <div className="relative mt-4 w-full">
      <div className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#F2E4D4] text-sm font-semibold text-[#4E342E] shadow-sm ring-1 ring-[#C4B69B]">
          {provider?.logo ? <img src={provider.logo} alt="" className="h-full w-full object-cover" /> : initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold text-[#4E342E]">{provider?.orgName || state.currentUser?.name || "Provider"}</span>
          <span className="mt-0.5 block truncate text-xs font-medium text-[#766B61]">Provider workspace</span>
        </span>
      </div>
      </div>

      <nav className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Provider navigation">
        <section className="border-b border-[#BFAF92] pb-5">
          <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[.12em] text-[#543D2E]">Workspace</p>
          <div className="space-y-1.5">{primaryItems.map(renderItem)}</div>
        </section>
        <section className="pb-5">
          <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[.12em] text-[#543D2E]">Manage</p>
          <div className="space-y-1.5">{secondaryItems.map(renderItem)}</div>
        </section>
      </nav>

      <div className="mt-auto space-y-1.5 border-t border-[#BFAF92] pt-3">
        <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#543D2E] transition-colors hover:bg-white/60 hover:text-[#4E342E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80502F]/40">
          <span className="relative"><ProviderIcon name="bell" />{unreadNotificationsCount > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#80502F] ring-2 ring-[#D4C8AE]" />}</span>
          Notifications
          {unreadNotificationsCount > 0 && <span className="ml-auto text-xs tabular-nums text-[#543D2E]">{unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}</span>}
        </button>
        <button type="button" onClick={() => navigate("settings")} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#543D2E] transition-colors hover:bg-white/60 hover:text-[#4E342E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80502F]/40"><ProviderIcon name="settings" />Settings</button>
        <button type="button" onClick={logout} className="flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] font-medium tracking-[0.01em] text-[#543D2E] transition-colors hover:bg-white/60 hover:text-[#4E342E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80502F]/40"><ProviderIcon name="logout" />Log out</button>
      </div>
      </div>
      {notificationsOpen && <NotificationPanel placement="floating" onClose={() => setNotificationsOpen(false)} />}
    </aside>
  )
}
