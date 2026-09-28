import { useApp } from '../../store/AppContext';
import { JobStatusBadge, VerifiedBadge } from '../../components/StatusBadge';

export default function ProviderDashboard() {
  const { state, navigate, myJobs, jobApplications } = useApp();
  const { providerProfile, notifications, currentUser } = state;

  if (!providerProfile) return null;

  const myNotifs = notifications.filter(n => n.userId === currentUser?.id && !n.read);
  const activeJobs = myJobs.filter(j => j.status === 'active');
  const totalApplicants = myJobs.reduce((sum, j) => sum + jobApplications(j.id).length, 0);
  const totalAccepted = myJobs.reduce((sum, j) =>
    sum + jobApplications(j.id).filter(a => a.status === 'accepted').length, 0);

  const recentActivity = myJobs
    .flatMap(j => jobApplications(j.id).map(a => ({ ...a, jobInfo: j })))
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-dark to-primary rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop&auto=format')`, backgroundSize: 'cover' }} />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
            <img src={providerProfile.logo} alt={providerProfile.orgName} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Welcome back</p>
            <h1 className="font-display text-2xl font-bold text-white">{providerProfile.orgName}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-white/70 text-sm">{providerProfile.location}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/70 text-sm">{providerProfile.industry}</span>
              {providerProfile.verified && (
                <span className="flex items-center gap-1 text-teal-light text-xs font-medium">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M20 6L9 17l-5-5"/></svg>
                  Verified Provider
                </span>
              )}
            </div>
          </div>
        </div>
        {myNotifs.length > 0 && (
          <div className="relative mt-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-2 h-2 bg-amber-light rounded-full flex-shrink-0" />
            <p className="text-white/90 text-sm">{myNotifs[0].message}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Jobs', value: activeJobs.length, color: 'text-green-700', bg: 'bg-green-50', page: 'my-jobs' as const },
          { label: 'Total Posted', value: myJobs.length, color: 'text-stone-700', bg: 'bg-stone-50', page: 'my-jobs' as const },
          { label: 'Total Applicants', value: totalApplicants, color: 'text-teal', bg: 'bg-teal-50', page: 'my-jobs' as const },
          { label: 'Workers Hired', value: totalAccepted, color: 'text-primary', bg: 'bg-primary-50', page: 'my-jobs' as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => navigate(s.page)}
            className={`${s.bg} border border-stone-200 rounded-2xl p-4 text-left hover:shadow-md transition-all group`}
          >
            <div className={`font-display text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-stone-500">{s.label}</div>
            <div className="text-xs text-stone-400 mt-1 group-hover:text-primary transition-colors">View →</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Active jobs */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-stone-900">Active Jobs</h2>
            <div className="flex gap-2">
              <button onClick={() => navigate('my-jobs')} className="text-sm text-stone-500 hover:text-stone-700">All jobs</button>
              <button
                onClick={() => navigate('create-job')}
                className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
              >
                + Post Job
              </button>
            </div>
          </div>

          {activeJobs.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-semibold text-stone-900 mb-2">No active jobs</h3>
              <p className="text-stone-500 text-sm mb-4">Post your first job to start receiving applications.</p>
              <button onClick={() => navigate('create-job')} className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors">
                Post a Job
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.slice(0, 3).map(job => {
                const apps = jobApplications(job.id);
                const pending = apps.filter(a => a.status === 'pending').length;
                const accepted = apps.filter(a => a.status === 'accepted').length;
                return (
                  <div key={job.id} className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-stone-900 leading-snug">{job.title}</h3>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-stone-500">
                          <span>📍 {job.district}</span>
                          <span>📅 {new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>
                          <span className="font-mono-data font-semibold text-stone-700">NPR {job.payment.toLocaleString()}/{job.paymentType.replace('per-', '')}</span>
                        </div>
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex gap-3">
                        <span className="text-xs text-stone-500">{apps.length} applicants</span>
                        {pending > 0 && <span className="text-xs text-amber-700 font-medium">{pending} pending review</span>}
                        {accepted > 0 && <span className="text-xs text-green-700 font-medium">{accepted} accepted</span>}
                      </div>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => navigate('applicant-management', job.id)}
                          className="text-xs text-teal font-medium hover:underline"
                        >
                          Review Applicants →
                        </button>
                      </div>
                    </div>
                    {/* Spots bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                        <span>Spots filled</span>
                        <span className="font-mono-data">{job.workersHired}/{job.workersNeeded}</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal rounded-full"
                          style={{ width: `${(job.workersHired / job.workersNeeded) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick actions */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: '+ Post New Job', page: 'create-job' as const, style: 'bg-primary text-white hover:bg-primary-dark' },
                { label: 'View All Jobs', page: 'my-jobs' as const, style: 'bg-stone-100 text-stone-700 hover:bg-stone-200' },
                { label: 'Organisation Profile', page: 'provider-profile' as const, style: 'bg-stone-100 text-stone-700 hover:bg-stone-200' },
              ].map(action => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.page)}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-colors ${action.style}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent applicant activity */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Recent Applicants</h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map(app => (
                  <button
                    key={app.id}
                    onClick={() => navigate('applicant-management', app.jobId)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-colors"
                  >
                    {app.workerPhoto ? (
                      <img src={app.workerPhoto} alt={app.workerName} className="w-8 h-8 rounded-lg object-cover bg-stone-100 flex-shrink-0" />
                    ) : (
                      <span className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-display font-bold flex-shrink-0">
                        {app.workerName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{app.workerName}</p>
                      <p className="text-xs text-stone-500 truncate">{app.jobTitle}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      app.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
                      app.status === 'rejected' ? 'bg-stone-100 text-stone-500' :
                      'bg-stone-100 text-stone-600'
                    }`}>
                      {app.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm text-center py-4">No applicants yet</p>
            )}
          </div>

          {/* Verification status */}
          {providerProfile.verified ? (
            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" className="w-5 h-5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span className="font-semibold text-teal">Verified Provider</span>
              </div>
              <p className="text-xs text-teal/80 leading-relaxed">
                Your organisation is verified. Workers see your verified badge and trust your job postings.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="font-semibold text-amber-800 mb-1">Verification Pending</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Complete your PAN verification to get the Verified Provider badge and increase worker trust.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
