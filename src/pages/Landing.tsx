import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useApp } from '../store/AppContext';
import heroVideo from '../assets/hero/gemini_generated_video_f3c61e6d.mp4';
import heroAudio from '../assets/hero/gemini_generated_video_f3c61e6d.mp3';
import { getFeaturedHimalayasJobs } from '../services/himalayas';
import type { Job } from '../types';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';

type JourneyAudience = 'worker' | 'business';

const journeyImages: Record<JourneyAudience, string[]> = {
  worker: [
    'worker-profile-guide.jpeg',
    'worker-job-search-guide.jpeg',
    'worker-application-guide.jpeg',
    'worker-work-record-guide.jpeg',
  ],
  business: [
    'business-profile-guide.jpeg',
    'business-job-post-guide.jpeg',
    'business-applicant-review-guide.jpeg',
    'business-hiring-decision-guide.jpeg',
  ],
};

const journeySteps: Record<JourneyAudience, { title: string; detail: string; points: string[] }[]> = {
  worker: [
    { title: 'Build Your Profile', detail: 'Give employers a clear picture of your experience, skills, and availability.', points: ['Add your district and contact details', 'List your trade skills and expected daily pay', 'Include work history or references'] },
    { title: 'Find Work That Fits', detail: 'Search for openings that match your location and availability.', points: ['Choose your district or municipality', 'Filter by trade, schedule, and work type', 'Compare pay before you apply'] },
    { title: 'Apply and Track Progress', detail: 'Send an application and follow its status from your account.', points: ['Review the role details before applying', 'Keep your application information current', 'Check for employer updates'] },
    { title: 'Build Your Work Record', detail: 'Keep your experience current as you complete work.', points: ['Add completed work to your history', 'Collect feedback from employers', 'Use your updated profile for future roles'] },
  ],
  business: [
    { title: 'Set Up Your Business Profile', detail: 'Introduce your business and give workers a clear way to reach you.', points: ['Add business and contact details', 'Share the type of work you offer', 'Keep your workplace locations current'] },
    { title: 'Post a Clear Job Opening', detail: 'Give applicants the information they need to decide if the role fits.', points: ['Describe the work and required skills', 'Set the location and schedule', 'State the pay and how it is calculated'] },
    { title: 'Review Applicants', detail: 'Compare applicants’ skills and work history for the role.', points: ['Read profiles and experience', 'Shortlist suitable applicants', 'Contact people to discuss next steps'] },
    { title: 'Manage Your Hiring', detail: 'Keep applications organized and let candidates know where they stand.', points: ['Track applicants in one place', 'Update application decisions', 'Record completed hiring steps'] },
  ],
};

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

