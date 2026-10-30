import { useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import NotificationPanel from './NotificationPanel';
import { LanguageSwitch } from '../i18n/LanguageContext';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';

export default function Navbar() {
  const { state, navigate, logout, unreadNotificationsCount } = useApp();
  const { currentUser, currentPage } = state;
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useDismissOnOutside(profileOpen, [profileMenuRef], () => setProfileOpen(false));
  useDismissOnOutside(mobileOpen, [mobileMenuButtonRef, mobileMenuRef], () => setMobileOpen(false));

  const isWorker = currentUser?.role === 'worker';
  const isProvider = currentUser?.role === 'provider';

  const workerLinks = [
    { label: 'Discover Jobs', page: 'job-discovery' as const },
    { label: 'My Applications', page: 'my-applications' as const },
    { label: 'Saved Jobs', page: 'saved-jobs' as const },
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
      <nav className="sticky top-0 z-40 border-b border-stone-200 bg-white shadow-[0_1px_3px_rgba(23,30,37,0.04)]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid h-[4.5rem] grid-cols-[1fr_auto] items-center md:grid-cols-[auto_1fr_auto] md:gap-4 lg:gap-8">
            {/* Logo */}
            <button
              onClick={() => navigate(currentUser ? (isWorker ? 'worker-dashboard' : 'provider-dashboard') : 'landing')}
              aria-label="Shram Bazaar home"
              className="group flex items-center"
            >
              <span className="flex items-baseline whitespace-nowrap leading-none" aria-hidden="true">
                <span className="text-[1.75rem] font-semibold leading-[0.92] text-[#5E3122]" style={{ fontFamily: "'Noto Serif Devanagari', serif" }}>
                  श्रम
                </span>
                <span className="font-script text-[1.65rem] font-semibold leading-none text-black">
                  Bazaar
                </span>
              </span>
            </button>

            {/* Desktop Nav */}
            {currentUser && (
              <div className="hidden h-full items-stretch justify-self-center md:flex md:gap-2">
                {links.map(link => (
                  <button
                    key={link.page}
                    onClick={() => navigate(link.page)}
                    aria-current={currentPage === link.page ? 'page' : undefined}
                    className={`flex h-full items-center border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 ${isWorker ? 'lg:hidden' : ''} ${currentPage === link.page ? 'border-primary-ink font-semibold text-primary-ink' : 'border-transparent font-medium text-stone-600 hover:border-stone-300 hover:text-stone-950'}`}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            )}
            {!currentUser && (
              <div className="hidden h-full items-stretch justify-self-center gap-7 text-sm font-medium text-stone-600 md:flex">
                <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="border-b-2 border-transparent transition-colors hover:border-stone-300 hover:text-primary-ink">
                  How it works
                </button>
                <button onClick={() => document.getElementById('businesses')?.scrollIntoView({ behavior: 'smooth' })} className="border-b-2 border-transparent transition-colors hover:border-stone-300 hover:text-primary-ink">
                  For businesses
                </button>
              </div>
            )}

            {/* Right actions */}
            <div className="flex items-center justify-self-end gap-1.5 sm:gap-2">
              <LanguageSwitch inline />
              {currentUser ? (
                <>
                  {/* Notifications */}
                  {!isWorker && <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    aria-label="Notifications"
                    title="Notifications"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                  </button>}

                  {/* Profile menu */}
                  <div className="hidden md:flex items-center gap-2">
                    {!isWorker && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary-ink">
                        Provider
                      </span>
                    )}
                    <div ref={profileMenuRef} className="relative">
                      <button
                        onClick={() => setProfileOpen(open => !open)}
                        aria-label="Profile and settings"
                        title="Profile and settings"
                        aria-haspopup="menu"
                        aria-expanded={profileOpen}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-stone-700 transition-colors hover:bg-stone-100 hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                          <path d="M10 3h4l.55 2.05c.68.17 1.3.43 1.87.78l1.94-.73 2 3.46-1.4 1.55a7.2 7.2 0 0 1 0 2.16l1.4 1.55-2 3.46-1.94-.73a7.2 7.2 0 0 1-1.87.78L14 19.4h-4l-.55-2.07a7.2 7.2 0 0 1-1.87-.78l-1.94.73-2-3.46 1.4-1.55a7.2 7.2 0 0 1 0-2.16l-1.4-1.55 2-3.46 1.94.73a7.2 7.2 0 0 1 1.87-.78L10 3Z" />
                          <circle cx="12" cy="11.2" r="2.6" />
                        </svg>
                      </button>
                      {profileOpen && (
                        <div role="menu" className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
                          <button
                            role="menuitem"
                            onClick={() => { setProfileOpen(false); navigate(isWorker ? 'worker-profile' : 'provider-profile'); }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary-ink"
                          >
                            View profile
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setProfileOpen(false); navigate('settings'); }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary-ink"
                          >
                            Settings
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => { setProfileOpen(false); logout(); }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-primary-50 hover:text-primary-ink"
                          >
                            Sign out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile menu button */}
                  <button
                    ref={mobileMenuButtonRef}
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={mobileOpen}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
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
                    className="text-sm font-medium text-stone-700 hover:text-primary-ink transition-colors px-3 py-1.5"
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
            <div ref={mobileMenuRef} className="md:hidden py-3 space-y-1">
              {links.map(link => (
                <button
                  key={link.page}
                  onClick={() => { navigate(link.page); setMobileOpen(false); }}
                  aria-current={currentPage === link.page ? 'page' : undefined}
                  className={`w-full rounded-lg border-l-2 px-3 py-2.5 text-left text-sm transition-colors ${currentPage === link.page ? 'border-primary-ink bg-primary-50/60 font-semibold text-primary-ink' : 'border-transparent font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-950'}`}
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

      {showNotifs && !isWorker && <NotificationPanel onClose={() => setShowNotifs(false)} />}
    </>
  );
}
