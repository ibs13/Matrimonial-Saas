'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminChatApi } from '@/lib/api';
import { apiError, timeAgo } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { MessageReportItem } from '@/types';

const STATUS_OPTIONS = ['Open', 'Dismissed'];

export default function AdminChatPage() {
  const [items, setItems] = useState<MessageReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Open');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminChatApi.getReports({ status, page, pageSize: 20 });
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDismiss = async (reportId: string) => {
    setActingId(reportId);
    setActionError('');
    try {
      await adminChatApi.dismissReport(reportId);
      setItems((prev) =>
        prev.map((r) => (r.reportId === reportId ? { ...r, status: 'Dismissed' } : r)),
      );
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setActingId(null);
    }
  };

  const handleCloseConversation = async (conversationId: string, reportId: string) => {
    setActingId(reportId + '-close');
    setActionError('');
    try {
      await adminChatApi.closeConversation(conversationId);
      setItems((prev) =>
        prev.map((r) =>
          r.conversationId === conversationId ? { ...r, isConversationClosed: true } : r,
        ),
      );
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat Moderation</h1>
        <p className="text-sm text-gray-500 mt-1">Review and act on reported messages.</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              status === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-3 text-red-400 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="font-medium text-gray-500">No {status.toLowerCase()} reports</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{totalCount} report{totalCount !== 1 ? 's' : ''}</p>

          <div className="space-y-3">
            {items.map((r) => (
              <div key={r.reportId} className="card space-y-3">
                {/* Message bubble preview */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 border border-gray-100">
                  <p className="font-medium text-gray-500 text-xs mb-1">
                    From <span className="font-semibold text-gray-700">{r.senderName}</span>
                  </p>
                  <p className="break-words">{r.messageBody}</p>
                </div>

                {/* Report details */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                  <span>
                    Reported by <span className="font-medium text-gray-700">{r.reporterName}</span>
                  </span>
                  <span>Reason: <span className="font-medium text-gray-700">{r.reason}</span></span>
                  <span>{timeAgo(r.createdAt)}</span>
                  {r.isConversationClosed && (
                    <span className="text-orange-600 font-medium">Conversation closed</span>
                  )}
                </div>

                {/* Actions */}
                {r.status === 'Open' && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleDismiss(r.reportId)}
                      disabled={actingId === r.reportId}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {actingId === r.reportId ? 'Dismissing…' : 'Dismiss report'}
                    </button>

                    {!r.isConversationClosed && (
                      <button
                        onClick={() => handleCloseConversation(r.conversationId, r.reportId)}
                        disabled={actingId === r.reportId + '-close'}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {actingId === r.reportId + '-close' ? 'Closing…' : 'Close conversation'}
                      </button>
                    )}
                  </div>
                )}

                {r.status === 'Dismissed' && (
                  <span className="inline-block text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    Dismissed
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm disabled:opacity-40"
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