function CategoryIcon({ type, className = 'h-20 w-20' }: { type: (typeof workCategories)[number]['icon']; className?: string }) {
  const commonProps = {
    viewBox: '0 0 64 64',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  if (type === 'professional') {
    return <svg {...commonProps}><path d="m8 29 9-15 12 6-8 15-13-6ZM56 29l-9-15-12 6 8 15 13-6Z" /><path d="m21 33 7-7c2-2 5-2 7 0l3 3 4-2 9 10-8 9c-2 2-5 2-7 0L21 33Z" /><path d="m27 36-4 5m10-2-5 6m11-3-4 5M32 5v5m-8-2 3 4m13-4-3 4" /></svg>;
  }
  if (type === 'skilled') {
    return <svg {...commonProps}><path d="m12 48 24-24m-4-7 7-7 9 2-2 9-7 7-7-7 7-7m-20 29 4 4" /><path d="m15 16 5-5 10 10-5 5M8 50l6 6 7-7-6-6-7 7Z" /><path d="M35 40h17v14H35zM39 40v-5h9v5" /></svg>;
  }
  if (type === 'hospitality') {
    return <svg {...commonProps}><path d="M10 39h44M15 39c1-12 8-19 22-19s20 7 21 19M19 46h29M24 52h19" /><path d="M31 18a11 11 0 1 1 22 0M36 18h12M42 12v6" /><path d="M16 39v5m9-5v5m9-5v5m9-5v5m9-5v5" /></svg>;
  }
  if (type === 'retail') {
    return <svg {...commonProps}><path d="M10 28h44l-4-12H14l-4 12Z" /><path d="M13 28v27h38V28M10 28c0 5 8 5 8 0 0 5 8 5 8 0 0 5 8 5 8 0 0 5 8 5 8 0 0 5 8 5 8 0" /><path d="M20 55V39h11v16m7-16h8v9h-8zM27 10a6 6 0 1 1 12 0m-14 0h16" /></svg>;
  }
  if (type === 'events') {
    return <svg {...commonProps}><path d="M8 27 32 9l24 18M13 27h38M16 27v28m32-28v28M27 55V39h10v16M10 55h44" /><path d="M22 27v28m20-28v28" /></svg>;
  }
  if (type === 'delivery') {
    return <svg {...commonProps}><path d="M6 29h32v18H6zM38 35h9l9 9v3H38zM13 47a4 4 0 1 0 8 0m22 0a4 4 0 1 0 8 0M43 35v9h13M11 24h17" /><path d="M25 16 36 8l11 8-11 8-11-8Z" /><path d="M30 14v8m6-11v8m6-5v8" /></svg>;
  }
  if (type === 'digital') {
    return <svg {...commonProps}><path d="M9 35V20h13c0-5 8-5 8 0h12v12c5 0 5 8 0 8v9H29c0-5-8-5-8 0H9V35Z" /><path d="M29 20v8m13 4h-8m-13 8v9m8-14h7" /><path d="m46 14 10-7-1 12-3-3-6 7-4-4 7-6-3-3Z" /></svg>;
  }
  return <svg {...commonProps}><path d="M11 55V18h42v37M7 18h50M17 25h30M17 32h30M17 39h30M17 46h30M18 55V46m10 9V46m10 9V46m10 9V46" /><path d="M32 18V8m0 0h17m-4 0v10m4-10 8 5" /><path d="M26 8h12" /></svg>;
}

function useScrollReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIsVisible(entry.isIntersecting);
    }, { threshold: 0.16, rootMargin: '-6% 0px -6% 0px' });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    className: `scroll-reveal${isVisible ? ' is-visible' : ''}`,
    style: { transitionDelay: isVisible ? `${delay}ms` : '0ms' },
  };
}

