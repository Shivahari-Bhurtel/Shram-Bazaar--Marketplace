import type { ApplicationStatus, JobStatus } from '../types';

const applicationConfig: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:     { label: 'Pending Review', bg: 'bg-stone-100',   text: 'text-stone-600',  dot: 'bg-stone-400' },
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
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const cfg = jobConfig[status];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

export function VerifiedBadge({ small }: { small?: boolean }) {
  if (small) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
      Verified Provider
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const configs: Record<string, { label: string; bg: string; text: string }> = {
    'qualified':          { label: 'Qualified / Professional', bg: 'bg-teal-50',   text: 'text-teal' },
    'skill-based':        { label: 'Skill Based',              bg: 'bg-amber-50',  text: 'text-amber-700' },
    'beginner-friendly':  { label: 'Beginner Friendly',        bg: 'bg-green-50',  text: 'text-green-700' },
  };
  const cfg = configs[category] ?? { label: category, bg: 'bg-stone-100', text: 'text-stone-600' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
