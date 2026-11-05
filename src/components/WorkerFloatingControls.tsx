import { useState } from 'react';
import { useApp } from '../store/AppContext';
import NotificationPanel from './NotificationPanel';

export default function WorkerFloatingControls() {
  const { unreadNotificationsCount, navigate } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <div className="fixed right-6 top-5 z-40 hidden items-center gap-1.5 rounded-2xl border border-[#E8DFD6] bg-white/95 p-2 shadow-lg shadow-stone-900/5 backdrop-blur lg:flex">
      <button type="button" onClick={() => setNotificationsOpen(open => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-stone-700 transition-colors hover:bg-[#F8F4EF] hover:text-[#5E3122] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8754F]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M10 21h4" /></svg>
        {unreadNotificationsCount > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A8754F] px-1 text-[9px] font-bold text-white">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>}
      </button>
      <button type="button" onClick={() => navigate('settings')} aria-label="Settings" title="Settings" className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-700 transition-colors hover:bg-[#F8F4EF] hover:text-[#5E3122] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8754F]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></svg>
      </button>
      {notificationsOpen && <NotificationPanel placement="floating" onClose={() => setNotificationsOpen(false)} />}
    </div>
  );
}
