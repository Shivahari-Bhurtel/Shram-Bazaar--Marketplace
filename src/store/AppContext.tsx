import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Application, ApplicationStatus, Job, KycDocumentType, Notification, ProviderProfile, Report,
  User, WorkerProfile,
} from "../types";

export type Page =
  | "landing" | "login" | "worker-signup" | "provider-signup"
  | "worker-dashboard" | "worker-profile" | "job-discovery" | "job-detail"
  | "my-applications" | "saved-jobs" | "provider-dashboard" | "provider-profile"
  | "create-job" | "edit-job" | "my-jobs" | "applicant-management";

type Credentials = { userId: string; password: string };
type SavedJob = { workerId: string; jobId: string };
type PersistedData = {
  users: User[];
  credentials: Credentials[];
  workerProfiles: WorkerProfile[];
  providerProfiles: ProviderProfile[];
  jobs: Job[];
  applications: Application[];
  savedJobs: SavedJob[];
  notifications: Notification[];
  reports: Report[];
};

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
  discoverySkill: string;
}

export interface WorkerSignup {
  email: string; password: string; name: string; phone: string;
  district: string; location: string; skills: string[];
}
export interface ProviderSignup {
  email: string; password: string; contactName: string; phone: string;
  orgName: string; pan: string; industry: string; district: string; location: string;
}
export interface KycSubmission {
  documentType: KycDocumentType;
  documentNumber: string;
  fileName: string;
  documentData: string;
}

const DATA_KEY = "shram-bazar-data-v1";
const SESSION_KEY = "shram-bazar-session-v1";
const emptyData: PersistedData = {
  users: [], credentials: [], workerProfiles: [], providerProfiles: [],
  jobs: [], applications: [], savedJobs: [], notifications: [], reports: [],
};
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().split("T")[0];
const blankProviderLogo = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop&auto=format";

function loadData(): PersistedData {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || "{}");
    return { ...emptyData, ...parsed };
  } catch {
    return emptyData;
  }
}

function experienceYears(profile: WorkerProfile) {
  return profile.experience.reduce((total, entry) => {
    const values = entry.duration.match(/\d+/g)?.map(Number) || [];
    return total + (values.length ? Math.max(...values) : 1);
  }, 0);
}

function computeMatch(job: Job, worker: WorkerProfile) {
  const matchingSkills = job.skillsRequired.filter(required =>
    worker.skills.some(skill => skill.toLowerCase() === required.toLowerCase()),
  );
  const skillsScore = job.skillsRequired.length
    ? Math.round((matchingSkills.length / job.skillsRequired.length) * 40)
    : 40;
  const locationScore = worker.district === job.district ? 20 : 0;
  const availabilityScore =
    worker.availability === "flexible" || worker.availability === job.workType ? 15 : 5;
  const availableOnDate = worker.availableDates.length === 0 || worker.availableDates.includes(job.date);
  const durationScore = availableOnDate ? 10 : 0;
  const years = experienceYears(worker);
  const requiredYears = Number(job.experienceRequired.match(/\d+/)?.[0] || 0);
  const experienceScore = !requiredYears || years >= requiredYears ? 15 : Math.round((years / requiredYears) * 15);
  return {
    score: Math.min(100, skillsScore + locationScore + availabilityScore + durationScore + experienceScore),
    reasons: [
      `${matchingSkills.length} of ${job.skillsRequired.length} required skills match`,
      locationScore ? `Location matches ${job.district}` : `Job is in ${job.district}; your district is ${worker.district}`,
      `${worker.availability.replace("-", " ")} availability`,
      availableOnDate ? "Available for the job date/duration" : "Job date is outside saved availability",
      `${years} year${years === 1 ? "" : "s"} of listed experience`,
    ],
  };
}

function withMatches(jobs: Job[], worker: WorkerProfile | null) {
  if (!worker) return jobs.map(job => ({ ...job, matchScore: undefined, matchReasons: undefined }));
  return jobs.map(job => {
    const match = computeMatch(job, worker);
    return { ...job, matchScore: match.score, matchReasons: match.reasons };
  });
}

