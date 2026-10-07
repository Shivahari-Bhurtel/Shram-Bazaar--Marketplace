import type { Job, JobCategory, WorkType } from '../types';

interface HimalayasApiJob {
  guid?: string;
  title?: string;
  companyName?: string;
  companyLogo?: string;
  applicationLink?: string;
  description?: string;
  excerpt?: string;
  employmentType?: string;
  seniority?: string;
  locationRestrictions?: string[];
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  salaryPeriod?: string;
  pubDate?: string;
}

interface HimalayasApiResponse {
  jobs?: HimalayasApiJob[];
  totalCount?: number;
  offset?: number;
  limit?: number;
}

export interface HimalayasSearchOptions {
  q?: string;
  employmentType?: string;
  country?: string;
  seniority?: string;
  sort?: string;
  offset?: number;
  limit?: number;
}

export interface HimalayasSearchResult {
  jobs: Job[];
  totalCount: number;
  offset: number;
  limit: number;
}

const toDate = (value?: string) => value ? value.slice(0, 10) : '';

const cleanText = (value?: string) =>
  value?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';

const workTypeFor = (employmentType?: string): WorkType => {
  const value = employmentType?.toLowerCase() || '';
  if (value.includes('hour')) return 'hourly';
  if (value.includes('part')) return 'half-day';
  if (value.includes('contract') || value.includes('freelance')) return 'multi-day';
  return 'full-day';
};

const categoryFor = (seniority?: string): JobCategory => {
  const value = seniority?.toLowerCase() || '';
  if (value.includes('entry') || value.includes('junior')) return 'beginner-friendly';
  if (value.includes('mid') || value.includes('senior') || value.includes('lead')) return 'qualified';
  return 'skill-based';
};

const salaryFor = (job: HimalayasApiJob) => {
  if (job.minSalary == null && job.maxSalary == null) return undefined;
  const currency = job.currency || '';
  const period = job.salaryPeriod ? ` / ${job.salaryPeriod}` : '';
  const minimum = job.minSalary != null ? `${currency} ${job.minSalary.toLocaleString()}` : '';
  const maximum = job.maxSalary != null ? `${currency} ${job.maxSalary.toLocaleString()}` : '';
  return minimum && maximum && minimum !== maximum ? `${minimum} - ${maximum}${period}` : `${minimum || maximum}${period}`;
};

export function mapHimalayasJob(job: HimalayasApiJob, index: number): Job {
  const publishedDate = toDate(job.pubDate);
  const location = job.locationRestrictions?.filter(Boolean).join(', ') || 'Remote';
  const description = cleanText(job.description) || cleanText(job.excerpt);

  return {
    id: `himalayas-${job.guid || index}`,
    providerId: 'himalayas',
    providerName: job.companyName || 'Company not listed',
    providerLogo: job.companyLogo || '',
    providerVerified: false,
    title: job.title || 'Untitled opportunity',
    description,
    category: categoryFor(job.seniority),
    skillsRequired: [],
    qualificationRequired: '',
    experienceRequired: '',
    workType: workTypeFor(job.employmentType),
    workersNeeded: 0,
    workersHired: 0,
    date: publishedDate,
    startTime: '',
    endTime: '',
    duration: '',
    location,
    district: location,
    payment: 0,
    paymentType: 'fixed',
    status: 'active',
    postedDate: publishedDate,
    deadline: '',
    applicantCount: 0,
    externalSource: 'himalayas',
    externalUrl: job.applicationLink,
    salaryText: salaryFor(job),
    employmentType: job.employmentType,
    seniority: job.seniority,
    publishedDate,
  };
}

export async function searchHimalayasJobs(options: HimalayasSearchOptions, signal?: AbortSignal): Promise<HimalayasSearchResult> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const response = await fetch(`/api/himalayas/jobs?${params.toString()}`, { signal });
  const payload = await response.json() as HimalayasApiResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'Himalayas jobs are temporarily unavailable.');

  const jobs = (payload.jobs || []).map((job, index) => mapHimalayasJob(job, index + (payload.offset || 0)));
  return {
    jobs,
    totalCount: payload.totalCount || jobs.length,
    offset: payload.offset || 0,
    limit: payload.limit || jobs.length,
  };
}