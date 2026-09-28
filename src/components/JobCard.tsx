import { useApp } from '../store/AppContext';
import type { Job } from '../types';

const categoryConfig = {
  'qualified': { label: 'Qualified / Professional', bg: 'bg-teal-50', text: 'text-teal', border: 'border-teal-100' },
  'skill-based': { label: 'Skill Based', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  'beginner-friendly': { label: 'Beginner Friendly', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
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
  const isWorker = state.currentUser?.role === 'worker';
  const applied = hasApplied(job.id);
  const saved = isSaved(job.id);
  const cat = categoryConfig[job.category];

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    saved ? unsaveJob(job.id) : saveJob(job.id);
  };

  return (
    <div
      onClick={() => navigate('job-detail', job.id)}
      className="bg-white border border-stone-200 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-stone-300 transition-all group animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
          <img src={job.providerLogo} alt={job.providerName} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-900 text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {job.title}
            </h3>
            {isWorker && (
              <button
                onClick={handleSave}
                className="p-1 flex-shrink-0 text-stone-400 hover:text-primary transition-colors"
                title={saved ? 'Unsave' : 'Save job'}
              >
                <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-primary">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-stone-500 truncate">{job.providerName}</span>
            {job.providerVerified && (
              <span className="flex-shrink-0 w-4 h-4 bg-teal-50 rounded-full flex items-center justify-center" title="Verified Provider">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="3" className="w-2.5 h-2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category + status */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${cat.bg} ${cat.text} ${cat.border}`}>
          {cat.label}
        </span>
        <span className="text-[11px] text-stone-500 font-medium px-2 py-0.5 bg-stone-50 rounded-full border border-stone-100">
          {workTypeLabel[job.workType]}
        </span>
        {job.status === 'filled' && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
            Filled
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-stone-400 flex-shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="text-xs text-stone-600 truncate">{job.location.split(',').slice(-2).join(',').trim()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-stone-400 flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-xs text-stone-600">{new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-stone-400 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-xs text-stone-600">{job.duration}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-stone-400 flex-shrink-0">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="text-xs font-semibold text-stone-800 font-mono-data">
            NPR {job.payment.toLocaleString()}
            <span className="font-normal text-stone-500">/{job.paymentType.replace('per-', '')}</span>
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
              className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full border border-stone-200 hover:border-primary hover:text-primary"
            >
              {skill}
            </button>
          ))}
          {job.skillsRequired.length > 3 && (
            <span className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-400 rounded-full">
              +{job.skillsRequired.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-stone-400 font-mono-data">
            {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-stone-400 font-mono-data">
            {job.workersNeeded - job.workersHired} spot{job.workersNeeded - job.workersHired !== 1 ? 's' : ''} left
          </span>
        </div>
        <div className="flex items-center gap-2">
          {applied ? (
            <span className="text-[11px] font-medium text-teal px-2 py-0.5 bg-teal-50 rounded-full">Applied</span>
          ) : (
            <span className="text-[11px] font-medium text-primary group-hover:underline">View Details →</span>
          )}
        </div>
      </div>
    </div>
  );
}
