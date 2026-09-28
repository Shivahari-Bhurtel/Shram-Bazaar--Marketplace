import { useMemo } from 'react';
import { ALL_SKILLS } from '../data/mockData';
import { useApp } from '../store/AppContext';

const categories = [
  {
    key: 'qualified',
    title: 'Professional work',
    description: 'Healthcare, education, accounting, technology and other qualified roles.',
    image: 'https://images.unsplash.com/photo-1700305248594-39e17fe196de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  },
  {
    key: 'skill-based',
    title: 'Skilled trades',
    description: 'Electrical, plumbing, carpentry, driving, hospitality and practical trades.',
    image: 'https://images.unsplash.com/photo-1768314668998-e7f306b27e08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  },
  {
    key: 'beginner-friendly',
    title: 'Entry-level work',
    description: 'Event support, loading, cleaning and flexible work open to new workers.',
    image: 'https://images.unsplash.com/photo-1786948670276-214ab8f791ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  },
];

const workerSteps = [
  ['01', 'Build your profile', 'Add your location, skills, experience and availability.'],
  ['02', 'Find relevant work', 'Search real provider jobs by district, skill, category and NPR payment.'],
  ['03', 'Apply and track', 'Send one application and follow every status update from your dashboard.'],
];

const providerSteps = [
  ['01', 'Register your organisation', 'Add your contact details, district and PAN information.'],
  ['02', 'Post clear work', 'State the requirements, location, duration and NPR payment.'],
  ['03', 'Review and hire', 'Compare profiles, shortlist applicants and record a hiring decision.'],
];

export default function Landing() {
  const { navigate, state } = useApp();

  const popularSkills = useMemo(() => {
    const counts = new Map<string, number>();
    state.jobs.forEach(job => job.skillsRequired.forEach(item => counts.set(item, (counts.get(item) ?? 0) + 1)));
    const stored = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
    return stored.length ? stored : ALL_SKILLS.slice(0, 8);
  }, [state.jobs]);

  const reviews = state.allWorkerProfiles
    .flatMap(worker => worker.workHistory.map(item => ({ ...item, workerName: worker.name, location: worker.district })))
    .filter(item => item.review)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-800" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=800&fit=crop&auto=format')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/70 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-green rounded-full" />
              Nepal's Flexible Work Platform
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Nepal's Bazaar<br />
              <span className="text-primary-light">for Flexible Work</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed mb-10 max-w-xl">
              Shram Bazar connects skilled workers with businesses across Nepal. Find flexible work that fits your life, or hire the right people for your needs — quickly, safely, and fairly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('worker-signup')}
                className="px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
              >
                Find Flexible Work
              </button>
              <button
                onClick={() => navigate('provider-signup')}
                className="px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-colors"
              >
                Hire Workers
              </button>
            </div>
            <p className="mt-4 text-white/50 text-sm">
              Already have an account?{' '}
              <button onClick={() => navigate('login')} className="text-white/80 hover:text-white underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            [state.jobs.filter(job => job.status === 'active').length, 'Active jobs'],
            [state.allWorkerProfiles.length, 'Worker profiles'],
            [state.allProviderProfiles.filter(provider => provider.verified).length, 'Verified providers'],
            [new Set(state.jobs.map(job => job.district)).size, 'Districts with jobs'],
          ].map(([value, label]) => (
            <div key={label} className="text-center md:text-left">
              <strong className="font-display text-3xl text-primary">{value}</strong>
              <p className="text-sm text-stone-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading eyebrow="Simple for both sides" title="How Shram Bazar works" description="Clear steps for finding work and hiring dependable people." />
        <div className="mt-10 grid md:grid-cols-2 border-y border-stone-200">
          <Journey title="For workers" steps={workerSteps} action="Create a worker profile" onAction={() => navigate('worker-signup')} />
          <Journey title="For providers" steps={providerSteps} action="Post a job" onAction={() => navigate('provider-signup')} provider />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading eyebrow="Browse the marketplace" title="Popular skills and categories" description="Start with the kind of work you need, then narrow results by skill and location." />
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {categories.map(item => (
            <button key={item.key} onClick={() => navigate('worker-signup')} className="relative h-64 text-left overflow-hidden group">
              <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
              <span className="absolute inset-0 bg-stone-900/65" />
              <span className="absolute inset-x-0 bottom-0 p-6 text-white">
                <strong className="font-display text-2xl block">{item.title}</strong>
                <span className="text-sm text-white/75 block mt-2">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {popularSkills.map(item => (
            <button key={item} onClick={() => navigate('worker-signup')} className="px-4 py-2 bg-white border border-stone-200 text-sm text-stone-700 hover:border-primary hover:text-primary">
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading eyebrow="Organisations on Shram Bazar" title="Trusted providers" description="Verification is based on stored organisation and PAN status, never a decorative badge." />
        {state.allProviderProfiles.length ? (
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {state.allProviderProfiles.slice(0, 8).map(provider => (
              <div key={provider.id} className="border-t-2 border-stone-800 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{provider.orgName}</h3>
                  {provider.verified && <span className="text-[11px] text-teal font-semibold">Verified</span>}
                </div>
                <p className="text-sm text-stone-500 mt-2">{provider.industry}</p>
                <p className="text-sm text-stone-500">{provider.location}, {provider.district}</p>
                <p className="text-xs text-stone-400 mt-3">{provider.totalHires} workers hired · {provider.rating ? `${provider.rating}/5` : 'No rating yet'}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-8 text-stone-500">Registered organisations will appear here.</p>}
      </section>

      <section className="bg-white border-y border-stone-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Built for practical work" title="Why Shram Bazar" description="A focused Nepal marketplace with the information workers and providers need to make clear decisions." />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              ['Verified providers', 'Organisation profiles show their stored PAN verification status clearly.'],
              ['Transparent payment', 'Every listing states payment in NPR with a per-day, per-hour or fixed basis.'],
              ['Flexible work', 'Workers can set availability and search by location, work type and duration.'],
              ['Trusted profiles', 'Skills, experience, work history and provider reviews stay attached to the worker.'],
            ].map(([title, text]) => <div key={title} className="border-t border-stone-300 pt-5"><h3 className="font-semibold">{title}</h3><p className="text-sm text-stone-500 mt-2 leading-relaxed">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-16">
        <div>
          <SectionHeading eyebrow="Worker reputation" title="Ratings built from completed work" description="Providers can leave a simple rating and review after accepting a worker." />
          {reviews.length ? <div className="mt-8 space-y-6">{reviews.map(review => (
            <blockquote key={`${review.jobId}-${review.workerName}`} className="border-l-2 border-primary pl-5">
              <p className="text-stone-700 leading-relaxed">“{review.review}”</p>
              <footer className="text-sm text-stone-500 mt-2">{review.workerName}, {review.location} · {review.rating}/5 · {review.providerName}</footer>
            </blockquote>
          ))}</div> : <p className="mt-8 text-sm text-stone-500">Reviews will appear after completed work is rated.</p>}
        </div>
        <div className="border-l border-stone-200 lg:pl-16">
          <SectionHeading eyebrow="Marketplace trust" title="Simple reporting when something is wrong" description="Workers can report misleading information, unsafe work or suspicious payment requests directly from a job page." />
          <div className="mt-8 bg-stone-100 p-6">
            <p className="text-sm text-stone-600 leading-relaxed">Reports are stored for review and duplicate reports are prevented. Reporting does not add chat, public arguments or complicated case management.</p>
          </div>
        </div>
      </section>

      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div><p className="text-white/70 text-sm font-medium">Ready to use Shram Bazar?</p><h2 className="font-display text-3xl md:text-4xl font-bold mt-2">Find work or build your workforce.</h2></div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('worker-signup')} className="px-6 py-3 bg-white text-primary font-semibold">Create worker profile</button>
            <button onClick={() => navigate('provider-signup')} className="px-6 py-3 border border-white/40 text-white font-semibold">Register as provider</button>
          </div>
        </div>
      </section>

      <footer className="bg-stone-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div><h2 className="font-display text-xl font-semibold">Shram Bazar</h2><p className="text-sm text-white/50 mt-3 leading-relaxed">A practical marketplace connecting workers and organisations across Nepal.</p></div>
          <FooterGroup title="Marketplace" items={[['Find work', () => navigate('worker-signup')], ['Hire workers', () => navigate('provider-signup')], ['Sign in', () => navigate('login')]]} />
          <FooterGroup title="Support" items={[['Contact support', () => { window.location.href = 'mailto:support@shrambazar.com'; }], ['Report a concern', () => navigate('login')], ['Account help', () => navigate('login')]]} />
          <FooterGroup title="Legal & Nepal" items={[['Terms of use', () => window.alert('Terms of use are available from Shram Bazar support.')], ['Privacy', () => window.alert('Your MVP data is stored locally in this browser.')], ['Kathmandu, Nepal', () => window.scrollTo({ top: 0, behavior: 'smooth' })]]} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-white/10 text-xs text-white/40 flex flex-col sm:flex-row justify-between gap-2">
          <span>© 2026 Shram Bazar</span><span>Nepal workforce marketplace</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return <div className="max-w-2xl"><p className="text-xs uppercase tracking-[0.16em] font-semibold text-primary">{eyebrow}</p><h2 className={`font-display text-3xl md:text-4xl font-bold mt-3 ${dark ? 'text-white' : 'text-stone-900'}`}>{title}</h2><p className={`mt-3 leading-relaxed ${dark ? 'text-white/60' : 'text-stone-500'}`}>{description}</p></div>;
}

function Journey({ title, steps, action, onAction, provider = false }: { title: string; steps: string[][]; action: string; onAction: () => void; provider?: boolean }) {
  return <div className={`py-8 md:p-10 ${provider ? 'md:border-l border-stone-200' : ''}`}><h3 className="font-display text-2xl font-semibold">{title}</h3><div className="mt-7 space-y-6">{steps.map(([number, step, detail]) => <div key={number} className="grid grid-cols-[2rem_1fr] gap-3"><span className="font-mono-data text-sm text-stone-400">{number}</span><div><h4 className="font-semibold">{step}</h4><p className="text-sm text-stone-500 mt-1">{detail}</p></div></div>)}</div><button onClick={onAction} className={`mt-8 px-5 py-2.5 text-sm font-semibold ${provider ? 'bg-primary text-white' : 'bg-stone-900 text-white'}`}>{action}</button></div>;
}

function FooterGroup({ title, items }: { title: string; items: [string, () => void][] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><div className="mt-4 space-y-3">{items.map(([label, action]) => <button key={label} onClick={action} className="block text-sm text-white/55 hover:text-white">{label}</button>)}</div></div>;
}