function WorkCategoryCard({ category, index, onSelect }: { category: (typeof workCategories)[number]; index: number; onSelect: () => void }) {
  const isDark = [0, 2, 5, 7].includes(index);

  return (
    <button
      onClick={onSelect}
      aria-label={`Find work in ${category.label}`}
      className={`group relative flex aspect-[0.9] flex-col items-center justify-center overflow-hidden rounded-2xl px-3 py-7 text-center transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5E3122] sm:px-4 ${isDark ? 'bg-[#5E3122] text-[#FFF1DF]' : 'bg-[#FFF0DD] text-[#5E3122]'}`}
    >
      <span className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full ${isDark ? 'bg-[#FFF1DF] text-[#5E3122]' : 'bg-[#5E3122] text-[#FFF1DF]'}`} aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M8 3v10M3 8h10" /></svg>
      </span>
      <CategoryIcon type={category.icon} className="h-[4.5rem] w-[4.5rem] shrink-0 sm:h-20 sm:w-20 2xl:h-[5.5rem] 2xl:w-[5.5rem] min-[1800px]:h-24 min-[1800px]:w-24" />
      <span className={`mt-3 max-w-[12ch] text-lg font-medium leading-[1.08] transition-opacity group-hover:opacity-85 sm:text-xl xl:text-[1.35rem] 2xl:mt-4 2xl:text-2xl min-[1800px]:mt-5 min-[1800px]:text-2xl ${isDark ? 'text-[#FFF5E9]' : 'text-black'}`} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{category.label}</span>
    </button>
  );
}

const workCategoryHotspots = [
  { left: '24.4%', top: '13.9%' },
  { left: '42.6%', top: '13.9%' },
  { left: '60.8%', top: '13.9%' },
  { left: '79.1%', top: '13.9%' },
  { left: '24.4%', top: '49.8%' },
  { left: '42.6%', top: '49.8%' },
  { left: '60.8%', top: '49.8%' },
  { left: '79.1%', top: '49.8%' },
];

function FindWorkArtwork({ onSelect }: { onSelect: (index: number) => void }) {
  return (
    <div className="relative mx-auto hidden w-full max-w-[1280px] xl:block">
      <img
        src={`${import.meta.env.BASE_URL}images/landing/find-your-right-work.svg`}
        alt=""
        aria-hidden="true"
        className="block h-auto w-full"
      />
      {workCategories.map((category, index) => (
        <button
          key={category.label}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Find work in ${category.label}`}
          className="absolute h-[33.5%] w-[16.9%] cursor-pointer rounded-xl focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
          style={{ ...workCategoryHotspots[index] }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const { navigate, browseSkill } = useApp();
  const [openMenu, setOpenMenu] = useState<'worker' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [journeyAudience, setJourneyAudience] = useState<JourneyAudience>('worker');
  const [heroSlide, setHeroSlide] = useState<'image' | 'video'>('image');
  const [heroAudioMuted, setHeroAudioMuted] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroAudioRef = useRef<HTMLAudioElement>(null);
  const workerMenuRef = useRef<HTMLDivElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointerId: number; x: number; scrollLeft: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleJourneyTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextTab: JourneyAudience = event.key === 'Home' ? 'worker' : event.key === 'End' ? 'business' : journeyAudience === 'worker' ? 'business' : 'worker';
    setJourneyAudience(nextTab);
    document.getElementById(`journey-${nextTab}-tab`)?.focus();
  };

  useDismissOnOutside(openMenu === 'worker', [workerMenuRef], () => setOpenMenu(null));

  useEffect(() => {
    const audio = heroAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    return () => audio.pause();
  }, []);

  const changeHeroSlide = (slide: 'image' | 'video', instant = slide === 'image') => {
    const video = heroVideoRef.current;
    const audio = heroAudioRef.current;
    if (slide === 'video') {
      if (video) {
        video.muted = true;
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      }
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        if (!heroAudioMuted) {
          audio.volume = 1;
          void audio.play().catch(() => setHeroAudioMuted(true));
        }
      }
    } else if (video) {
      video.muted = true;
      video.pause();
      video.currentTime = 0;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    setHeroSlide(slide);
    const track = heroTrackRef.current;
    if (track) track.scrollTo({ left: slide === 'video' ? track.clientWidth : 0, behavior: instant ? 'instant' : 'smooth' });
  };

  const toggleHeroAudio = () => {
    const audio = heroAudioRef.current;
    const video = heroVideoRef.current;
    if (!audio || !video) return;
    const nextMuted = !heroAudioMuted;
    setHeroAudioMuted(nextMuted);
    audio.volume = nextMuted ? 0 : 1;
    if (!nextMuted && audio.paused) {
      audio.currentTime = video.currentTime;
      if (video.paused) void video.play().catch(() => undefined);
      void audio.play().catch(() => setHeroAudioMuted(true));
    } else if (nextMuted) {
      audio.pause();
    }
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
    <div className="landing-page min-h-screen bg-white">
      <div className="flex min-h-screen flex-col gap-6 sm:gap-7">
      <nav
        aria-label="Shram Bazzar landing navigation"
        className="shrink-0 bg-white"
      >
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 font-sans text-sm font-semibold tracking-tight text-stone-700 sm:px-6 sm:py-5 sm:text-base lg:flex-nowrap lg:gap-x-5 xl:gap-x-8 xl:px-0 2xl:max-w-[1450px] 2xl:text-base min-[1800px]:max-w-[1600px] min-[1800px]:gap-x-9 min-[1800px]:text-lg">
          <div ref={workerMenuRef} className="relative shrink-0">
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
          <button
            onClick={() => {
              setOpenMenu(null);
              setJourneyAudience('business');
              window.requestAnimationFrame(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }));
            }}
            className="shrink-0 whitespace-nowrap text-base font-semibold tracking-tight text-primary-ink transition-colors hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Hire workers
          </button>
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

      <aside className="mx-auto flex w-[calc(100%-2rem)] max-w-[1280px] shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl bg-[#F3E4D9] px-5 py-4 text-center text-base text-[#5E3122] sm:w-[calc(100%-3rem)] sm:justify-between sm:px-7 sm:py-5 sm:text-lg lg:w-[calc(100%-5rem)] lg:px-9 lg:py-5 2xl:max-w-[1450px] min-[1800px]:max-w-[1600px] min-[1800px]:px-10 min-[1800px]:py-6">
        <p className="font-medium leading-snug sm:text-xl 2xl:text-2xl min-[1800px]:text-2xl">Get connected with local personnel for your everyday business and service needs</p>
        <button
          onClick={() => navigate('provider-signup')}
          className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b border-[#8C3D2B]/70 pb-1 text-lg font-semibold tracking-tight text-[#8C3D2B] transition-colors hover:border-[#713121] hover:text-[#713121] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8C3D2B] sm:text-xl 2xl:text-2xl min-[1800px]:text-2xl"
        >
          <span>Get started</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1">
            <path d="M3.5 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </aside>

      {/* Hero */}
      <section
        className="relative mx-auto mb-8 mt-0 min-h-[38rem] w-[calc(100%-2rem)] max-w-[1280px] overflow-hidden rounded-[2rem] bg-stone-900 sm:mb-12 sm:min-h-[40rem] sm:w-[calc(100%-3rem)] lg:w-[calc(100%-3rem)] 2xl:min-h-[46rem] 2xl:max-w-[1450px] min-[1800px]:max-w-[1600px]"
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
              preload="auto"
              onTimeUpdate={event => {
                const audio = heroAudioRef.current;
                if (audio && Math.abs(audio.currentTime - event.currentTarget.currentTime) > 0.3) {
                  audio.currentTime = event.currentTarget.currentTime;
                }
              }}
              onEnded={() => changeHeroSlide('image', true)}
              aria-label="Shram Bazzar hero video"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <audio
          ref={heroAudioRef}
          src={heroAudio}
          preload="auto"
          className="hidden"
        />
        {heroSlide === 'video' && (
          <div className="absolute bottom-4 right-4 z-20 sm:bottom-5 sm:right-6">
            <button
              type="button"
              onClick={toggleHeroAudio}
              aria-label={heroAudioMuted ? 'Turn video sound on' : 'Mute video sound'}
              aria-pressed={!heroAudioMuted}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-stone-950/55 text-white shadow-sm backdrop-blur-sm transition hover:bg-stone-950/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {heroAudioMuted ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" /></svg>
              )}
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-stone-950/90 via-stone-950/70 to-stone-950/45" />
        <div className="relative z-[2] mx-auto flex h-full min-h-[38rem] max-w-[1280px] items-center px-5 py-20 sm:min-h-[40rem] sm:px-8 sm:py-24 lg:px-10 lg:py-28 2xl:min-h-[46rem] 2xl:max-w-[1450px] 2xl:px-12 min-[1800px]:max-w-[1600px] min-[1800px]:px-14">
          <div className="max-w-2xl">
            <h1 className="mb-5 font-display text-4xl font-bold leading-tight text-white sm:mb-6 sm:text-5xl lg:text-6xl 2xl:text-[4.5rem] min-[1800px]:text-7xl">
              <span className="font-brand text-5xl font-semibold text-white sm:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[7.5rem] min-[1800px]:text-[7.5rem]">Shram Bazzar</span><br />
              <span className="text-primary-light">for Flexible Work</span>
            </h1>
            <p className="mb-7 max-w-xl text-base leading-relaxed text-white/80 sm:mb-9 sm:text-lg 2xl:max-w-2xl 2xl:text-xl min-[1800px]:text-xl">
              Shram Bazzar connects skilled workers with businesses across Nepal.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('login')}
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
      </section>
      </div>

      <section className="bg-white px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:pt-24">
        <div className="mx-auto max-w-[1280px] 2xl:max-w-[1400px] min-[1800px]:max-w-[1600px]">
          <div className="grid items-center gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:hidden">
            <div>
              <h2 className="grid text-[3.25rem] font-bold leading-[0.98] tracking-tight text-black sm:text-6xl lg:text-7xl" style={{ fontFamily: '"TeX Gyre Termes", "Times New Roman", serif' }}>
                <span>Find</span>
                <span>Your</span>
                <span>Right</span>
                <span>Work</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 lg:gap-5">
              {workCategories.map((category, index) => <WorkCategoryCard key={category.label} category={category} index={index} onSelect={() => navigate('worker-signup')} />)}
            </div>
          </div>
          <FindWorkArtwork onSelect={() => navigate('worker-signup')} />
        </div>
      </section>

      <FeaturedOpportunities />

      <section id="how-it-works" className="bg-white px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1400px] min-[1800px]:max-w-[1600px]">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 flex items-center justify-center">
              <h2 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl" style={{ fontFamily: '"TeX Gyre Termes", "Times New Roman", serif' }}>How Shram Bazzar Works</h2>
            </div>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">Simple steps to find work and hire local talent across Nepal.</p>
          </div>

          <div className="mx-auto mt-10 flex w-full max-w-xl gap-1 rounded-full border border-[#E8DDD2] bg-[#FAF8F5] p-1" role="tablist" aria-label="Choose how you use Shram Bazzar">
            <button
              id="journey-worker-tab"
              type="button"
              role="tab"
              aria-selected={journeyAudience === 'worker'}
              tabIndex={journeyAudience === 'worker' ? 0 : -1}
              aria-controls="journey-panel"
              onClick={() => setJourneyAudience('worker')}
              onKeyDown={handleJourneyTabKeyDown}
              className={`flex min-h-10 flex-1 flex-col items-center justify-center rounded-full px-2 py-0 text-center transition-all sm:px-4 ${journeyAudience === 'worker' ? 'bg-[#FFF0DD] text-[#5E3122] shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <span className="text-lg font-semibold leading-5 sm:text-xl sm:leading-5">For Workers</span>
              <span className="text-xs font-normal leading-4 opacity-80 sm:text-sm">Job Seekers</span>
            </button>
            <button
              id="journey-business-tab"
              type="button"
              role="tab"
              aria-selected={journeyAudience === 'business'}
              tabIndex={journeyAudience === 'business' ? 0 : -1}
              aria-controls="journey-panel"
              onClick={() => setJourneyAudience('business')}
              onKeyDown={handleJourneyTabKeyDown}
              className={`flex min-h-10 flex-1 flex-col items-center justify-center rounded-full px-2 py-0 text-center transition-all sm:px-4 ${journeyAudience === 'business' ? 'bg-[#5E3122] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
            >
              <span className="text-lg font-semibold leading-5 sm:text-xl sm:leading-5">For Businesses</span>
              <span className="text-xs font-normal leading-4 opacity-80 sm:text-sm">Employers</span>
            </button>
          </div>

          <div id="journey-panel" role="tabpanel" aria-labelledby={journeyAudience === 'worker' ? 'journey-worker-tab' : 'journey-business-tab'} key={journeyAudience} className={`${journeyAudience === 'worker' ? 'journey-panel-enter' : ''} mt-8 grid gap-x-8 gap-y-10 xl:grid-cols-2 xl:gap-x-14 xl:gap-y-14`}>
            {journeySteps[journeyAudience].map((step, index) => <JourneyStepCard key={`${journeyAudience}-${step.title}`} step={step} index={index} audience={journeyAudience} />)}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate(journeyAudience === 'worker' ? 'worker-signup' : 'provider-signup')}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold shadow-sm transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 ${journeyAudience === 'worker' ? 'bg-[#FFF0DD] text-[#5E3122] hover:bg-[#F3E4D2] focus-visible:outline-[#8B5E3C]' : 'bg-[#5E3122] text-white hover:bg-[#4C281D] focus-visible:outline-[#5E3122]'}`}
            >
              {journeyAudience === 'worker' ? 'Create Worker Profile' : 'Post a Job Opening'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <WhyShramaSection />

      <section id="businesses" className="bg-white px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:pb-12">
        <div className="relative mx-auto flex min-h-80 max-w-[1200px] items-center overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-white shadow-sm sm:px-10 sm:py-16 lg:px-14 2xl:max-w-[1400px] min-[1800px]:min-h-[26rem] min-[1800px]:max-w-[1500px] min-[1800px]:px-16">
        <svg aria-hidden="true" viewBox="0 0 420 280" fill="none" className="pointer-events-none absolute bottom-0 right-0 hidden h-[74%] w-[32%] max-w-md text-amber-300/75 xl:block">
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
          <div className="relative z-10 max-w-[42rem]">
            <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tracking-wide text-white">For businesses</p>
            <h2 className="mt-4 font-sans text-4xl font-bold leading-tight sm:text-5xl">Finds the right people for your next job</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">Post your opening, connect with skilled workers across Nepal, and manage your hiring in one place.</p>
            <button onClick={() => navigate('provider-signup')} className="mt-8 inline-flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary-ink transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Create your business account <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-3xl border border-red-900 bg-red-950 p-6 text-white shadow-sm sm:p-10 lg:grid-cols-[1fr_auto] lg:gap-12 2xl:max-w-[1400px] min-[1800px]:max-w-[1600px] min-[1800px]:p-12">
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
        <div className="max-w-7xl 2xl:max-w-[1400px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-10 min-[1800px]:gap-14">
          <div><h2 className="font-brand text-3xl font-semibold">Shram Bazzar</h2><p className="text-sm text-white/50 mt-3 leading-relaxed">Connecting workers and businesses across Nepal.</p></div>
          <FooterGroup title="Get started" items={[['Find work', () => navigate('worker-signup')], ['Hire workers', () => navigate('provider-signup')], ['Sign in', () => navigate('login')]]} />
          <FooterGroup title="Help" items={[['Contact us', () => { window.location.href = 'mailto:support@shrama.com'; }], ['Report a concern', () => navigate('login')], ['Account help', () => navigate('login')]]} />
          <FooterGroup title="Learn more" items={[['Terms of use', () => window.alert('Terms of use are available from Shram Bazzar support.')], ['Privacy', () => window.alert('Your information is saved in this browser.')], ['Kathmandu, Nepal', () => window.scrollTo({ top: 0, behavior: 'smooth' })]]} />
        </div>
        <div className="max-w-7xl 2xl:max-w-[1400px] min-[1800px]:max-w-[1600px] mx-auto px-4 sm:px-6 py-6 text-xs text-stone-400 flex flex-col sm:flex-row justify-between gap-2">
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
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 2xl:max-w-[1400px] 2xl:pt-20 min-[1800px]:max-w-[1600px] min-[1800px]:px-8">
        <h2 className="mb-9 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:mb-10 sm:text-4xl 2xl:text-[2.75rem] min-[1800px]:mb-12 min-[1800px]:text-5xl">Popular Providers</h2>
        {loading && jobs.length === 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:auto-rows-[16rem] xl:auto-rows-[17rem] 2xl:auto-rows-[18rem]" aria-label="Loading job listings">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className={`min-h-[220px] w-full animate-pulse rounded-[1.5rem] ${providerTileColors[index % providerTileColors.length].skeleton}`} />)}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            <span>Listings unavailable</span>
            <button onClick={() => setRetry(value => value + 1)} className="rounded-lg px-3 py-2 font-semibold text-primary-ink transition hover:bg-stone-50">Retry</button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:auto-rows-[16rem] xl:auto-rows-[17rem] 2xl:auto-rows-[18rem] 2xl:gap-6">
            {jobs.map((job, index) => <FeaturedOpportunityCard key={job.id} job={job} index={index} />)}
          </div>
        )}

      </div>
    </section>
  );
}

const providerTileColors = [
  { card: 'bg-[#F0EFE8] text-[#282A24]', logo: 'bg-white text-[#58782A]', action: 'bg-[#58782A] text-white hover:bg-[#405D1B]', skeleton: 'bg-[#F0EFE8]' },
  { card: 'bg-[#536F2C] text-white', logo: 'bg-white/15 text-white', action: 'bg-white text-[#405D1B] hover:bg-[#F0EFE8]', skeleton: 'bg-[#536F2C]/20' },
  { card: 'bg-[#E8EEDD] text-[#2F3A25]', logo: 'bg-white text-[#58782A]', action: 'bg-[#58782A] text-white hover:bg-[#405D1B]', skeleton: 'bg-[#E8EEDD]' },
  { card: 'bg-[#F4F3EC] text-[#2F3429]', logo: 'bg-white text-[#58782A]', action: 'bg-[#58782A] text-white hover:bg-[#405D1B]', skeleton: 'bg-[#F4F3EC]' },
  { card: 'bg-[#81465A] text-white', logo: 'bg-white/15 text-white', action: 'bg-white text-[#71384C] hover:bg-[#F8F2F4]', skeleton: 'bg-[#81465A]/20' },
  { card: 'bg-[#E8EEDD] text-[#2F3A25]', logo: 'bg-white text-[#58782A]', action: 'bg-[#58782A] text-white hover:bg-[#405D1B]', skeleton: 'bg-[#E8EEDD]' },
  { card: 'bg-[#536F2C] text-white', logo: 'bg-white/15 text-white', action: 'bg-white text-[#405D1B] hover:bg-[#F0EFE8]', skeleton: 'bg-[#536F2C]/20' },
  { card: 'bg-[#F4F3EC] text-[#2F3429]', logo: 'bg-white text-[#58782A]', action: 'bg-[#58782A] text-white hover:bg-[#405D1B]', skeleton: 'bg-[#F4F3EC]' },
];

function conciseLocation(location: string) {
  const cleanLocation = location.trim().replace(/\s+/g, ' ');
  if (!cleanLocation) return 'Worldwide remote';
  if (cleanLocation.length <= 34 || /worldwide remote/i.test(cleanLocation)) return cleanLocation;
  const locations = cleanLocation.split(',').map(part => part.trim()).filter(Boolean);
  if (locations.length > 1) return `${locations.slice(0, 2).join(', ')} + more`;
  return cleanLocation;
}

function FeaturedOpportunityCard({ job, index }: { job: Job; index: number }) {
  const colors = providerTileColors[index % providerTileColors.length];
  const location = conciseLocation(job.location);
  const reveal = useScrollReveal<HTMLElement>((index % 4) * 70);

  return (
    <article
      ref={reveal.ref}
      style={reveal.style}
      className={`${reveal.className} group relative flex min-h-[220px] w-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6 lg:min-h-0 lg:p-6 2xl:p-7 ${colors.card}`}
    >
      <div className="flex min-w-0 items-center gap-3 pr-1">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-105">
          <CompanyLogo job={job} className={colors.logo} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-words font-sans text-sm font-semibold leading-snug tracking-[-0.01em]">{job.providerName}</p>
          {job.providerVerified && <p className="mt-1 text-xs font-medium opacity-75">Verified provider</p>}
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="break-words font-sans text-lg font-medium leading-[1.25] tracking-[-0.015em] sm:text-xl">{job.title}</h3>
      </div>

      <p className="mt-2.5 flex min-w-0 items-start gap-1.5 text-xs font-medium leading-relaxed opacity-85 lg:text-sm">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8.3c0 4.2-6 9-6 9s-6-4.8-6-9a6 6 0 1 1 12 0Z"/><circle cx="10" cy="8" r="2"/></svg>
        <span className="break-words">{location}</span>
      </p>

      <div className="mt-auto flex min-w-0 items-end justify-between gap-3 pt-3">
        <div className="min-w-0">
          {job.salaryText && <p className="break-words text-xs font-semibold lg:text-sm">{job.salaryText}</p>}
        </div>
        {job.externalUrl ? (
          <a href={job.externalUrl} target="_blank" rel="noreferrer" aria-label={`Apply for ${job.title} at ${job.providerName}`} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] lg:px-3.5 lg:text-sm ${colors.action}`}>
            Apply <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="shrink-0 rounded-lg bg-black/5 px-3 py-2 text-xs font-semibold opacity-60 lg:text-sm">Apply</span>
        )}
      </div>
    </article>
  );
}

