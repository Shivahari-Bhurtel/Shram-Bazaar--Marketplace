import { useState } from 'react';
import { useApp } from '../store/AppContext';
import NotificationPanel from './NotificationPanel';
import { LanguageSwitch } from '../i18n/LanguageContext';

export default function Navbar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp();
  const { currentUser, currentPage } = state;
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isWorker = currentUser?.role === 'worker';
  const isProvider = currentUser?.role === 'provider';

  const workerLinks = [
    { label: 'Discover Jobs', page: 'job-discovery' as const },
    { label: 'My Applications', page: 'my-applications' as const },
    { label: 'Saved Jobs', page: 'saved-jobs' as const },
    { label: 'Chat', page: 'chat' as const },
  ];

  const providerLinks = [
    { label: 'Dashboard', page: 'provider-dashboard' as const },
    { label: 'Post a Job', page: 'create-job' as const },
    { label: 'My Jobs', page: 'my-jobs' as const },
    { label: 'Organisation', page: 'provider-profile' as const },
    { label: 'Chat', page: 'chat' as const },
  ];

  const links = isWorker ? workerLinks : isProvider ? providerLinks : [];

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-stone-100 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex h-[4.5rem] items-center justify-between">
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
                <span className="font-display text-3xl font-extrabold tracking-tight text-primary leading-none">Shrama</span>
              </div>
            </button>

            {/* Desktop Nav */}
            {currentUser && (
              <div className={`hidden items-center md:flex ${isWorker ? 'gap-2' : 'gap-1'}`}>
                {links.map(link => (
                  <button
                    key={link.page}
                    onClick={() => navigate(link.page)}
                    className={`${isWorker ? 'rounded-xl px-4 py-2.5 text-base font-semibold tracking-tight' : 'rounded-lg px-3 py-1.5 text-sm font-medium'} transition-colors ${
                      currentPage === link.page
                        ? isWorker ? 'bg-stone-200 text-stone-950 font-bold' : 'bg-primary-50 text-primary font-bold'
                        : isWorker ? 'text-stone-950 hover:bg-stone-100' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
            {!currentUser && (
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
                <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">
                  How it works
                </button>
                <button onClick={() => document.getElementById('businesses')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">
                  For businesses
                </button>
              </div>
            )}

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <LanguageSwitch inline />
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

                  {/* Profile menu */}
                  <div className="hidden md:flex items-center gap-2">
                    {!isWorker && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary">
                        Provider
                      </span>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setProfileOpen(open => !open)}
                        aria-haspopup="menu"
                        aria-expanded={profileOpen}
                        className={`${isWorker ? 'text-[15px] font-semibold tracking-tight' : 'text-sm font-medium'} inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-stone-700 transition-colors hover:bg-stone-100 hover:text-primary`}
                      >
                        Profile
                        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                          <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {profileOpen && (
                        <div role="menu" className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                          <button
                            role="menuitem"
                            onClick={() => { setProfileOpen(false); navigate(isWorker ? 'worker-profile' : 'provider-profile'); }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary"
                          >
                            View profile
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setProfileOpen(false); navigate('settings'); }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary"
                          >
                            Settings
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setProfileOpen(false); logout(); }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-primary-50 hover:text-primary-dark"
                          >
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
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
            <div className="md:hidden py-3 space-y-1">
              {links.map(link => (
                <button
                  key={link.page}
                  onClick={() => { navigate(link.page); setMobileOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${isWorker ? 'text-base font-semibold tracking-tight' : 'text-sm font-medium'} ${
                    currentPage === link.page
                      ? isWorker ? 'bg-stone-200 text-stone-950 font-bold' : 'bg-primary-50 text-primary font-bold'
                      : isWorker ? 'text-stone-950 hover:bg-stone-100' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => { navigate(isWorker ? 'worker-profile' : 'provider-profile'); setMobileOpen(false); }}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100"
              >
                Profile
              </button>
              <button
                onClick={() => { navigate('settings'); setMobileOpen(false); }}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100"
              >
                Settings
              </button>
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
