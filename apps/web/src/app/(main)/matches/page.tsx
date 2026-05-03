'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { matchApi, interestApi, savedApi } from '@/lib/api';
import { enumLabel, timeAgo, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import MatchBadge from '@/components/profile/MatchBadge';
import VerificationBadgeList from '@/components/profile/VerificationBadges';
import type { MatchResultItem, RecommendedMatchesResponse } from '@/types';

export default function MatchesPage() {
  const router = useRouter();
  const [data, setData] = useState<RecommendedMatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [sentSet, setSentSet] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await matchApi.getRecommended(refresh);
      setData(res);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleViewProfile = (item: MatchResultItem) => {
    sessionStorage.setItem(`profile_${item.userId}`, JSON.stringify(item));
    router.push(`/profile/${item.userId}`);
  };

  const handleSendInterest = async (userId: string) => {
    setSending(userId);
    setActionError('');
    try {
      await interestApi.send({ receiverId: userId });
      setSentSet((s) => new Set([...s, userId]));
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSending(null);
    }
  };

  const handleSave = async (userId: string) => {
    setSaving(userId);
    setActionError('');
    try {
      await savedApi.save(userId);
      setSavedSet((s) => new Set([...s, userId]));
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">Calculating your matches…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-gray-600">{error}</p>
        <button onClick={() => load()} className="btn-secondary mt-4 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommended Matches</h1>
          <p className="text-gray-500 text-sm mt-1">
            Profiles ranked by how well they match your partner preferences.
          </p>
          {data?.lastScoredAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last scored {timeAgo(data.lastScoredAt)}
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-secondary text-sm flex-shrink-0"
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh scores'}
        </button>
      </div>

      {/* No preferences nudge */}
      {data && !data.hasPreferences && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Set partner preferences for better scores</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Scores are more accurate when you fill in your Partner Expectations in your profile.
            </p>
            <a href="/profile/setup" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
              Update preferences →
            </a>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-red-500 font-medium">✕</button>
        </div>
      )}

      {/* Empty state */}
      {data?.items.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">💞</p>
          <p className="font-medium">No matches found yet</p>
          <p className="text-sm mt-1 text-gray-400">
            Matches appear once other approved profiles exist.
          </p>
        </div>
      )}

      {/* Match cards */}
      {data && data.items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((item) => (
            <MatchCard
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
      )}

      {/* Score explanation */}
      <div className="border border-gray-100 rounded-xl px-5 py-4 bg-gray-50 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700 text-sm">How scores are calculated</p>
        <p>Scores (0–100) are computed from your partner preferences against each profile. Criteria: religion (25 pts), age range (20 pts), marital status (15 pts), preferred location (15 pts), education level (15 pts), height range (10 pts).</p>
        <p>No personal data (phone, email, address) is used. Scores are deterministic and cached for 24 hours.</p>
      </div>
    </div>
  );
}

function MatchCard({
  item,
  alreadySent,
  sending,
  alreadySaved,
  saving,
  onViewProfile,
  onSendInterest,
  onSave,
}: {
  item: MatchResultItem;
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
      {/* Avatar + name */}
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

      {/* Match badge */}
      <MatchBadge score={item.matchScore} level={item.matchLevel} size="sm" />

      {/* Match reasons */}
      {item.matchReasons.length > 0 && (
        <ul className="space-y-0.5">
          {item.matchReasons.map((r) => (
            <li key={r} className="text-xs text-green-700 flex items-center gap-1">
              <span>✓</span><span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600">
        {item.religion && <Detail emoji="🕌" text={item.religion} />}
        {(item.division || item.countryOfResidence) && (
          <Detail
            emoji="📍"
            text={[item.division, item.countryOfResidence].filter(Boolean).join(', ')}
          />
        )}
        {item.educationLevel && <Detail emoji="🎓" text={enumLabel(item.educationLevel)} />}
        {item.maritalStatus && <Detail emoji="💒" text={enumLabel(item.maritalStatus)} />}
      </div>

      {/* Verification badges */}
      <VerificationBadgeList badges={item.badges} size="sm" />

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
