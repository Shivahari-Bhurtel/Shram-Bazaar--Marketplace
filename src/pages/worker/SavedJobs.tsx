import { useEffect, useState } from "react"
import DemoJobCard from "../../components/DemoJobCard"
import DemoJobDetailsModal from "../../components/DemoJobDetailsModal"
import JobCard from "../../components/JobCard"
import { useDemoJobState } from "../../hooks/useDemoJobState"
import { loadDemoJobs, type DemoJob } from "../../services/demoJobs"
import { useApp } from "../../store/AppContext"

export default function SavedJobs() {
  const { state, navigate } = useApp()
  const demoState = useDemoJobState(state.workerProfile?.id)
  const [demoJobs, setDemoJobs] = useState<DemoJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedJob, setSelectedJob] = useState<DemoJob | null>(null)
  const availableJobs = [...state.jobs, ...state.externalJobs]
  const savedJobs = state.savedJobIds
    .map((id) => availableJobs.find((job) => job.id === id))
    .filter((job): job is NonNullable<typeof job> => Boolean(job))
  const savedDemoJobs = demoJobs.filter((job) => demoState.savedIds.includes(job.id))
  const appliedIds = new Set(demoState.applications.map((application) => application.jobId))

  useEffect(() => {
    const controller = new AbortController()
    loadDemoJobs(controller.signal)
      .then(setDemoJobs)
      .catch((loadError: unknown) => { if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  return (
    <div className="w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8"><h1 className="mb-1 font-display text-3xl font-bold text-stone-900">Saved jobs</h1><p className="text-stone-500">{savedJobs.length + savedDemoJobs.length} job{savedJobs.length + savedDemoJobs.length !== 1 ? "s" : ""} saved</p></div>

      {savedDemoJobs.length > 0 && <section className="mb-8" aria-label="Saved Kathmandu Valley jobs"><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-bold text-stone-900">Kathmandu Valley jobs</h2><p className="mt-1 text-xs text-stone-500">Sample listings · availability and employer details are illustrative.</p></div></div><div className="grid gap-5 md:grid-cols-2">{savedDemoJobs.map((job) => <DemoJobCard key={job.id} job={job} saved applied={appliedIds.has(job.id)} onOpen={setSelectedJob} onToggleSaved={demoState.toggleSaved} onApply={demoState.apply} />)}</div></section>}

      {savedJobs.length > 0 && <section className="mb-8" aria-label="Saved provider and external jobs"><h2 className="mb-3 text-xl font-bold text-stone-900">Provider and external posts</h2><div className="grid gap-5 md:grid-cols-2">{savedJobs.map((job) => <JobCard key={job.id} job={job} />)}</div></section>}

      {!loading && error && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Job listings could not be loaded: {error}</div>}
      {loading && <p role="status" className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">Loading saved jobs…</p>}
      {!loading && savedJobs.length === 0 && savedDemoJobs.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center sm:p-16">
          <div className="mb-4 text-4xl" aria-hidden="true">🔖</div><h3 className="mb-2 font-semibold text-stone-900">No saved jobs</h3><p className="mb-6 text-sm text-stone-500">Save a job while browsing to keep it handy.</p>
          <button onClick={() => navigate("job-discovery")} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark">Browse jobs</button>
        </div>
      )}
      {selectedJob && <DemoJobDetailsModal job={selectedJob} saved applied={appliedIds.has(selectedJob.id)} onClose={() => setSelectedJob(null)} onToggleSaved={demoState.toggleSaved} onApply={demoState.apply} />}
    </div>
  )
}