function CompanyLogo({ job, className }: { job: Job; className: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = job.providerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className={`flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ${className}`}>
      {job.providerLogo && !imageFailed ? (
        <img
          src={job.providerLogo}
          alt={`${job.providerName} logo`}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <span aria-hidden="true" className="flex h-full w-full items-center justify-center bg-transparent font-sans text-sm font-bold tracking-wide text-current">
          {initials}
        </span>
      )}
    </div>
  );
}

function WhyShramaSection() {
  return (
    <section id="why-shrama" className="scroll-mt-8 bg-white px-4 pb-6 pt-12 sm:px-6 sm:pb-8 sm:pt-16">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-10 lg:px-14 2xl:max-w-[1400px] min-[1800px]:max-w-[1500px]">
        <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900 md:text-4xl">Why Shram Bazzar?</h2>
      </div>
    </section>
  );
}

function JourneyStepCard({ step, index, audience }: { step: { title: string; detail: string; points: string[] }; index: number; audience: JourneyAudience }) {
  const isWorker = audience === 'worker';
  const showCharacter = isWorker || (!isWorker && index < 4);
  const imageOnRight = (isWorker && index >= 2) || (!isWorker && (index === 0 || index === 3));
  const businessProfileIllustration = !isWorker && index === 0;
  const useWorkerCardStyle = isWorker;
  const isProfileStep = isWorker && index === 0;
  const characterImage = `${import.meta.env.BASE_URL}images/landing/${journeyImages[audience][index]}`;
  const cardSurface = useWorkerCardStyle
    ? 'gap-3 bg-[#FFF0DD] p-6 text-[#111111] sm:p-8'
    : 'gap-5 border border-[#8B5E3C] bg-[#A8754F] p-6 text-[#FFF9F2] shadow-sm sm:p-8';
  const cardLayout = showCharacter
    ? 'md:items-start md:justify-start md:gap-4'
    : 'md:items-center md:justify-between';
  const workerTextTone = 'text-[#111111]';
  const headingTone = isWorker ? workerTextTone : 'text-[#FFF9F2]';
  const detailTone = isWorker ? workerTextTone : 'text-[#FFF9F2]';
  const pointsTone = isWorker ? workerTextTone : 'text-[#FFF9F2]';
  const bulletTone = isWorker ? 'bg-[#111111]' : 'bg-[#FFF9F2]';
  const descriptionClass = isProfileStep
    ? `max-w-xl text-lg leading-8 ${detailTone}`
    : `max-w-xl text-lg leading-relaxed ${detailTone}`;
  const pointsClass = isProfileStep
    ? `space-y-4 text-lg font-medium leading-8 ${pointsTone}`
    : `space-y-3 text-base font-medium leading-relaxed ${pointsTone}`;

  return (
    <article className={`group flex min-h-[21rem] flex-col items-stretch rounded-2xl md:flex-row ${cardLayout} ${cardSurface}`}>
      <div className={`flex-1 ${isProfileStep ? 'space-y-5 sm:space-y-6' : 'space-y-4'} ${showCharacter ? imageOnRight ? 'order-2 md:order-1 md:pr-2' : 'order-2 md:order-2 md:pl-2' : ''}`} style={{ fontFamily: '"TeX Gyre Termes", "Times New Roman", serif' }}>
        <div className="flex items-center gap-3">
          <h3 className={`min-w-0 flex-1 text-2xl font-semibold tracking-[-0.02em] leading-tight sm:text-3xl ${headingTone}`}>{step.title}</h3>
        </div>
        <p className={`leading-relaxed ${descriptionClass}`}>{step.detail}</p>
        <ul className={`pt-1 ${pointsClass}`}>
          {step.points.map(point => <li key={point} className="flex items-start gap-2.5"><span className={`mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full ${bulletTone}`} aria-hidden="true" /><span>{point}</span></li>)}
        </ul>
      </div>
      {showCharacter && <img src={characterImage} alt="" aria-hidden="true" className={`mx-auto h-72 w-60 shrink-0 ${businessProfileIllustration ? 'object-cover object-[46%_center]' : 'object-contain'} mix-blend-multiply md:h-80 md:w-64 md:self-center ${imageOnRight ? 'order-1 md:order-2' : 'order-1 md:order-1'}`} />}
    </article>
  );
}

function FooterGroup({ title, items }: { title: string; items: [string, () => void][] }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3><div className="mt-4 space-y-3">{items.map(([label, action]) => <button key={label} onClick={action} className="block text-sm text-white/55 hover:text-white">{label}</button>)}</div></div>;
}
