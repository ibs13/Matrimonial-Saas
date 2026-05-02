'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchApi, interestApi, savedApi } from '@/lib/api';
import { enumLabel, timeAgo, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type {
  SearchResultItem,
  SearchProfilesRequest,
  Gender,
  Religion,
  MaritalStatus,
  EducationLevel,
  EmploymentType,
} from '@/types';

const GENDERS: Gender[] = ['Male', 'Female'];
const RELIGIONS: Religion[] = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'];
const MARITAL_STATUSES: MaritalStatus[] = ['NeverMarried', 'Divorced', 'Widowed', 'Separated'];
const EDUCATION_LEVELS: EducationLevel[] = ['BelowSSC', 'SSC', 'HSC', 'Diploma', 'Bachelor', 'Masters', 'PhD', 'PostDoc'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['Employed', 'SelfEmployed', 'BusinessOwner', 'Student', 'Unemployed'];

const defaultFilters: SearchProfilesRequest = {
  sortBy: 'LastActive',
  page: 1,
  pageSize: 20,
  maritalStatuses: [],
  employmentTypes: [],
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
  const [limitReached, setLimitReached] = useState(false);

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
    setLimitReached(false);
    try {
      await interestApi.send({ receiverId: userId });
      setSentSet((s) => new Set([...s, userId]));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setLimitReached(true);
      } else {
        setSendError(apiError(err));
      }
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

  const toggleMaritalStatus = (v: MaritalStatus) =>
    setFilters((f) => {
      const cur = f.maritalStatuses ?? [];
      return {
        ...f,
        maritalStatuses: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
      };
    });

  const toggleEmploymentType = (v: EmploymentType) =>
    setFilters((f) => {
      const cur = f.employmentTypes ?? [];
      return {
        ...f,
        employmentTypes: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
      };
    });

  const handleClear = () => {
    setFilters(defaultFilters);
    setResults([]);
    setSearched(false);
    setSearchError('');
  };

  const activeFilterCount = [
    filters.gender,
    filters.religion,
    filters.ageMin,
    filters.ageMax,
    filters.countryOfResidence,
    filters.division,
    filters.district,
    filters.minEducationLevel,
  ].filter(Boolean).length
    + (filters.maritalStatuses?.length ?? 0)
    + (filters.employmentTypes?.length ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Your Match</h1>
        <p className="text-gray-500 mt-1">Search from active profiles below.</p>
      </div>

      {/* Filter form */}
      <form onSubmit={handleSearch} className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 font-medium px-2 py-0.5 rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>

        {/* Core single-value filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Looking for</label>
            <select
              className="input"
              value={filters.gender ?? ''}
              onChange={(e) => set('gender', e.target.value)}
            >
              <option value="">Any gender</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Religion</label>
            <select
              className="input"
              value={filters.religion ?? ''}
              onChange={(e) => set('religion', e.target.value)}
            >
              <option value="">Any religion</option>
              {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Age from</label>
            <input
              type="number" min={18} max={80} className="input"
              value={filters.ageMin ?? ''}
              onChange={(e) => set('ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="18"
            />
          </div>

          <div>
            <label className="label">Age to</label>
            <input
              type="number" min={18} max={80} className="input"
              value={filters.ageMax ?? ''}
              onChange={(e) => set('ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="60"
            />
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
            <label className="label">District</label>
            <input
              type="text" className="input"
              value={filters.district ?? ''}
              onChange={(e) => set('district', e.target.value)}
              placeholder="e.g. Gazipur"
            />
          </div>

          <div>
            <label className="label">Min Education</label>
            <select
              className="input"
              value={filters.minEducationLevel ?? ''}
              onChange={(e) => set('minEducationLevel', e.target.value)}
            >
              <option value="">Any level</option>
              {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{enumLabel(l)}</option>)}
            </select>
          </div>
        </div>

        {/* Marital status checkboxes */}
        <div>
          <p className="label mb-2">Marital status</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {MARITAL_STATUSES.map((ms) => (
              <label key={ms} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={filters.maritalStatuses?.includes(ms) ?? false}
                  onChange={() => toggleMaritalStatus(ms)}
                />
                <span className="text-sm text-gray-700">{enumLabel(ms)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Employment type checkboxes */}
        <div>
          <p className="label mb-2">Employment status</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {EMPLOYMENT_TYPES.map((et) => (
              <label key={et} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={filters.employmentTypes?.includes(et) ?? false}
                  onChange={() => toggleEmploymentType(et)}
                />
                <span className="text-sm text-gray-700">{enumLabel(et)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sort + actions */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="label">Sort by</label>
            <select
              className="input"
              value={filters.sortBy ?? 'LastActive'}
              onChange={(e) => set('sortBy', e.target.value)}
            >
              <option value="LastActive">Recently active</option>
              <option value="Newest">Newest</option>
              <option value="Completion">Most complete</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button type="button" className="btn-secondary" onClick={handleClear}>
            Clear
          </button>
        </div>
      </form>

      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Search failed: {searchError}
        </div>
      )}

      {limitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Monthly interest limit reached</p>
            <p className="text-xs text-amber-700 mt-0.5">Upgrade your plan to send more interests this month.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/membership" className="btn-primary text-xs py-1.5 px-3">Upgrade plan</Link>
            <button onClick={() => setLimitReached(false)} className="text-amber-500 hover:text-amber-700 font-medium">✕</button>
          </div>
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
            Showing {results.length} of {totalCount} profile{totalCount !== 1 ? 's' : ''}
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

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => handlePage((filters.page ?? 1) - 1)}
                disabled={(filters.page ?? 1) <= 1}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex items-center text-sm text-gray-600 px-2">
                Page {filters.page ?? 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePage((filters.page ?? 1) + 1)}
                disabled={(filters.page ?? 1) >= totalPages}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
              >
                Next
              </button>
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
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={item.displayName} className="w-full h-full object-cover" />
          ) : (
            item.displayName?.[0]?.toUpperCase() ?? '?'
          )}
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
        {(item.division || item.countryOfResidence) && (
          <Detail
            emoji="📍"
            text={[item.division, item.district, item.countryOfResidence].filter(Boolean).join(', ')}
          />
        )}
        {item.educationLevel && <Detail emoji="🎓" text={enumLabel(item.educationLevel)} />}
        {item.maritalStatus && <Detail emoji="💒" text={enumLabel(item.maritalStatus)} />}
        {item.employmentType && <Detail emoji="💼" text={enumLabel(item.employmentType)} />}
      </div>

      {/* Completion bar */}
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
          {saving ? '…' : '🔖'}
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

