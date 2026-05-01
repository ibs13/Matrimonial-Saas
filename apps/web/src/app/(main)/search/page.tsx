'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchApi, interestApi, savedApi } from '@/lib/api';
import { enumLabel, timeAgo, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { SearchResultItem, SearchProfilesRequest, Gender, Religion, MaritalStatus, EducationLevel } from '@/types';

const GENDERS: Gender[] = ['Male', 'Female'];
const RELIGIONS: Religion[] = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'];
const EDUCATION_LEVELS: EducationLevel[] = ['BelowSSC', 'SSC', 'HSC', 'Diploma', 'Bachelor', 'Masters', 'PhD', 'PostDoc'];
const MARITAL_STATUSES: MaritalStatus[] = ['NeverMarried', 'Divorced', 'Widowed', 'Separated'];

const defaultFilters: SearchProfilesRequest = {
  sortBy: 'LastActive',
  page: 1,
  pageSize: 20,
};

export default function SearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchProfilesRequest>(defaultFilters);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [searchError, setSearchError] = useState('');
  const [sendError, setSendError] = useState('');

  const doSearch = useCallback(async (f: SearchProfilesRequest) => {
    setLoading(true);
    setSearchError('');
    try {
      const res = await searchApi.search(f);
      setResults(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setSearched(true);
    } catch (err) {
      setSearchError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const f = { ...filters, page: 1 };
    setFilters(f);
    doSearch(f);
  };

  const handlePage = (p: number) => {
    const f = { ...filters, page: p };
    setFilters(f);
    doSearch(f);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendInterest = async (userId: string) => {
    setSending(userId);
    setSendError('');
    try {
      await interestApi.send({ receiverId: userId });
      setSentSet((s) => new Set([...s, userId]));
    } catch (err) {
      setSendError(apiError(err));
    } finally {
      setSending(null);
    }
  };

  const handleSave = async (userId: string) => {
    setSaving(userId);
    try {
      await savedApi.save(userId);
      setSavedSet((s) => new Set([...s, userId]));
    } catch (err) {
      setSendError(apiError(err));
    } finally {
      setSaving(null);
    }
  };

  const handleViewProfile = (item: SearchResultItem) => {
    sessionStorage.setItem(`profile_${item.userId}`, JSON.stringify(item));
    router.push(`/profile/${item.userId}`);
  };

  const set = (key: keyof SearchProfilesRequest, value: unknown) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Your Match</h1>
        <p className="text-gray-500 mt-1">Search from active profiles below.</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Filters</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Looking for</label>
            <select className="input" value={filters.gender ?? ''} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Any gender</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Religion</label>
            <select className="input" value={filters.religion ?? ''} onChange={(e) => set('religion', e.target.value)}>
              <option value="">Any religion</option>
              {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Age min</label>
            <input
              type="number" min={18} max={80} className="input"
              value={filters.ageMin ?? ''}
              onChange={(e) => set('ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="18"
            />
          </div>

          <div>
            <label className="label">Age max</label>
            <input
              type="number" min={18} max={80} className="input"
              value={filters.ageMax ?? ''}
              onChange={(e) => set('ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="60"
            />
          </div>

          <div>
            <label className="label">Min Education</label>
            <select className="input" value={filters.minEducationLevel ?? ''} onChange={(e) => set('minEducationLevel', e.target.value)}>
              <option value="">Any level</option>
              {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{enumLabel(l)}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Country</label>
            <input
              type="text" className="input"
              value={filters.countryOfResidence ?? ''}
              onChange={(e) => set('countryOfResidence', e.target.value)}
              placeholder="e.g. Bangladesh"
            />
          </div>

          <div>
            <label className="label">Division</label>
            <input
              type="text" className="input"
              value={filters.division ?? ''}
              onChange={(e) => set('division', e.target.value)}
              placeholder="e.g. Dhaka"
            />
          </div>

          <div>
            <label className="label">Sort by</label>
            <select
              className="input"
              value={filters.sortBy ?? 'LastActive'}
              onChange={(e) => set('sortBy', e.target.value)}
            >
              <option value="LastActive">Last Active</option>
              <option value="Newest">Newest</option>
              <option value="Completion">Completion</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setFilters(defaultFilters); setResults([]); setSearched(false); }}
          >
            Clear
          </button>
        </div>
      </form>

      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Search failed: {searchError}
        </div>
      )}

      {sendError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>Could not send interest: {sendError}</span>
          <button onClick={() => setSendError('')} className="ml-4 text-red-500 hover:text-red-700 font-medium">✕</button>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No profiles found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="text-sm text-gray-500">
            Showing {results.length} of {totalCount} profiles
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => (
              <ProfileCard
                key={item.userId}
                item={item}
                alreadySent={sentSet.has(item.userId)}
                sending={sending === item.userId}
                alreadySaved={savedSet.has(item.userId)}
                saving={saving === item.userId}
                onViewProfile={() => handleViewProfile(item)}
                onSendInterest={() => handleSendInterest(item.userId)}
                onSave={() => handleSave(item.userId)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === (filters.page ?? 1)
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProfileCard({
  item,
  alreadySent,
  sending,
  alreadySaved,
  saving,
  onViewProfile,
  onSendInterest,
  onSave,
}: {
  item: SearchResultItem;
  alreadySent: boolean;
  sending: boolean;
  alreadySaved: boolean;
  saving: boolean;
  onViewProfile: () => void;
  onSendInterest: () => void;
  onSave: () => void;
}) {
  return (
    <div className="card flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-lg flex items-center justify-center flex-shrink-0">
          {item.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{item.displayName}</p>
          <p className="text-xs text-gray-500">
            {[item.gender, item.ageYears ? `${item.ageYears} yrs` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
        {item.religion && <Detail emoji="🕌" text={item.religion} />}
        {item.countryOfResidence && <Detail emoji="📍" text={item.division ? `${item.division}, ${item.countryOfResidence}` : item.countryOfResidence} />}
        {item.educationLevel && <Detail emoji="🎓" text={enumLabel(item.educationLevel)} />}
        {item.maritalStatus && <Detail emoji="💒" text={enumLabel(item.maritalStatus)} />}
      </div>

      {/* Completion */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
          <div
            className="h-1.5 bg-primary-400 rounded-full"
            style={{ width: `${item.completionPercentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{item.completionPercentage}%</span>
      </div>

      {item.lastActiveAt && (
        <p className="text-xs text-gray-400">Active {timeAgo(item.lastActiveAt)}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <button onClick={onViewProfile} className="btn-secondary text-xs py-1.5 px-3">
          View
        </button>
        <button
          onClick={onSendInterest}
          disabled={alreadySent || sending}
          className={`flex-1 text-xs py-1.5 ${alreadySent ? 'btn-secondary opacity-60 cursor-not-allowed' : 'btn-primary'}`}
        >
          {alreadySent ? '✓ Sent' : sending ? '…' : 'Send Interest'}
        </button>
        <button
          onClick={onSave}
          disabled={alreadySaved || saving}
          title={alreadySaved ? 'Saved' : 'Save to shortlist'}
          className={`text-xs py-1.5 px-2.5 rounded-lg border transition-colors ${
            alreadySaved
              ? 'bg-amber-50 border-amber-300 text-amber-600 cursor-not-allowed'
              : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
          }`}
        >
          {saving ? '…' : alreadySaved ? '🔖' : '🔖'}
        </button>
      </div>
    </div>
  );
}

function Detail({ emoji, text }: { emoji: string; text: string }) {
  return (
    <span className="flex items-center gap-1 truncate">
      <span>{emoji}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}
