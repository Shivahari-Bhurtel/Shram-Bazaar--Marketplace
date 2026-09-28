import { useState } from 'react';
import { useApp } from '../store/AppContext';
import NotificationPanel from './NotificationPanel';

export default function Navbar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp();
  const { currentUser, currentPage } = state;
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isWorker = currentUser?.role === 'worker';
  const isProvider = currentUser?.role === 'provider';

  const workerLinks = [
    { label: 'Discover Jobs', page: 'job-discovery' as const },
    { label: 'My Applications', page: 'my-applications' as const },
    { label: 'Saved Jobs', page: 'saved-jobs' as const },
    { label: 'My Profile', page: 'worker-profile' as const },
  ];

  const providerLinks = [
    { label: 'Dashboard', page: 'provider-dashboard' as const },
    { label: 'Post a Job', page: 'create-job' as const },
    { label: 'My Jobs', page: 'my-jobs' as const },
    { label: 'Organisation', page: 'provider-profile' as const },
  ];

  const links = isWorker ? workerLinks : isProvider ? providerLinks : [];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => navigate(currentUser ? (isWorker ? 'worker-dashboard' : 'provider-dashboard') : 'landing')}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
              </div>
              <div className="leading-none">
                <span className="font-display text-lg font-bold text-primary tracking-tight">Shram Bazar</span>
                <span className="block text-[10px] text-stone-400 font-mono-data tracking-wider">श्रम बजार</span>
              </div>
            </button>

            {/* Desktop Nav */}
            {currentUser && (
              <div className="hidden md:flex items-center gap-1">
                {links.map(link => (
                  <button
                    key={link.page}
                    onClick={() => navigate(link.page)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === link.page
                        ? 'bg-primary-50 text-primary'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {currentUser ? (
                <>
                  {/* Notifications */}
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="relative p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Role badge + logout */}
                  <div className="hidden md:flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isWorker ? 'bg-teal-50 text-teal' : 'bg-primary-50 text-primary'
                    }`}>
                      {isWorker ? 'Worker' : 'Provider'}
                    </span>
                    <span className="text-sm text-stone-700 font-medium">{currentUser.name.split(' ')[0]}</span>
                    <button
                      onClick={logout}
                      className="text-sm text-stone-500 hover:text-primary transition-colors px-2 py-1 rounded"
                    >
                      Sign out
                    </button>
                  </div>

                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      {mobileOpen
                        ? <path d="M18 6L6 18M6 6l12 12"/>
                        : <path d="M3 12h18M3 6h18M3 18h18"/>
                      }
                    </svg>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('login')}
                    className="text-sm font-medium text-stone-700 hover:text-primary transition-colors px-3 py-1.5"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => navigate('worker-signup')}
                    className="text-sm font-medium bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu */}
          {currentUser && mobileOpen && (
            <div className="md:hidden border-t border-stone-100 py-3 space-y-1">
              {links.map(link => (
                <button
                  key={link.page}
                  onClick={() => { navigate(link.page); setMobileOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === link.page
                      ? 'bg-primary-50 text-primary'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
    </>
  );
}
