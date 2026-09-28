import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ALL_SKILLS, DISTRICTS } from '../../data/mockData';

export default function WorkerProfile() {
  const { state, updateWorkerProfile } = useApp();
  const { workerProfile } = state;
  const [editing, setEditing] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});
  const [skillInput, setSkillInput] = useState('');
  const [saved, setSaved] = useState(false);

  if (!workerProfile) return null;

  const startEdit = (section: string) => {
    setEditing(section);
    setSaved(false);
    if (section === 'basic') {
      setTempData({
        name: workerProfile.name,
        phone: workerProfile.phone,
        location: workerProfile.location,
        district: workerProfile.district,
        bio: workerProfile.bio,
        availability: workerProfile.availability,
      });
    } else if (section === 'skills') {
      setTempData({ skills: [...workerProfile.skills] });
    }
  };

  const saveEdit = () => {
    if (editing === 'basic') {
      updateWorkerProfile(tempData);
    } else if (editing === 'skills') {
      updateWorkerProfile({ skills: tempData.skills });
    }
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSkill = (skill: string) => {
    const skills = tempData.skills ?? [];
    setTempData((p: any) => ({
      ...p,
      skills: skills.includes(skill) ? skills.filter((s: string) => s !== skill) : [...skills, skill],
    }));
  };

  const filteredSkills = ALL_SKILLS.filter(s =>
    s.toLowerCase().includes(skillInput.toLowerCase()) &&
    !(tempData.skills ?? []).includes(s)
  ).slice(0, 15);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">My Profile</h1>
          <p className="text-stone-500">A complete profile gets more job matches and provider trust.</p>
        </div>
        {saved && (
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fade-in">
            ✓ Saved
          </span>
        )}
      </div>

      {/* Profile hero */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="relative">
          <img src={workerProfile.photo} alt={workerProfile.name} className="w-20 h-20 rounded-xl object-cover bg-stone-700" />
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-stone-900 flex items-center justify-center cursor-pointer">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-white">{workerProfile.name}</h2>
          <p className="text-white/60 text-sm">{workerProfile.location}</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span className="text-amber text-sm">★</span>
              <span className="text-white font-medium">{workerProfile.rating}</span>
              <span className="text-white/40 text-xs">avg rating</span>
            </div>
            <div className="text-white/40">·</div>
            <span className="text-white/60 text-sm">{workerProfile.totalJobs} jobs completed</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* Basic Info */}
          <Section
            title="Basic Information"
            onEdit={() => startEdit('basic')}
            editing={editing === 'basic'}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
          >
            {editing === 'basic' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <input value={tempData.name} onChange={e => setTempData((p: any) => ({ ...p, name: e.target.value }))} className="input-style" />
                </Field>
                <Field label="Phone">
                  <input value={tempData.phone} onChange={e => setTempData((p: any) => ({ ...p, phone: e.target.value }))} className="input-style" />
                </Field>
                <Field label="Location">
                  <input value={tempData.location} onChange={e => setTempData((p: any) => ({ ...p, location: e.target.value }))} placeholder="e.g. Baneshwor, Kathmandu" className="input-style" />
                </Field>
                <Field label="District">
                  <select value={tempData.district} onChange={e => setTempData((p: any) => ({ ...p, district: e.target.value }))} className="input-style">
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Availability">
                  <select value={tempData.availability} onChange={e => setTempData((p: any) => ({ ...p, availability: e.target.value }))} className="input-style">
                    <option value="morning">Mornings only</option>
                    <option value="afternoon">Afternoons only</option>
                    <option value="full-day">Full day</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                  <textarea value={tempData.bio} onChange={e => setTempData((p: any) => ({ ...p, bio: e.target.value }))} rows={3} className="input-style resize-none" />
                </Field>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Info label="Name" value={workerProfile.name} />
                <Info label="Phone" value={workerProfile.phone} />
                <Info label="Location" value={workerProfile.location} />
                <Info label="District" value={workerProfile.district} />
                <Info label="Availability" value={{ morning: 'Mornings only', afternoon: 'Afternoons', 'full-day': 'Full day', flexible: 'Flexible' }[workerProfile.availability]} />
                <div className="sm:col-span-2">
                  <Info label="Bio" value={workerProfile.bio} />
                </div>
              </div>
            )}
          </Section>

          {/* Skills */}
          <Section
            title="Skills"
            onEdit={() => startEdit('skills')}
            editing={editing === 'skills'}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
          >
            {editing === 'skills' ? (
              <div>
                <input
                  type="text" value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  placeholder="Search skills to add…"
                  className="input-style mb-3 w-full"
                />
                <div className="flex flex-wrap gap-2 mb-3">
                  {(tempData.skills ?? []).map((s: string) => (
                    <span key={s} className="text-xs px-2.5 py-1 bg-primary-50 text-primary rounded-full border border-primary-100 flex items-center gap-1">
                      {s}
                      <button type="button" onClick={() => toggleSkill(s)} className="text-primary/60 hover:text-primary font-bold">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredSkills.map(s => (
                    <button key={s} type="button" onClick={() => { toggleSkill(s); setSkillInput(''); }}
                      className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200 hover:bg-stone-200 transition-colors">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workerProfile.skills.length > 0
                  ? workerProfile.skills.map(s => (
                      <span key={s} className="text-sm px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200">{s}</span>
                    ))
                  : <p className="text-stone-400 text-sm">No skills added yet.</p>
                }
              </div>
            )}
          </Section>

          {/* Qualifications */}
          <Section title="Qualifications" onEdit={() => {}} editing={false} onSave={() => {}} onCancel={() => {}}>
            {workerProfile.qualifications.length > 0 ? (
              <div className="space-y-3">
                {workerProfile.qualifications.map(q => (
                  <div key={q.id} className="flex gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">🎓</span>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{q.degree}</p>
                      <p className="text-sm text-stone-600">{q.field}</p>
                      <p className="text-xs text-stone-400">{q.institution} · {q.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm">No qualifications added yet.</p>
            )}
          </Section>

          {/* Experience */}
          <Section title="Work Experience" onEdit={() => {}} editing={false} onSave={() => {}} onCancel={() => {}}>
            {workerProfile.experience.length > 0 ? (
              <div className="space-y-4">
                {workerProfile.experience.map(ex => (
                  <div key={ex.id} className="flex gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">💼</span>
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{ex.title}</p>
                      <p className="text-sm text-stone-600">{ex.company} · {ex.duration}</p>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">{ex.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm">No experience added yet.</p>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Work history */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Work History</h3>
            {workerProfile.workHistory.length > 0 ? (
              <div className="space-y-4">
                {workerProfile.workHistory.map((wh, i) => (
                  <div key={i} className="pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-stone-900 line-clamp-1">{wh.jobTitle}</p>
                    <p className="text-xs text-stone-500">{wh.providerName}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{wh.date}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span key={i} className={`text-xs ${i < wh.rating ? 'text-amber' : 'text-stone-200'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-xs font-mono-data text-stone-600">NPR {wh.payment.toLocaleString()}</span>
                    </div>
                    {wh.review && (
                      <p className="text-xs text-stone-500 italic mt-1.5 leading-relaxed">"{wh.review}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-stone-400 text-sm text-center py-4">No completed jobs yet.</p>
            )}
          </div>

          {/* Availability */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-3">Available Dates</h3>
            <div className="flex flex-wrap gap-2">
              {workerProfile.availableDates.map(d => (
                <span key={d} className="text-xs px-2.5 py-1 bg-teal-50 text-teal rounded-full border border-teal-100 font-mono-data">
                  {new Date(d).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, onEdit, editing, onSave, onCancel, children }: {
  title: string; onEdit: () => void; editing: boolean;
  onSave: () => void; onCancel: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-900">{title}</h3>
        {!editing ? (
          <button onClick={onEdit} className="text-xs text-primary hover:underline font-medium">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-700">Cancel</button>
            <button onClick={onSave} className="text-xs font-medium text-white bg-primary px-2.5 py-1 rounded-lg hover:bg-primary-dark transition-colors">Save</button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <p className="text-xs text-stone-400 uppercase tracking-wider font-mono-data mb-0.5">{label}</p>
      <p className="text-stone-800">{value ?? '—'}</p>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-stone-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
