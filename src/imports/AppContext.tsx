import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { User, WorkerProfile, ProviderProfile, Job, Application, Notification, ApplicationStatus, JobStatus } from '../types';
import {
  demoWorkerUser, demoProviderUser,
  workerProfiles, providerProfiles,
  initialJobs, initialApplications, initialNotifications,
  computeMatchScore,
} from '../data/mockData';

export type Page =
  | 'landing'
  | 'login'
  | 'worker-signup'
  | 'provider-signup'
  | 'worker-dashboard'
  | 'worker-profile'
  | 'job-discovery'
  | 'job-detail'
  | 'my-applications'
  | 'saved-jobs'
  | 'provider-dashboard'
  | 'provider-profile'
  | 'create-job'
  | 'edit-job'
  | 'my-jobs'
  | 'applicant-management';

interface AppState {
  currentPage: Page;
  currentJobId: string | null;
  currentUser: User | null;
  workerProfile: WorkerProfile | null;
  providerProfile: ProviderProfile | null;
  jobs: Job[];
  applications: Application[];
  savedJobIds: string[];
  notifications: Notification[];
  allWorkerProfiles: WorkerProfile[];
  allProviderProfiles: ProviderProfile[];
}

type Action =
  | { type: 'NAVIGATE'; page: Page; jobId?: string }
  | { type: 'LOGIN_WORKER' }
  | { type: 'LOGIN_PROVIDER' }
  | { type: 'LOGOUT' }
  | { type: 'APPLY_JOB'; jobId: string; coverNote: string }
  | { type: 'SAVE_JOB'; jobId: string }
  | { type: 'UNSAVE_JOB'; jobId: string }
  | { type: 'UPDATE_APPLICATION_STATUS'; applicationId: string; status: ApplicationStatus; note?: string }
  | { type: 'POST_JOB'; job: Omit<Job, 'id' | 'providerId' | 'providerName' | 'providerLogo' | 'providerVerified' | 'workersHired' | 'postedDate' | 'applicantCount' | 'status'> }
  | { type: 'UPDATE_JOB'; jobId: string; updates: Partial<Job> }
  | { type: 'DELETE_JOB'; jobId: string }
  | { type: 'MARK_NOTIFICATION_READ'; notificationId: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'UPDATE_WORKER_PROFILE'; updates: Partial<WorkerProfile> }
  | { type: 'UPDATE_PROVIDER_PROFILE'; updates: Partial<ProviderProfile> };

function enrichJobsWithMatchData(jobs: Job[], workerProfile: WorkerProfile | null): Job[] {
  if (!workerProfile) return jobs;
  return jobs.map(j => {
    const { score, reasons } = computeMatchScore(j, workerProfile);
    return { ...j, matchScore: score, matchReasons: reasons };
  });
}

