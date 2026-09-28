import { useApp } from '../store/AppContext';

export default function Landing() {
  const { navigate, loginAsWorker, loginAsProvider } = useApp();

  const categories = [
    {
      icon: '🎓',
      title: 'Qualified / Professional',
      desc: 'Nurses, engineers, accountants, lawyers — roles requiring formal qualifications and licences.',
      color: 'bg-teal-50 border-teal-100',
      badge: 'text-teal',
    },
    {
      icon: '🔧',
      title: 'Skill Based',
      desc: 'Electricians, cooks, drivers, tailors — trades and crafts requiring specific learned skills.',
      color: 'bg-amber-50 border-amber-100',
      badge: 'text-amber-700',
    },
    {
      icon: '🤝',
      title: 'Beginner Friendly',
      desc: 'Event staff, helpers, cleaners, loaders — great for first-timers seeking flexible income.',
      color: 'bg-green-50 border-green-100',
      badge: 'text-green-700',
    },
  ];

  const stats = [
    { value: '2,400+', label: 'Active Workers' },
    { value: '180+', label: 'Verified Providers' },
    { value: '12,000+', label: 'Jobs Completed' },
    { value: '14', label: 'Districts Covered' },
  ];

  const howWorkerWorks = [
    { step: '01', title: 'Create your profile', desc: 'Add your skills, qualifications, experience, and set your availability dates.' },
    { step: '02', title: 'Discover matching jobs', desc: 'Browse jobs filtered by location, category, pay, and date. See your match score instantly.' },
    { step: '03', title: 'Apply with one click', desc: 'Send your profile and a cover note. Track your applications in real time.' },
    { step: '04', title: 'Get hired & get paid', desc: 'Receive notifications when selected. Show up, do great work, build your work history.' },
  ];

  const howProviderWorks = [
    { step: '01', title: 'Register your organisation', desc: 'Create a verified provider account with your PAN and business details.' },
    { step: '02', title: 'Post your requirements', desc: 'Describe the job, skills needed, dates, location, and payment clearly.' },
    { step: '03', title: 'Review matched applicants', desc: 'See ranked profiles with skills, experience, ratings, and availability.' },
    { step: '04', title: 'Select & confirm workers', desc: 'Accept the best fits, notify them instantly, and manage the engagement.' },
  ];

  const testimonials = [
    {
      name: 'Aarav Sharma',
      role: 'Electrician, Kathmandu',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
      text: 'Through Shram Bazar I found 3 event electrical jobs in one month. The match score helped me focus on jobs I could actually get.',
    },
    {
      name: 'Rekha Shrestha',
      role: 'HR Manager, Himalayan Grand Hotel',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&auto=format',
      text: 'We staffed 40 workers for our peak season through Shram Bazar. The profiles are verified and quality is consistently good.',
    },
    {
      name: 'Priya Thapa',
      role: 'Event Staff, Pokhara',
      photo: 'https://images.unsplash.com/photo-1494790108755-2616b612b17c?w=80&h=80&fit=crop&auto=format',
      text: 'Flexible work that fits around my schedule. I choose which jobs I take. Best platform for gig work in Nepal.',
    },
  ];

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
              श्रम बजार connects skilled workers with businesses across Nepal. Find flexible work that fits your life, or hire the right people for your needs — quickly, safely, and fairly.
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

      {/* Demo Quick Access */}
      <section className="bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-primary-50 text-sm font-medium">
            🚀 <strong>Try the demo</strong> — explore the full prototype with pre-loaded Nepal data
          </p>
          <div className="flex gap-3">
            <button
              onClick={loginAsWorker}
              className="px-4 py-1.5 bg-white text-primary text-sm font-semibold rounded-lg hover:bg-primary-50 transition-colors"
            >
              Demo as Worker
            </button>
            <button
              onClick={loginAsProvider}
              className="px-4 py-1.5 bg-primary-dark text-white text-sm font-semibold rounded-lg hover:bg-stone-900 transition-colors border border-primary-light/30"
            >
              Demo as Provider
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-sm text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Job Categories */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-3">Three Ways to Work</h2>
          <p className="text-stone-500 max-w-xl mx-auto">Jobs are categorised so you always know what's expected before you apply.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div key={cat.title} className={`rounded-2xl p-6 border ${cat.color}`}>
              <div className="text-4xl mb-4">{cat.icon}</div>
              <h3 className={`font-display text-xl font-semibold mb-2 ${cat.badge}`}>{cat.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works — Two columns */}
      <section className="py-20 bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-3">How Shram Bazar Works</h2>
            <p className="text-stone-500">Simple workflows for both workers and providers.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Worker */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-stone-900">For Workers</h3>
              </div>
              <div className="space-y-6">
                {howWorkerWorks.map(step => (
                  <div key={step.step} className="flex gap-4">
                    <span className="font-mono-data text-sm font-bold text-primary bg-primary-50 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                      {step.step}
                    </span>
                    <div>
                      <h4 className="font-semibold text-stone-900 mb-1">{step.title}</h4>
                      <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('worker-signup')}
                className="mt-8 px-6 py-2.5 bg-teal text-white font-medium rounded-xl hover:bg-teal-dark transition-colors"
              >
                Start Finding Work →
              </button>
            </div>

            {/* Provider */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-stone-900">For Providers</h3>
              </div>
              <div className="space-y-6">
                {howProviderWorks.map(step => (
                  <div key={step.step} className="flex gap-4">
                    <span className="font-mono-data text-sm font-bold text-primary bg-primary-50 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                      {step.step}
                    </span>
                    <div>
                      <h4 className="font-semibold text-stone-900 mb-1">{step.title}</h4>
                      <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('provider-signup')}
                className="mt-8 px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
              >
                Post Your First Job →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-3">Built on Trust</h2>
          <p className="text-stone-500">Safety and transparency at every step.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '✓', title: 'Verified Providers', desc: 'PAN-registered businesses verified before posting jobs.', color: 'text-teal' },
            { icon: '₨', title: 'Clear Payment Terms', desc: 'Every job displays rate, type, and payment timing upfront.', color: 'text-amber-700' },
            { icon: '★', title: 'Worker Ratings', desc: 'Completed job history and provider reviews visible on profiles.', color: 'text-primary' },
            { icon: '🛡', title: 'Report System', desc: 'Flag issues with jobs or workers directly from the platform.', color: 'text-stone-600' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-2xl p-6 border border-stone-200">
              <div className={`text-2xl font-bold mb-3 ${item.color}`}>{item.icon}</div>
              <h3 className="font-semibold text-stone-900 mb-2">{item.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-white text-center mb-12">What People Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <p className="text-white/80 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover bg-stone-700" />
                  <div>
                    <p className="text-white font-medium text-sm">{t.name}</p>
                    <p className="text-white/50 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 border-t border-stone-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">SB</span>
            </div>
            <span className="font-display text-white font-semibold">Shram Bazar</span>
            <span className="text-stone-500 text-sm">· श्रम बजार</span>
          </div>
          <p className="text-stone-500 text-xs">© 2024 Shram Bazar Pvt. Ltd. · Kathmandu, Nepal · All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
