import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../store/AppContext';
import heroVideo from '../assets/hero/gemini_generated_video_f3c61e6d.mp4';
import { getFeaturedHimalayasJobs } from '../services/himalayas';
import type { Job } from '../types';

const workerSteps = [
  ['1', 'Build your profile', 'Add your location, skills, experience, and availability.'],
  ['2', 'Find the right work', 'Search by district, skill, type of work, and pay.'],
  ['3', 'Apply and follow along', 'Apply to jobs and follow each application from your account.'],
];

const providerSteps = [
  ['1', 'Create a business profile', 'Add your business and contact details.'],
  ['2', 'Post a job', 'Share the role, location, schedule, and pay.'],
  ['3', 'Choose a worker', 'Review applicants and select the right person for your opening.'],
];

const workCategories = [
  { label: 'Professional & Qualified', icon: 'professional' },
  { label: 'Skilled Work', icon: 'skilled' },
  { label: 'Hospitality & Food', icon: 'hospitality' },
  { label: 'Retail & Sales', icon: 'retail' },
  { label: 'Events & Temporary', icon: 'events' },
  { label: 'Delivery & Logistics', icon: 'delivery' },
  { label: 'Digital & Creative', icon: 'digital' },
  { label: 'Construction & Maintenance', icon: 'construction' },
] as const;

function CategoryIcon({ type }: { type: (typeof workCategories)[number]['icon'] }) {
  const commonProps = {
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-16 w-16',
    'aria-hidden': true,
  };

  if (type === 'professional') {
    return <svg {...commonProps}><path d="M12 35 23 25c3-3 7-3 10 0l6 6 8-8c2-2 5-2 7 0l3 3-13 13c-3 3-7 3-10 0l-4-4-7 7-11-7Z" /><path d="m18 23 7-6 7 4M43 23l7-7 5 1-1 6" /><path d="M29 12v5M24 14l-3-3M35 14l3-3" /></svg>;
  }
  if (type === 'skilled') {
    return <svg {...commonProps}><path d="M17 33h30v12H17zM13 45h38M22 33V21h20v12M27 21v-5h10v5M24 39h16" /><path d="M29 48v4M35 48v4" /></svg>;
  }
  if (type === 'hospitality') {
    return <svg {...commonProps}><path d="M13 31h38M17 31c1 10 7 15 15 15s14-5 15-15M14 31c0-7 5-12 18-12s18 5 18 12M32 13v6M26 13h12M21 51h22" /><path d="M47 24c4 0 6 2 6 5" /></svg>;
  }
  if (type === 'retail') {
    return <svg {...commonProps}><path d="M16 25h32l-2 27H18l-2-27Z" /><path d="m19 25 4-10h18l4 10M25 25c0 4 3 6 7 6s7-2 7-6M25 38h14M25 44h9" /></svg>;
  }
  if (type === 'events') {
    return <svg {...commonProps}><path d="M14 20h36v32H14zM14 28h36M23 13v14M41 13v14" /><path d="m22 38 5 5 15-15" /></svg>;
  }
  if (type === 'delivery') {
    return <svg {...commonProps}><path d="M10 24h29v22H10zM39 32h8l7 8v6H39zM17 46a4 4 0 1 0 8 0M44 46a4 4 0 1 0 8 0M48 32v8h6" /><path d="M15 19h12M10 14h13" /></svg>;
  }
  if (type === 'digital') {
    return <svg {...commonProps}><path d="m13 19 10 10-10 10M29 43h22M38 15h13M38 22h13M38 29h8" /><path d="M22 17h8v8h-8z" /></svg>;
  }
  return <svg {...commonProps}><path d="M15 51h34M20 51V24h24v27M16 24l4-9h24l4 9M27 51V38h10v13M25 30h2M37 30h2" /><path d="M13 15h10M41 15h10" /></svg>;
}

