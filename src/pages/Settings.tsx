import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';

type Preferences = {
  applicationUpdates: boolean;
  messages: boolean;
};

const PREFERENCES_KEY = 'shrama-notification-preferences-v1';

export default function Settings() {
  const { state, navigate } = useApp();
  const user = state.currentUser;
  const isProvider = user?.role === 'provider';
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      return stored ? { applicationUpdates: true, messages: true, ...JSON.parse(stored) } : { applicationUpdates: true, messages: true };
    } catch {
      return { applicationUpdates: true, messages: true };
    }
  });

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const togglePreference = (key: keyof Preferences) => {
    setPreferences(current => ({ ...current, [key]: !current[key] }));
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Your account</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">Manage your account details and notification preferences.</p>
      </header>

      <section className="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold text-stone-900">Account information</h2>
          <p className="mt-1 text-sm text-stone-500">Your Shrama sign-in and profile details.</p>
        </div>
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Email address</p>
            <p className="mt-1 break-all text-sm font-medium text-stone-800">{user?.email ?? 'Not available'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Account type</p>
            <p className="mt-1 text-sm font-medium capitalize text-stone-800">{user?.role ?? 'Member'}</p>
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={() => navigate(user?.role === 'provider' ? 'provider-profile' : 'worker-profile')}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-primary hover:text-primary"
            >
              Edit profile <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold text-stone-900">Notifications</h2>
          <p className="mt-1 text-sm text-stone-500">Choose which updates you want to see in Shrama.</p>
        </div>
        <div className="divide-y divide-stone-100 px-5 sm:px-6">
          <PreferenceRow
            title={isProvider ? 'New applicant updates' : 'Application updates'}
            description={isProvider ? 'Get updates when someone applies to one of your job listings.' : 'Get updates when an employer reviews or changes your application status.'}
            checked={preferences.applicationUpdates}
            onChange={() => togglePreference('applicationUpdates')}
          />
          <PreferenceRow
            title="Messages"
            description="Get notified when you receive a new message."
            checked={preferences.messages}
            onChange={() => togglePreference('messages')}
          />
        </div>
      </section>
    </main>
  );
}

function PreferenceRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-5">
      <div>
        <p className="text-sm font-semibold text-stone-800">{title}</p>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-500 sm:text-sm">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${checked ? 'bg-primary' : 'bg-stone-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
