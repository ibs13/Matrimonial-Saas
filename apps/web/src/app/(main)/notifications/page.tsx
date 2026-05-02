'use client';

import { useEffect, useState, useCallback } from 'react';
import { notificationApi } from '@/lib/api';
import { apiError, timeAgo } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { NotificationResponse, NotificationListResponse } from '@/types';

const TYPE_ICON: Record<string, string> = {
  InterestReceived: '💌',
  InterestAccepted: '✅',
  InterestRejected: '❌',
  ProfileApproved: '🎉',
  ProfileRejected: '⚠️',
  PhotoApproved: '🖼️',
  PhotoRejected: '🚫',
  ReportReviewed: '📋',
};

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await notificationApi.getAll({ page: p, pageSize: 20 });
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

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: Math.max(0, prev.unreadCount - 1),
              items: prev.items.map((n) =>
                n.id === id ? { ...n, isRead: true } : n
              ),
            }
          : prev
      );
    } catch {
      // ignore — non-critical
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationApi.markAllAsRead();
      setData((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: 0,
              items: prev.items.map((n) => ({ ...n, isRead: true })),
            }
          : prev
      );
    } catch (err) {
      setError(apiError(err));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {data && data.unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {data.unreadCount} unread
            </p>
          )}
        </div>
        {data && data.unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="btn-secondary text-sm py-1.5 px-3"
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
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
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium text-gray-700">No notifications yet</p>
          <p className="text-sm text-gray-500 mt-1">
            You&apos;ll see updates about interests, profile reviews, and more here.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {data?.items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={handleMarkAsRead}
              />
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
    </div>
  );
}

function NotificationItem({
  notification: n,
  onMarkRead,
}: {
  notification: NotificationResponse;
  onMarkRead: (id: string) => void;
}) {
  const icon = TYPE_ICON[n.type] ?? '🔔';

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors cursor-default ${
        n.isRead
          ? 'bg-white border-gray-100'
          : 'bg-primary-50 border-primary-100'
      }`}
    >
      <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${n.isRead ? 'font-normal text-gray-800' : 'font-semibold text-gray-900'}`}>
          {n.title}
        </p>
        <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
      </div>

      {!n.isRead && (
        <button
          onClick={() => onMarkRead(n.id)}
          className="flex-shrink-0 text-xs text-primary-600 hover:text-primary-800 font-medium mt-0.5 whitespace-nowrap"
          title="Mark as read"
        >
          Mark read
        </button>
      )}
    </li>
  );
}