export default function Landing() {
  const { navigate, browseSkill } = useApp();
  const [openMenu, setOpenMenu] = useState<'worker' | 'provider' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [heroSlide, setHeroSlide] = useState<'image' | 'video'>('image');
  const [heroVideoMuted, setHeroVideoMuted] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointerId: number; x: number; scrollLeft: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const changeHeroSlide = (slide: 'image' | 'video', instant = slide === 'image') => {
    const video = heroVideoRef.current;
    if (slide === 'video') {
      if (video) {
        video.muted = true;
        setHeroVideoMuted(true);
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      }
    } else if (video) {
      video.muted = true;
      setHeroVideoMuted(true);
      video.pause();
      video.currentTime = 0;
    }
    setHeroSlide(slide);
    const track = heroTrackRef.current;
    if (track) track.scrollTo({ left: slide === 'video' ? track.clientWidth : 0, behavior: instant ? 'instant' : 'smooth' });
  };

  const toggleHeroVideoSound = () => {
    const video = heroVideoRef.current;
    if (!video) return;
    const nextMuted = !heroVideoMuted;
    video.muted = nextMuted;
    setHeroVideoMuted(nextMuted);
    if (!nextMuted && video.paused) void video.play().catch(() => undefined);
  };

  useEffect(() => {
    if (heroSlide !== 'image') return;
    const timer = window.setTimeout(() => changeHeroSlide('video', false), 5000);
    return () => window.clearTimeout(timer);
  }, [heroSlide]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (query) browseSkill(query);
    else navigate('job-discovery');
  };

  return (
    <div className="landing-page min-h-screen bg-cream">
      <nav
        aria-label="Shram Bazzar landing navigation"
        className="bg-white"
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-5 font-sans text-base font-semibold tracking-tight text-stone-700 sm:px-6 lg:flex-nowrap lg:gap-x-4 xl:gap-x-7 xl:px-0">
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenMenu(openMenu === 'worker' ? null : 'worker')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'worker'}
              className="whitespace-nowrap text-base font-semibold tracking-tight text-primary-ink transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Find work
            </button>
            {openMenu === 'worker' && (
              <div role="menu" className="absolute left-0 top-full z-50 mt-3 min-w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <button onClick={() => { setOpenMenu(null); navigate('login'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary-ink">Login</button>
                <button onClick={() => { setOpenMenu(null); navigate('worker-signup'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary-ink">Register</button>
              </div>
            )}
          </div>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="shrink-0 whitespace-nowrap text-base font-semibold tracking-tight transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            How it works
          </button>
          <button
            onClick={() => document.getElementById('businesses')?.scrollIntoView({ behavior: 'smooth' })}
            className="shrink-0 whitespace-nowrap text-base font-semibold tracking-tight transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            For businesses
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenMenu(openMenu === 'provider' ? null : 'provider')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'provider'}
              className="whitespace-nowrap text-base font-semibold tracking-tight text-primary-ink transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Hire workers
            </button>
            {openMenu === 'provider' && (
              <div role="menu" className="absolute left-0 top-full z-50 mt-3 min-w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <button onClick={() => { setOpenMenu(null); navigate('login'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary-ink">Login</button>
                <button onClick={() => { setOpenMenu(null); navigate('provider-signup'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary-ink">Register</button>
              </div>
            )}
          </div>
          <form onSubmit={handleSearch} className="order-last flex min-w-full items-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 transition-colors focus-within:border-primary focus-within:bg-white sm:order-none sm:ml-auto sm:min-w-0 sm:flex-1 sm:max-w-md lg:max-w-md xl:max-w-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search jobs or skills"
              aria-label="Search jobs or skills"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-stone-800 placeholder:text-stone-400 outline-none"
            />
            <button type="submit" className="ml-2 shrink-0 text-base font-bold tracking-tight text-primary-ink transition-colors hover:text-primary-ink">
              Search
            </button>
          </form>
          <button
            onClick={() => navigate('login')}
            className="shrink-0 whitespace-nowrap text-base font-semibold tracking-tight text-stone-700 transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Login
          </button>
          <button
            onClick={() => navigate('worker-signup')}
            className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-primary-ink transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative mx-auto my-5 w-[calc(100%-2rem)] max-w-[1200px] overflow-hidden rounded-[2rem] bg-stone-900 sm:my-7 sm:w-[calc(100%-3rem)] lg:my-9 lg:w-[calc(100%-5rem)]"
        onTouchStart={event => {
          const touch = event.touches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={event => {
          const start = touchStart.current;
          const touch = event.changedTouches[0];
          touchStart.current = null;
          if (!start || !touch) return;
          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
          changeHeroSlide(deltaX < 0 ? 'video' : 'image');
        }}
        onWheel={event => {
          if (Math.abs(event.deltaX) < 20 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
          changeHeroSlide(event.deltaX > 0 ? 'video' : 'image');
        }}
        onPointerDown={event => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return;
          if (event.target instanceof HTMLElement && event.target.closest('button, a, input')) return;
          const track = heroTrackRef.current;
          if (!track) return;
          dragStart.current = { pointerId: event.pointerId, x: event.clientX, scrollLeft: track.scrollLeft };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const start = dragStart.current;
          const track = heroTrackRef.current;
          if (!start || start.pointerId !== event.pointerId || !track) return;
          track.scrollLeft = start.scrollLeft - (event.clientX - start.x);
        }}
        onPointerUp={event => {
          if (!dragStart.current || dragStart.current.pointerId !== event.pointerId) return;
          dragStart.current = null;
          const track = heroTrackRef.current;
          if (track) changeHeroSlide(track.scrollLeft >= track.clientWidth / 2 ? 'video' : 'image');
        }}
        onPointerCancel={() => { dragStart.current = null; }}
      >
        <div
          ref={heroTrackRef}
          className="absolute inset-0 z-0 flex cursor-grab snap-x snap-mandatory touch-pan-x overflow-x-auto overflow-y-hidden scroll-smooth active:cursor-grabbing [scrollbar-color:rgba(255,255,255,0.45)_rgba(255,255,255,0.12)] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/50 [&::-webkit-scrollbar-track]:bg-white/10"
        >
          <div className="relative h-full w-full shrink-0 snap-always snap-start">
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=800&fit=crop&auto=format"
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full select-none object-cover"
            />
          </div>
          <div className="relative h-full w-full shrink-0 snap-always snap-start">
            <video
              ref={heroVideoRef}
              src={heroVideo}
              muted={heroVideoMuted}
              playsInline
              preload="auto"
              onEnded={() => changeHeroSlide('image', true)}
              aria-label="Shram Bazzar hero video"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-stone-950/90 via-stone-950/70 to-stone-950/45" />
        <div className="relative z-[2] mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28 xl:py-32">
          <div className="max-w-2xl">
            <h1 className="mb-5 font-display text-4xl font-bold leading-tight text-white sm:mb-6 sm:text-5xl lg:text-6xl">
              <span className="font-brand text-5xl font-semibold text-white sm:text-6xl lg:text-7xl xl:text-8xl">Shram Bazzar</span><br />
              <span className="text-primary-light">for Flexible Work</span>
            </h1>
            <p className="mb-7 max-w-xl text-base leading-relaxed text-white/80 sm:mb-9 sm:text-lg">
              Shram Bazzar connects skilled workers with businesses across Nepal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('worker-signup')}
                className="px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-lg"
              >
                Find Flexible Work
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-2 text-sm text-white/70">
              <span>Already have an account?</span>
              <button onClick={() => navigate('login')} className="font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white">
                Sign in
              </button>
            </div>
          </div>
        </div>
        {heroSlide === 'video' && (
          <button
            type="button"
            onClick={toggleHeroVideoSound}
            aria-label={heroVideoMuted ? 'Turn video sound on' : 'Mute video'}
            aria-pressed={!heroVideoMuted}
            className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-stone-950/45 text-white shadow-lg backdrop-blur-sm transition hover:bg-stone-950/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-5 sm:right-6"
          >
            {heroVideoMuted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" /></svg>
            )}
          </button>
        )}
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="font-sans text-3xl font-bold leading-tight tracking-normal text-stone-900 sm:text-4xl lg:text-5xl">
              Find Your Right Work
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {workCategories.map(category => (
              <button
                key={category.label}
                onClick={() => navigate('worker-signup')}
                aria-label={`Find work in ${category.label}`}
                className="group relative flex min-h-36 flex-col items-center justify-center rounded-xl border-2 border-primary-dark bg-[#fff0dd] px-4 py-5 text-center text-primary-ink shadow-[6px_7px_0_0_#68432c] transition-all hover:-translate-y-1 hover:shadow-[8px_9px_0_0_#68432c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <CategoryIcon type={category.icon} />
                <span className="mt-3 font-display text-lg font-semibold leading-tight text-stone-900 transition-colors group-hover:text-primary-ink sm:text-xl">{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <FeaturedOpportunities />

      <section id="how-it-works" className="bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="" title="How Shram Bazzar works" description="Get started in three simple steps." />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Journey title="For workers" steps={workerSteps} action="Create a worker profile" onAction={() => navigate('worker-signup')} />
          <Journey title="For businesses" steps={providerSteps} action="Post a job opening" onAction={() => navigate('provider-signup')} provider />
        </div>
        </div>
      </section>

      <WhyShramaSection />

      <section id="businesses" className="bg-white px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="relative mx-auto flex min-h-80 max-w-[1200px] items-center overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-white shadow-sm sm:px-10 sm:py-16 lg:px-14">
        <svg aria-hidden="true" viewBox="0 0 420 280" fill="none" className="pointer-events-none absolute bottom-0 right-0 hidden h-[74%] w-[38%] max-w-md text-amber-300/75 md:block">
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Three prominent towers only, with simple 3D side planes. */}
            <path d="M40 260V118h105v142M145 260V75h110v185M255 260V118h105v142" />
            <path d="M40 118l24-18h104l-23 18M145 75l25-20h110l-25 20M255 118l25-18h105l-25 18" />
            <path d="M145 75V55h18V39h12V22h4V8h4v14h5v17h11v16M255 75l25-20v143l-25 18M145 75l25-20v143l-25 18M40 118l24-18v143l-24 17" />
            <path d="M65 133h58m-58 26h58m-58 26h58m-58 26h58m-58 26h58M174 91h55m-55 25h55m-55 25h55m-55 25h55m-55 25h55m-55 25h55m-55 25h55M280 133h55m-55 26h55m-55 26h55m-55 26h55m-55 26h55" />
            <path d="M40 260h320" />
          </g>
        </svg>
        <div className="relative w-full">
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tracking-wide text-white">For businesses</p>
            <h2 className="mt-4 font-sans text-4xl font-bold leading-tight sm:text-5xl">Find the right people for your next job</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">Post your opening, connect with skilled workers across Nepal, and manage your hiring in one place.</p>
            <button onClick={() => navigate('provider-signup')} className="mt-8 inline-flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary-ink transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Create your business account <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        </div>
      </section>

      <section className="bg-stone-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-3xl border border-red-900 bg-red-950 p-6 text-white shadow-sm sm:p-10 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div className="flex items-center gap-7 sm:gap-10">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-white/10 text-red-100 ring-8 ring-white/5 sm:h-28 sm:w-28" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" className="h-14 w-14 sm:h-16 sm:w-16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3 27 7v7c0 7-4.7 12.1-11 15-6.3-2.9-11-8-11-15V7l11-4Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 10v8m0 4h.02" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-200">Safety and support</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">See something concerning?</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">If a job seems unsafe or misleading, or asks you to pay upfront, report it. Our team can review the listing.</p>
            </div>
          </div>
          <button onClick={() => navigate('login')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            Report a concern <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <footer className="bg-stone-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div><h2 className="font-brand text-3xl font-semibold">Shram Bazzar</h2><p className="text-sm text-white/50 mt-3 leading-relaxed">Connecting workers and businesses across Nepal.</p></div>
          <FooterGroup title="Get started" items={[['Find work', () => navigate('worker-signup')], ['Hire workers', () => navigate('provider-signup')], ['Sign in', () => navigate('login')]]} />
          <FooterGroup title="Help" items={[['Contact us', () => { window.location.href = 'mailto:support@shrama.com'; }], ['Report a concern', () => navigate('login')], ['Account help', () => navigate('login')]]} />
          <FooterGroup title="Learn more" items={[['Terms of use', () => window.alert('Terms of use are available from Shram Bazzar support.')], ['Privacy', () => window.alert('Your information is saved in this browser.')], ['Kathmandu, Nepal', () => window.scrollTo({ top: 0, behavior: 'smooth' })]]} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-xs text-stone-400 flex flex-col sm:flex-row justify-between gap-2">
          <span>© 2026 Shram Bazzar</span><span>Work and hiring across Nepal</span>
        </div>
      </footer>
    </div>
  );
}

function FeaturedOpportunities() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getFeaturedHimalayasJobs(10, controller.signal)
      .then(listings => setJobs(listings.filter(job => job.providerName.toLowerCase().replace(/[^a-z0-9]/g, '') !== 'aihimalaya')))
      .catch(cause => {
        if (cause.name !== 'AbortError') {
          setError(cause instanceof Error ? cause.message : 'Featured opportunities are temporarily unavailable.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  return (
    <section id="popular-providers" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-12">
        <h2 className="mb-7 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">Popular Providers</h2>
        {loading && jobs.length === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Loading job listings">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[200px] w-full animate-pulse rounded-2xl border border-stone-100 bg-stone-50" />)}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            <span>Listings unavailable</span>
            <button onClick={() => setRetry(value => value + 1)} className="rounded-lg px-3 py-2 font-semibold text-primary-ink transition hover:bg-stone-50">Retry</button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {jobs.map((job, index) => <FeaturedOpportunityCard key={job.id} job={job} index={index} />)}
          </div>
        )}

      </div>
    </section>
  );
}

function FeaturedOpportunityCard({ job, index }: { job: Job; index: number }) {
  return (
    <article
      style={{ animationDelay: `${Math.min(index * 55, 360)}ms`, animationFillMode: 'backwards' }}
      className="group flex h-[200px] w-full min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#91AC67]/60 hover:bg-white hover:shadow-md motion-reduce:animate-none motion-reduce:transition-none animate-fade-in"
    >
      <div className="flex items-start justify-between gap-2">
        <CompanyLogo job={job} />
        {job.externalUrl ? (
          <a href={job.externalUrl} target="_blank" rel="noreferrer" className="group/apply inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-sans text-[13px] font-semibold tracking-tight text-primary-ink transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Apply <span aria-hidden="true" className="text-sm transition-transform duration-200 group-hover/apply:-translate-y-0.5 group-hover/apply:translate-x-0.5">↗</span>
          </a>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 px-2 py-1 font-sans text-[13px] font-semibold tracking-tight text-stone-400">Apply <span aria-hidden="true" className="text-sm">↗</span></span>
        )}
      </div>
      <div className="mt-4 min-w-0">
        <h3 className="line-clamp-2 font-sans text-[15px] font-semibold leading-[1.25] tracking-tight text-stone-900">{job.providerName}</h3>
        {job.externalCategory && <p className="mt-1.5 line-clamp-2 font-sans text-[13px] font-medium leading-[1.4] tracking-[0.005em] text-stone-600">{job.externalCategory}</p>}
      </div>
      <span className="mt-auto inline-flex w-fit px-2.5 py-1 font-sans text-xs font-semibold tracking-tight text-[#597928]">Remote</span>
    </article>
  );
}

function CompanyLogo({ job }: { job: Job }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = job.providerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm ring-2 ring-stone-50 transition-transform duration-300 group-hover:scale-105">
      {job.providerLogo && !imageFailed ? (
        <img
          src={job.providerLogo}
          alt={`${job.providerName} logo`}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <span aria-hidden="true" className="flex h-full w-full items-center justify-center bg-primary-50 font-sans text-sm font-bold tracking-wide text-primary-ink">
          {initials}
        </span>
      )}
    </div>
  );
}

function WhyShramaSection() {
  return (
    <section className="bg-white px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">Why Shram Bazzar?</h2>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, dark = false }: { eyebrow: string; title: string; description: string; dark?: boolean }) {
  return <div className="max-w-2xl">{eyebrow && <p className="text-xs uppercase tracking-[0.16em] font-semibold text-primary-ink">{eyebrow}</p>}<h2 className={`font-display text-3xl md:text-4xl font-bold ${eyebrow ? 'mt-3' : ''} ${dark ? 'text-white' : 'text-stone-900'}`}>{title}</h2><p className={`mt-3 leading-relaxed ${dark ? 'text-white/60' : 'text-stone-500'}`}>{description}</p></div>;
}

function Journey({ title, steps, action, onAction, provider = false }: { title: string; steps: string[][]; action: string; onAction: () => void; provider?: boolean }) {
  return (
    <div className={`rounded-2xl p-7 shadow-sm sm:p-9 ${provider ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'}`}>
      <h3 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">{title}</h3>
      <div className="mt-8 space-y-7">
        {steps.map(([number, step, detail]) => (
          <div key={number} className="grid grid-cols-[2.75rem_1fr] gap-4">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full font-sans text-xl font-extrabold leading-none tracking-tight ring-1 sm:text-2xl ${provider ? 'bg-white/10 text-white ring-white/15' : 'bg-primary-50 text-primary-ink ring-primary-100'}`}>
              {number}
            </span>
            <div>
              <h4 className="font-sans text-lg font-bold leading-snug tracking-tight sm:text-xl">{step}</h4>
              <p className={`mt-1.5 font-sans text-sm leading-relaxed sm:text-base ${provider ? 'text-white/65' : 'text-stone-500'}`}>{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onAction}
        className={`mt-9 rounded-xl px-5 py-3.5 text-sm font-bold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:text-base ${provider ? 'bg-white text-stone-900 hover:bg-stone-100' : 'bg-primary text-white hover:bg-primary-dark'}`}
      >
        {action}
      </button>
    </div>
  );
}

function FooterGroup({ title, items }: { title: string; items: [string, () => void][] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><div className="mt-4 space-y-3">{items.map(([label, action]) => <button key={label} onClick={action} className="block text-sm text-white/55 hover:text-white">{label}</button>)}</div></div>;
}
