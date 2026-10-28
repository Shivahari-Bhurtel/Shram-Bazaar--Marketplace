import { useState, type FormEvent } from 'react';
import { useApp } from '../../store/AppContext';
import JobCard from '../../components/JobCard';
import { ApplicationStatusBadge } from '../../components/StatusBadge';

type SideLink = 'worker-dashboard' | 'job-discovery' | 'my-applications' | 'saved-jobs' | 'chat';

function SidebarIcon({ name, className = '' }: { name: 'home' | 'search' | 'applications' | 'saved' | 'chat' | 'profile'; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-[18px] w-[18px] ${className}`} aria-hidden="true">
      {name === 'search' && <><circle cx="10.8" cy="10.8" r="6.8" /><path strokeLinecap="round" d="m16 16 4.5 4.5" /></>}
      {name === 'home' && <><path strokeLinecap="round" strokeLinejoin="round" d="m3.5 10.5 8.5-7 8.5 7M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>}
      {name === 'applications' && <><rect x="4" y="5" width="16" height="15" rx="2" /><path strokeLinecap="round" d="M8 5V3m8 2V3M8 11h8m-8 4h5" /></>}
      {name === 'saved' && <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-3.8L6 21V4.8Z" />}
      {name === 'chat' && <><path strokeLinecap="round" strokeLinejoin="round" d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4.5A7.5 7.5 0 1 1 20 11.5Z" /><path strokeLinecap="round" d="M8 10h8m-8 4h5" /></>}
      {name === 'profile' && <><circle cx="12" cy="8" r="3.5" /><path strokeLinecap="round" d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>}
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
  const displayName = workerProfile.name.trim().split(/\s+/).map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  const firstName = displayName.split(/\s+/)[0];

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (search.trim()) browseSkill(search.trim());
    else navigate('job-discovery');
  };

  const sideLinks: { label: string; page: SideLink; icon: 'home' | 'search' | 'applications' | 'saved' | 'chat'; count?: number }[] = [
    { label: 'Home', page: 'worker-dashboard', icon: 'home' },
    { label: 'Find work', page: 'job-discovery', icon: 'search' },
    { label: 'My applications', page: 'my-applications', icon: 'applications', count: myApplications.length },
    { label: 'Saved jobs', page: 'saved-jobs', icon: 'saved', count: state.savedJobIds.length },
    { label: 'Messages', page: 'chat', icon: 'chat' },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)] xl:gap-8">
        <aside className="space-y-3 rounded-3xl bg-[#f3eee8] p-3 lg:sticky lg:top-24">
          <section className="relative overflow-hidden rounded-2xl border border-primary-dark/15 bg-gradient-to-br from-primary-dark via-primary to-[#a8754f] shadow-sm">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10 bg-white/[0.04]" />
            <div className="relative p-5">
              <div className="flex items-center gap-3">
                {workerProfile.photo ? (
                  <img src={workerProfile.photo} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/30" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 font-sans text-2xl font-semibold text-white">{displayName.slice(0, 1).toUpperCase()}</div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-white">{displayName}</h2>
                  <p className="mt-0.5 truncate text-sm text-white/75">{workerProfile.location || workerProfile.district}</p>
                  {workerProfile.rating > 0 && <p className="mt-1 text-xs font-medium text-white/90">{workerProfile.rating.toFixed(1)} ★ · {workerProfile.totalJobs} completed</p>}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white/90">Profile strength</span>
                  <span className="font-semibold text-white">{profilePercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${profilePercent}%` }} /></div>
                <button onClick={() => navigate('worker-profile')} className="mt-2.5 text-xs font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">Edit profile</button>
              </div>

              {workerProfile.skills.length > 0 && <div className="mt-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/70">Skills</p><div className="flex flex-wrap gap-1.5">{workerProfile.skills.slice(0, 4).map(skill => <span key={skill} className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">{skill}</span>)}{workerProfile.skills.length > 4 && <span className="px-1 py-1 text-[11px] text-white/70">+{workerProfile.skills.length - 4}</span>}</div></div>}
            </div>
          </section>

          <nav aria-label="Worker workspace" className="rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
            <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">Your workspace</p>
            {sideLinks.map(link => {
              const active = state.currentPage === link.page;
              return <button key={link.page} onClick={() => navigate(link.page)} aria-current={active ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${active ? 'bg-primary-50 font-semibold text-primary-ink' : 'font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}>
                <SidebarIcon name={link.icon} />
                <span className="flex-1">{link.label}</span>
                {link.count !== undefined && link.count > 0 && <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] ${active ? 'bg-white text-primary-ink' : 'bg-stone-100 text-stone-500'}`}>{link.count}</span>}
              </button>;
            })}
          </nav>

          {myNotifs.length > 0 && <button onClick={() => navigate('my-applications')} className="flex w-full items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" /><span><span className="block text-xs font-bold text-amber-900">New update</span><span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-amber-800">{myNotifs[0].message}</span></span></button>}
        </aside>

        <main className="min-w-0">
          <header className="relative mb-6 overflow-hidden rounded-3xl border border-primary-dark/20 bg-gradient-to-br from-primary-dark via-primary to-[#a8754f] px-5 py-6 shadow-sm sm:px-8 sm:py-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/10 bg-white/[0.04] sm:h-72 sm:w-72" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div><h1 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-white sm:text-3xl lg:text-4xl">{greeting()}, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}</h1></div>
              <form onSubmit={submitSearch} className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/60 bg-white p-1.5 shadow-md focus-within:ring-2 focus-within:ring-white/40">
                <SidebarIcon name="search" className="shrink-0 text-stone-400" />
                <input aria-label="Search jobs by skill or role" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try plumbing, driving, hospitality" className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400" />
                <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Search</button>
              </form>
            </div>
          </header>

          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-4"><h2 className="font-sans text-2xl font-semibold tracking-tight text-stone-950">Picked for your profile</h2><button onClick={() => navigate('job-discovery')} className="shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-50">Browse jobs <span aria-hidden="true">→</span></button></div>
            {recommendedJobs.length > 0 ? <div className="grid gap-4 xl:grid-cols-2">{recommendedJobs.map(job => <JobCard key={job.id} job={job} />)}</div> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-9 text-center sm:px-8"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-ink"><SidebarIcon name="search" /></div><h3 className="mt-4 text-lg font-bold text-stone-900">Your next opportunity starts here</h3><p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-500">We don’t have a role to recommend yet. Browse open jobs and use your skills to find a good fit.</p><button onClick={() => navigate('job-discovery')} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">Explore jobs</button></div>}
          </section>

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-sans text-2xl font-semibold tracking-tight text-stone-950">Saved for later</h2><button onClick={() => navigate('saved-jobs')} className="rounded-lg px-2 py-2 text-sm font-semibold text-primary-ink hover:bg-primary-50">View all <span aria-hidden="true">→</span></button></div>
            {savedJobs.length ? <div className="grid gap-4 xl:grid-cols-2">{savedJobs.map(job => <JobCard key={job.id} job={job} compact />)}</div> : <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-stone-600">Keep interesting jobs close by saving them from discovery.</p><button onClick={() => navigate('job-discovery')} className="self-start rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:border-primary-100 hover:text-primary-ink sm:self-auto">Find jobs</button></div>}
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-sans text-xl font-semibold tracking-tight text-stone-950">Application activity</h2><button onClick={() => navigate('my-applications')} className="text-sm font-semibold text-primary-ink hover:underline">All applications</button></div>
            {recentApplications.length ? <div className="divide-y divide-stone-100">{recentApplications.map(application => <div key={application.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{application.jobTitle}</p><p className="mt-0.5 text-xs text-stone-500">{application.providerName}</p></div><ApplicationStatusBadge status={application.status} /></div>)}</div> : <div className="rounded-xl bg-stone-50 px-4 py-5 text-center"><p className="text-sm font-medium text-stone-700">No applications yet</p><p className="mt-1 text-xs text-stone-500">When you apply for a job, updates will show here.</p></div>}
          </section>
        </main>
      </div>
    </div>
  );
}
