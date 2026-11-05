import { useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';
import ShramaAIMark from './ShramaAIMark';
import NotificationPanel from './NotificationPanel';

type WorkerPage = 'worker-dashboard' | 'worker-profile' | 'job-discovery' | 'my-applications' | 'saved-jobs' | 'chat' | 'voice-assistant' | 'settings';
type IconName = 'home' | 'search' | 'applications' | 'saved' | 'ai' | 'echo';

function WorkspaceIcon({ name }: { name: IconName }) {
  if (name === 'ai') return <img src="/images/worker/ai-logo-trim.png" alt="" className="h-8 w-8 object-contain" />;
  if (name === 'echo') return <img src="/images/worker/smart.png" alt="" className="sidebar-logo-rim h-8 w-8 object-contain" />;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'home' || name === 'applications' ? '1.7' : '1.5'} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      {name === 'home' && <><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>}
      {name === 'search' && <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></>}
      {name === 'applications' && <><path d="M14 2.75H6.5a2 2 0 0 0-2 2v14.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.25l-5.5-5.5Z" /><path d="M14 3v5.5h5.5M8.5 14.5l2.25 2.25 4.75-5" /></>}
      {name === 'saved' && <path d="M6 3.5h12V21l-6-3.8L6 21V3.5Z" />}
    </svg>
  );
}

const links: { label: string; page: WorkerPage; icon: IconName }[] = [
  { label: 'Home', page: 'worker-dashboard', icon: 'home' },
  { label: 'Find work', page: 'job-discovery', icon: 'search' },
  { label: 'My applications', page: 'my-applications', icon: 'applications' },
  { label: 'Saved jobs', page: 'saved-jobs', icon: 'saved' },
  { label: 'AI', page: 'chat', icon: 'ai' },
  { label: 'Echo', page: 'voice-assistant', icon: 'echo' },
];