const workerOnly: Page[] = ["worker-dashboard", "worker-profile", "job-discovery", "my-applications", "saved-jobs"];
const providerOnly: Page[] = ["provider-dashboard", "provider-profile", "create-job", "edit-job", "my-jobs", "applicant-management"];
const publicOnly: Page[] = ["landing", "login", "worker-signup", "provider-signup"];

interface AppContextValue {
  state: AppState;
  navigate: (page: Page, jobId?: string) => void;
  login: (email: string, password: string) => string | null;
  signupWorker: (data: WorkerSignup) => string | null;
  signupProvider: (data: ProviderSignup) => string | null;
  loginAsWorker: () => void;
  loginAsProvider: () => void;
  logout: () => void;
  applyToJob: (jobId: string, coverNote: string) => void;
  saveJob: (jobId: string) => void;
  unsaveJob: (jobId: string) => void;
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus, note?: string) => void;
  postJob: (job: Omit<Job, "id" | "providerId" | "providerName" | "providerLogo" | "providerVerified" | "workersHired" | "postedDate" | "applicantCount" | "status">) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  deleteJob: (jobId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateWorkerProfile: (updates: Partial<WorkerProfile>) => void;
  updateProviderProfile: (updates: Partial<ProviderProfile>) => void;
  hasApplied: (jobId: string) => boolean;
  isSaved: (jobId: string) => boolean;
  browseSkill: (skill: string) => void;
  reportJob: (jobId: string, reason: string, details: string) => string | null;
  reviewWorker: (applicationId: string, rating: number, review: string) => void;
  submitKyc: (submission: KycSubmission) => string | null;
  approveKyc: () => void;
  unreadNotificationsCount: number;
  myApplications: Application[];
  myJobs: Job[];
  jobApplications: (jobId: string) => Application[];
}

/*
 * Keep one context identity across Vite Fast Refresh updates. Without this,
 * the provider mounted by main.tsx can retain the previous module's Context
 * while refreshed consumers read a newly-created Context, making useApp()
 * incorrectly report that no provider exists.
 */
