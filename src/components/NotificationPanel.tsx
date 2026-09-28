import { useApp } from '../store/AppContext';
import type { Notification } from '../types';

const typeConfig: Record<Notification['type'], { icon: string; color: string }> = {
  selection: { icon: '✓', color: 'bg-green-100 text-green-700' },
  shortlisted: { icon: '★', color: 'bg-amber-100 text-amber-700' },
  rejection: { icon: '✗', color: 'bg-stone-100 text-stone-600' },
  application: { icon: '↑', color: 'bg-teal-100 text-teal' },
  'new-job': { icon: '🔔', color: 'bg-primary-100 text-primary' },
  'job-update': { icon: '!', color: 'bg-amber-100 text-amber-700' },
};

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { state, markNotificationRead, markAllNotificationsRead } = useApp();
  const myNotifs = state.notifications
    .filter(n => n.userId === state.currentUser?.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-[4.5rem] z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900">Notifications</h3>
          <div className="flex items-center gap-2">
            {myNotifs.some(n => !n.read) && (
              <button onClick={markAllNotificationsRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 rounded">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[26rem]">
          {myNotifs.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <div className="text-3xl mb-2">🔔</div>
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            myNotifs.map(notif => {
              const cfg = typeConfig[notif.type];
              return (
                <button
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={`w-full text-left px-4 py-3 border-b border-stone-50 hover:bg-stone-50 transition-colors flex gap-3 ${
                    !notif.read ? 'bg-primary-50/30' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-snug ${notif.read ? 'text-stone-700' : 'text-stone-900'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-stone-400 mt-1 font-mono-data">{notif.date}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