export default function WorkerSidebar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const onlineStorageKey = `worker-online:${state.currentUser?.id ?? 'guest'}`;
  const [online, setOnline] = useState(() => {
    try { return localStorage.getItem(onlineStorageKey) !== 'false'; } catch { return true; }
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useDismissOnOutside(profileOpen, [profileMenuRef], () => setProfileOpen(false));

  const workerProfile = state.workerProfile;
  const userName = workerProfile?.name || state.currentUser?.name || 'Worker';
  const userTitle = workerProfile?.professionalTitle || workerProfile?.skills.slice(0, 2).join(' · ') || 'Worker';
  const initials = userName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const openPage = (page: WorkerPage) => {
    if (page === 'voice-assistant') {
      try { sessionStorage.setItem('voice-assistant-return-page', state.currentPage); } catch { /* Navigation still works without session storage. */ }
    }
    if (page === 'chat') {
      try { sessionStorage.setItem('ai-chat-return-page', state.currentPage); } catch { /* Navigation still works without session storage. */ }
    }
    setProfileOpen(false);
    setNotificationsOpen(false);
    navigate(page);
  };
  const toggleOnline = () => {
    const next = !online;
    setOnline(next);
    try { localStorage.setItem(onlineStorageKey, String(next)); } catch { /* Keep the setting for this session if storage is unavailable. */ }
  };
  const accountLinks: { label: string; page: WorkerPage }[] = [
    { label: 'My profile', page: 'worker-profile' },
    { label: 'My applications', page: 'my-applications' },
    { label: 'Saved jobs', page: 'saved-jobs' },
  ];

  return (
    <aside className="worker-workspace-rail fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[#E8DFD6] bg-[#F8F4EF] lg:flex" aria-label="Worker workspace">
      <div className="flex h-full w-full flex-col px-4 py-5">
        <button type="button" onClick={() => openPage('worker-dashboard')} aria-label="Shram Bazaar home" className="flex items-baseline gap-1 px-2 text-left leading-none">
          <span className="text-[1.75rem] font-semibold text-[#5E3122]" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>श्रम</span>
          <span className="font-script text-[1.65rem] font-semibold text-black">Bazaar</span>
        </button>

        <div ref={profileMenuRef} className="relative mt-6 w-full">
          {profileOpen && <section role="dialog" className="absolute left-[calc(100%+1rem)] top-0 z-50 w-[19rem] max-w-[calc(100vw-18rem)] rounded-2xl border border-[#E8DFD6] bg-white p-4 text-stone-800 shadow-xl" aria-label="Profile menu">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
              {workerProfile?.photo ? <img src={workerProfile.photo} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#A8754F] text-sm font-bold text-white">{initials}</span>}
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{userName}</p><p className="truncate text-xs text-stone-500">{userTitle}</p></div>
            </div>
            <button type="button" onClick={() => setNotificationsOpen(open => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="flex w-full items-center justify-between border-b border-stone-100 py-3 text-sm font-medium text-stone-700 hover:text-[#5E3122]">
              <span>Notifications</span>
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 hover:bg-[#F8F4EF]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10 21h4" /></svg>
                {unreadNotificationsCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A8754F] px-1 text-[9px] font-bold text-white">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>}
              </span>
            </button>
            <button type="button" onClick={toggleOnline} className="flex w-full items-center justify-between border-b border-stone-100 py-3 text-sm" aria-pressed={online}>
              <span className="flex flex-col items-start"><span className="font-medium text-stone-800">Online for messages</span><span className="text-xs text-stone-500">{online ? 'You appear available' : 'You appear offline'}</span></span>
              <span className={`relative h-6 w-11 rounded-full transition-colors ${online ? 'bg-[#A8754F]' : 'bg-stone-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${online ? 'translate-x-5' : 'translate-x-0.5'}`} /></span>
            </button>
            <nav className="space-y-0.5 border-b border-stone-100 py-2" aria-label="Account links">
              {accountLinks.map(item => <button key={item.label} type="button" onClick={() => openPage(item.page)} className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-stone-700 hover:bg-[#F8F4EF] hover:text-[#5E3122]">{item.label}</button>)}
            </nav>
            <div className="space-y-0.5 pt-2">
              <button type="button" onClick={logout} className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50">Log out</button>
            </div>
          </section>}
          <button type="button" onClick={() => { setProfileOpen(open => !open); setNotificationsOpen(false); }} aria-label={`Open profile menu for ${userName}`} aria-expanded={profileOpen} aria-haspopup="dialog" className="ml-2 flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8754F]">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-[#D9C4B2] transition hover:ring-2 hover:ring-[#A8754F]">
              {workerProfile?.photo ? <img src={workerProfile.photo} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[#A8754F] text-sm font-bold text-white">{initials}</span>}
            </span>
            <span className="max-w-32 truncate text-lg font-semibold text-stone-800 underline decoration-stone-400 underline-offset-4">{userName}</span>
          </button>
        </div>

        <nav className="mt-5 flex flex-col gap-1" aria-label="Worker navigation">
          {links.map(link => {
            const active = state.currentPage === link.page;
            const logoLink = link.icon === 'ai' || link.icon === 'echo';
            return <button key={link.icon} type="button" onClick={() => openPage(link.page)} aria-current={active ? 'page' : undefined} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? 'bg-[#EDE0D2] font-semibold text-[#5E3122]' : 'font-medium text-stone-700 hover:bg-white/75 hover:text-[#5E3122]'}`}>
              <span className={`flex shrink-0 items-center justify-center [&>svg]:h-7 [&>svg]:w-7 ${logoLink ? 'h-10 w-10' : 'h-8 w-8'}`}><WorkspaceIcon name={link.icon} /></span>
              <span className={logoLink ? 'font-semibold' : 'font-medium'}>{link.icon === 'ai' ? <ShramaAIMark className="h-8 w-8" /> : link.label}</span>
            </button>;
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <a href="mailto:support@shrama.com" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-white/75 hover:text-[#5E3122]">
            <img src="/images/worker/help-icon.png" alt="" className="h-5 w-5 object-contain" />
            Help and Guidance
          </a>
          <button type="button" onClick={() => openPage('settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-white/75 hover:text-[#5E3122] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8754F]">
            <img src="/images/worker/settings-icon.png" alt="" className="h-5 w-5 object-contain" />
            Settings
          </button>
          {notificationsOpen && <NotificationPanel placement="floating" onClose={() => setNotificationsOpen(false)} />}
        </div>
      </div>
    </aside>
  );
}