const contextGlobal = globalThis as typeof globalThis & {
  __SHRAM_BAZAR_APP_CONTEXT__?: ReturnType<typeof createContext<AppContextValue | null>>;
};
const AppContext =
  contextGlobal.__SHRAM_BAZAR_APP_CONTEXT__ ??
  (contextGlobal.__SHRAM_BAZAR_APP_CONTEXT__ = createContext<AppContextValue | null>(null));

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PersistedData>(loadData);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const [currentPage, setCurrentPage] = useState<Page>(() => sessionId ? "worker-dashboard" : "landing");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [discoverySkill, setDiscoverySkill] = useState("");

  const currentUser = data.users.find(user => user.id === sessionId) || null;
  const workerProfile = currentUser?.role === "worker"
    ? data.workerProfiles.find(profile => profile.id === currentUser.profileId) || null : null;
  const providerProfile = currentUser?.role === "provider"
    ? data.providerProfiles.find(profile => profile.id === currentUser.profileId) || null : null;

  useEffect(() => localStorage.setItem(DATA_KEY, JSON.stringify(data)), [data]);
  useEffect(() => {
    if (sessionId) localStorage.setItem(SESSION_KEY, sessionId);
    else localStorage.removeItem(SESSION_KEY);
  }, [sessionId]);

  useEffect(() => {
    if (!currentUser && !publicOnly.includes(currentPage)) setCurrentPage("login");
    if (currentUser && publicOnly.includes(currentPage)) {
      setCurrentPage(currentUser.role === "worker" ? "worker-dashboard" : "provider-dashboard");
    }
    if (currentUser?.role === "worker" && providerOnly.includes(currentPage)) setCurrentPage("worker-dashboard");
    if (currentUser?.role === "provider" && workerOnly.includes(currentPage)) setCurrentPage("provider-dashboard");
  }, [currentPage, currentUser]);

  const addNotification = (draft: PersistedData, notification: Omit<Notification, "id" | "date" | "read">) => {
    draft.notifications.push({ ...notification, id: id("n"), date: today(), read: false });
  };

  const navigate = (page: Page, jobId?: string) => {
    if (!currentUser && !publicOnly.includes(page)) return setCurrentPage("login");
    if (currentUser?.role === "worker" && providerOnly.includes(page)) return setCurrentPage("worker-dashboard");
    if (currentUser?.role === "provider" && workerOnly.includes(page)) return setCurrentPage("provider-dashboard");
    if (page === "job-detail" && jobId && !data.jobs.some(job => job.id === jobId)) return;
    if ((page === "edit-job" || page === "applicant-management") && jobId &&
      !data.jobs.some(job => job.id === jobId && job.providerId === providerProfile?.id)) return;
    setCurrentPage(page);
    if (jobId) setCurrentJobId(jobId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activate = (user: User) => {
    setSessionId(user.id);
    setCurrentPage(user.role === "worker" ? "worker-dashboard" : "provider-dashboard");
  };

  const login = (email: string, password: string) => {
    const user = data.users.find(item => item.email.toLowerCase() === email.trim().toLowerCase());
    const credentials = user && data.credentials.find(item => item.userId === user.id);
    if (!user || credentials?.password !== password) return "Email or password is incorrect.";
    activate(user);
    return null;
  };

  const duplicateError = (email: string) =>
    data.users.some(user => user.email.toLowerCase() === email.trim().toLowerCase())
      ? "An account with this email already exists." : null;

  const signupWorker = (form: WorkerSignup) => {
    const duplicate = duplicateError(form.email); if (duplicate) return duplicate;
    const profileId = id("wp");
    const user: User = { id: id("u-w"), role: "worker", email: form.email.trim().toLowerCase(), name: form.name.trim(), profileId };
    const profile: WorkerProfile = {
      id: profileId, name: form.name.trim(), photo: "", phone: form.phone,
      email: user.email, location: form.location || form.district, district: form.district,
      skills: form.skills, qualifications: [], experience: [], availableDates: [],
      availability: "flexible", bio: "", workHistory: [], rating: 0, totalJobs: 0, verified: false,
      kycStatus: "not-verified",
    };
    setData(old => ({ ...old, users: [...old.users, user], credentials: [...old.credentials, { userId: user.id, password: form.password }], workerProfiles: [...old.workerProfiles, profile] }));
    activate(user); return null;
  };

  const signupProvider = (form: ProviderSignup) => {
    const duplicate = duplicateError(form.email); if (duplicate) return duplicate;
    const profileId = id("pp");
    const user: User = { id: id("u-p"), role: "provider", email: form.email.trim().toLowerCase(), name: form.orgName.trim(), profileId };
    const profile: ProviderProfile = {
      id: profileId, orgName: form.orgName.trim(), logo: blankProviderLogo,
      contactName: form.contactName.trim(), email: user.email, phone: form.phone,
      location: form.location || form.district, district: form.district, industry: form.industry,
      description: "", verified: false, pan: form.pan.trim(), totalHires: 0, rating: 0, reviewCount: 0,
    };
    setData(old => ({ ...old, users: [...old.users, user], credentials: [...old.credentials, { userId: user.id, password: form.password }], providerProfiles: [...old.providerProfiles, profile] }));
    activate(user); return null;
  };

  const logout = () => { setSessionId(""); setCurrentPage("landing"); setCurrentJobId(null); };
  const unsupportedDemo = () => setCurrentPage("login");

  const applyToJob = (jobId: string, coverNote: string) => {
    if (!currentUser || !workerProfile || workerProfile.kycStatus !== "verified" ||
      data.applications.some(app => app.jobId === jobId && app.workerId === workerProfile.id)) return;
    const job = data.jobs.find(item => item.id === jobId && item.status === "active"); if (!job) return;
    setData(old => {
      const draft = structuredClone(old);
      const application: Application = {
        id: id("app"), jobId, workerId: workerProfile.id, workerName: workerProfile.name,
        workerPhoto: workerProfile.photo, workerLocation: workerProfile.location,
        workerSkills: workerProfile.skills, workerRating: workerProfile.rating,
        workerTotalJobs: workerProfile.totalJobs, jobTitle: job.title, providerName: job.providerName,
        providerId: job.providerId, appliedDate: today(), status: "pending", coverNote,
      };
      draft.applications.push(application);
      draft.jobs = draft.jobs.map(item => item.id === jobId ? { ...item, applicantCount: item.applicantCount + 1 } : item);
      const providerUser = draft.users.find(user => user.profileId === job.providerId);
      if (providerUser) addNotification(draft, { userId: providerUser.id, type: "application", title: "New Applicant", message: `${workerProfile.name} applied for "${job.title}".`, jobId, applicationId: application.id });
      return draft;
    });
  };

  const saveJob = (jobId: string) => {
    if (!workerProfile || data.savedJobs.some(saved => saved.workerId === workerProfile.id && saved.jobId === jobId)) return;
    setData(old => ({ ...old, savedJobs: [...old.savedJobs, { workerId: workerProfile.id, jobId }] }));
  };
  const unsaveJob = (jobId: string) => workerProfile && setData(old => ({ ...old, savedJobs: old.savedJobs.filter(saved => !(saved.workerId === workerProfile.id && saved.jobId === jobId)) }));

  const updateApplicationStatus = (applicationId: string, status: ApplicationStatus, note?: string) => {
    if (!providerProfile) return;
    setData(old => {
      const application = old.applications.find(app => app.id === applicationId && old.jobs.some(job => job.id === app.jobId && job.providerId === providerProfile.id));
      if (!application) return old;
      const draft = structuredClone(old);
      draft.applications = draft.applications.map(app => app.id === applicationId ? { ...app, status, providerNote: note } : app);
      const accepted = draft.applications.filter(app => app.jobId === application.jobId && app.status === "accepted").length;
      draft.jobs = draft.jobs.map(job => job.id === application.jobId ? { ...job, workersHired: accepted, status: accepted >= job.workersNeeded ? "filled" : job.status } : job);
      const workerUser = draft.users.find(user => user.profileId === application.workerId);
      if (workerUser) addNotification(draft, {
        userId: workerUser.id, type: status === "accepted" ? "selection" : status === "shortlisted" ? "shortlisted" : "rejection",
        title: status === "accepted" ? "Application Accepted!" : status === "shortlisted" ? "You've been Shortlisted" : "Application Update",
        message: `Your application for "${application.jobTitle}" is now ${status}.${note ? ` Note: ${note}` : ""}`,
        jobId: application.jobId, applicationId,
      });
      return draft;
    });
  };

  const postJob: AppContextValue["postJob"] = job => {
    if (!providerProfile) return;
    const newJob: Job = { ...job, id: id("j"), providerId: providerProfile.id, providerName: providerProfile.orgName, providerLogo: providerProfile.logo, providerVerified: providerProfile.verified, workersHired: 0, postedDate: today(), applicantCount: 0, status: "active" };
    setData(old => ({ ...old, jobs: [newJob, ...old.jobs] }));
  };

  const updateJob = (jobId: string, updates: Partial<Job>) => {
    if (!providerProfile || !data.jobs.some(job => job.id === jobId && job.providerId === providerProfile.id)) return;
    setData(old => {
      const draft = structuredClone(old);
      const job = draft.jobs.find(item => item.id === jobId)!;
      draft.jobs = draft.jobs.map(item => item.id === jobId ? { ...item, ...updates } : item);
      const recipients = new Set([
        ...draft.applications.filter(app => app.jobId === jobId).map(app => app.workerId),
        ...draft.savedJobs.filter(saved => saved.jobId === jobId).map(saved => saved.workerId),
      ]);
      recipients.forEach(profileId => {
        const workerUser = draft.users.find(user => user.profileId === profileId);
        if (workerUser) addNotification(draft, { userId: workerUser.id, type: "job-update", title: "Job Updated", message: `"${job.title}" was updated by the provider.`, jobId });
      });
      return draft;
    });
  };

  const deleteJob = (jobId: string) => {
    if (!providerProfile || !data.jobs.some(job => job.id === jobId && job.providerId === providerProfile.id)) return;
    setData(old => {
      const draft = structuredClone(old); const job = draft.jobs.find(item => item.id === jobId)!;
      new Set(draft.applications.filter(app => app.jobId === jobId).map(app => app.workerId)).forEach(profileId => {
        const workerUser = draft.users.find(user => user.profileId === profileId);
        if (workerUser) addNotification(draft, { userId: workerUser.id, type: "job-update", title: "Job Removed", message: `"${job.title}" was removed by the provider.`, jobId });
      });
      draft.jobs = draft.jobs.filter(item => item.id !== jobId);
      draft.applications = draft.applications.filter(app => app.jobId !== jobId);
      draft.savedJobs = draft.savedJobs.filter(saved => saved.jobId !== jobId);
      return draft;
    });
  };

  const reportJob = (jobId: string, reason: string, details: string) => {
    if (!currentUser) return "Please sign in before reporting a job.";
    if (!data.jobs.some(job => job.id === jobId)) return "This job is no longer available.";
    if (data.reports.some(report => report.jobId === jobId && report.reporterId === currentUser.id)) {
      return "You have already reported this job.";
    }
    setData(old => ({
      ...old,
      reports: [...old.reports, {
        id: id("report"), reporterId: currentUser.id, jobId, reason,
        details: details.trim(), date: today(), status: "submitted",
      }],
    }));
    return null;
  };

  const reviewWorker = (applicationId: string, rating: number, review: string) => {
    if (!providerProfile || rating < 1 || rating > 5) return;
    setData(old => {
      const application = old.applications.find(app =>
        app.id === applicationId && app.status === "accepted" &&
        old.jobs.some(job => job.id === app.jobId && job.providerId === providerProfile.id),
      );
      if (!application) return old;
      const job = old.jobs.find(item => item.id === application.jobId)!;
      return {
        ...old,
        workerProfiles: old.workerProfiles.map(profile => {
          if (profile.id !== application.workerId) return profile;
          const entry = {
            jobId: job.id, jobTitle: job.title, providerName: providerProfile.orgName,
            date: today(), payment: job.payment, rating, review: review.trim(),
          };
          const workHistory = [...profile.workHistory.filter(item => item.jobId !== job.id), entry];
          const average = workHistory.reduce((sum, item) => sum + item.rating, 0) / workHistory.length;
          return { ...profile, workHistory, totalJobs: workHistory.length, rating: Number(average.toFixed(1)) };
        }),
      };
    });
  };

  const submitKyc = (submission: KycSubmission) => {
    if (!workerProfile) return "Only worker accounts can submit identity verification.";
    if (!submission.documentNumber.trim()) return "Enter the document number.";
    if (!submission.fileName || !submission.documentData) return "Upload a clear identity document.";
    if (submission.documentData.length > 2_800_000) return "The document is too large. Use a file smaller than 2 MB.";
    updateWorkerProfile({
      kycStatus: "pending",
      kycDocumentType: submission.documentType,
      kycDocumentNumber: submission.documentNumber.trim(),
      kycDocumentFileName: submission.fileName,
      kycDocumentData: submission.documentData,
      kycSubmittedDate: today(),
      kycVerifiedDate: undefined,
      verified: false,
    });
    return null;
  };

  const approveKyc = () => {
    if (!workerProfile || workerProfile.kycStatus !== "pending") return;
    setData(old => {
      const draft = structuredClone(old);
      draft.workerProfiles = draft.workerProfiles.map(profile => profile.id === workerProfile.id ? {
        ...profile, kycStatus: "verified", kycVerifiedDate: today(), verified: true,
      } : profile);
      addNotification(draft, {
        userId: currentUser!.id,
        type: "job-update",
        title: "Identity Verified",
        message: "Your identity verification was approved. You can now apply for jobs.",
      });
      return draft;
    });
  };

  const updateWorkerProfile = (updates: Partial<WorkerProfile>) => {
    if (!workerProfile) return;
    setData(old => {
      const updated = { ...workerProfile, ...updates };
      return {
        ...old,
        users: old.users.map(user => user.profileId === workerProfile.id ? { ...user, name: updated.name } : user),
        workerProfiles: old.workerProfiles.map(profile => profile.id === workerProfile.id ? updated : profile),
        applications: old.applications.map(application => application.workerId === workerProfile.id ? {
          ...application, workerName: updated.name, workerPhoto: updated.photo,
          workerLocation: updated.location, workerSkills: updated.skills,
          workerRating: updated.rating, workerTotalJobs: updated.totalJobs,
        } : application),
      };
    });
  };
  const updateProviderProfile = (updates: Partial<ProviderProfile>) => {
    if (!providerProfile) return;
    setData(old => ({ ...old,
      users: old.users.map(user => user.profileId === providerProfile.id ? { ...user, name: updates.orgName || user.name } : user),
      providerProfiles: old.providerProfiles.map(profile => profile.id === providerProfile.id ? { ...profile, ...updates } : profile),
      jobs: old.jobs.map(job => job.providerId === providerProfile.id ? { ...job, providerName: updates.orgName || job.providerName, providerLogo: updates.logo || job.providerLogo, providerVerified: updates.verified ?? job.providerVerified } : job),
      applications: old.applications.map(application => application.providerId === providerProfile.id ? { ...application, providerName: updates.orgName || application.providerName } : application),
    }));
  };

  const state: AppState = {
    currentPage, currentJobId, currentUser, workerProfile, providerProfile,
    jobs: withMatches(data.jobs, workerProfile), applications: data.applications,
    savedJobIds: workerProfile ? data.savedJobs.filter(saved => saved.workerId === workerProfile.id).map(saved => saved.jobId) : [],
    notifications: data.notifications,
    allWorkerProfiles: data.workerProfiles.map(({
      kycDocumentNumber: _documentNumber,
      kycDocumentData: _documentData,
      kycDocumentFileName: _documentFileName,
      ...publicProfile
    }) => publicProfile),
    allProviderProfiles: data.providerProfiles, discoverySkill,
  };
  const myApplications = workerProfile ? data.applications.filter(app => app.workerId === workerProfile.id) : [];
  const myJobs = providerProfile ? data.jobs.filter(job => job.providerId === providerProfile.id) : [];
  const jobApplications = (jobId: string) => providerProfile && data.jobs.some(job => job.id === jobId && job.providerId === providerProfile.id)
    ? data.applications.filter(app => app.jobId === jobId) : [];
  const unreadNotificationsCount = currentUser ? data.notifications.filter(note => note.userId === currentUser.id && !note.read).length : 0;

  const value = useMemo<AppContextValue>(() => ({
    state, navigate, login, signupWorker, signupProvider,
    loginAsWorker: unsupportedDemo, loginAsProvider: unsupportedDemo, logout,
    applyToJob, saveJob, unsaveJob, updateApplicationStatus, postJob, updateJob, deleteJob,
    markNotificationRead: notificationId => setData(old => ({ ...old, notifications: old.notifications.map(note => note.id === notificationId && note.userId === currentUser?.id ? { ...note, read: true } : note) })),
    markAllNotificationsRead: () => setData(old => ({ ...old, notifications: old.notifications.map(note => note.userId === currentUser?.id ? { ...note, read: true } : note) })),
    updateWorkerProfile, updateProviderProfile,
    hasApplied: jobId => !!workerProfile && data.applications.some(app => app.jobId === jobId && app.workerId === workerProfile.id),
    isSaved: jobId => !!workerProfile && data.savedJobs.some(saved => saved.jobId === jobId && saved.workerId === workerProfile.id),
    browseSkill: skill => { setDiscoverySkill(skill); navigate("job-discovery"); },
    reportJob, reviewWorker, submitKyc, approveKyc,
    unreadNotificationsCount, myApplications, myJobs, jobApplications,
  // Function identities intentionally track current persisted state.
  }), [data, currentPage, currentJobId, currentUser, workerProfile, providerProfile, discoverySkill]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
