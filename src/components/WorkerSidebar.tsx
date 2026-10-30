import { useState } from 'react';
import { useApp } from '../store/AppContext';
import NotificationPanel from './NotificationPanel';
import ShramaAIMark from './ShramaAIMark';

type WorkerPage = 'worker-dashboard' | 'job-discovery' | 'my-applications' | 'saved-jobs' | 'chat';
type IconName = 'home' | 'search' | 'applications' | 'saved' | 'ai';

function WorkspaceIcon({ name }: { name: IconName }) {
  if (name === 'ai') {
    return <ShramaAIMark />;
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'home' || name === 'applications' ? '1.7' : '1.5'} strokeLinecap={name === 'search' || name === 'home' || name === 'applications' ? 'round' : 'square'} strokeLinejoin={name === 'search' || name === 'home' || name === 'applications' ? 'round' : 'miter'} className="h-5 w-5" aria-hidden="true">
      {name === 'home' && <><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .7-1.53l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>}
      {name === 'search' && <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" /></>}
      {name === 'applications' && <><path d="M14 2.75H6.5a2 2 0 0 0-2 2v14.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8.25l-5.5-5.5Z" /><path d="M14 3v5.5h5.5M8.5 14.5l2.25 2.25 4.75-5" /></>}
      {name === 'saved' && <path d="M6 3.5h12V21l-6-3.8L6 21V3.5Z" />}
    </svg>
  );
}

const links: { label: string; page: WorkerPage; icon: IconName }[] = [
  { label: 'Home', page: 'worker-dashboard', icon: 'home' },
  { label: 'Search', page: 'job-discovery', icon: 'search' },
  { label: 'My applications', page: 'my-applications', icon: 'applications' },
  { label: 'Saved jobs', page: 'saved-jobs', icon: 'saved' },
  { label: 'AI', page: 'chat', icon: 'ai' },
];

export default function WorkerSidebar({ fullHeight = false }: { fullHeight?: boolean }) {
  const { state, navigate, unreadNotificationsCount } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const sidebar = (
    <aside className={`worker-workspace-rail fixed left-0 z-30 hidden w-20 border-r border-stone-200/80 bg-white lg:flex ${fullHeight ? 'top-0 h-dvh' : 'top-[4.5rem] h-[calc(100dvh-4.5rem)]'}`} aria-label="Worker workspace">
      <nav className="flex h-full w-full flex-col items-center gap-1 px-1.5 pt-4">
        {links.map(link => {
          const active = state.currentPage === link.page;
          return <button key={link.page} onClick={() => navigate(link.page)} title={link.label} aria-label={link.label} aria-current={active ? 'page' : undefined} className={`relative flex w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2.5 text-center text-xs leading-tight text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${active ? 'font-medium after:absolute after:bottom-2 after:left-0 after:top-2 after:w-0.5 after:rounded-full after:bg-primary-ink' : 'font-normal hover:text-primary-ink'}`}>
            <span className={`flex items-center justify-center text-black ${link.icon === 'ai' ? 'h-11 w-11' : 'h-10 w-10'}`}><WorkspaceIcon name={link.icon} /></span>
            {link.icon !== 'ai' && <span className="max-w-full">{link.label}</span>}
          </button>;
        })}
        <div className="mt-auto w-full space-y-0 pb-3">
          <button type="button" onClick={() => setNotificationsOpen(open => !open)} title="Notifications" aria-label="Notifications" aria-expanded={notificationsOpen} className="relative flex w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-center text-xs text-black transition-colors hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
            <span className="flex h-10 w-10 items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
            </span>
            {unreadNotificationsCount > 0 && <span className="absolute right-3 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{unreadNotificationsCount}</span>}
          </button>
          <a href="mailto:support@shrama.com" title="Help" aria-label="Contact help and support" className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-center text-xs text-black transition-colors hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40">
            <span className="flex h-10 w-10 items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.8 9.5a2.3 2.3 0 1 1 3.9 1.7c-1 .9-1.7 1.3-1.7 2.8" />
                <circle cx="12" cy="17.3" r=".7" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span>Help</span>
          </a>
        </div>
      </nav>
      {notificationsOpen && <NotificationPanel placement="sidebar" onClose={() => setNotificationsOpen(false)} />}
    </aside>
  );

  return sidebar;
}
