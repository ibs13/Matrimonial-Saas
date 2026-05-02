'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { apiError, timeAgo } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { AdminDashboardMetrics } from '@/types';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getMetrics()
      .then(setData)
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Users */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Users" value={data.totalUsers} />
          <StatCard label="Email Verified" value={data.verifiedUsers} />
          <StatCard label="New (7 days)" value={data.newUsersLast7Days} accent />
        </div>
      </section>

      {/* Profiles */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Profiles</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Draft" value={data.draftProfiles} />
          <StatCard label="Pending Review" value={data.pendingProfiles} accent={data.pendingProfiles > 0} />
          <StatCard label="Approved" value={data.approvedProfiles} />
          <StatCard label="Suspended" value={data.suspendedProfiles} danger={data.suspendedProfiles > 0} />
        </div>
      </section>

      {/* Moderation */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Moderation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Active Reports" value={data.activeReports} danger={data.activeReports > 0} />
          <StatCard label="Pending Photos" value={data.pendingPhotos} accent={data.pendingPhotos > 0} />
          <StatCard label="Interests Sent" value={data.totalInterests} />
        </div>
      </section>

      {/* Interests */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Interests</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Requests" value={data.totalInterests} />
          <StatCard label="Accepted" value={data.acceptedInterests} />
          <StatCard
            label="Acceptance Rate"
            value={data.totalInterests > 0
              ? `${Math.round((data.acceptedInterests / data.totalInterests) * 100)}%`
              : '—'}
          />
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h2>
        {data.recentActivity.length === 0 ? (
          <div className="card text-center py-10 text-gray-400 text-sm">No admin actions recorded yet.</div>
        ) : (
          <ul className="space-y-2">
            {data.recentActivity.map((item, i) => (
              <li key={i} className="card py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="font-mono text-primary-700">{item.action}</span>
                    {' '}
                    <span className="text-gray-500 font-normal">on {item.entityType}</span>
                  </p>
                  {item.reason && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Reason: {item.reason}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{item.adminEmail}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{timeAgo(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-4 bg-white ${
      danger ? 'border-red-200' : accent ? 'border-primary-200' : 'border-gray-100'
    }`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${
        danger ? 'text-red-600' : accent ? 'text-primary-700' : 'text-gray-900'
      }`}>
        {value}
      </p>
    </div>
  );
}
