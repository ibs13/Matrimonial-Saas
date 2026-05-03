'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { AdminTicketItem, AdminTicketDetailResponse, TicketStatus, TicketCategory } from '@/types';

const STATUSES: TicketStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];
const CATEGORIES: TicketCategory[] = ['Payment', 'Profile', 'Report', 'Account', 'Other'];

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open:       'bg-blue-100 text-blue-800',
  InProgress: 'bg-amber-100 text-amber-800',
  Resolved:   'bg-green-100 text-green-800',
  Closed:     'bg-gray-100 text-gray-600',
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminTicketDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async (p: number, status: string, category: string) => {
    setLoadingList(true);
    try {
      const res = await adminApi.getSupportTickets({
        page: p,
        pageSize: 20,
        status: status || undefined,
        category: category || undefined,
      });
      setTickets(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(1, statusFilter, categoryFilter); }, [loadList, statusFilter, categoryFilter]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages]);

  const handleSelect = async (id: string) => {
    setSelected(id);
    setDetail(null);
    setActionError('');
    setActionSuccess('');
    setLoadingDetail(true);
    try {
      const d = await adminApi.getSupportTicketDetail(id);
      setDetail(d);
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    setActionError('');
    try {
      const updated = await adminApi.replySupportTicket(selected, reply.trim());
      setDetail(updated);
      setReply('');
      setActionSuccess('Reply sent.');
      await loadList(page, statusFilter, categoryFilter);
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selected) return;
    setUpdating(true);
    setActionError('');
    try {
      const updated = await adminApi.updateTicketStatus(selected, newStatus);
      setDetail(updated);
      setActionSuccess(`Status changed to ${newStatus}.`);
      await loadList(page, statusFilter, categoryFilter);
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin — Support Tickets</h1>
        <p className="text-gray-500 text-sm mt-1">{totalCount} total tickets</p>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-red-500 font-medium">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="ml-4 text-green-500 font-medium">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="input w-40 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="input w-40 text-sm"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Ticket list */}
        <div className="lg:col-span-2 space-y-2">
          {loadingList ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : tickets.length === 0 ? (
            <div className="card text-center py-10 text-gray-500">
              <p className="text-3xl mb-2">✅</p>
              <p>No tickets found</p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`w-full text-left card hover:shadow-md transition-all ${selected === t.id ? 'ring-2 ring-primary-500' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`badge text-xs ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{t.category}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500 truncate">{t.userEmail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.messageCount} msg · {formatDate(t.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex gap-1 pt-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPage(p); loadList(p, statusFilter, categoryFilter); }}
                  className={`w-8 h-8 rounded text-xs ${p === page ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className="lg:col-span-3">
          {!selected && (
            <div className="card flex items-center justify-center h-48 text-gray-400 text-sm">
              Select a ticket to view
            </div>
          )}
          {selected && loadingDetail && (
            <div className="card flex justify-center py-12"><Spinner /></div>
          )}
          {selected && detail && !loadingDetail && (
            <div className="card space-y-4">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`badge ${STATUS_COLORS[detail.status]}`}>{detail.status}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{detail.category}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{detail.subject}</h2>
                <p className="text-sm text-gray-500">{detail.userEmail}</p>
                <p className="text-xs text-gray-400 mt-0.5">Opened {formatDate(detail.createdAt)}</p>
              </div>

              {/* Status selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Change status:</span>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={updating || detail.status === s}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      detail.status === s
                        ? `${STATUS_COLORS[s]} border-transparent cursor-default`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {detail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      msg.isStaff
                        ? 'bg-primary-50 border border-primary-100 ml-6'
                        : 'bg-gray-50 border border-gray-200 mr-6'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${msg.isStaff ? 'text-primary-700' : 'text-gray-700'}`}>
                        {msg.isStaff ? '🛡 Support' : '👤 User'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply form */}
              {detail.status !== 'Closed' ? (
                <form onSubmit={handleReply} className="space-y-2 pt-2 border-t border-gray-100">
                  <textarea
                    className="input h-20 resize-none text-sm"
                    placeholder="Write a reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="btn-primary text-sm"
                  >
                    {sending ? 'Sending…' : '🛡 Send Reply'}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-400 italic pt-2 border-t border-gray-100">
                  Ticket is closed — change status to re-open.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
