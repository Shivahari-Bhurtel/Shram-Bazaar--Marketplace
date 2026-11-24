import { useState } from "react"
import { useApp } from "../../store/AppContext"
import { JobStatusBadge } from "../../components/StatusBadge"
import { formatNepalDate } from "../../utils/dates"
import { formatJobBudget } from "../../utils/jobBudget"
import analyticsDemo from "../../data/provider-analytics-demo.json"

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const card = "dashboard-panel rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[var(--dashboard-shadow)]"

function Icon({ name }: { name: "jobs" | "people" | "hired" | "arrow" | "arrow-up-right" | "pin" | "chart" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
    {name === "jobs" && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></>}
    {name === "people" && <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 8a3 3 0 0 1 0 6m2 2a4 4 0 0 1 2 4"/></>}
    {name === "hired" && <><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/></>}
    {name === "arrow" && <><path d="M5 12h14M13 6l6 6-6 6"/></>}
    {name === "arrow-up-right" && <><path d="M7 17 17 7M8 7h9v9"/></>}
    {name === "pin" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    {name === "chart" && <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 6-7"/></>}
  </svg>
}

function PanelTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[#EEE8D9] px-4 sm:px-5"><h2 className="flex items-center gap-2.5 text-sm font-semibold text-[#25231F]"><span className="h-4 w-1 rounded-full bg-[#D3AA35]"/>{children}</h2>{action}</div>
}

export default function ProviderDashboard() {
  const { state, navigate, myJobs, jobApplications } = useApp()
  const [range, setRange] = useState<"month" | "year">("year")
  const profile = state.providerProfile
  if (!profile) return null

  const activeJobs = myJobs.filter((job) => job.status === "active")
  const applicantRows = myJobs.flatMap((job) => jobApplications(job.id).map((application) => ({ application, job })))
    .sort((a, b) => b.application.appliedDate.localeCompare(a.application.appliedDate))
  const useShowcaseAnalytics = true
  const demoJobMap = new Map(analyticsDemo.jobs.map((job) => [job.id, job]))
  const hiredApplicationIds = new Set(analyticsDemo.engagements.filter((engagement) => ["CONFIRMED", "IN_PROGRESS", "COMPLETION_PENDING", "COMPLETED"].includes(engagement.status)).map((engagement) => engagement.applicationId))
  const analyticsRows = useShowcaseAnalytics
    ? analyticsDemo.applications.flatMap((application) => {
      const job = demoJobMap.get(application.jobId)
      return job ? [{ application: { id: application.id, appliedDate: application.appliedAt, status: application.status, shortlisted: application.shortlisted, workerName: application.workerName }, job: { id: job.id, title: job.title, district: job.district, status: job.derivedStatus } }] : []
    })
    : applicantRows
  const analyticsJobs = useShowcaseAnalytics
    ? analyticsDemo.jobs.map((job) => ({ id: job.id, title: job.title, district: job.district, status: job.derivedStatus }))
    : myJobs
  const applicantCount = analyticsRows.length
  const hiredCount = useShowcaseAnalytics
    ? analyticsRows.filter(({ application }) => hiredApplicationIds.has(application.id)).length
    : applicantRows.filter(({ application }) => application.status === "accepted" || application.status === "completed").length
  const analyticsActiveJobs = analyticsJobs.filter(({ status }) => status === "active" || status === "in_progress").length
  const stats = [
    { label: "Active jobs", value: analyticsActiveJobs, icon: "jobs" as const, action: () => navigate("my-jobs") },
    { label: "Total posted", value: analyticsJobs.length, icon: "jobs" as const, action: () => navigate("my-jobs") },
    { label: "Applicants", value: applicantCount, icon: "people" as const, action: () => navigate("applicant-management") },
    { label: "Workers hired", value: hiredCount, icon: "hired" as const, action: () => navigate("provider-operations") },
  ]
  const monthly = (() => {
    const now = new Date()
    const count = range === "year" ? 12 : 6
    return Array.from({ length: count }, (_, index) => {
      const offset = count - 1 - index
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const apps = analyticsRows.filter(({ application }) => {
        const applied = new Date(application.appliedDate)
        return applied.getFullYear() === date.getFullYear() && applied.getMonth() === date.getMonth()
      })
      return { label: months[date.getMonth()], applications: apps.length, hired: apps.filter(({ application }) => useShowcaseAnalytics ? hiredApplicationIds.has(application.id) : application.status === "accepted" || application.status === "completed").length }
    })
  })()
  const maxMonthly = Math.max(1, ...monthly.map((entry) => entry.applications))
  const stages = [
    { label: "Pending", value: analyticsRows.filter(({ application }) => application.status === "pending").length },
    { label: "Shortlisted", value: analyticsRows.filter(({ application }) => application.shortlisted).length },
    { label: "Hired", value: hiredCount },
    { label: "Closed", value: analyticsRows.filter(({ application }) => ["rejected", "declined", "withdrawn"].includes(application.status)).length },
  ]
  const maxStage = Math.max(1, ...stages.map((stage) => stage.value))
  const statusCounts = [
    { label: "Open", value: analyticsJobs.filter((job) => job.status === "active" || job.status === "in_progress").length, color: "#D3AA35" },
    { label: "Filled", value: analyticsJobs.filter((job) => job.status === "filled").length, color: "#292824" },
    { label: "Closed", value: analyticsJobs.filter((job) => job.status === "closed" || job.status === "completed").length, color: "#9A978D" },
    { label: "Draft", value: analyticsJobs.filter((job) => job.status === "draft").length, color: "#D8D1C2" },
  ]
  const totalStatus = Math.max(1, analyticsJobs.length)
  let cumulative = 0
  const donut = statusCounts.map((entry) => {
    const from = cumulative
    cumulative += entry.value / totalStatus * 100
    return `${entry.color} ${from}% ${cumulative}%`
  }).join(", ")
  const topJobs = [...analyticsJobs].sort((a, b) => analyticsRows.filter((row) => row.application.id && row.job.id === b.id).length - analyticsRows.filter((row) => row.job.id === a.id).length).slice(0, 4)

  return <div className="provider-dashboard provider-page mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] font-semibold text-[#553421] shadow-sm">{profile.logo ? <img src={profile.logo} alt={`${profile.orgName} logo`} className="h-full w-full object-cover"/> : (profile.contactName.trim()[0] || "S").toUpperCase()}</div>
        <div className="min-w-0"><p className="text-xs font-medium tracking-wide text-[#8F6C12]">Provider analytics</p><h1 className="truncate font-display text-xl font-semibold tracking-[-0.03em] text-[#25231F]">{profile.orgName}</h1></div>
      </div>
      <button type="button" onClick={() => navigate("create-job")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800">+ Post a Job</button>
    </header>

    <section aria-label="Hiring overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => <button key={stat.label} type="button" onClick={stat.action} className={`${card} group p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#D8C17A] hover:shadow-[0_10px_28px_rgba(82,65,27,0.09)]`}>
        <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F5EDCF] text-[#8F6C12]"><Icon name={stat.icon}/></span><span className="text-[#92877E] transition group-hover:text-[#8F6C12]"><Icon name="arrow-up-right"/></span></div>
        <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#25231F]">{stat.value}</p><p className="mt-0.5 text-xs font-semibold text-[#625D52] sm:text-sm">{stat.label}</p>
      </button>)}
    </section>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.8fr)]">
      <section className={`${card} min-w-0`}>
        <PanelTitle action={<div className="flex rounded-lg bg-[#F4F0E6] p-1 text-xs"><button onClick={() => setRange("month")} className={`rounded-md px-3 py-1.5 ${range === "month" ? "bg-white font-semibold text-[#8F6C12] shadow-sm" : "text-[#766B61]"}`}>6 months</button><button onClick={() => setRange("year")} className={`rounded-md px-3 py-1.5 ${range === "year" ? "bg-white font-semibold text-[#8F6C12] shadow-sm" : "text-[#766B61]"}`}>12 months</button></div>}>Applications overview</PanelTitle>
        <div className="px-4 pb-4 pt-3 sm:px-5">
          {applicantCount === 0 ? <div className="flex h-56 flex-col items-center justify-center text-center"><span className="text-[#8F6C12]"><Icon name="chart"/></span><p className="mt-2 text-sm font-medium text-[#51483F]">Application activity will appear here</p><p className="mt-1 text-xs text-[#92877E]">Your monthly application and hiring trends.</p></div> : <div className="relative h-56 pl-7">
            <div className="absolute inset-x-7 top-2 bottom-7 flex flex-col justify-between">{[100, 66, 33, 0].map((line) => <div key={line} className="border-t border-dashed border-[#EEE9E3]"/>)}</div>
            <div className="absolute left-0 top-0 bottom-7 flex flex-col justify-between text-[10px] text-[#92877E]">{[maxMonthly, Math.round(maxMonthly * .66), Math.round(maxMonthly * .33), 0].map((value, index) => <span key={index}>{value}</span>)}</div>
            <div className="absolute inset-x-7 top-2 bottom-7 flex items-end justify-around gap-1">{monthly.map((entry, index) => { const height = Math.max(entry.applications ? 6 : 1, entry.applications / maxMonthly * 100); const hiredHeight = entry.applications ? entry.hired / maxMonthly * 100 : 0; return <button key={`${entry.label}-${index}`} title={`${entry.label}: ${entry.applications} applications, ${entry.hired} hired`} onClick={() => navigate("applicant-management")} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"><span className="mb-1 hidden text-[10px] font-medium text-[#51483F] group-hover:block">{entry.applications}</span><span className="relative flex w-[min(58%,2rem)] items-end overflow-hidden rounded-t-sm bg-[#F3E8BF]" style={{ height: `${height}%` }}><span className="w-full bg-[#292824]" style={{ height: `${entry.applications ? hiredHeight / height * 100 : 0}%` }}/></span></button>})}</div>
            <div className="absolute inset-x-7 bottom-0 flex justify-around text-[10px] text-[#766B61]">{monthly.map((entry, index) => <span key={`${entry.label}-${index}`}>{entry.label}</span>)}</div>
          </div>}
          <div className="mt-3 flex justify-center gap-5 text-[11px] text-[#766B61]"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#292824]"/>Hired</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#F3E8BF]"/>Applications</span></div>
        </div>
      </section>
      <section className={card}>
        <PanelTitle>Application stages</PanelTitle>
        <div className="space-y-4 px-5 py-5">{stages.map((stage) => <button key={stage.label} onClick={() => navigate("applicant-management")} className="w-full text-left"><span className="mb-1.5 flex justify-between text-xs text-[#766B61]"><span>{stage.label}</span><span className="tabular-nums text-[#8F6C12]">{stage.value}</span></span><span className="block h-2 overflow-hidden rounded-full bg-[#EEE8D9]"><span className="block h-full rounded-full bg-[#D3AA35]" style={{ width: `${stage.value / maxStage * 100}%` }}/></span></button>)}</div>
        <div className="mx-4 mb-4 rounded-lg bg-[#F4F0E6] px-4 py-3 text-center"><p className="text-xs text-[#766B61]">Total applications</p><p className="mt-0.5 text-xl font-bold tabular-nums text-[#261C14]">{applicantCount}</p></div>
      </section>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(17rem,0.85fr)]">
      <section className={card}>
        <PanelTitle>Job status</PanelTitle>
        <div className="flex flex-col items-center px-4 py-5">
          <div className="relative grid h-40 w-40 place-items-center rounded-full" style={{ background: analyticsJobs.length ? `conic-gradient(${donut})` : "conic-gradient(#eee9e3 0 100%)" }}><div className="grid h-24 w-24 place-content-center rounded-full bg-white text-center"><span className="text-[11px] text-[#766B61]">Total jobs</span><strong className="text-2xl text-[#261C14]">{analyticsJobs.length}</strong></div></div>
          <div className="mt-5 grid w-full grid-cols-2 gap-x-3 gap-y-2">{statusCounts.map((item) => <button key={item.label} onClick={() => navigate("my-jobs")} className="flex items-center justify-between gap-2 text-xs text-[#766B61]"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }}/>{item.label}</span><strong className="tabular-nums text-[#261C14]">{item.value}</strong></button>)}</div>
        </div>
      </section>
      <section className={card}>
        <PanelTitle action={<button onClick={() => navigate("applicant-management")} className="text-xs font-semibold text-[#70472F] hover:underline">View all</button>}>Job applicants</PanelTitle>
        {topJobs.length ? <div className="divide-y divide-[#EEE8D9]">{topJobs.map((job) => { const jobRows = analyticsRows.filter((row) => row.job.id === job.id); const count = jobRows.length; const hired = jobRows.filter(({ application }) => useShowcaseAnalytics ? hiredApplicationIds.has(application.id) : application.status === "accepted" || application.status === "completed").length; return <button key={job.id} onClick={() => navigate("applicant-management", useShowcaseAnalytics ? undefined : job.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F4F0E6] sm:px-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5EDCF] text-[#70472F]"><Icon name="jobs"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#261C14]">{job.title}</span><span className="block truncate text-xs text-[#766B61]">{job.district} · {count} applicants</span></span><span className="shrink-0 text-xs font-semibold text-[#51483F]">{hired} hired</span></button>})}</div> : <p className="px-5 py-10 text-center text-sm text-[#92877E]">Post a job to see applicant activity here.</p>}
        <button onClick={() => navigate("my-jobs")} className="flex w-full items-center justify-between border-t border-[#EEE8D9] px-5 py-3 text-xs font-semibold text-[#70472F] hover:bg-[#F4F0E6]">View all jobs <Icon name="arrow"/></button>
      </section>
      <aside className="space-y-4">
        <section className={card}><PanelTitle>Quick actions</PanelTitle><div className="space-y-2 p-4"><button onClick={() => navigate("create-job")} className="flex min-h-10 w-full items-center justify-between rounded-lg bg-black px-3.5 text-left text-sm font-semibold text-white transition hover:bg-neutral-800">Post a new job <Icon name="arrow"/></button><button onClick={() => navigate("my-jobs")} className="flex min-h-10 w-full items-center justify-between rounded-lg bg-black px-3.5 text-left text-sm font-semibold text-white transition hover:bg-neutral-800">View all jobs <Icon name="arrow"/></button><button onClick={() => navigate("applicant-management")} className="flex min-h-10 w-full items-center justify-between rounded-lg bg-black px-3.5 text-left text-sm font-semibold text-white transition hover:bg-neutral-800">View applicants <Icon name="arrow"/></button></div></section>
        <section className={card}><PanelTitle action={<button onClick={() => navigate("applicant-management")} className="text-xs font-semibold text-[#70472F] hover:underline">All</button>}>Recent applicants</PanelTitle>
          {applicantRows.length ? <div className="divide-y divide-[#EEE8D9]">{applicantRows.slice(0, 3).map(({ application, job }) => <button key={application.id} onClick={() => navigate("applicant-management", job.id)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-[#F4F0E6]">{application.workerPhoto ? <img src={application.workerPhoto} alt="" className="h-8 w-8 rounded-lg object-cover"/> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F5EDCF] text-sm font-semibold text-[#553421]">{application.workerName.charAt(0).toUpperCase()}</span>}<span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-[#261C14]">{application.workerName}</span><span className="block truncate text-[11px] text-[#766B61]">{job.title}</span></span></button>)}</div> : <p className="px-4 py-5 text-center text-xs text-[#92877E]">No applicants yet. Applications will appear here when workers apply.</p>}
        </section>
        <section className={`${card} p-4`}><div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${profile.verified ? "bg-[#8F6C12]" : "bg-[#C5A05A]"}`}/><div><h2 className="text-sm font-semibold text-[#261C14]">Organisation verification</h2><p className="mt-1 text-xs leading-5 text-[#766B61]">{profile.verified ? "Current status: verified." : `Current status: ${(profile.verificationStatus || "not-submitted").replace(/-/g, " ")}.`}</p><button onClick={() => navigate("provider-profile")} className="mt-2 text-xs font-semibold text-[#70472F] hover:underline">Open organisation profile</button></div></div></section>
      </aside>
    </div>

    <section className={`${card} mt-4`}><PanelTitle action={<button onClick={() => navigate("my-jobs")} className="text-xs font-semibold text-[#70472F] hover:underline">View all</button>}>Active jobs</PanelTitle>{activeJobs.length ? <div className="divide-y divide-[#EEE8D9]">{activeJobs.slice(0, 3).map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-[#261C14]">{job.title}</h3><JobStatusBadge status={job.status}/></div><p className="mt-1 text-xs text-[#766B61]">{[job.district, formatJobBudget(job), `Posted ${formatNepalDate(job.date, { month: "short", day: "numeric" })}`].filter(Boolean).join(" · ")}</p></div><button onClick={() => navigate("applicant-management", job.id)} className="rounded-lg border border-[#E4D8B8] px-3 py-2 text-xs font-semibold text-[#553421] hover:bg-[#F5EDCF]">Review applicants</button></article>)}</div> : <div className="px-6 py-8 text-center"><h3 className="text-sm font-semibold text-[#261C14]">No active jobs yet</h3><p className="mt-1 text-sm text-[#766B61]">Post an opportunity to start receiving applications from workers.</p><button onClick={() => navigate("create-job")} className="mt-3 rounded-lg bg-[#553421] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F3020]">Post a Job</button></div>}</section>
  </div>
}
