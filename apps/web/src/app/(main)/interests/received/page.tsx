'use client';

import { useEffect, useState, useCallback } from 'react';
import { interestApi } from '@/lib/api';
import { interestStatusClass, formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { InterestRequestResponse } from '@/types';

const STATUS_OPTIONS = ['', 'Pending', 'Accepted', 'Rejected'] as const;

export default function ReceivedInterestsPage() {
  const [items, setItems] = useState<InterestRequestResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async (p: number, status: string) => {
    setLoading(true);
    try {
      const res = await interestApi.getReceived({
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

  const handleAccept = async (id: string) => {
    setActionId(id);
    try {
      const updated = await interestApi.accept(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      alert(apiError(err));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this interest request?')) return;
    setActionId(id);
    try {
      const updated = await interestApi.reject(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      alert(apiError(err));
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = items.filter((i) => i.status === 'Pending').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Received Interests</h1>
        <p className="text-gray-500 text-sm mt-1">
          {totalCount} total{pendingCount > 0 && ` · ${pendingCount} pending`}
        </p>
      </div>

      {/* Filter tabs */}
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
          <p className="text-4xl mb-3">💌</p>
          <p className="font-medium">No interests received yet</p>
          <p className="text-sm mt-1">Make sure your profile is active and complete</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InterestCard
              key={item.id}
              item={item}
              isActing={actionId === item.id}
              onAccept={() => handleAccept(item.id)}
              onReject={() => handleReject(item.id)}
            />
          ))}
        </div>
      )}

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

function InterestCard({
  item,
  isActing,
  onAccept,
  onReject,
}: {
  item: InterestRequestResponse;
  isActing: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className={`card flex items-start gap-4 ${item.status === 'Pending' ? 'border-l-4 border-l-primary-400' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {item.otherDisplayName?.[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{item.otherDisplayName}</p>
          <span className={`badge ${interestStatusClass(item.status)}`}>{item.status}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {[item.otherGender, item.otherAgeYears ? `${item.otherAgeYears} yrs` : null, item.otherCountryOfResidence]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {item.message && (
          <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-sm text-gray-700 italic">&ldquo;{item.message}&rdquo;</p>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">{formatDate(item.sentAt)}</p>
        {item.respondedAt && (
          <p className="text-xs text-gray-400">Responded {formatDate(item.respondedAt)}</p>
        )}

        {/* Actions */}
        {item.status === 'Pending' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={onAccept}
              disabled={isActing}
              className="btn-primary text-sm py-1.5 px-4"
            >
              {isActing ? '…' : 'Accept'}
            </button>
            <button
              onClick={onReject}
              disabled={isActing}
              className="btn-secondary text-sm py-1.5 px-4"
            >
              Decline
            </button>
          </div>
        )}

        {item.status === 'Accepted' && (
          <p className="text-sm text-green-700 mt-2">
            ✅ You&apos;ve accepted this interest. Contact information is now shared.
          </p>
        )}
      </div>
    </div>
  );
}