const initialState: AppState = {
  currentPage: 'landing',
  currentJobId: null,
  currentUser: null,
  workerProfile: null,
  providerProfile: null,
  jobs: initialJobs,
  applications: initialApplications,
  savedJobIds: ['j-003', 'j-007'],
  notifications: initialNotifications,
  allWorkerProfiles: workerProfiles,
  allProviderProfiles: providerProfiles,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, currentPage: action.page, currentJobId: action.jobId ?? state.currentJobId };

    case 'LOGIN_WORKER': {
      const profile = workerProfiles.find(p => p.id === demoWorkerUser.profileId) ?? workerProfiles[0];
      const enrichedJobs = enrichJobsWithMatchData(state.jobs, profile);
      return {
        ...state,
        currentUser: demoWorkerUser,
        workerProfile: profile,
        jobs: enrichedJobs,
        currentPage: 'worker-dashboard',
      };
    }

    case 'LOGIN_PROVIDER': {
      const profile = providerProfiles.find(p => p.id === demoProviderUser.profileId) ?? providerProfiles[0];
      return {
        ...state,
        currentUser: demoProviderUser,
        providerProfile: profile,
        currentPage: 'provider-dashboard',
      };
    }

    case 'LOGOUT':
      return {
        ...initialState,
        jobs: state.jobs.map(j => ({ ...j, matchScore: undefined, matchReasons: undefined })),
      };

    case 'APPLY_JOB': {
      const job = state.jobs.find(j => j.id === action.jobId);
      if (!job || !state.currentUser || !state.workerProfile) return state;
      const newApp: Application = {
        id: `app-${Date.now()}`,
        jobId: action.jobId,
        workerId: state.workerProfile.id,
        workerName: state.workerProfile.name,
        workerPhoto: state.workerProfile.photo,
        workerLocation: state.workerProfile.location,
        workerSkills: state.workerProfile.skills,
        workerRating: state.workerProfile.rating,
        workerTotalJobs: state.workerProfile.totalJobs,
        jobTitle: job.title,
        providerName: job.providerName,
        providerId: job.providerId,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        coverNote: action.coverNote,
      };
      const providerNotif: Notification = {
        id: `n-${Date.now()}`,
        userId: state.currentUser.id.replace('w', 'p'),
        type: 'application',
        title: 'New Applicant',
        message: `${state.workerProfile.name} has applied for "${job.title}".`,
        date: new Date().toISOString().split('T')[0],
        read: false,
        jobId: action.jobId,
        applicationId: newApp.id,
      };
      return {
        ...state,
        applications: [...state.applications, newApp],
        jobs: state.jobs.map(j =>
          j.id === action.jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j
        ),
        notifications: [...state.notifications, providerNotif],
      };
    }

    case 'SAVE_JOB':
      return { ...state, savedJobIds: [...state.savedJobIds, action.jobId] };

    case 'UNSAVE_JOB':
      return { ...state, savedJobIds: state.savedJobIds.filter(id => id !== action.jobId) };

    case 'UPDATE_APPLICATION_STATUS': {
      const app = state.applications.find(a => a.id === action.applicationId);
      if (!app) return state;
      const workerNotif: Notification = {
        id: `n-${Date.now()}`,
        userId: `u-w-${app.workerId}`,
        type: action.status === 'accepted' ? 'selection' : action.status === 'shortlisted' ? 'shortlisted' : 'rejection',
        title: action.status === 'accepted' ? 'Application Accepted!' : action.status === 'shortlisted' ? 'You\'ve been Shortlisted' : 'Application Update',
        message: action.status === 'accepted'
          ? `${app.providerName} has accepted your application for "${app.jobTitle}". ${action.note ?? ''}`
          : action.status === 'shortlisted'
          ? `${app.providerName} shortlisted your application for "${app.jobTitle}".`
          : `Your application for "${app.jobTitle}" was not selected. ${action.note ? `Note: ${action.note}` : ''}`,
        date: new Date().toISOString().split('T')[0],
        read: false,
        jobId: app.jobId,
        applicationId: action.applicationId,
      };
      return {
        ...state,
        applications: state.applications.map(a =>
          a.id === action.applicationId
            ? { ...a, status: action.status, providerNote: action.note }
            : a
        ),
        notifications: [...state.notifications, workerNotif],
      };
    }

    case 'POST_JOB': {
      if (!state.providerProfile) return state;
      const newJob: Job = {
        ...action.job,
        id: `j-${Date.now()}`,
        providerId: state.providerProfile.id,
        providerName: state.providerProfile.orgName,
        providerLogo: state.providerProfile.logo,
        providerVerified: state.providerProfile.verified,
        workersHired: 0,
        postedDate: new Date().toISOString().split('T')[0],
        applicantCount: 0,
        status: 'active',
      };
      return { ...state, jobs: [newJob, ...state.jobs] };
    }

    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(j => j.id === action.jobId ? { ...j, ...action.updates } : j),
      };

    case 'DELETE_JOB':
      return { ...state, jobs: state.jobs.filter(j => j.id !== action.jobId) };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.notificationId ? { ...n, read: true } : n
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    case 'UPDATE_WORKER_PROFILE':
      return {
        ...state,
        workerProfile: state.workerProfile ? { ...state.workerProfile, ...action.updates } : null,
      };

    case 'UPDATE_PROVIDER_PROFILE':
      return {
        ...state,
        providerProfile: state.providerProfile ? { ...state.providerProfile, ...action.updates } : null,
      };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  navigate: (page: Page, jobId?: string) => void;
  loginAsWorker: () => void;
  loginAsProvider: () => void;
  logout: () => void;
  applyToJob: (jobId: string, coverNote: string) => void;
  saveJob: (jobId: string) => void;
  unsaveJob: (jobId: string) => void;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus, note?: string) => void;
  postJob: (job: Omit<Job, 'id' | 'providerId' | 'providerName' | 'providerLogo' | 'providerVerified' | 'workersHired' | 'postedDate' | 'applicantCount' | 'status'>) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  deleteJob: (jobId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateWorkerProfile: (updates: Partial<WorkerProfile>) => void;
  updateProviderProfile: (updates: Partial<ProviderProfile>) => void;
  hasApplied: (jobId: string) => boolean;
  isSaved: (jobId: string) => boolean;
  unreadNotificationsCount: number;
  myApplications: Application[];
  myJobs: Job[];
  jobApplications: (jobId: string) => Application[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const navigate = (page: Page, jobId?: string) => dispatch({ type: 'NAVIGATE', page, jobId });
  const loginAsWorker = () => dispatch({ type: 'LOGIN_WORKER' });
  const loginAsProvider = () => dispatch({ type: 'LOGIN_PROVIDER' });
  const logout = () => dispatch({ type: 'LOGOUT' });
  const applyToJob = (jobId: string, coverNote: string) => dispatch({ type: 'APPLY_JOB', jobId, coverNote });
  const saveJob = (jobId: string) => dispatch({ type: 'SAVE_JOB', jobId });
  const unsaveJob = (jobId: string) => dispatch({ type: 'UNSAVE_JOB', jobId });
  const updateApplicationStatus = (applicationId: string, status: ApplicationStatus, note?: string) =>
    dispatch({ type: 'UPDATE_APPLICATION_STATUS', applicationId, status, note });
  const postJob = (job: Omit<Job, 'id' | 'providerId' | 'providerName' | 'providerLogo' | 'providerVerified' | 'workersHired' | 'postedDate' | 'applicantCount' | 'status'>) =>
    dispatch({ type: 'POST_JOB', job });
  const updateJob = (jobId: string, updates: Partial<Job>) => dispatch({ type: 'UPDATE_JOB', jobId, updates });
  const deleteJob = (jobId: string) => dispatch({ type: 'DELETE_JOB', jobId });
  const markNotificationRead = (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', notificationId: id });
  const markAllNotificationsRead = () => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  const updateWorkerProfile = (updates: Partial<WorkerProfile>) => dispatch({ type: 'UPDATE_WORKER_PROFILE', updates });
  const updateProviderProfile = (updates: Partial<ProviderProfile>) => dispatch({ type: 'UPDATE_PROVIDER_PROFILE', updates });

  const hasApplied = (jobId: string) =>
    state.applications.some(a => a.jobId === jobId && a.workerId === state.workerProfile?.id);
  const isSaved = (jobId: string) => state.savedJobIds.includes(jobId);

  const unreadNotificationsCount = state.notifications.filter(
    n => !n.read && n.userId === state.currentUser?.id
  ).length;

  const myApplications = state.applications.filter(
    a => a.workerId === state.workerProfile?.id
  );

  const myJobs = state.jobs.filter(
    j => j.providerId === state.providerProfile?.id
  );

  const jobApplications = (jobId: string) =>
    state.applications.filter(a => a.jobId === jobId);

  return (
    <AppContext.Provider value={{
      state, navigate, loginAsWorker, loginAsProvider, logout,
      applyToJob, saveJob, unsaveJob, updateApplicationStatus,
      postJob, updateJob, deleteJob,
      markNotificationRead, markAllNotificationsRead,
      updateWorkerProfile, updateProviderProfile,
      hasApplied, isSaved,
      unreadNotificationsCount, myApplications, myJobs, jobApplications,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
