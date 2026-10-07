import { useEffect, useMemo, useState } from 'react';
import { ALL_SKILLS } from '../data/mockData';
import { useApp } from '../store/AppContext';

const categories = [
  {
    key: 'qualified',
    title: 'Professional jobs',
    description: 'Healthcare, education, accounting, technology, and more.',
    image: 'https://images.unsplash.com/photo-1700305248594-39e17fe196de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  },
  {
    key: 'skill-based',
    title: 'Hands-on work',
    description: 'Electrical, plumbing, carpentry, driving, hospitality and practical trades.',
    image: 'https://images.unsplash.com/photo-1768314668998-e7f306b27e08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  },
  {
    key: 'beginner-friendly',
    title: 'Jobs for beginners',
    description: 'Event help, loading, cleaning, and other jobs for people starting out.',
    image: 'https://images.unsplash.com/photo-1786948670276-214ab8f791ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
  },
];

const workerSteps = [
  ['01', 'Build your profile', 'Add your location, skills, experience and availability.'],
  ['02', 'Find the right work', 'Search by district, skill, type of work, and pay.'],
  ['03', 'Apply and follow along', 'Apply for a job and check for updates in your account.'],
];

const providerSteps = [
  ['01', 'Create a business profile', 'Add your business and contact details.'],
  ['02', 'Post a job', 'Describe the work, location, dates, and pay.'],
  ['03', 'Choose a worker', 'Review applicants and choose the right person for the job.'],
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
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Shram Bazzar<br />
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
              <button onClick={() => navigate('login')} className="text-white/80 hover:text-white">
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
            [state.allWorkerProfiles.length, 'Workers'],
            [state.allProviderProfiles.filter(provider => provider.verified).length, 'Verified businesses'],
            [new Set(state.jobs.map(job => job.district)).size, 'Areas with jobs'],
          ].map(([value, label]) => (
            <div key={label} className="text-center md:text-left">
              <strong className="font-display text-3xl text-primary tabular-nums"><CountUp value={Number(value)} /></strong>
              <p className="text-sm text-stone-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading eyebrow="Easy to get started" title="How Shram Bazar works" description="A few simple steps to find work or hire someone." />
        <div className="mt-10 grid md:grid-cols-2 border-y border-stone-200">
          <Journey title="For workers" steps={workerSteps} action="Create a worker profile" onAction={() => navigate('worker-signup')} />
          <Journey title="For businesses" steps={providerSteps} action="Post a job" onAction={() => navigate('provider-signup')} provider />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <SectionHeading eyebrow="Explore work" title="Popular skills and jobs" description="Choose the kind of work you are looking for." />
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
        <SectionHeading eyebrow="Businesses on Shram Bazar" title="Meet local employers" description="Get to know the businesses posting jobs on Shram Bazar." />
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
        ) : <p className="mt-8 text-stone-500">Local businesses will appear here.</p>}
      </section>

      <section className="bg-white border-y border-stone-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Built for everyday work" title="Why Shram Bazar" description="Find dependable work or hire reliable people with clear details from the start." />
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              ['Verified businesses', 'See which businesses have confirmed their details.'],
              ['Clear pay', 'Know how much a job pays before you apply.'],
              ['Flexible work', 'Choose when you can work and search by place, job type, and length.'],
              ['Worker profiles', 'Learn about each worker’s skills, experience, and reviews.'],
            ].map(([title, text]) => <div key={title} className="border-t border-stone-300 pt-5"><h3 className="font-semibold">{title}</h3><p className="text-sm text-stone-500 mt-2 leading-relaxed">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-16">
        <div>
          <SectionHeading eyebrow="Worker reviews" title="Ratings from completed jobs" description="Employers can leave a rating and review after a job is complete." />
          {reviews.length ? <div className="mt-8 space-y-6">{reviews.map(review => (
            <blockquote key={`${review.jobId}-${review.workerName}`} className="border-l-2 border-primary pl-5">
              <p className="text-stone-700 leading-relaxed">“{review.review}”</p>
              <footer className="text-sm text-stone-500 mt-2">{review.workerName}, {review.location} · {review.rating}/5 · {review.providerName}</footer>
            </blockquote>
          ))}</div> : <p className="mt-8 text-sm text-stone-500">Reviews will appear after completed work is rated.</p>}
        </div>
        <div className="border-l border-stone-200 lg:pl-16">
          <SectionHeading eyebrow="Your safety" title="Tell us when something seems wrong" description="Report a job that seems unsafe, misleading, or asks for unusual payment." />
          <div className="mt-8 bg-stone-100 p-6">
            <p className="text-sm text-stone-600 leading-relaxed">Your report helps us review the job listing.</p>
          </div>
        </div>
      </section>

      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div><p className="text-white/70 text-sm font-medium">Ready to get started?</p><h2 className="font-display text-3xl md:text-4xl font-bold mt-2">Find work or hire a worker.</h2></div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate('worker-signup')} className="px-6 py-3 bg-white text-primary font-semibold">Create worker profile</button>
            <button onClick={() => navigate('provider-signup')} className="px-6 py-3 border border-white/40 text-white font-semibold">Sign up as a business</button>
          </div>
        </div>
      </section>

      <footer className="bg-stone-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div><h2 className="font-display text-xl font-semibold">Shram Bazar</h2><p className="text-sm text-white/50 mt-3 leading-relaxed">Connecting workers and businesses across Nepal.</p></div>
          <FooterGroup title="Get started" items={[['Find work', () => navigate('worker-signup')], ['Hire workers', () => navigate('provider-signup')], ['Sign in', () => navigate('login')]]} />
          <FooterGroup title="Help" items={[['Contact us', () => { window.location.href = 'mailto:support@shrambazar.com'; }], ['Report a concern', () => navigate('login')], ['Account help', () => navigate('login')]]} />
          <FooterGroup title="Learn more" items={[['Terms of use', () => window.alert('Terms of use are available from Shram Bazar support.')], ['Privacy', () => window.alert('Your information is saved in this browser.')], ['Kathmandu, Nepal', () => window.scrollTo({ top: 0, behavior: 'smooth' })]]} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-stone-100 text-xs text-stone-400 flex flex-col sm:flex-row justify-between gap-2">
          <span>© 2026 Shram Bazar</span><span>Work and hiring across Nepal</span>
        </div>
      </footer>
    </div>
  );
}

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || value === 0) {
      setCount(value);
      return;
    }

    let frame = 0;
    let startTime: number | undefined;
    const duration = 1400;

    const animate = (time: number) => {
      if (startTime === undefined) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(value * easedProgress));

      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <>{count}</>;
}

