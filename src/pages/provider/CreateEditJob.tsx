import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ALL_SKILLS, DISTRICTS } from '../../data/mockData';
import type { Job, JobCategory, WorkType, PaymentType } from '../../types';

interface Props {
  editJobId?: string | null;
}

export default function CreateEditJob({ editJobId }: Props) {
  const { state, navigate, postJob, updateJob } = useApp();
  const existingJob = editJobId ? state.jobs.find(j => j.id === editJobId) : null;

  const [form, setForm] = useState({
    title: existingJob?.title ?? '',
    description: existingJob?.description ?? '',
    category: (existingJob?.category ?? 'skill-based') as JobCategory,
    skillsRequired: existingJob?.skillsRequired ?? [] as string[],
    qualificationRequired: existingJob?.qualificationRequired ?? '',
    experienceRequired: existingJob?.experienceRequired ?? '',
    workType: (existingJob?.workType ?? 'full-day') as WorkType,
    workersNeeded: existingJob?.workersNeeded ?? 1,
    date: existingJob?.date ?? '',
    endDate: existingJob?.endDate ?? '',
    startTime: existingJob?.startTime ?? '08:00',
    endTime: existingJob?.endTime ?? '17:00',
    duration: existingJob?.duration ?? '',
    location: existingJob?.location ?? '',
    district: existingJob?.district ?? '',
    payment: existingJob?.payment ?? 0,
    paymentType: (existingJob?.paymentType ?? 'per-day') as PaymentType,
    deadline: existingJob?.deadline ?? '',
  });

  const [skillInput, setSkillInput] = useState('');
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const filteredSkills = ALL_SKILLS.filter(s =>
    s.toLowerCase().includes(skillInput.toLowerCase()) && !form.skillsRequired.includes(s)
  ).slice(0, 12);

  const toggleSkill = (skill: string) => {
    setForm(p => ({
      ...p,
      skillsRequired: p.skillsRequired.includes(skill)
        ? p.skillsRequired.filter(s => s !== skill)
        : [...p.skillsRequired, skill],
    }));
  };

  const handleSubmit = () => {
    if (existingJob) {
      updateJob(existingJob.id, form);
    } else {
      postJob(form as any);
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-stone-900 mb-2">
          {existingJob ? 'Job Updated!' : 'Job Posted Successfully!'}
        </h2>
        <p className="text-stone-500 mb-8">
          {existingJob
            ? 'Your job listing has been updated.'
            : 'Your job is now live. Matching workers will be notified and can start applying.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('my-jobs')} className="px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors">
            View My Jobs
          </button>
          <button onClick={() => navigate('provider-dashboard')} className="px-5 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors">
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { n: 1, label: 'Job Basics' },
    { n: 2, label: 'Requirements' },
    { n: 3, label: 'Schedule & Pay' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(existingJob ? 'my-jobs' : 'provider-dashboard')} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>

      <h1 className="font-display text-3xl font-bold text-stone-900 mb-8">
        {existingJob ? 'Edit Job Posting' : 'Post a New Job'}
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => step > s.n && setStep(s.n)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step === s.n ? 'bg-primary text-white' :
                  step > s.n ? 'bg-green text-white cursor-pointer' :
                  'bg-stone-200 text-stone-500'
                }`}
              >
                {step > s.n ? '✓' : s.n}
              </button>
              <span className={`text-sm font-medium hidden sm:block ${step === s.n ? 'text-stone-900' : 'text-stone-400'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px min-w-8 ${step > s.n ? 'bg-green' : 'bg-stone-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8">
        {/* Step 1: Job Basics */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-semibold text-stone-900 text-lg mb-4">Job Information</h2>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Job Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Electrician for Office Renovation" className="input-style" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Job Category *</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'qualified', label: 'Qualified / Professional', desc: 'Requires formal qualification or licence' },
                  { value: 'skill-based', label: 'Skill Based', desc: 'Requires specific skill or trade' },
                  { value: 'beginner-friendly', label: 'Beginner Friendly', desc: 'No prior experience needed' },
                ].map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, category: cat.value as JobCategory }))}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      form.category === cat.value
                        ? 'border-primary bg-primary-50'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-medium text-stone-800 leading-snug">{cat.label}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Job Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the role, responsibilities, and what you expect from workers. The more detail, the better the match."
                rows={5}
                className="input-style resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Number of Workers Needed *</label>
              <input
                type="number" min="1" max="100"
                value={form.workersNeeded}
                onChange={e => setForm(p => ({ ...p, workersNeeded: Number(e.target.value) }))}
                className="input-style w-32"
              />
            </div>
          </div>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-semibold text-stone-900 text-lg mb-4">Skills & Requirements</h2>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Skills Required</label>
              <input
                type="text" value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                placeholder="Search skills…"
                className="input-style mb-2"
              />
              {form.skillsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.skillsRequired.map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 bg-primary-50 text-primary rounded-full border border-primary-100 flex items-center gap-1">
                      {s}
                      <button type="button" onClick={() => toggleSkill(s)} className="text-primary/60 hover:text-primary font-bold">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {filteredSkills.map(s => (
                  <button key={s} type="button" onClick={() => { toggleSkill(s); setSkillInput(''); }}
                    className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200 hover:bg-stone-200 transition-colors">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Qualification Required</label>
              <input
                value={form.qualificationRequired}
                onChange={e => setForm(p => ({ ...p, qualificationRequired: e.target.value }))}
                placeholder="e.g. SLC/SEE passed, Diploma in Electrical Engineering"
                className="input-style"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Experience Required</label>
              <input
                value={form.experienceRequired}
                onChange={e => setForm(p => ({ ...p, experienceRequired: e.target.value }))}
                placeholder="e.g. Minimum 2 years in event coordination"
                className="input-style"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Work Location *</label>
              <input
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Durbar Marg, Kathmandu"
                className="input-style"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">District *</label>
              <select value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} className="input-style">
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Schedule & Pay */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <h2 className="font-semibold text-stone-900 text-lg mb-4">Schedule & Payment</h2>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1.5">Work Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'full-day', label: 'Full Day' },
                  { value: 'half-day', label: 'Half Day' },
                  { value: 'multi-day', label: 'Multi-Day' },
                  { value: 'hourly', label: 'Hourly' },
                ].map(wt => (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, workType: wt.value as WorkType }))}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      form.workType === wt.value ? 'border-primary bg-primary-50 text-primary' : 'border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Start Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input-style" />
              </div>
              {form.workType === 'multi-day' && (
                <div>
                  <label className="text-sm font-medium text-stone-700 block mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="input-style" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Start Time</label>
                <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className="input-style" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">End Time</label>
                <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className="input-style" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Duration</label>
                <input value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 1 day, 3 days, 2 weeks" className="input-style" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Application Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className="input-style" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Payment Amount (NPR) *</label>
                <input
                  type="number" value={form.payment || ''}
                  onChange={e => setForm(p => ({ ...p, payment: Number(e.target.value) }))}
                  placeholder="e.g. 1500"
                  className="input-style"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1.5">Payment Type *</label>
                <select value={form.paymentType} onChange={e => setForm(p => ({ ...p, paymentType: e.target.value as PaymentType }))} className="input-style">
                  <option value="per-day">Per Day</option>
                  <option value="per-hour">Per Hour</option>
                  <option value="fixed">Fixed (total)</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Job Summary Preview</p>
              <h3 className="font-semibold text-stone-900">{form.title || 'Untitled Job'}</h3>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-stone-500">
                {form.district && <span>{form.district}</span>}
                {form.date && <span>{new Date(form.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>}
                {form.payment > 0 && <span className="font-mono-data font-semibold text-stone-800">NPR {form.payment.toLocaleString()}/{form.paymentType.replace('per-', '')}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-stone-100">
          <button
            onClick={() => step === 1 ? navigate('provider-dashboard') : setStep(s => s - 1)}
            className="px-5 py-2.5 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && (!form.title || !form.description)}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!form.date || !form.payment || !form.location}
              className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {existingJob ? 'Save Changes' : 'Post Job →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
