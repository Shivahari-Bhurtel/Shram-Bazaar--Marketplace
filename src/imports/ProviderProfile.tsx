import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { VerifiedBadge } from '../../components/StatusBadge';
import { DISTRICTS } from '../../data/mockData';

export default function ProviderProfile() {
  const { state, updateProviderProfile } = useApp();
  const { providerProfile } = state;
  const [editing, setEditing] = useState(false);
  const [tempData, setTempData] = useState<any>({});
  const [saved, setSaved] = useState(false);

  if (!providerProfile) return null;

  const startEdit = () => {
    setEditing(true);
    setSaved(false);
    setTempData({
      orgName: providerProfile.orgName,
      contactName: providerProfile.contactName,
      phone: providerProfile.phone,
      location: providerProfile.location,
      district: providerProfile.district,
      industry: providerProfile.industry,
      description: providerProfile.description,
    });
  };

  const saveEdit = () => {
    updateProviderProfile(tempData);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const industries = ['Information Technology', 'Hospitality & Tourism', 'Healthcare', 'Construction', 'Events & Entertainment', 'Retail', 'Manufacturing', 'Education', 'Finance & Banking', 'NGO / INGO', 'Other'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">Organisation Profile</h1>
          <p className="text-stone-500">Manage your organisation's public profile.</p>
        </div>
        {saved && (
          <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fade-in">✓ Saved</span>
        )}
      </div>

      {/* Header card */}
      <div className="bg-gradient-to-r from-primary-dark to-primary rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
          <img src={providerProfile.logo} alt={providerProfile.orgName} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-xl font-bold text-white">{providerProfile.orgName}</h2>
            {providerProfile.verified && <VerifiedBadge small />}
          </div>
          <p className="text-white/70 text-sm">{providerProfile.industry} · {providerProfile.location}</p>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-white/70 text-sm">{providerProfile.totalHires} workers hired</span>
            <span className="text-white/30">·</span>
            <div className="flex items-center gap-1">
              <span className="text-amber text-sm">★</span>
              <span className="text-white font-medium">{providerProfile.rating}</span>
              <span className="text-white/40 text-xs">({providerProfile.reviewCount} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* Main info */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Organisation Details</h3>
              {!editing ? (
                <button onClick={startEdit} className="text-xs text-primary hover:underline font-medium">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="text-xs text-stone-500 hover:text-stone-700">Cancel</button>
                  <button onClick={saveEdit} className="text-xs font-medium text-white bg-primary px-2.5 py-1 rounded-lg hover:bg-primary-dark transition-colors">Save</button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Organisation Name', key: 'orgName', type: 'text' },
                  { label: 'Contact Person', key: 'contactName', type: 'text' },
                  { label: 'Phone', key: 'phone', type: 'tel' },
                  { label: 'Location', key: 'location', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-stone-600 block mb-1">{f.label}</label>
                    <input
                      type={f.type} value={tempData[f.key] ?? ''}
                      onChange={e => setTempData((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      className="input-style"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">District</label>
                  <select value={tempData.district} onChange={e => setTempData((p: any) => ({ ...p, district: e.target.value }))} className="input-style">
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Industry</label>
                  <select value={tempData.industry} onChange={e => setTempData((p: any) => ({ ...p, industry: e.target.value }))} className="input-style">
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-stone-600 block mb-1">Organisation Description</label>
                  <textarea
                    value={tempData.description} rows={4}
                    onChange={e => setTempData((p: any) => ({ ...p, description: e.target.value }))}
                    className="input-style resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: 'Organisation', value: providerProfile.orgName },
                  { label: 'Contact Person', value: providerProfile.contactName },
                  { label: 'Phone', value: providerProfile.phone },
                  { label: 'Email', value: providerProfile.email },
                  { label: 'Location', value: providerProfile.location },
                  { label: 'District', value: providerProfile.district },
                  { label: 'Industry', value: providerProfile.industry },
                  { label: 'PAN Number', value: providerProfile.pan },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-mono-data mb-0.5">{item.label}</p>
                    <p className="text-sm text-stone-800">{item.value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-mono-data mb-0.5">Description</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{providerProfile.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Verification */}
          <div className={`rounded-2xl p-5 border ${providerProfile.verified ? 'bg-teal-50 border-teal-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              {providerProfile.verified ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2.5" className="w-5 h-5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span className="font-semibold text-teal">Verified Provider</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" className="w-5 h-5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span className="font-semibold text-amber-800">Verification Pending</span>
                </>
              )}
            </div>
            <p className="text-xs leading-relaxed text-stone-600">
              {providerProfile.verified
                ? `Verified on ${providerProfile.verifiedDate}. Your Verified badge increases worker trust and application rates.`
                : 'Submit your PAN number and business registration documents to get verified. Workers trust verified providers more.'}
            </p>
            {!providerProfile.verified && (
              <button className="mt-3 w-full py-2 bg-amber-600 text-white text-xs font-medium rounded-xl hover:bg-amber-700 transition-colors">
                Start Verification
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-4">Hiring Stats</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Workers Hired', value: providerProfile.totalHires },
                { label: 'Provider Rating', value: `${providerProfile.rating} ★` },
                { label: 'Worker Reviews', value: providerProfile.reviewCount },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center">
                  <span className="text-sm text-stone-500">{s.label}</span>
                  <span className="font-semibold text-stone-900 font-mono-data">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust tips */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
            <h3 className="font-semibold text-stone-900 mb-3 text-sm">Build Worker Trust</h3>
            <div className="space-y-2 text-xs text-stone-500">
              <p>✓ Complete organisation description</p>
              <p>✓ Verify your PAN registration</p>
              <p>✓ Post detailed job descriptions</p>
              <p>✓ Respond to applicants promptly</p>
              <p>✓ Maintain high worker ratings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
