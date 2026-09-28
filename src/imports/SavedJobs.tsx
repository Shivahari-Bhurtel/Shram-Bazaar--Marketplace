import { useApp } from '../../store/AppContext';
import JobCard from '../../components/JobCard';

export default function SavedJobs() {
  const { state, navigate } = useApp();
  const savedJobs = state.jobs.filter(j => state.savedJobIds.includes(j.id));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">Saved Jobs</h1>
        <p className="text-stone-500">{savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved</p>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center">
          <div className="text-4xl mb-4">🔖</div>
          <h3 className="font-semibold text-stone-900 mb-2">No saved jobs</h3>
          <p className="text-stone-500 text-sm mb-6">Bookmark jobs you're interested in so you can apply later.</p>
          <button
            onClick={() => navigate('job-discovery')}
            className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {savedJobs.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
