export type UserRole = 'worker' | 'provider';
export type JobCategory = 'qualified' | 'skill-based' | 'beginner-friendly';
export type WorkType = 'full-day' | 'half-day' | 'hourly' | 'multi-day';
export type ApplicationStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected';
export type JobStatus = 'active' | 'filled' | 'closed' | 'draft';
export type PaymentType = 'per-day' | 'per-hour' | 'fixed';

export interface Qualification {
  id: string;
  degree: string;
  institution: string;
  year: number;
  field: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface WorkHistory {
  jobId: string;
  jobTitle: string;
  providerName: string;
  date: string;
  payment: number;
  rating: number;
  review: string;
}

export interface WorkerProfile {
  id: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  location: string;
  district: string;
  skills: string[];
  qualifications: Qualification[];
  experience: Experience[];
  availableDates: string[];
  availability: 'morning' | 'afternoon' | 'full-day' | 'flexible';
  bio: string;
  workHistory: WorkHistory[];
  rating: number;
  totalJobs: number;
  verified: boolean;
}

export interface ProviderProfile {
  id: string;
  orgName: string;
  logo: string;
  contactName: string;
  email: string;
  phone: string;
  location: string;
  district: string;
  industry: string;
  description: string;
  verified: boolean;
  verifiedDate?: string;
  pan: string;
  totalHires: number;
  rating: number;
  reviewCount: number;
}

export interface Job {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo: string;
  providerVerified: boolean;
  title: string;
  description: string;
  category: JobCategory;
  skillsRequired: string[];
  qualificationRequired: string;
  experienceRequired: string;
  workType: WorkType;
  workersNeeded: number;
  workersHired: number;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  district: string;
  payment: number;
  paymentType: PaymentType;
  status: JobStatus;
  postedDate: string;
  deadline: string;
  applicantCount: number;
  matchScore?: number;
  matchReasons?: string[];
}

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  workerName: string;
  workerPhoto: string;
  workerLocation: string;
  workerSkills: string[];
  workerRating: number;
  workerTotalJobs: number;
  jobTitle: string;
  providerName: string;
  providerId: string;
  appliedDate: string;
  status: ApplicationStatus;
  coverNote: string;
  providerNote?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'application' | 'selection' | 'new-job' | 'job-update' | 'rejection' | 'shortlisted';
  title: string;
  message: string;
  date: string;
  read: boolean;
  jobId?: string;
  applicationId?: string;
}

export interface User {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  profileId: string;
}
