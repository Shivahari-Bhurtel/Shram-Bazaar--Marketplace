import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ALL_SKILLS, DISTRICTS } from '../../data/mockData';
import type { KycDocumentType } from '../../types';

export default function WorkerProfile() {
  const { state, updateWorkerProfile, submitKyc, approveKyc } = useApp();
  const { workerProfile } = state;
  const [editing, setEditing] = useState<string | null>(null);
  const [tempData, setTempData] = useState<any>({});
  const [skillInput, setSkillInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [kycForm, setKycForm] = useState({
    documentType: 'national-id' as KycDocumentType,
    documentNumber: '',
    fileName: '',
    documentData: '',
  });
  const [kycMessage, setKycMessage] = useState('');

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
        photo: workerProfile.photo,
      });
    } else if (section === 'skills') {
      setTempData({ skills: [...workerProfile.skills] });
    } else if (section === 'qualifications') {
      const qualification = workerProfile.qualifications[0];
      setTempData(qualification ? { ...qualification } : { degree: '', institution: '', year: new Date().getFullYear(), field: '' });
    } else if (section === 'experience') {
      const experience = workerProfile.experience[0];
      setTempData(experience ? { ...experience } : { title: '', company: '', duration: '', description: '' });
    }
  };

  const saveEdit = () => {
    if (editing === 'basic') {
      updateWorkerProfile(tempData);
    } else if (editing === 'skills') {
      updateWorkerProfile({ skills: tempData.skills });
    } else if (editing === 'qualifications') {
      updateWorkerProfile({
        qualifications: tempData.degree
          ? [{ id: workerProfile.qualifications[0]?.id ?? `q-${Date.now()}`, ...tempData, year: Number(tempData.year) }]
          : [],
      });
    } else if (editing === 'experience') {
      updateWorkerProfile({
        experience: tempData.title
          ? [{ id: workerProfile.experience[0]?.id ?? `e-${Date.now()}`, ...tempData }]
          : [],
      });
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
  const kycStatus = workerProfile.kycStatus ?? 'not-verified';
  const maskedDocumentNumber = workerProfile.kycDocumentNumber
    ? `${'•'.repeat(Math.max(4, workerProfile.kycDocumentNumber.length - 4))}${workerProfile.kycDocumentNumber.slice(-4)}`
    : '';

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
        {workerProfile.photo ? (
          <img src={workerProfile.photo} alt={workerProfile.name} className="w-20 h-20 rounded-xl object-cover bg-stone-700" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center font-display text-2xl font-bold">
            {workerProfile.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-white">{workerProfile.name}</h2>
          <p className="text-white/60 text-sm">{workerProfile.location}</p>
          {kycStatus === 'verified' && (
            <span className="inline-flex mt-2 text-xs font-medium text-teal-light border border-teal-light/40 px-2 py-0.5 rounded-full">
              Identity Verified
            </span>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span className="text-white font-medium">{workerProfile.rating || 'No ratings yet'}</span>
              {workerProfile.rating > 0 && <span className="text-white/40 text-xs">average rating</span>}
            </div>
            <div className="text-white/40">·</div>
            <span className="text-white/60 text-sm">{workerProfile.totalJobs} jobs completed</span>
          </div>
        </div>
      </div>

      {/* Private identity verification */}
      <div id="identity-verification" className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono-data uppercase tracking-wider text-stone-400">Private account information</p>
            <h3 className="font-display text-xl font-semibold text-stone-900 mt-1">Identity Verification / KYC</h3>
            <p className="text-sm text-stone-500 mt-1 max-w-2xl">
              Verification is optional during signup, but your identity must be verified before you can apply for jobs.
              Your document number and uploaded file are never shown on your public profile.
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
            kycStatus === 'verified'
              ? 'bg-teal-50 text-teal border border-teal-100'
              : kycStatus === 'pending'
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
          }`}>
            {kycStatus === 'verified' ? 'Verified' : kycStatus === 'pending' ? 'Pending Verification' : 'Not Verified'}
          </span>
        </div>

        {kycStatus === 'not-verified' && (
          <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-stone-100">
            <Field label="Identity document">
              <select
                value={kycForm.documentType}
                onChange={event => setKycForm(current => ({ ...current, documentType: event.target.value as KycDocumentType }))}
                className="input-style"
              >
                <option value="national-id">Nepal National ID (NID)</option>
                <option value="citizenship">Nepal Citizenship Certificate</option>
                <option value="passport">Passport</option>
                <option value="driving-licence">Driving Licence</option>
              </select>
            </Field>
            <Field label="Document number">
              <input
                value={kycForm.documentNumber}
                onChange={event => setKycForm(current => ({ ...current, documentNumber: event.target.value }))}
                placeholder="Enter your document number"
                className="input-style"
              />
            </Field>
            <Field label="Document upload" className="sm:col-span-2">
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setKycMessage('The document is too large. Use a file smaller than 2 MB.');
                    event.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setKycForm(current => ({ ...current, fileName: file.name, documentData: String(reader.result) }));
                    setKycMessage('');
                  };
                  reader.readAsDataURL(file);
                }}
                className="input-style"
              />
              <p className="text-xs text-stone-400 mt-1">JPG, PNG or PDF. Maximum file size: 2 MB.</p>
            </Field>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-stone-500">{kycForm.fileName ? `Selected: ${kycForm.fileName}` : 'No document selected.'}</p>
              <button
                onClick={() => {
                  const error = submitKyc(kycForm);
                  setKycMessage(error ?? 'KYC submitted for verification.');
                }}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark"
              >
                Submit for Verification
              </button>
            </div>
          </div>
        )}

        {kycStatus === 'pending' && (
          <div className="mt-5 pt-5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-stone-700">Your identity document is waiting for review.</p>
              <p className="text-xs text-stone-500 mt-1">
                {workerProfile.kycDocumentFileName} · Document ending in {maskedDocumentNumber.slice(-4)}
              </p>
            </div>
            <button onClick={approveKyc} className="px-4 py-2 bg-stone-800 text-white text-xs font-semibold rounded-xl">
              Demo Admin: Approve KYC
            </button>
          </div>
        )}

        {kycStatus === 'verified' && (
          <div className="mt-5 pt-5 border-t border-stone-100">
            <p className="text-sm font-medium text-teal">Your identity is verified. You can apply for jobs.</p>
            <p className="text-xs text-stone-500 mt-1">
              {workerProfile.kycDocumentFileName} · Document ending in {maskedDocumentNumber.slice(-4)}
            </p>
          </div>
        )}
        {kycMessage && <p className="mt-3 text-sm text-stone-600">{kycMessage}</p>}
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
                <Field label="Profile image URL" className="sm:col-span-2">
                  <input value={tempData.photo} onChange={e => setTempData((p: any) => ({ ...p, photo: e.target.value }))} placeholder="Optional — leave blank to use your initial" className="input-style" />
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
          <Section title="Qualifications" onEdit={() => startEdit('qualifications')} editing={editing === 'qualifications'} onSave={saveEdit} onCancel={() => setEditing(null)}>
            {editing === 'qualifications' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Qualification"><input value={tempData.degree} onChange={e => setTempData((p: any) => ({ ...p, degree: e.target.value }))} className="input-style" /></Field>
                <Field label="Field"><input value={tempData.field} onChange={e => setTempData((p: any) => ({ ...p, field: e.target.value }))} className="input-style" /></Field>
                <Field label="Institution"><input value={tempData.institution} onChange={e => setTempData((p: any) => ({ ...p, institution: e.target.value }))} className="input-style" /></Field>
                <Field label="Year"><input type="number" value={tempData.year} onChange={e => setTempData((p: any) => ({ ...p, year: e.target.value }))} className="input-style" /></Field>
              </div>
            ) : workerProfile.qualifications.length > 0 ? (
              <div className="space-y-3">
                {workerProfile.qualifications.map(q => (
                  <div key={q.id} className="flex gap-3">
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
          <Section title="Work Experience" onEdit={() => startEdit('experience')} editing={editing === 'experience'} onSave={saveEdit} onCancel={() => setEditing(null)}>
            {editing === 'experience' ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Role"><input value={tempData.title} onChange={e => setTempData((p: any) => ({ ...p, title: e.target.value }))} className="input-style" /></Field>
                <Field label="Company"><input value={tempData.company} onChange={e => setTempData((p: any) => ({ ...p, company: e.target.value }))} className="input-style" /></Field>
                <Field label="Duration"><input value={tempData.duration} onChange={e => setTempData((p: any) => ({ ...p, duration: e.target.value }))} placeholder="e.g. 3 years" className="input-style" /></Field>
                <Field label="Description" className="sm:col-span-2"><textarea value={tempData.description} onChange={e => setTempData((p: any) => ({ ...p, description: e.target.value }))} className="input-style resize-none" /></Field>
              </div>
            ) : workerProfile.experience.length > 0 ? (
              <div className="space-y-4">
                {workerProfile.experience.map(ex => (
                  <div key={ex.id} className="flex gap-3">
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
            <div className="flex gap-2 mb-3">
              <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="input-style" />
              <button
                onClick={() => {
                  if (!dateInput || workerProfile.availableDates.includes(dateInput)) return;
                  updateWorkerProfile({ availableDates: [...workerProfile.availableDates, dateInput].sort() });
                  setDateInput('');
                }}
                className="px-3 py-2 bg-primary text-white text-xs font-medium rounded-xl"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {workerProfile.availableDates.map(d => (
                <button
                  key={d}
                  onClick={() => updateWorkerProfile({ availableDates: workerProfile.availableDates.filter(date => date !== d) })}
                  className="text-xs px-2.5 py-1 bg-teal-50 text-teal rounded-full border border-teal-100 font-mono-data"
                  title="Remove date"
                >
                  {new Date(d).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
            {!workerProfile.availableDates.length && <p className="text-xs text-stone-400">No specific dates added.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, onEdit, editing, onSave, onCancel, children, editable = true }: {
  title: string; onEdit: () => void; editing: boolean;
  onSave: () => void; onCancel: () => void; children: React.ReactNode; editable?: boolean;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-900">{title}</h3>
        {!editing ? editable && (
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
