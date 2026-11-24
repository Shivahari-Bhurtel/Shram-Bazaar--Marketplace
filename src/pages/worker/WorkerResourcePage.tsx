import { useApp } from "../../store/AppContext"

const pageCopy = {
  eyebrow: "We can help",
  title: "Help & support",
  intro: "Choose the quickest way to get help with your account, applications, profile, or learning.",
}

export default function WorkerResourcePage() {
  const { navigate, state } = useApp()
  const isProvider = state.currentUser?.role === "provider"
  const intro = isProvider
    ? "Get help with your provider profile, job postings, applicants, and team operations."
    : pageCopy.intro

  return <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
    <header className="rounded-2xl bg-[#4E342E] px-6 py-7 text-white shadow-sm sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#E8CBAE]">{pageCopy.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{pageCopy.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#F3E8DE] sm:text-base">{intro}</p>
    </header>

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {isProvider ? <>
        <HelpCard title="Provider profile" body="Review your provider details and organisation information." action="Open provider profile" onClick={() => navigate("provider-profile")} />
        <HelpCard title="Jobs and applicants" body="Manage job postings and review candidates across your jobs." action="Open applicants" onClick={() => navigate("applicant-management")} />
        <HelpCard title="Team & Operations" body="Manage hires, work schedules, payment records, and reviews." action="Open team operations" onClick={() => navigate("provider-operations")} />
      </> : <>
        <HelpCard title="Account and profile" body="Update contact details, skills, qualifications, and availability." action="Open my profile" onClick={() => navigate("worker-profile")} />
        <HelpCard title="Applications and jobs" body="Find jobs, check applications, or revisit a saved listing." action="Find work" onClick={() => navigate("job-discovery")} />
        <HelpCard title="Learning" body="Browse courses and review certificates you have earned." action="Open Learn" onClick={() => navigate("learn")} />
      </>}
      <section className="rounded-2xl border border-[#D7BFA4] bg-[#F7F0E8] p-5 md:col-span-3"><h2 className="text-lg font-bold text-[#4E342E]">Contact support</h2><p className="mt-2 text-sm text-[#5B4032]">Email support@shrama.com and include a short description of the issue.</p><a href="mailto:support@shrama.com" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#4E342E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B2722]">Email support</a></section>
    </div>
  </div>
}

function HelpCard({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return <section className="rounded-2xl border border-[#E3D6C8] bg-white p-5"><h2 className="text-lg font-bold text-[#4E342E]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p><button type="button" onClick={onClick} className="mt-4 text-sm font-semibold text-[#80502F] underline underline-offset-4">{action}</button></section>
}
