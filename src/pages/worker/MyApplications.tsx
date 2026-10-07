import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ApplicationStatusBadge } from '../../components/StatusBadge';
import type { ApplicationStatus } from '../../types';

export default function MyApplications() {
  const { myApplications, navigate, state } = useApp();
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');

  const countFor = (status: ApplicationStatus) => myApplications.filter(app => app.status === status).length;
  const filtered = activeTab === 'all' ? myApplications : myApplications.filter(app => app.status === activeTab);
  const tabs: { key: ApplicationStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All applications' },
    { key: 'pending', label: 'Applied' },
    { key: 'shortlisted', label: 'Shortlisted' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Not selected' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">Your workspace</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">My applications</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600 sm:text-base">Keep track of your applications and the latest updates from employers.</p>
        </div>
        <button
          onClick={() => navigate('job-discovery')}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          Browse jobs <span aria-hidden="true">→</span>
        </button>
      </header>

      <section aria-label="Application list">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold tracking-tight text-stone-900">Application activity</h2>
          <span className="text-sm text-stone-500">{myApplications.length} {myApplications.length === 1 ? 'application' : 'applications'}</span>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto border-b border-stone-200 pb-0.5" role="tablist" aria-label="Filter applications by status">
          {tabs.map(tab => {
            const count = tab.key === 'all' ? myApplications.length : countFor(tab.key);
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${selected ? 'border-primary text-primary' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${selected ? 'bg-primary-50 text-primary' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center sm:px-12 sm:py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7m-13 2h18l-1.2 10.2a2 2 0 0 1-2 1.8H6.2a2 2 0 0 1-2-1.8L3 9Zm0 0V7h18v2m-12 4h6" />
              </svg>
            </div>
            <h3 className="mt-5 font-display text-xl font-bold text-stone-900">
              {activeTab === 'all' ? 'Your next opportunity starts here' : `No ${tabs.find(tab => tab.key === activeTab)?.label.toLowerCase()} applications`}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
              {activeTab === 'all'
                ? 'Explore current openings, find work that matches your skills, and your applications will be tracked here.'
                : 'There are no applications in this status yet. You can check another status or explore more jobs.'}
            </p>
            <button
              onClick={() => navigate('job-discovery')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Discover jobs <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => {
              const job = state.jobs.find(item => item.id === app.jobId);
              const jobDate = job?.date ? new Date(job.date) : null;
              return (
                <article key={app.id} className="rounded-2xl border border-stone-200 bg-white p-5 transition-shadow hover:shadow-md sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate('job-detail', app.jobId)}
                        className="text-left font-display text-lg font-bold leading-snug text-stone-900 transition-colors hover:text-primary sm:text-xl"
                      >
                        {app.jobTitle}
                      </button>
                      <p className="mt-1 text-sm font-medium text-stone-600">{app.providerName}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
                        {job && (
                          <>
                            <span className="inline-flex items-center gap-1.5">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-stone-400" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                              {job.location.split(',').slice(-1)[0].trim()}
                            </span>
                            <span className="font-semibold text-stone-700">NPR {job.payment.toLocaleString()}/{job.paymentType.replace('per-', '')}</span>
                            {jobDate && !Number.isNaN(jobDate.getTime()) && <span>{jobDate.toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>}
                          </>
                        )}
                      </div>
                    </div>
                    <ApplicationStatusBadge status={app.status} />
                  </div>

                  {app.coverNote && (
                    <div className="mt-5 rounded-xl bg-stone-50 px-4 py-3.5">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Your message</p>
                      <p className="line-clamp-2 text-sm leading-relaxed text-stone-600">{app.coverNote}</p>
                    </div>
                  )}

                  {app.providerNote && (
                    <div className={`mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed ${app.status === 'accepted' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                      <span className="font-semibold">Update from {app.providerName}: </span>{app.providerNote}
                    </div>
                  )}

                  {app.status === 'accepted' && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <span className="font-bold" aria-hidden="true">✓</span>
                      <p className="font-medium">You’re accepted. {jobDate && !Number.isNaN(jobDate.getTime()) ? `Your job is scheduled for ${jobDate.toLocaleDateString('en-NP', { weekday: 'long', month: 'long', day: 'numeric' })}.` : 'Check the job details for next steps.'}</p>
                    </div>
                  )}
                  {app.status === 'shortlisted' && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">You’re shortlisted. The employer may contact you with an update.</div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                    <span className="text-xs text-stone-400">Applied {app.appliedDate}</span>
                    <button onClick={() => navigate('job-detail', app.jobId)} className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-dark">
                      View job <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
