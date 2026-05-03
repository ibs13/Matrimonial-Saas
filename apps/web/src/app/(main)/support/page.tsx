'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supportApi } from '@/lib/api';
import { formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { TicketResponse, TicketStatus } from '@/types';

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open:       'bg-blue-100 text-blue-800',
  InProgress: 'bg-amber-100 text-amber-800',
  Resolved:   'bg-green-100 text-green-800',
  Closed:     'bg-gray-100 text-gray-600',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await supportApi.getAll({ page: p, pageSize: 15 });
      setTickets(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-500 text-sm mt-1">{totalCount} ticket{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/support/new" className="btn-primary">
          + New Ticket
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : tickets.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎫</p>
          <p className="font-medium">No support tickets yet</p>
          <p className="text-sm mt-1">Create a ticket if you need help.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/support/${t.id}`}
              className="card block hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{t.category}</span>
                  </div>
                  <p className="font-medium text-gray-900 mt-1.5 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.messageCount} message{t.messageCount !== 1 ? 's' : ''} · Updated {formatDate(t.updatedAt)}
                  </p>
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => { setPage(page - 1); load(page - 1); }}
            disabled={page <= 1}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-gray-600 px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => { setPage(page + 1); load(page + 1); }}
            disabled={page >= totalPages}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
