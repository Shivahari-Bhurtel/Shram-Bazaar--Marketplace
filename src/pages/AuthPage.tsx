import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { ALL_SKILLS, DISTRICTS } from '../data/mockData';

type AuthMode = 'login' | 'worker-signup' | 'provider-signup';

interface Props {
  mode: AuthMode;
}

export default function AuthPage({ mode }: Props) {
  const { navigate, login, signupWorker, signupProvider } = useApp();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    district: '',
    location: '',
    orgName: '',
    pan: '',
    industry: '',
    contactName: '',
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLogin = mode === 'login';
  const isWorker = mode === 'worker-signup';
  const isProvider = mode === 'provider-signup';

  const industries = ['Information Technology', 'Hospitality & Tourism', 'Healthcare', 'Construction', 'Events & Entertainment', 'Retail', 'Manufacturing', 'Education', 'Finance & Banking', 'NGO / INGO', 'Other'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const result = login(formData.email, formData.password);
      if (result) setError(result);
    } else if (isProvider && step < 2) {
      setStep(s => s + 1);
    } else {
      const result = isWorker
        ? signupWorker({
            email: formData.email, password: formData.password,
            name: formData.email.trim().split('@')[0], phone: '', district: '', location: '', skills: [],
          })
        : signupProvider({
            email: formData.email, password: formData.password, contactName: formData.contactName,
            phone: formData.phone, orgName: formData.orgName, pan: formData.pan,
            industry: formData.industry, district: formData.district, location: formData.location,
          });
      if (result) setError(result);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const filteredSkills = ALL_SKILLS.filter(s =>
    s.toLowerCase().includes(skillInput.toLowerCase()) && !formData.skills.includes(s)
  ).slice(0, 12);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
          <p className="text-stone-600 font-medium">Setting up your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-stone-900 relative overflow-hidden flex-col justify-center p-12">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&h=1200&fit=crop&auto=format')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute left-12 top-12 z-10">
          <button onClick={() => navigate('landing')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="font-brand text-white text-lg font-semibold">S</span>
            </div>
            <span className="font-brand text-2xl text-white font-semibold">Shrama</span>
          </button>
        </div>
        <div className="relative my-auto w-full">
          <h2 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            {isLogin ? 'Welcome back to Shrama' : isWorker ? 'Find work that fits your life' : 'Hire the right people, fast'}
          </h2>
          <p className="text-white/60 leading-relaxed">
            {isLogin
              ? 'Sign in to your account to continue your journey on Nepal\'s flexible work platform.'
              : isWorker
              ? 'Thousands of flexible jobs across Nepal. Match your skills and availability with the right opportunity.'
              : 'Post jobs, review qualified applicants, and build your flexible workforce with confidence.'}
          </p>
          <div className="mt-8 space-y-3">
            {(isWorker ? ['Discover jobs matched to your skills', 'Track all your applications in one place', 'Build your work history and rating'] :
              isProvider ? ['Verified provider badge builds trust', 'Review ranked applicant profiles', 'Manage all hirings from your dashboard'] :
              ['Your profile and applications', 'New matching jobs in your district', 'Messages from providers']).map(item => (
              <div key={item} className="flex items-center gap-2 text-white/70 text-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="#14A085" strokeWidth="2.5" className="w-4 h-4 flex-shrink-0">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back to landing */}
          <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-800 mb-8 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to homepage
          </button>

          {/* Mode toggle (login page) */}
          {isLogin && (
            <div className="bg-stone-100 rounded-xl p-1 flex mb-8">
              <button onClick={() => navigate('login')} className="flex-1 py-2 rounded-lg text-sm font-medium bg-white shadow text-stone-900">
                Sign In
              </button>
              <button onClick={() => navigate('worker-signup')} className="flex-1 py-2 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-700">
                Register
              </button>
            </div>
          )}

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900 mb-2">
              {isLogin ? 'Sign in to your account' : isWorker ? (step === 1 ? 'Create Account' : 'Tell us about your skills') : (step === 1 ? 'Create Provider Account' : 'Organisation Details')}
            </h1>
            {!isLogin && !(isWorker && step === 1) && (
              <p className="text-stone-500 text-sm leading-relaxed">
                {isWorker
                  ? step === 1
                    ? 'Step 1 of 2 · Account details. Start with your contact information; you’ll add your location and skills next.'
                    : 'Step 2 of 2 · Location and skills. This helps us match you with relevant work nearby.'
                  : `Step ${step} of 2 — ${step === 1 ? 'Contact information' : 'Business details'}`}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Login fields */}
            {isLogin && (
              <>
                <Field label="Email address">
                  <input
                    type="email" value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    required
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password" value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    required
                  />
                </Field>
              </>
            )}

            {/* Worker signup: email and password only */}
            {isWorker && step === 1 && (
              <>
                <Field label="Gmail address">
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="you@gmail.com" className="w-full px-4 py-3 border border-stone-200 rounded-xl text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" autoComplete="email" required />
                </Field>
                <Field label="Password">
                  <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="At least 8 characters" className="w-full px-4 py-3 border border-stone-200 rounded-xl text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" autoComplete="new-password" minLength={8} required />
                </Field>
              </>
            )}

            {/* Worker signup step 2 */}
            {isWorker && step === 2 && (
              <>
                <Field label="Your district">
                  <select value={formData.district} onChange={e => setFormData(p => ({ ...p, district: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required>
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Local address">
                  <input type="text" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Baneshwor, Kathmandu" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
                <Field label="Your skills" hint="Select all that apply">
                  <input
                    type="text" value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    placeholder="Search skills…"
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white mb-2"
                  />
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {formData.skills.map(s => (
                        <span key={s} className="text-xs px-2 py-1 bg-primary-50 text-primary rounded-full border border-primary-100 flex items-center gap-1">
                          {s}
                          <button type="button" onClick={() => toggleSkill(s)} className="text-primary/60 hover:text-primary">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSkills.map(s => (
                      <button
                        key={s} type="button" onClick={() => { toggleSkill(s); setSkillInput(''); }}
                        className="text-xs px-2 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200 hover:bg-stone-200 transition-colors"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {/* Provider signup step 1 */}
            {isProvider && step === 1 && (
              <>
                <Field label="Contact person name">
                  <input type="text" value={formData.contactName} onChange={e => setFormData(p => ({ ...p, contactName: e.target.value }))} placeholder="e.g. Sanjay Manandhar" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
                <Field label="Email address">
                  <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="org@example.com" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+977-01XXXXXXX" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
                <Field label="Password">
                  <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="At least 8 characters" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" minLength={8} required />
                </Field>
              </>
            )}

            {/* Provider signup step 2 */}
            {isProvider && step === 2 && (
              <>
                <Field label="Organisation name">
                  <input type="text" value={formData.orgName} onChange={e => setFormData(p => ({ ...p, orgName: e.target.value }))} placeholder="e.g. HimTech Solutions Pvt. Ltd." className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
                <Field label="PAN number" hint="Required for verification">
                  <input type="text" value={formData.pan} onChange={e => setFormData(p => ({ ...p, pan: e.target.value }))} placeholder="9-digit PAN" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
                <Field label="Industry">
                  <select value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required>
                    <option value="">Select industry</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="District">
                  <select value={formData.district} onChange={e => setFormData(p => ({ ...p, district: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required>
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Organisation address">
                  <input type="text" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g. New Baneshwor, Kathmandu" className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white" required />
                </Field>
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors mt-2"
            >
              {isLogin ? 'Sign In' : isProvider && step < 2 ? <>Continue <span aria-hidden="true">→</span></> : isWorker ? 'Create my account' : 'Register Organisation'}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-stone-500">
            {isLogin ? (
              <>Don't have an account?{' '}
                <button onClick={() => navigate('worker-signup')} className="text-primary hover:underline font-medium">Register as Worker</button>
                {' or '}
                <button onClick={() => navigate('provider-signup')} className="text-primary hover:underline font-medium">as Provider</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => navigate('login')} className="text-primary hover:underline font-medium">Sign in</button>
                {isWorker ? (
                  <> · <button onClick={() => navigate('provider-signup')} className="text-stone-500 hover:text-stone-800">Register as a provider</button></>
                ) : (
                  <> · <button onClick={() => navigate('worker-signup')} className="text-stone-500 hover:text-stone-800">Register as a worker</button></>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-sm font-semibold text-stone-800">{label}</label>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
