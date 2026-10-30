import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { Job } from '../types';

const categoryConfig = {
  'qualified': { label: 'Qualified / Professional' },
  'skill-based': { label: 'Skill Based' },
  'beginner-friendly': { label: 'Beginner Friendly' },
};

const workTypeLabel: Record<string, string> = {
  'full-day': 'Full Day',
  'half-day': 'Half Day',
  'hourly': 'Hourly',
  'multi-day': 'Multi-Day',
};

interface Props {
  job: Job;
  compact?: boolean;
}

export default function JobCard({ job, compact = false }: Props) {
  const { navigate, hasApplied, isSaved, saveJob, unsaveJob, browseSkill, state } = useApp();
  const [logoFailed, setLogoFailed] = useState(false);
  const isWorker = state.currentUser?.role === 'worker';
  const applied = hasApplied(job.id);
  const saved = isSaved(job.id);
  const cat = categoryConfig[job.category];
  const isExternal = job.externalSource === 'himalayas';

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    saved ? unsaveJob(job.id) : saveJob(job.id);
  };

  return (
    <div
      onClick={() => {
        if (isExternal && !state.currentUser) {
          if (job.externalUrl) window.open(job.externalUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        navigate('job-detail', job.id);
      }}
      className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm cursor-pointer hover:shadow-md hover:border-stone-300 transition-all group animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-stone-200 bg-white shadow-sm flex-shrink-0">
          {job.providerLogo && !logoFailed ? (
            <img
              src={job.providerLogo}
              alt={`${job.providerName} logo`}
              loading="lazy"
              onError={() => setLogoFailed(true)}
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <span aria-hidden="true" className="flex h-full w-full items-center justify-center bg-primary-50 font-display font-bold text-primary-ink">{job.providerName.trim().slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-950 text-lg leading-snug group-hover:text-primary-ink transition-colors line-clamp-2">
              {job.title}
            </h3>
            {isWorker && (
              <button
                onClick={handleSave}
                className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-50 hover:text-primary-ink transition-colors"
                title={saved ? 'Unsave' : 'Save job'}
              >
                <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-primary-ink">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-medium text-stone-700 truncate">{job.providerName}</span>
            {job.providerVerified && (
              <span className="flex-shrink-0 w-4 h-4 bg-primary-50 rounded-full flex items-center justify-center" title="Verified Provider">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5E3122" strokeWidth="3" className="w-2.5 h-2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category + status */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-medium text-stone-900">
        <span>{cat.label}</span>
        <span aria-hidden="true" className="text-[#5E3122]">·</span>
        <span>{job.employmentType || workTypeLabel[job.workType]}</span>
        {isExternal && <><span aria-hidden="true" className="text-[#5E3122]">·</span><span>External Opportunity</span></>}
        {job.status === 'filled' && <><span aria-hidden="true" className="text-[#5E3122]">·</span><span>Filled</span></>}
      </div>

      {/* Meta info */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-stone-500 flex-shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="text-sm text-stone-700 truncate">{job.location.split(',').slice(-2).join(',').trim()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-stone-500 flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-sm text-stone-700">{job.date ? new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' }) : 'Date not listed'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-stone-500 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-sm text-stone-700">{job.duration || job.seniority || 'Details on source'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-stone-500 flex-shrink-0">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="text-sm font-semibold text-stone-900 font-mono-data">
            {isExternal ? (job.salaryText || 'Salary not listed') : <>NPR {job.payment.toLocaleString()}<span className="font-normal text-stone-500">/{job.paymentType.replace('per-', '')}</span></>}
          </span>
        </div>
      </div>

      {/* Skills */}
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skillsRequired.slice(0, 3).map(skill => (
            <button
              key={skill}
              onClick={event => { event.stopPropagation(); browseSkill(skill); }}
              className="min-h-8 text-[13px] px-2.5 py-1 bg-stone-100 text-stone-800 rounded-full border border-stone-200 hover:border-primary hover:text-primary-ink"
            >
              {skill}
            </button>
          ))}
          {job.skillsRequired.length > 3 && (
            <span className="text-[13px] px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full">
              +{job.skillsRequired.length - 3} more
            </span>
          )}
        </div>
      )}

      {isExternal && !compact && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <p className="line-clamp-2 text-sm leading-relaxed text-stone-700">{job.description || 'Description not listed.'}</p>
          <p className="mt-2 text-[11px] font-mono-data uppercase tracking-wider text-stone-500"><a href="https://himalayas.app" target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="underline underline-offset-2 hover:text-primary-ink">Source: Himalayas</a></p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isExternal ? (
            <span className="text-[13px] text-stone-600 font-mono-data">{job.publishedDate ? `Published ${new Date(job.publishedDate).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}` : 'Published date not listed'}</span>
          ) : (
            <>
              <span className="text-[13px] text-stone-600 font-mono-data">{job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
              <span className="text-[13px] text-stone-600 font-mono-data">{job.workersNeeded - job.workersHired} spot{job.workersNeeded - job.workersHired !== 1 ? 's' : ''} left</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {applied ? (
            <span className="text-xs font-semibold text-stone-900 px-2.5 py-1 bg-primary-50 rounded-full border border-primary-100">Applied</span>
          ) : (
            <span className="text-xs font-semibold text-primary-ink group-hover:underline">{isExternal ? 'View Original →' : 'View Details →'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
