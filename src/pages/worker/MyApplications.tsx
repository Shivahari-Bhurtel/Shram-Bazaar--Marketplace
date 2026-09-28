import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { ApplicationStatusBadge } from '../../components/StatusBadge';
import type { ApplicationStatus } from '../../types';

export default function MyApplications() {
  const { myApplications, navigate, state } = useApp();
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');

  const filtered = activeTab === 'all' ? myApplications : myApplications.filter(a => a.status === activeTab);

  const tabs: { key: ApplicationStatus | 'all'; label: string }[] = [
    { key: 'all', label: `All (${myApplications.length})` },
    { key: 'accepted', label: `Accepted (${myApplications.filter(a => a.status === 'accepted').length})` },
    { key: 'shortlisted', label: `Shortlisted (${myApplications.filter(a => a.status === 'shortlisted').length})` },
    { key: 'pending', label: `Applied (${myApplications.filter(a => a.status === 'pending').length})` },
    { key: 'rejected', label: `Not Selected (${myApplications.filter(a => a.status === 'rejected').length})` },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">My Applications</h1>
        <p className="text-stone-500">Track the status of all your job applications.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Applied', value: myApplications.length, color: 'text-stone-900' },
          { label: 'Accepted', value: myApplications.filter(a => a.status === 'accepted').length, color: 'text-green-700' },
          { label: 'Shortlisted', value: myApplications.filter(a => a.status === 'shortlisted').length, color: 'text-amber-700' },
          { label: 'Applied', value: myApplications.filter(a => a.status === 'pending').length, color: 'text-stone-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-4 text-center">
            <div className={`font-display text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-xs text-stone-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="font-semibold text-stone-900 mb-2">No applications here</h3>
          <p className="text-stone-500 text-sm mb-6">
            {activeTab === 'all' ? "You haven't applied to any jobs yet." : `No applications with ${activeTab} status.`}
          </p>
          <button onClick={() => navigate('job-discovery')} className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors">
            Discover Jobs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const job = state.jobs.find(j => j.id === app.jobId);
            return (
              <div key={app.id} className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate('job-detail', app.jobId)}
                      className="font-semibold text-stone-900 hover:text-primary transition-colors text-left leading-snug"
                    >
                      {app.jobTitle}
                    </button>
                    <p className="text-sm text-stone-500 mt-0.5">{app.providerName}</p>
                    {job && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {job.location.split(',').slice(-1)[0].trim()}
                        </span>
                        <span className="text-xs font-semibold text-stone-800 font-mono-data">
                          NPR {job.payment.toLocaleString()}/{job.paymentType.replace('per-', '')}
                        </span>
                        <span className="text-xs text-stone-500">
                          {new Date(job.date).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                </div>

                {/* Cover note */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400 mb-1">Your cover note:</p>
                  <p className="text-sm text-stone-600 italic leading-relaxed line-clamp-2">"{app.coverNote}"</p>
                </div>

                {/* Provider note if rejected/accepted */}
                {app.providerNote && (
                  <div className={`mt-3 p-3 rounded-xl text-sm ${
                    app.status === 'accepted' ? 'bg-green-50 text-green-700' : 'bg-stone-50 text-stone-600'
                  }`}>
                    <span className="font-medium">{app.providerName} says:</span> "{app.providerNote}"
                  </div>
                )}

                {/* Status context message */}
                {app.status === 'accepted' && (
                  <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-green text-lg">🎉</span>
                    <p className="text-sm text-green-700 font-medium">Congratulations! Show up on {job ? new Date(job.date).toLocaleDateString('en-NP', { weekday: 'long', month: 'long', day: 'numeric' }) : 'the job date'}.</p>
                  </div>
                )}
                {app.status === 'shortlisted' && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <p className="text-sm text-amber-700">You've been shortlisted. Final decision coming soon.</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-stone-400 font-mono-data">Applied {app.appliedDate}</span>
                  <button
                    onClick={() => navigate('job-detail', app.jobId)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    View Job →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
