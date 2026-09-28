import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ApplicationStatusBadge } from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { ApplicationStatus } from '../../types';

type ActionType = { applicationId: string; newStatus: ApplicationStatus; note?: string } | null;

export default function ApplicantManagement() {
  const { state, navigate, jobApplications, updateApplicationStatus, reviewWorker } = useApp();
  const job = state.jobs.find(j => j.id === state.currentJobId);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [pendingAction, setPendingAction] = useState<ActionType>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Record<string, { rating: number; review: string }>>({});

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-500">Job not found.</p>
        <button onClick={() => navigate('my-jobs')} className="mt-4 text-primary hover:underline">Back to My Jobs</button>
      </div>
    );
  }

  const apps = jobApplications(job.id);
  const filtered = activeTab === 'all' ? apps : apps.filter(a => a.status === activeTab);

  const counts = {
    all: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    shortlisted: apps.filter(a => a.status === 'shortlisted').length,
    accepted: apps.filter(a => a.status === 'accepted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  const handleAction = (applicationId: string, newStatus: ApplicationStatus, note?: string) => {
    updateApplicationStatus(applicationId, newStatus, note);
    setPendingAction(null);
    setRejectNote('');
    if (newStatus === 'accepted') {
      // Increment workersHired
      const newHired = job.workersHired + 1;
      // (in a real system this would be handled server-side)
    }
  };

  const tabs: { key: ApplicationStatus | 'all'; label: string; dot?: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'pending', label: `Applied (${counts.pending})`, dot: counts.pending > 0 ? 'bg-amber' : undefined },
    { key: 'shortlisted', label: `Shortlisted (${counts.shortlisted})` },
    { key: 'accepted', label: `Accepted (${counts.accepted})` },
    { key: 'rejected', label: `Not Selected (${counts.rejected})` },
  ];

  const workerProfiles = state.allWorkerProfiles;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate('my-jobs')} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to My Jobs
      </button>

      {/* Job header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-stone-900">{job.title}</h1>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-stone-500">
              <span>📍 {job.location}</span>
              <span>📅 {new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>
              <span className="font-mono-data font-semibold text-stone-800">NPR {job.payment.toLocaleString()}/{job.paymentType.replace('per-', '')}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-bold text-stone-900">{job.workersHired}/{job.workersNeeded}</div>
            <div className="text-xs text-stone-500">workers hired</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal rounded-full transition-all"
              style={{ width: `${Math.min((job.workersHired / job.workersNeeded) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-stone-400 font-mono-data">{job.workersNeeded - job.workersHired} spots remaining</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="font-semibold text-stone-900 mb-2">No applicants yet</h3>
          <p className="text-stone-500 text-sm">
            {activeTab === 'all'
              ? 'When workers apply for this job, they will appear here.'
              : `No applicants with ${activeTab} status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const workerFull = workerProfiles.find(w => w.id === app.workerId);
            const isExpanded = expandedApp === app.id;
            return (
              <div key={app.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                app.status === 'pending' ? 'border-amber-200 shadow-sm' : 'border-stone-200'
              }`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {app.workerPhoto ? (
                      <img src={app.workerPhoto} alt={app.workerName} className="w-12 h-12 rounded-xl object-cover bg-stone-100 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-display font-bold flex-shrink-0">
                        {app.workerName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-stone-900">{app.workerName}</h3>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-stone-500">{app.workerLocation}</span>
                            {workerFull?.kycStatus === 'verified' && (
                              <span className="text-[11px] font-medium text-teal bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full">
                                Identity Verified
                              </span>
                            )}
                            {workerFull && (
                              <>
                                <span className="text-stone-300">·</span>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-amber text-xs">★</span>
                                  <span className="text-xs text-stone-600 font-medium">{workerFull.rating}</span>
                                </div>
                                <span className="text-xs text-stone-500">{workerFull.totalJobs} jobs</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ApplicationStatusBadge status={app.status} />
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {app.workerSkills.slice(0, 4).map(skill => {
                          const isRequired = job.skillsRequired.some(s => s.toLowerCase() === skill.toLowerCase());
                          return (
                            <span key={skill} className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                              isRequired ? 'bg-green-50 text-green-700 border-green-100' : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}>
                              {isRequired && '✓ '}{skill}
                            </span>
                          );
                        })}
                        {app.workerSkills.length > 4 && (
                          <span className="text-[11px] px-2 py-0.5 bg-stone-100 text-stone-400 rounded-full">+{app.workerSkills.length - 4}</span>
                        )}
                      </div>

                      {/* Cover note */}
                      <div className="mt-3 bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 mb-1">Cover note:</p>
                        <p className={`text-sm text-stone-700 italic leading-relaxed ${!isExpanded && 'line-clamp-2'}`}>"{app.coverNote}"</p>
                      </div>

                      {/* Provider note */}
                      {app.providerNote && (
                        <p className="text-xs text-stone-500 mt-2">Your note: "{app.providerNote}"</p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-stone-400 font-mono-data">Applied {app.appliedDate}</span>
                        <button onClick={() => setExpandedApp(isExpanded ? null : app.id)} className="text-xs text-stone-500 hover:text-stone-700">
                          {isExpanded ? 'Show less ↑' : 'View full profile ↓'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded worker profile */}
                  {isExpanded && workerFull && (
                    <div className="mt-4 pt-4 border-t border-stone-100 animate-fade-in">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Qualifications</h4>
                          {workerFull.qualifications.length > 0 ? (
                            workerFull.qualifications.map(q => (
                              <div key={q.id} className="text-sm">
                                <p className="font-medium text-stone-800">{q.degree}</p>
                                <p className="text-stone-500 text-xs">{q.institution} · {q.year}</p>
                              </div>
                            ))
                          ) : <p className="text-stone-400 text-xs">None listed</p>}

                          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mt-4 mb-2">Experience</h4>
                          {workerFull.experience.length > 0 ? (
                            workerFull.experience.map(ex => (
                              <div key={ex.id} className="text-sm mb-2">
                                <p className="font-medium text-stone-800">{ex.title}</p>
                                <p className="text-stone-500 text-xs">{ex.company} · {ex.duration}</p>
                              </div>
                            ))
                          ) : <p className="text-stone-400 text-xs">No experience listed</p>}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Availability</h4>
                          <p className="text-sm text-stone-700 capitalize mb-1">{workerFull.availability.replace('-', ' ')}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {workerFull.availableDates.slice(0, 6).map(d => (
                              <span key={d} className={`text-[11px] px-2 py-0.5 rounded-full font-mono-data border ${
                                d === job.date ? 'bg-green-50 text-green-700 border-green-100' : 'bg-stone-50 text-stone-500 border-stone-200'
                              }`}>
                                {new Date(d).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}
                                {d === job.date && ' ✓'}
                              </span>
                            ))}
                          </div>

                          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mt-4 mb-2">Work History</h4>
                          {workerFull.workHistory.length > 0 ? (
                            workerFull.workHistory.slice(0, 2).map((wh, i) => (
                              <div key={i} className="text-sm mb-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <span key={i} className={`text-xs ${i < wh.rating ? 'text-amber' : 'text-stone-200'}`}>★</span>
                                    ))}
                                  </div>
                                  <span className="text-xs text-stone-800 font-medium truncate">{wh.jobTitle}</span>
                                </div>
                                {wh.review && <p className="text-xs text-stone-500 italic mt-0.5">"{wh.review}"</p>}
                              </div>
                            ))
                          ) : <p className="text-stone-400 text-xs">No completed jobs yet</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(app.status === 'pending' || app.status === 'shortlisted' || app.status === 'accepted') && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-stone-100">
                      {app.status !== 'accepted' && (
                        <button
                          onClick={() => setPendingAction({ applicationId: app.id, newStatus: 'accepted' })}
                          className="px-4 py-1.5 bg-green text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                        >
                          ✓ Accept
                        </button>
                      )}
                      {app.status === 'pending' && (
                        <button
                          onClick={() => handleAction(app.id, 'shortlisted')}
                          className="px-4 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-xl hover:bg-amber-200 transition-colors"
                        >
                          ★ Shortlist
                        </button>
                      )}
                      <button
                        onClick={() => setPendingAction({ applicationId: app.id, newStatus: 'rejected' })}
                        className="px-4 py-1.5 bg-stone-100 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-200 transition-colors"
                      >
                        ✗ Not Selected
                      </button>
                    </div>
                  )}
                  {app.status === 'accepted' && (
                    <div className="mt-4 pt-4 border-t border-stone-100">
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
                        <span className="font-medium">{app.workerName} has been accepted for this job.</span>
                      </div>
                      <div className="mt-3 grid sm:grid-cols-[8rem_1fr_auto] gap-2">
                        <select
                          value={reviewDraft[app.id]?.rating ?? 5}
                          onChange={event => setReviewDraft(current => ({ ...current, [app.id]: { rating: Number(event.target.value), review: current[app.id]?.review ?? '' } }))}
                          className="input-style"
                          aria-label="Worker rating"
                        >
                          {[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}
                        </select>
                        <input
                          value={reviewDraft[app.id]?.review ?? ''}
                          onChange={event => setReviewDraft(current => ({ ...current, [app.id]: { rating: current[app.id]?.rating ?? 5, review: event.target.value } }))}
                          placeholder="Short review of the worker"
                          className="input-style"
                        />
                        <button
                          onClick={() => {
                            const draft = reviewDraft[app.id] ?? { rating: 5, review: '' };
                            reviewWorker(app.id, draft.rating, draft.review);
                          }}
                          className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-xl"
                        >
                          Save review
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Accept */}
      {pendingAction?.newStatus === 'accepted' && (
        <ConfirmDialog
          title="Accept this applicant?"
          message={`You're accepting ${apps.find(a => a.id === pendingAction.applicationId)?.workerName} for "${job.title}". They will be notified immediately.`}
          confirmLabel="Yes, Accept"
          onConfirm={() => handleAction(pendingAction.applicationId, 'accepted')}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {/* Reject dialog with optional note */}
      {pendingAction?.newStatus === 'rejected' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setPendingAction(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fade-in">
            <h3 className="font-display text-lg font-semibold text-stone-900 mb-2">Not selecting this applicant?</h3>
            <p className="text-sm text-stone-500 mb-4">Optionally leave a note for the applicant (visible to them).</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="e.g. We need more experience in this specific area…"
              rows={3}
              className="input-style resize-none w-full mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setPendingAction(null)} className="flex-1 px-4 py-2 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => handleAction(pendingAction.applicationId, 'rejected', rejectNote || undefined)}
                className="flex-1 px-4 py-2 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
