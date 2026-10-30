import type { ApplicationStatus, JobStatus } from '../types';

const applicationConfig: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: 'Applied',        bg: 'bg-stone-100',   text: 'text-stone-600',  dot: 'bg-stone-400' },
  shortlisted: { label: 'Shortlisted',    bg: 'bg-amber-100',   text: 'text-amber-700',  dot: 'bg-amber' },
  accepted:    { label: 'Accepted',       bg: 'bg-green-100',   text: 'text-green-700',  dot: 'bg-green' },
  rejected:    { label: 'Not Selected',   bg: 'bg-stone-100',   text: 'text-stone-500',  dot: 'bg-stone-400' },
};

const jobConfig: Record<JobStatus, { label: string; bg: string; text: string }> = {
  active: { label: 'Active',  bg: 'bg-green-100',  text: 'text-green-700' },
  filled: { label: 'Filled',  bg: 'bg-teal-100',   text: 'text-teal' },
  closed: { label: 'Closed',  bg: 'bg-stone-100',  text: 'text-stone-500' },
  draft:  { label: 'Draft',   bg: 'bg-amber-100',  text: 'text-amber-700' },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const cfg = applicationConfig[status];
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 text-[13px] font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const cfg = jobConfig[status];
  return (
    <span className={`inline-flex min-h-8 items-center text-[13px] font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export function VerifiedBadge({ small }: { small?: boolean }) {
  if (small) {
    return (
      <span className="inline-flex min-h-7 items-center gap-1.5 text-xs font-semibold text-teal bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-teal bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-100">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Verified Provider
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const configs: Record<string, { label: string }> = {
    'qualified':          { label: 'Qualified / Professional' },
    'skill-based':        { label: 'Skill Based' },
    'beginner-friendly':  { label: 'Beginner Friendly' },
  };
  const cfg = configs[category] ?? { label: category };
  return (
    <span className="inline-flex items-center text-sm font-medium text-stone-900">
      {cfg.label}
    </span>
  );
}
