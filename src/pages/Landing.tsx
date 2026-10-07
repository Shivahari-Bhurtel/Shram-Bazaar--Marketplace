import { useRef, useState, type FormEvent } from 'react';
import { useApp } from '../store/AppContext';
import heroVideo from '../assets/hero/gemini_generated_video_f3c61e6d.mp4';

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

export default function Landing() {
  const { navigate, state, browseSkill } = useApp();
  const [openMenu, setOpenMenu] = useState<'worker' | 'provider' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [heroSlide, setHeroSlide] = useState<'image' | 'video'>('image');
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointerId: number; x: number; scrollLeft: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const changeHeroSlide = (slide: 'image' | 'video') => {
    const video = heroVideoRef.current;
    if (slide === 'video') {
      if (video) {
        video.volume = 1;
        video.muted = false;
        void video.play().catch(() => undefined);
      }
    } else if (video) {
      video.muted = true;
      video.pause();
    }
    setHeroSlide(slide);
    const track = heroTrackRef.current;
    if (track) track.scrollTo({ left: slide === 'video' ? track.clientWidth : 0, behavior: 'smooth' });
  };

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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-3 px-4 py-4 font-sans text-[15px] font-semibold tracking-tight text-stone-700 sm:px-6">
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenMenu(openMenu === 'worker' ? null : 'worker')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'worker'}
              className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-primary transition-colors hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Find work
            </button>
            {openMenu === 'worker' && (
              <div role="menu" className="absolute left-0 top-full z-50 mt-3 min-w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <button onClick={() => { setOpenMenu(null); navigate('login'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Login</button>
                <button onClick={() => { setOpenMenu(null); navigate('worker-signup'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Register</button>
              </div>
            )}
          </div>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            How it works
          </button>
          <button
            onClick={() => document.getElementById('businesses')?.scrollIntoView({ behavior: 'smooth' })}
            className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            For businesses
          </button>
          <div className="relative shrink-0">
            <button
              onClick={() => setOpenMenu(openMenu === 'provider' ? null : 'provider')}
              aria-haspopup="menu"
              aria-expanded={openMenu === 'provider'}
              className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-primary transition-colors hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Hire workers
            </button>
            {openMenu === 'provider' && (
              <div role="menu" className="absolute left-0 top-full z-50 mt-3 min-w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                <button onClick={() => { setOpenMenu(null); navigate('login'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Login</button>
                <button onClick={() => { setOpenMenu(null); navigate('provider-signup'); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-primary">Register</button>
              </div>
            )}
          </div>
          <form onSubmit={handleSearch} className="order-last flex min-w-full items-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 transition-colors focus-within:border-primary focus-within:bg-white sm:order-none sm:ml-auto sm:min-w-0 sm:flex-1 sm:max-w-xs lg:max-w-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Search jobs or skills"
              aria-label="Search jobs or skills"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-stone-800 placeholder:text-stone-400 outline-none"
            />
            <button type="submit" className="ml-2 shrink-0 text-[15px] font-bold tracking-tight text-primary transition-colors hover:text-primary-dark">
              Search
            </button>
          </form>
          <button
            onClick={() => navigate('login')}
            className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight text-stone-700 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Login
          </button>
          <button
            onClick={() => navigate('worker-signup')}
            className="shrink-0 whitespace-nowrap text-[15px] font-bold tracking-tight text-primary transition-colors hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative mx-3 my-4 overflow-hidden rounded-[2rem] bg-stone-900 sm:mx-6 lg:mx-10"
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
              muted
              playsInline
              loop
              preload="auto"
              aria-label="Shram Bazzar hero video"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-stone-950/90 via-stone-950/70 to-stone-950/45" />
        <div className="relative z-[2] max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              <span className="font-brand text-6xl sm:text-7xl lg:text-8xl font-semibold">Shram Bazzar</span><br />
              <span className="text-primary-light">for Flexible Work</span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed mb-10 max-w-xl">
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
            <p className="mt-4 text-white/50 text-sm">
              Already have an account?{' '}
              <button onClick={() => navigate('login')} className="text-white/80 hover:text-white">
                Sign in
              </button>
            </p>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3" role="group" aria-label="Choose hero background">
          <button
            type="button"
            onClick={() => changeHeroSlide('image')}
            aria-label="Show image background"
            aria-pressed={heroSlide === 'image'}
            className={`h-3 w-3 rounded-full shadow-sm ring-offset-2 ring-offset-stone-900/40 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${heroSlide === 'image' ? 'bg-white ring-2 ring-white/70' : 'bg-white/50 hover:bg-white/80'}`}
          />
          <button
            type="button"
            onClick={() => changeHeroSlide('video')}
            aria-label="Show video background"
            aria-pressed={heroSlide === 'video'}
            className={`h-3 w-3 rounded-full shadow-sm ring-offset-2 ring-offset-stone-900/40 transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${heroSlide === 'video' ? 'bg-white ring-2 ring-white/70' : 'bg-white/50 hover:bg-white/80'}`}
          />
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="font-sans text-3xl font-bold leading-tight tracking-normal text-stone-900 sm:text-4xl lg:text-5xl">
              Find Your right work
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Professional & Qualified',
              'Skilled Work',
              'Hospitality & Food',
              'Retail & Sales',
              'Events & Temporary',
              'Delivery & Logistics',
              'Digital & Creative',
              'Construction & Maintenance',
            ].map(category => (
              <button
                key={category}
                onClick={() => navigate('worker-signup')}
                className="group flex min-h-24 items-center justify-between rounded-2xl border-l-4 border-primary bg-white px-5 py-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:px-6"
              >
                <span className="font-display text-lg font-semibold leading-snug text-stone-800 transition-colors group-hover:text-primary sm:text-xl">{category}</span>
                <span className="ml-3 text-xl text-stone-300 transition-all group-hover:translate-x-1 group-hover:text-primary">→</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {state.allProviderProfiles.length > 0 && <section id="popular-providers" className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Popular Providers
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {state.allProviderProfiles.slice(0, 4).map(provider => (
                <article key={provider.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-50 text-lg font-semibold text-primary">
                      {provider.logo ? (
                        <img src={provider.logo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        provider.orgName.slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-semibold text-stone-900">{provider.orgName}</h3>
                      <p className="mt-1 text-xs text-stone-500">{provider.industry}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3 pt-4 text-xs text-stone-500">
                    <span>{provider.district}</span>
                  </div>
                </article>
            ))}
          </div>
        </div>
      </section>}

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

      <section id="businesses" className="relative overflow-hidden bg-primary text-white">
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
        <div className="relative mx-auto flex min-h-80 max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tracking-wide text-white">For businesses</p>
            <h2 className="mt-4 font-sans text-4xl font-bold leading-tight sm:text-5xl">Find the right people for your next job</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">Post your opening, connect with skilled workers across Nepal, and manage your hiring in one place.</p>
            <button onClick={() => navigate('provider-signup')} className="mt-8 inline-flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Create your business account <span aria-hidden="true">→</span>
            </button>
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
  return <div className="max-w-2xl">{eyebrow && <p className="text-xs uppercase tracking-[0.16em] font-semibold text-primary">{eyebrow}</p>}<h2 className={`font-display text-3xl md:text-4xl font-bold ${eyebrow ? 'mt-3' : ''} ${dark ? 'text-white' : 'text-stone-900'}`}>{title}</h2><p className={`mt-3 leading-relaxed ${dark ? 'text-white/60' : 'text-stone-500'}`}>{description}</p></div>;
}

function Journey({ title, steps, action, onAction, provider = false }: { title: string; steps: string[][]; action: string; onAction: () => void; provider?: boolean }) {
  return (
    <div className={`rounded-2xl p-7 shadow-sm sm:p-9 ${provider ? 'bg-stone-900 text-white' : 'bg-white text-stone-900'}`}>
      <h3 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">{title}</h3>
      <div className="mt-8 space-y-7">
        {steps.map(([number, step, detail]) => (
          <div key={number} className="grid grid-cols-[2.75rem_1fr] gap-4">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full font-sans text-xl font-extrabold leading-none tracking-tight ring-1 sm:text-2xl ${provider ? 'bg-white/10 text-white ring-white/15' : 'bg-primary-50 text-primary ring-primary-100'}`}>
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
