import { useState, type FormEvent } from 'react';
import { useApp } from '../../store/AppContext';
import JobCard from '../../components/JobCard';
import { ApplicationStatusBadge } from '../../components/StatusBadge';

function SidebarIcon({ name, className = '' }: { name: 'search'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${className}`} aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.5" /><path d="m15.6 15.6 4.6 4.6" />
    </svg>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WorkerDashboard() {
  const { state, navigate, myApplications, browseSkill } = useApp();
  const { workerProfile, jobs, externalJobs, notifications, currentUser } = state;
  const [search, setSearch] = useState('');

  if (!workerProfile) return null;

  const myNotifs = notifications.filter(notification => notification.userId === currentUser?.id && !notification.read);
  const allJobs = [...jobs, ...externalJobs];
  const recommendedJobs = allJobs
    .filter(job => (job.status === 'active' || job.status === 'filled') && !myApplications.some(application => application.jobId === job.id))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 3);
  const savedJobs = allJobs.filter(job => state.savedJobIds.includes(job.id)).slice(0, 2);
  const recentApplications = myApplications.slice(0, 3);
  const profileSteps = [
    { label: 'Basic details', complete: !!(workerProfile.phone && workerProfile.location) },
    { label: 'Skills', complete: workerProfile.skills.length > 0 },
    { label: 'Experience or qualifications', complete: workerProfile.experience.length > 0 || workerProfile.qualifications.length > 0 },
    { label: 'Identity verified', complete: workerProfile.kycStatus === 'verified' },
  ];
  const profilePercent = Math.round(profileSteps.filter(step => step.complete).length / profileSteps.length * 100);
  const completedProfileSections = profileSteps.filter(step => step.complete).length;
  const displayName = workerProfile.name.trim().split(/\s+/).map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  const firstName = displayName.split(/\s+/)[0];
  const profileTitle = workerProfile.professionalTitle?.trim() || workerProfile.experience[0]?.title || workerProfile.skills.slice(0, 2).join(' · ');

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    browseSkill(search.trim());
  };

  return (
    <div className="w-full max-w-[1800px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px] 2xl:gap-8">
        <main className="order-3 min-w-0 lg:order-2">
          <header className="relative mb-6 overflow-hidden rounded-2xl border border-[#3D241A] bg-gradient-to-r from-[#3D241A] via-[#5E3122] to-[#70452F] px-5 py-5 shadow-md shadow-[#3D241A]/10 sm:px-7 sm:py-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_86%_20%,rgba(255,255,255,0.15),transparent_48%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border border-white/10 sm:h-48 sm:w-48" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h1 className="font-sans text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-2xl lg:text-3xl">{greeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}</h1></div>
              <form onSubmit={submitSearch} className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/60 bg-white p-1.5 shadow-md focus-within:ring-2 focus-within:ring-white/40">
                <input aria-label="Search jobs by skill or role" value={search} onChange={event => setSearch(event.target.value)} onFocus={() => browseSkill(search.trim())} placeholder="Search by title, skill, or keyword..." className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400" />
                <button type="submit" aria-label="Search jobs" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-transparent text-primary-ink transition-colors hover:text-[#4C281D]">
                  <SidebarIcon name="search" className="!h-5 !w-5 shrink-0" />
                </button>
              </form>
            </div>
          </header>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-sans text-2xl font-semibold tracking-tight text-stone-950">Recommended jobs</h2>
              <button type="button" onClick={() => navigate('job-discovery')} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 hover:text-primary-ink" aria-label="Open job discovery filters">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" /><circle cx="8" cy="6" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" /><circle cx="11" cy="18" r="1.5" fill="currentColor" /></svg>
                Filter jobs
              </button>
            </div>
            {recommendedJobs.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">{recommendedJobs.map(job => <JobCard key={job.id} job={job} />)}</div>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-stone-700">No recommendations yet.</p>
                <button onClick={() => navigate('job-discovery')} className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark sm:self-auto">Find jobs</button>
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-sans text-2xl font-semibold tracking-tight text-stone-950">Saved jobs</h2><button onClick={() => navigate('saved-jobs')} className="rounded-lg px-2 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-50">View all <span aria-hidden="true">→</span></button></div>
            {savedJobs.length ? <div className="grid gap-4 xl:grid-cols-2">{savedJobs.map(job => <JobCard key={job.id} job={job} compact />)}</div> : <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium text-stone-700">No saved jobs yet.</p><button onClick={() => navigate('job-discovery')} className="self-start rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:border-primary-100 hover:text-primary-ink sm:self-auto">Find jobs</button></div>}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-sans text-xl font-semibold tracking-tight text-stone-950">Recent applications</h2><button onClick={() => navigate('my-applications')} className="text-sm font-semibold text-primary-ink hover:underline">View all</button></div>
            {recentApplications.length ? <div className="divide-y divide-stone-100">{recentApplications.map(application => <div key={application.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{application.jobTitle}</p><p className="mt-0.5 text-xs text-stone-500">{application.providerName}</p></div><ApplicationStatusBadge status={application.status} /></div>)}</div> : <div className="rounded-xl bg-stone-50 px-4 py-5 text-center"><p className="text-sm font-medium text-stone-700">No applications yet.</p></div>}
          </section>
        </main>

        <aside className="order-2 space-y-3 lg:order-3 xl:sticky xl:top-24">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3.5">
              {workerProfile.photo ? (
                <img src={workerProfile.photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#5E3122] font-sans text-xl font-semibold text-white">{displayName.slice(0, 1).toUpperCase()}</div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-black">{displayName}</h2>
                {profileTitle && <p className="mt-0.5 truncate text-xs leading-relaxed text-stone-600">{profileTitle}</p>}
              </div>
            </div>

            <div className="mt-5 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-black">Profile completion</span>
                <span className="text-sm font-semibold tabular-nums text-[#5E3122]">{profilePercent}%</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">{completedProfileSections} of {profileSteps.length} sections complete</p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profilePercent}>
                <div className="h-full rounded-full bg-[#5E3122] transition-all duration-500" style={{ width: `${profilePercent}%` }} />
              </div>
              <button onClick={() => navigate('worker-profile')} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-black underline decoration-stone-400 underline-offset-4 transition-colors hover:decoration-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
                Edit profile
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" /></svg>
              </button>
            </div>

          </section>

          {myNotifs.length > 0 && <button onClick={() => navigate('my-applications')} className="flex w-full items-start gap-3 p-2 text-left transition-colors"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-700" aria-hidden="true">✓</span><span><span className="block text-xs font-medium text-red-700">New update</span><span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-stone-900">{myNotifs[0].message}</span></span></button>}
        </aside>
      </div>
    </div>
  );
}
