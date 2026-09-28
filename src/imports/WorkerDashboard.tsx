import { useApp } from '../../store/AppContext';
import JobCard from '../../components/JobCard';
import { ApplicationStatusBadge } from '../../components/StatusBadge';

export default function WorkerDashboard() {
  const { state, navigate, myApplications } = useApp();
  const { workerProfile, jobs, notifications, currentUser } = state;

  if (!workerProfile) return null;

  const myNotifs = notifications.filter(n => n.userId === currentUser?.id && !n.read);
  const recentApplications = myApplications.slice(0, 3);
  const recommendedJobs = jobs
    .filter(j => j.status === 'active' && !myApplications.some(a => a.jobId === j.id))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 3);

  const stats = [
    { label: 'Applications', value: myApplications.length, color: 'bg-teal-50 text-teal', page: 'my-applications' as const },
    { label: 'Accepted', value: myApplications.filter(a => a.status === 'accepted').length, color: 'bg-green-50 text-green-700', page: 'my-applications' as const },
    { label: 'Saved Jobs', value: state.savedJobIds.length, color: 'bg-amber-50 text-amber-700', page: 'saved-jobs' as const },
    { label: 'Jobs Done', value: workerProfile.totalJobs, color: 'bg-primary-50 text-primary', page: 'worker-profile' as const },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1530099486328-e021101a494a?w=400&h=300&fit=crop&auto=format')`, backgroundSize: 'cover' }} />
        <div className="relative flex items-start gap-4">
          <img src={workerProfile.photo} alt={workerProfile.name} className="w-14 h-14 rounded-xl object-cover bg-stone-700 flex-shrink-0" />
          <div>
            <p className="text-white/60 text-sm">Good morning 🙏</p>
            <h1 className="font-display text-2xl font-bold text-white">{workerProfile.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-white/70 text-sm">{workerProfile.location}</span>
              <span className="text-white/30">·</span>
              <div className="flex items-center gap-1">
                <span className="text-amber text-sm">★</span>
                <span className="text-white/80 text-sm font-medium">{workerProfile.rating}</span>
                <span className="text-white/40 text-xs">({workerProfile.totalJobs} jobs)</span>
              </div>
            </div>
          </div>
        </div>
        {myNotifs.length > 0 && (
          <div className="relative mt-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            <p className="text-white/90 text-sm">{myNotifs[0].message}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => navigate(s.page)}
            className="bg-white border border-stone-200 rounded-2xl p-4 text-left hover:shadow-md transition-all group"
          >
            <div className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mb-3 ${s.color}`}>{s.label}</div>
            <div className="font-display text-3xl font-bold text-stone-900">{s.value}</div>
            <div className="text-xs text-stone-400 mt-1 group-hover:text-primary transition-colors">View →</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recommended jobs */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-stone-900">Recommended for You</h2>
            <button onClick={() => navigate('job-discovery')} className="text-sm text-primary hover:underline font-medium">
              See all jobs →
            </button>
          </div>
          {recommendedJobs.length > 0 ? (
            <div className="space-y-4">
              {recommendedJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-stone-500">No new recommended jobs right now.</p>
              <button onClick={() => navigate('job-discovery')} className="mt-4 text-primary text-sm font-medium hover:underline">
                Browse all jobs
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile completeness */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Profile Completeness</h3>
            <div className="space-y-3">
              {[
                { label: 'Basic info', done: true },
                { label: 'Skills added', done: workerProfile.skills.length > 0 },
                { label: 'Qualifications', done: workerProfile.qualifications.length > 0 },
                { label: 'Work experience', done: workerProfile.experience.length > 0 },
                { label: 'Availability set', done: workerProfile.availableDates.length > 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-green-100' : 'bg-stone-100'}`}>
                    {item.done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" className="w-3 h-3"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                    )}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-stone-700' : 'text-stone-400'}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('worker-profile')}
              className="mt-4 w-full py-2 bg-stone-100 text-stone-700 text-sm font-medium rounded-xl hover:bg-stone-200 transition-colors"
            >
              Complete Your Profile
            </button>
          </div>

          {/* Recent Applications */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Recent Applications</h3>
              <button onClick={() => navigate('my-applications')} className="text-xs text-primary hover:underline">All</button>
            </div>
            {recentApplications.length > 0 ? (
              <div className="space-y-3">
                {recentApplications.map(app => (
                  <div key={app.id} className="border-b border-stone-50 last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-medium text-stone-900 line-clamp-1">{app.jobTitle}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{app.providerName}</p>
                    <div className="mt-1.5">
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 text-center py-4">No applications yet</p>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-3">Your Skills</h3>
            <div className="flex flex-wrap gap-2">
              {workerProfile.skills.map(skill => (
                <span key={skill} className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200">{skill}</span>
              ))}
            </div>
            <button onClick={() => navigate('worker-profile')} className="mt-3 text-xs text-primary hover:underline">
              Edit skills →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
