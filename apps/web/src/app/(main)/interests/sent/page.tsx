'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { interestApi } from '@/lib/api';
import { interestStatusClass, formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { InterestRequestResponse } from '@/types';

const STATUS_OPTIONS = ['', 'Pending', 'Accepted', 'Rejected', 'Cancelled'] as const;

export default function SentInterestsPage() {
  const [items, setItems] = useState<InterestRequestResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async (p: number, status: string) => {
    setLoading(true);
    try {
      const res = await interestApi.getSent({
        page: p,
        pageSize: 20,
        status: status || undefined,
      });
      setItems(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, statusFilter);
  }, [load, page, statusFilter]);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this interest request?')) return;
    setCancelling(id);
    try {
      await interestApi.cancel(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'Cancelled' } : i))
      );
    } catch (err) {
      alert(apiError(err));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sent Interests</h1>
          <p className="text-gray-500 text-sm mt-1">{totalCount} total</p>
        </div>
        <Link href="/search" className="btn-primary">
          Browse Profiles
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              statusFilter === s
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📤</p>
          <p className="font-medium">No sent interests</p>
          <p className="text-sm mt-1">Browse profiles to send your first interest</p>
          <Link href="/search" className="btn-primary mt-4 inline-flex">Browse Profiles</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center flex-shrink-0">
                {item.otherDisplayName?.[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 truncate">{item.otherDisplayName}</p>
                  <span className={`badge ${interestStatusClass(item.status)}`}>{item.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[item.otherGender, item.otherAgeYears ? `${item.otherAgeYears} yrs` : null, item.otherCountryOfResidence]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {item.message && (
                  <p className="text-xs text-gray-600 mt-1 italic truncate">&ldquo;{item.message}&rdquo;</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.sentAt)}</p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    sessionStorage.setItem(`profile_${item.otherUserId}`, JSON.stringify({
                      userId: item.otherUserId,
                      displayName: item.otherDisplayName,
                      gender: item.otherGender,
                      ageYears: item.otherAgeYears,
                      countryOfResidence: item.otherCountryOfResidence,
                      division: item.otherDivision,
                      completionPercentage: 0,
                    }));
                    window.location.href = `/profile/${item.otherUserId}`;
                  }}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  View
                </button>
                {item.status === 'Pending' && (
                  <button
                    onClick={() => handleCancel(item.id)}
                    disabled={cancelling === item.id}
                    className="btn-danger text-xs py-1.5 px-3"
                  >
                    {cancelling === item.id ? '…' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
