import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { JobStatusBadge, CategoryBadge } from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { JobStatus } from '../../types';

export default function MyJobs() {
  const { myJobs, jobApplications, navigate, deleteJob, updateJob } = useApp();
  const [activeTab, setActiveTab] = useState<JobStatus | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = activeTab === 'all' ? myJobs : myJobs.filter(j => j.status === activeTab);

  const tabs: { key: JobStatus | 'all'; label: string }[] = [
    { key: 'all', label: `All (${myJobs.length})` },
    { key: 'active', label: `Active (${myJobs.filter(j => j.status === 'active').length})` },
    { key: 'filled', label: `Filled (${myJobs.filter(j => j.status === 'filled').length})` },
    { key: 'closed', label: `Closed (${myJobs.filter(j => j.status === 'closed').length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">My Jobs</h1>
          <p className="text-stone-500">Manage your job postings and review applicants.</p>
        </div>
        <button
          onClick={() => navigate('create-job')}
          className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          + Post Job
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="font-semibold text-stone-900 mb-2">No jobs here</h3>
          <p className="text-stone-500 text-sm mb-6">
            {activeTab === 'all' ? "You haven't posted any jobs yet." : `No ${activeTab} jobs.`}
          </p>
          <button onClick={() => navigate('create-job')} className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors">
            Post Your First Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(job => {
            const apps = jobApplications(job.id);
            const pendingCount = apps.filter(a => a.status === 'pending').length;
            const acceptedCount = apps.filter(a => a.status === 'accepted').length;
            const spotsLeft = job.workersNeeded - job.workersHired;

            return (
              <div key={job.id} className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 flex-wrap">
                      <h3 className="font-semibold text-stone-900 leading-snug">{job.title}</h3>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <CategoryBadge category={job.category} />
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        📍 {job.district}
                      </span>
                      <span className="text-xs text-stone-500">
                        📅 {new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}
                        {job.endDate && ` – ${new Date(job.endDate).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}`}
                      </span>
                      <span className="text-xs font-semibold text-stone-800 font-mono-data">
                        NPR {job.payment.toLocaleString()}/{job.paymentType.replace('per-', '')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.status === 'active' && (
                      <>
                        <button
                          onClick={() => navigate('edit-job', job.id)}
                          className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                          title="Edit job"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => updateJob(job.id, { status: 'closed' })}
                          className="p-2 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Close job"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setConfirmDelete(job.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete job"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Applicant stats + progress */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-4">
                      <span className="text-xs text-stone-500">
                        <span className="font-semibold text-stone-800">{apps.length}</span> applicants
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-xs text-amber-700 font-medium">{pendingCount} awaiting review</span>
                      )}
                      {acceptedCount > 0 && (
                        <span className="text-xs text-green-700 font-medium">{acceptedCount} accepted</span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('applicant-management', job.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        pendingCount > 0
                          ? 'bg-primary text-white hover:bg-primary-dark'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {pendingCount > 0 ? `Review ${pendingCount} Pending` : 'View Applicants'}
                    </button>
                  </div>
                  {/* Progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal rounded-full transition-all"
                        style={{ width: `${Math.min((job.workersHired / job.workersNeeded) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-stone-400 font-mono-data">{job.workersHired}/{job.workersNeeded} hired</span>
                  </div>
                </div>

                {/* Deadline warning */}
                {job.status === 'active' && (() => {
                  const deadlineDays = Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return deadlineDays <= 3 && deadlineDays > 0 ? (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Applications close in {deadlineDays} day{deadlineDays !== 1 ? 's' : ''}
                    </div>
                  ) : null;
                })()}
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this job?"
          message="This will permanently delete the job posting and all associated applications. This cannot be undone."
          confirmLabel="Delete Job"
          danger
          onConfirm={() => { deleteJob(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
