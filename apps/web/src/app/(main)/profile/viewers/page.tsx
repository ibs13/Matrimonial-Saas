'use client';

import { useEffect, useState, useCallback } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, timeAgo, enumLabel } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { ProfileViewerItem, ProfileViewersResponse } from '@/types';

export default function ViewersPage() {
  const [data, setData] = useState<ProfileViewersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await profileApi.getViewers({ page: p, pageSize: 20 });
      setData(result);
      setPage(p);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Who Viewed My Profile</h1>
        {data && (
          <p className="text-sm text-gray-500 mt-0.5">
            {data.totalCount === 0
              ? 'No views recorded yet.'
              : `${data.totalCount} unique viewer${data.totalCount !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👁️</p>
          <p className="font-medium text-gray-700">No profile views yet</p>
          <p className="text-sm text-gray-500 mt-1">
            When other members view your profile, they&apos;ll appear here.
            Make sure your profile is active and visible.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {data?.items.map((viewer) => (
              <ViewerCard key={viewer.viewerUserId} viewer={viewer} />
            ))}
          </ul>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {data.totalPages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= data.totalPages || loading}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Only members with active, visible profiles are shown here.
      </p>
    </div>
  );
}

function ViewerCard({ viewer }: { viewer: ProfileViewerItem }) {
  const initials = viewer.displayName?.[0]?.toUpperCase() ?? '?';

  const meta = [
    viewer.gender,
    viewer.ageYears ? `${viewer.ageYears} yrs` : null,
    viewer.countryOfResidence,
    viewer.division,
  ]
    .filter(Boolean)
    .map((v) => enumLabel(v!))
    .join(' · ');

  return (
    <li className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-4 py-3">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {viewer.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={viewer.photoUrl}
            alt={viewer.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{viewer.displayName}</p>
        {meta && <p className="text-sm text-gray-500 truncate">{meta}</p>}
      </div>

      {/* Time */}
      <p className="text-xs text-gray-400 flex-shrink-0">{timeAgo(viewer.viewedAt)}</p>
    </li>
  );
}
