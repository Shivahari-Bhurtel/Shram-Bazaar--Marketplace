import { useApp } from "../../store/AppContext"
import { JobStatusBadge } from "../../components/StatusBadge"
import { formatNepalDate } from "../../utils/dates"
import { formatJobBudget } from "../../utils/jobBudget"

function Icon({ name }: { name: "jobs" | "people" | "hired" | "arrow" | "arrow-up-right" | "pin" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
    {name === "jobs" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>}
    {name === "people" && <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 8a3 3 0 0 1 0 6m2 2a4 4 0 0 1 2 4"/></>}
    {name === "hired" && <><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/></>}
    {name === "arrow" && <><path d="M5 12h14M13 6l6 6-6 6"/></>}
    {name === "arrow-up-right" && <><path d="M7 17 17 7M8 7h9v9"/></>}
    {name === "pin" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
  </svg>
}

export default function ProviderDashboard() {
  const { state, navigate, myJobs, jobApplications } = useApp()
  const profile = state.providerProfile
  if (!profile) return null
  const activeJobs = myJobs.filter((job) => job.status === "active")
  const applicantRows = myJobs.flatMap((job) => jobApplications(job.id).map((application) => ({ application, job })))
    .sort((a, b) => b.application.appliedDate.localeCompare(a.application.appliedDate))
  const applicantCount = applicantRows.length
  const hiredCount = applicantRows.filter(({ application }) => application.status === "accepted").length
  const stats = [
    { label: "Active jobs", value: activeJobs.length, icon: "jobs" as const, action: () => navigate("my-jobs") },
    { label: "Total posted", value: myJobs.length, icon: "jobs" as const, action: () => navigate("my-jobs") },
    { label: "Applicants", value: applicantCount, icon: "people" as const, action: () => navigate("applicant-management") },
    { label: "Workers hired", value: hiredCount, icon: "hired" as const, action: () => navigate("applicant-management") },
  ]
  const firstName = profile.contactName.trim().split(/\s+/)[0] || "there"

  return <div className="provider-page mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E8E2D5] bg-[#F7F1EB] text-lg font-semibold text-[#553421]">
          {profile.logo ? <img src={profile.logo} alt={`${profile.orgName} logo`} className="h-full w-full object-cover"/> : (profile.contactName.trim()[0] || "S").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#766B61]">Welcome back, {firstName}</p>
          <h1 className="mt-0.5 truncate font-display text-2xl font-semibold tracking-[-0.03em] text-[#261C14]">{profile.orgName}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#766B61]">
            {profile.location && <span className="inline-flex items-center gap-1"><Icon name="pin"/>{profile.location}</span>}
            {profile.industry && profile.industry.trim().toLowerCase() !== "other" && <span>{profile.industry}</span>}
            {profile.verified && <span className="font-semibold text-[#70472F]">Verified provider</span>}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => navigate("create-job")} className="provider-post-job-action inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-[#164E38] px-4 text-sm font-semibold text-white transition hover:bg-[#103B2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#236B4B] focus-visible:ring-offset-2 sm:self-auto">+ Post a Job</button>
    </header>

    {!profile.verified && profile.verificationStatus && profile.verificationStatus !== "not-submitted" && <div className="mt-6 flex flex-col justify-between gap-3 rounded-xl border border-[#E8E2D5] bg-white px-4 py-3 sm:flex-row sm:items-center">
      <div><p className="text-sm font-semibold text-[#261C14]">Provider verification: {profile.verificationStatus.replace(/-/g, " ")}</p><p className="mt-0.5 text-xs text-[#766B61]">Your verification progress is shown from the submitted organisation record.</p></div>
      <button type="button" onClick={() => navigate("provider-profile")} className="text-left text-sm font-semibold text-[#70472F] hover:underline">View organisation</button>
    </div>}

    <section aria-label="Hiring overview" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => <button key={stat.label} type="button" onClick={stat.action} className="group rounded-xl border border-[#E8E2D5] bg-white p-4 text-left shadow-[0_1px_2px_rgba(25,44,34,0.03)] transition hover:-translate-y-0.5 hover:border-[#C8D9CC] hover:shadow-[0_8px_24px_rgba(20,57,39,0.06)]">
        <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center text-black"><Icon name={stat.icon}/></span><span className="text-black transition group-hover:text-[#70472F]"><Icon name="arrow-up-right"/></span></div>
        <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-[#1A1714]">{stat.value}</p><p className="mt-1 text-sm font-semibold text-[#51483F]">{stat.label}</p>
      </button>)}
    </section>

    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.9fr)]">
      <section className="min-w-0 rounded-xl border border-[#E8E2D5] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#F0EBE6] px-5 py-4"><div><h2 className="font-semibold text-[#261C14]">Active jobs</h2><p className="mt-0.5 text-xs text-[#766B61]">Keep track of open opportunities and applications.</p></div><button onClick={() => navigate("my-jobs")} className="shrink-0 text-sm font-semibold text-[#70472F] hover:underline">View all</button></div>
        {activeJobs.length === 0 ? <div className="px-6 py-12 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7F1EB] text-[#70472F]"><Icon name="jobs"/></span><h3 className="mt-3 font-semibold text-[#261C14]">No active jobs yet</h3><p className="mx-auto mt-1 max-w-sm text-sm text-[#766B61]">Post an opportunity to start receiving applications from workers.</p><button onClick={() => navigate("create-job")} className="mt-4 rounded-lg bg-[#553421] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4F3020]">Post a Job</button></div> : <div className="divide-y divide-[#F0EBE6]">
          {activeJobs.slice(0, 4).map((job) => { const applicants = jobApplications(job.id); return <article key={job.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-[#261C14]">{job.title}</h3><JobStatusBadge status={job.status}/></div><p className="mt-1.5 text-xs text-[#766B61]">{[job.district, job.category, formatJobBudget(job)].filter(Boolean).join(" · ")}</p><p className="mt-1 text-xs text-[#92877E]">Posted {formatNepalDate(job.date, { month: "short", day: "numeric", year: "numeric" })} · {job.workersHired}/{job.workersNeeded} workers hired</p></div>
            <div className="flex shrink-0 items-center gap-3"><span className="text-xs text-[#766B61]">{applicants.length} applicants</span><button onClick={() => navigate("applicant-management", job.id)} className="rounded-lg border border-[#E4D3C3] px-3 py-2 text-xs font-semibold text-[#553421] hover:bg-[#F7F1EB]">Review</button><button onClick={() => navigate("edit-job", job.id)} className="rounded-lg px-2 py-2 text-xs font-semibold text-[#65564A] hover:bg-[#FAF8F5]">Edit</button></div>
          </article>})}
        </div>}
      </section>

      <aside className="space-y-6">
        <section className="rounded-none border border-[#E8E2D5] bg-white p-5"><h2 className="font-semibold text-[#261C14]">Quick actions</h2><div className="mt-4 space-y-2"><button onClick={() => navigate("create-job")} className="flex min-h-11 w-full items-center justify-between rounded-md bg-[#553421] px-3.5 text-left text-sm font-semibold text-white transition hover:bg-[#4F3020]">Post a new job <Icon name="arrow"/></button><button onClick={() => navigate("my-jobs")} className="flex min-h-11 w-full items-center justify-between rounded-md border border-[#E8E2D5] px-3.5 text-left text-sm font-medium text-[#34443A] hover:bg-[#FAF8F5]">View all jobs <Icon name="arrow"/></button><button onClick={() => navigate("applicant-management")} className="flex min-h-11 w-full items-center justify-between rounded-md border border-[#E8E2D5] px-3.5 text-left text-sm font-medium text-[#34443A] hover:bg-[#FAF8F5]">View applicants <Icon name="arrow"/></button></div></section>
        <section className="rounded-none border border-[#E8E2D5] bg-white"><div className="flex items-center justify-between border-b border-[#F0EBE6] px-5 py-4"><div><h2 className="font-semibold text-[#261C14]">Recent applicants</h2><p className="mt-0.5 text-xs text-[#766B61]">Latest applications across your jobs.</p></div><button onClick={() => navigate("applicant-management")} className="text-xs font-semibold text-[#70472F] hover:underline">All</button></div>
          {applicantRows.length ? <div className="divide-y divide-[#F0EBE6]">{applicantRows.slice(0, 4).map(({ application, job }) => <button key={application.id} onClick={() => navigate("applicant-management", job.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-[#FAF8F5]">{application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-9 w-9 rounded-lg object-cover"/> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F7F1EB] text-sm font-semibold text-[#553421]">{application.workerName.charAt(0).toUpperCase()}</span>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[#261C14]">{application.workerName}</span><span className="block truncate text-xs text-[#766B61]">{job.title}</span></span><span className="shrink-0 text-[10px] font-medium capitalize text-[#766B61]">{application.status}</span></button>)}</div> : <p className="px-5 py-8 text-center text-sm text-[#92877E]">No applicants yet. Applications will appear here when workers apply.</p>}
        </section>
        <section className="rounded-none border border-[#E8E2D5] bg-white p-4"><div className="flex items-start gap-3"><span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${profile.verified ? "bg-[#70472F]" : "bg-[#C5A05A]"}`}/><div><h2 className="text-sm font-semibold text-[#261C14]">{profile.verified ? "Verified organisation" : "Organisation verification"}</h2><p className="mt-1 text-xs leading-5 text-[#766B61]">{profile.verified ? "Your verified status is confirmed on your organisation profile." : profile.verificationStatus ? `Current status: ${profile.verificationStatus.replace(/-/g, " ")}.` : "No verification status has been submitted."}</p><button onClick={() => navigate("provider-profile")} className="mt-2 text-xs font-semibold text-[#70472F] hover:underline">Open organisation profile</button></div></div></section>
      </aside>
    </div>
  </div>
}