function SectionHeading({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return <div className="max-w-2xl"><p className="text-xs uppercase tracking-[0.16em] font-semibold text-primary">{eyebrow}</p><h2 className={`font-display text-3xl md:text-4xl font-bold mt-3 ${dark ? 'text-white' : 'text-stone-900'}`}>{title}</h2><p className={`mt-3 leading-relaxed ${dark ? 'text-white/60' : 'text-stone-500'}`}>{description}</p></div>;
}

function Journey({ title, steps, action, onAction, provider = false }: { title: string; steps: string[][]; action: string; onAction: () => void; provider?: boolean }) {
  return <div className={`py-8 md:p-10 ${provider ? 'md:border-l border-stone-200' : ''}`}><h3 className="font-display text-2xl font-semibold">{title}</h3><div className="mt-7 space-y-6">{steps.map(([number, step, detail]) => <div key={number} className="grid grid-cols-[2rem_1fr] gap-3"><span className="font-mono-data text-sm text-stone-400">{number}</span><div><h4 className="font-semibold">{step}</h4><p className="text-sm text-stone-500 mt-1">{detail}</p></div></div>)}</div><button onClick={onAction} className="mt-8 px-5 py-2.5 text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors">{action}</button></div>;
}

function FooterGroup({ title, items }: { title: string; items: [string, () => void][] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><div className="mt-4 space-y-3">{items.map(([label, action]) => <button key={label} onClick={action} className="block text-sm text-white/55 hover:text-white">{label}</button>)}</div></div>;
}
