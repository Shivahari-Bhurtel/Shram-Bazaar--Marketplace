import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { CategoryBadge, VerifiedBadge } from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function JobDetail() {
  const { state, navigate, applyToJob, hasApplied, saveJob, unsaveJob, isSaved } = useApp();
  const { jobs, workerProfile, currentUser } = state;

  const job = jobs.find(j => j.id === state.currentJobId);
  const [coverNote, setCoverNote] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-500">Job not found.</p>
        <button onClick={() => navigate('job-discovery')} className="mt-4 text-primary hover:underline">Back to jobs</button>
      </div>
    );
  }

  const applied = hasApplied(job.id);
  const saved = isSaved(job.id);
  const isWorker = currentUser?.role === 'worker';

  const handleApply = () => {
    applyToJob(job.id, coverNote);
    setShowApplyForm(false);
    setShowConfirm(false);
    setSubmitted(true);
  };

  const spotsLeft = job.workersNeeded - job.workersHired;

  const workTypeLabel: Record<string, string> = {
    'full-day': 'Full Day', 'half-day': 'Half Day', 'hourly': 'Hourly', 'multi-day': 'Multi-Day',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <button onClick={() => navigate('job-discovery')} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to jobs
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                <img src={job.providerLogo} alt={job.providerName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-stone-900 leading-snug">{job.title}</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-stone-600">{job.providerName}</span>
                      {job.providerVerified && <VerifiedBadge small />}
                    </div>
                  </div>
                  {isWorker && (
                    <button
                      onClick={() => saved ? unsaveJob(job.id) : saveJob(job.id)}
                      className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
                        saved ? 'bg-primary-50 border-primary-100 text-primary' : 'bg-white border-stone-200 text-stone-400 hover:text-primary'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <CategoryBadge category={job.category} />
                  <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full">{workTypeLabel[job.workType]}</span>
                </div>
              </div>
            </div>

            {/* Match score */}
            {isWorker && job.matchScore !== undefined && (
              <div className={`mt-4 rounded-xl p-4 border ${
                job.matchScore >= 70 ? 'bg-green-50 border-green-100' :
                job.matchScore >= 40 ? 'bg-amber-50 border-amber-100' :
                'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-stone-800">Your Match Score</span>
                  <span className={`font-mono-data text-xl font-bold ${
                    job.matchScore >= 70 ? 'text-green-700' : job.matchScore >= 40 ? 'text-amber-700' : 'text-stone-600'
                  }`}>{job.matchScore}%</span>
                </div>
                <div className="w-full h-2 bg-white rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${job.matchScore >= 70 ? 'bg-green' : job.matchScore >= 40 ? 'bg-amber' : 'bg-stone-400'}`}
                    style={{ width: `${job.matchScore}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {job.matchReasons?.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-stone-700">
                      <svg viewBox="0 0 24 24" fill="none" stroke={job.matchScore! >= 70 ? '#16A34A' : '#D97706'} strokeWidth="2.5" className="w-4 h-4 mt-0.5 flex-shrink-0">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="font-semibold text-stone-900 mb-3">Job Description</h2>
            <p className="text-stone-700 leading-relaxed text-sm">{job.description}</p>
          </div>

          {/* Requirements */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="font-semibold text-stone-900 mb-4">Requirements</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Skills Required</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skillsRequired.map(skill => {
                    const workerHasIt = workerProfile?.skills.some(s => s.toLowerCase() === skill.toLowerCase());
                    return (
                      <span key={skill} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                        workerHasIt ? 'bg-green-50 text-green-700 border-green-100' : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}>
                        {workerHasIt && '✓ '}{skill}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Qualification</h3>
                  <p className="text-sm text-stone-700">{job.qualificationRequired}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Experience</h3>
                  <p className="text-sm text-stone-700">{job.experienceRequired}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Apply form */}
          {isWorker && showApplyForm && !applied && (
            <div className="bg-white border-2 border-primary rounded-2xl p-6 animate-fade-in">
              <h2 className="font-semibold text-stone-900 mb-1">Your Application</h2>
              <p className="text-stone-500 text-sm mb-4">Add a short note to stand out. Your full profile will be shared with the provider.</p>
              <textarea
                value={coverNote}
                onChange={e => setCoverNote(e.target.value)}
                placeholder="e.g. I have 5 years of experience in electrical work and am fully available on the dates you need…"
                rows={4}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowApplyForm(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!coverNote.trim()}
                  className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Application →
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center animate-fade-in">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="font-semibold text-green-800 mb-1">Application Submitted!</h3>
              <p className="text-green-700 text-sm">You'll receive a notification once the provider reviews your profile.</p>
              <button onClick={() => navigate('my-applications')} className="mt-4 text-sm text-green-700 font-medium hover:underline">
                View My Applications →
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick info */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="text-center border-b border-stone-100 pb-4 mb-4">
              <div className="font-display text-3xl font-bold text-stone-900">
                NPR {job.payment.toLocaleString()}
              </div>
              <div className="text-stone-500 text-sm mt-0.5">per {job.paymentType.replace('per-', '')}</div>
              {job.workType === 'multi-day' && (
                <div className="text-xs text-stone-400 mt-1 font-mono-data">
                  ≈ NPR {(job.payment * parseInt(job.duration)).toLocaleString()} total
                </div>
              )}
            </div>

            <div className="space-y-3">
              {[
                { icon: '📅', label: 'Date', value: job.endDate ? `${new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })} – ${new Date(job.endDate).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}` : new Date(job.date).toLocaleDateString('en-NP', { weekday: 'short', month: 'long', day: 'numeric' }) },
                { icon: '🕐', label: 'Time', value: `${job.startTime} – ${job.endTime}` },
                { icon: '⏱', label: 'Duration', value: job.duration },
                { icon: '📍', label: 'Location', value: job.location },
                { icon: '👥', label: 'Workers Needed', value: `${job.workersNeeded} workers (${spotsLeft} spots left)` },
                { icon: '📋', label: 'Applications', value: `${job.applicantCount} applicants` },
                { icon: '⏰', label: 'Apply By', value: new Date(job.deadline).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' }) },
              ].map(item => (
                <div key={item.label} className="flex gap-3">
                  <span className="text-lg leading-none flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-[11px] text-stone-400 font-mono-data uppercase">{item.label}</p>
                    <p className="text-sm text-stone-800 font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply / Applied button */}
            {isWorker && (
              <div className="mt-5">
                {applied ? (
                  <div className="w-full py-2.5 bg-teal-50 text-teal text-sm font-semibold rounded-xl text-center border border-teal-100">
                    ✓ Application Submitted
                  </div>
                ) : job.status === 'filled' ? (
                  <div className="w-full py-2.5 bg-stone-100 text-stone-500 text-sm font-medium rounded-xl text-center">
                    Position Filled
                  </div>
                ) : (
                  <button
                    onClick={() => setShowApplyForm(true)}
                    className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                  >
                    Apply for this Job
                  </button>
                )}
              </div>
            )}
          </div>

          {/* About provider */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-3">About the Provider</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100">
                <img src={job.providerLogo} alt={job.providerName} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-medium text-stone-900 text-sm">{job.providerName}</p>
                {job.providerVerified && <VerifiedBadge small />}
              </div>
            </div>
            <div className="text-xs text-stone-500 flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {job.district}
            </div>
            <div className="mt-3 p-3 bg-stone-50 rounded-lg">
              <p className="text-xs text-stone-500 leading-relaxed">
                Jobs posted by verified providers include PAN registration and business verification for worker trust and safety.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Submit Application?"
          message={`You're applying to "${job.title}" at ${job.providerName}. Your full profile and cover note will be shared with the provider.`}
          confirmLabel="Yes, Apply Now"
          onConfirm={handleApply}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
