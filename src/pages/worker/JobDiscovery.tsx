import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import JobCard from '../../components/JobCard';
import { DISTRICTS, ALL_SKILLS } from '../../data/mockData';
import type { JobCategory, WorkType } from '../../types';

type SortOption = 'match' | 'payment-high' | 'payment-low' | 'newest' | 'deadline';

export default function JobDiscovery() {
  const { state } = useApp();
  const { jobs } = state;

  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCategory, setFilterCategory] = useState<JobCategory | ''>('');
  const [filterWorkType, setFilterWorkType] = useState<WorkType | ''>('');
  const [filterPayMin, setFilterPayMin] = useState('');
  const [filterSkill, setFilterSkill] = useState(state.discoverySkill);
  const [filterDate, setFilterDate] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('match');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => setFilterSkill(state.discoverySkill), [state.discoverySkill]);

  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'active' || j.status === 'filled'), [jobs]);

  const filtered = useMemo(() => {
    return activeJobs
      .filter(job => {
        if (search) {
          const s = search.toLowerCase();
          if (!job.title.toLowerCase().includes(s) &&
              !job.providerName.toLowerCase().includes(s) &&
              !job.location.toLowerCase().includes(s) &&
              !job.skillsRequired.some(sk => sk.toLowerCase().includes(s))) {
            return false;
          }
        }
        if (filterDistrict && job.district !== filterDistrict) return false;
        if (filterCategory && job.category !== filterCategory) return false;
        if (filterWorkType && job.workType !== filterWorkType) return false;
        if (filterPayMin && job.payment < Number(filterPayMin)) return false;
        if (filterSkill && !job.skillsRequired.some(s => s.toLowerCase().includes(filterSkill.toLowerCase()))) return false;
        if (filterDate && job.date !== filterDate) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        if (sortBy === 'payment-high') return b.payment - a.payment;
        if (sortBy === 'payment-low') return a.payment - b.payment;
        if (sortBy === 'newest') return b.postedDate.localeCompare(a.postedDate);
        if (sortBy === 'deadline') return a.deadline.localeCompare(b.deadline);
        return 0;
      });
  }, [activeJobs, search, filterDistrict, filterCategory, filterWorkType, filterPayMin, filterSkill, filterDate, sortBy]);

  const activeFiltersCount = [filterDistrict, filterCategory, filterWorkType, filterPayMin, filterSkill, filterDate].filter(Boolean).length;

  const clearFilters = () => {
    setFilterDistrict(''); setFilterCategory(''); setFilterWorkType('');
    setFilterPayMin(''); setFilterSkill(''); setFilterDate('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">Discover Jobs</h1>
        <p className="text-stone-500">{filtered.length} jobs available · sorted by your profile match</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by job title, skill, or provider…"
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 border rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
            activeFiltersCount > 0
              ? 'bg-primary text-white border-primary'
              : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-white text-primary rounded-full text-xs font-bold flex items-center justify-center">{activeFiltersCount}</span>
          )}
        </button>

        <select
          value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white text-stone-700"
        >
          <option value="match">Best Match</option>
          <option value="payment-high">Highest Pay</option>
          <option value="payment-low">Lowest Pay</option>
          <option value="newest">Newest</option>
          <option value="deadline">Deadline Soon</option>
        </select>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-900">Filters</h3>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline">Clear all</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">District</label>
              <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
                <option value="">All districts</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as any)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
                <option value="">All categories</option>
                <option value="qualified">Qualified / Professional</option>
                <option value="skill-based">Skill Based</option>
                <option value="beginner-friendly">Beginner Friendly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Work Type</label>
              <select value={filterWorkType} onChange={e => setFilterWorkType(e.target.value as any)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
                <option value="">All types</option>
                <option value="full-day">Full Day</option>
                <option value="half-day">Half Day</option>
                <option value="multi-day">Multi-Day</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Min Pay (NPR/day)</label>
              <input type="number" value={filterPayMin} onChange={e => setFilterPayMin(e.target.value)} placeholder="e.g. 1000" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Skill</label>
              <input type="text" value={filterSkill} onChange={e => setFilterSkill(e.target.value)} placeholder="e.g. Electrical" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Date</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* Category quick filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { key: '', label: 'All Jobs', count: activeJobs.length },
          { key: 'qualified', label: '🎓 Qualified', count: activeJobs.filter(j => j.category === 'qualified').length },
          { key: 'skill-based', label: '🔧 Skill Based', count: activeJobs.filter(j => j.category === 'skill-based').length },
          { key: 'beginner-friendly', label: '🤝 Beginner', count: activeJobs.filter(j => j.category === 'beginner-friendly').length },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilterCategory(btn.key as any)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filterCategory === btn.key
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
            }`}
          >
            {btn.label}
            <span className={`text-xs ${filterCategory === btn.key ? 'text-white/60' : 'text-stone-400'}`}>{btn.count}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-16 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-semibold text-stone-900 mb-2">No jobs found</h3>
          <p className="text-stone-500 text-sm mb-4">Try adjusting your search or removing some filters.</p>
          <button onClick={clearFilters} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
