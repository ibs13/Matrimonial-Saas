'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type {
  PaymentAttemptResponse,
  PaymentAttemptListResponse,
  PaymentAttemptStatus,
  MembershipPlan,
} from '@/types';

const STATUS_BADGE: Record<PaymentAttemptStatus, string> = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Paid:      'bg-green-100  text-green-800',
  Failed:    'bg-red-100    text-red-800',
  Cancelled: 'bg-gray-100   text-gray-600',
};

const PLAN_BADGE: Record<MembershipPlan, string> = {
  Free:    'bg-gray-100  text-gray-700',
  Basic:   'bg-blue-100  text-blue-700',
  Premium: 'bg-primary-100 text-primary-700',
  Vip:     'bg-amber-100 text-amber-700',
};

const STATUSES: PaymentAttemptStatus[] = ['Pending', 'Paid', 'Failed', 'Cancelled'];
const PLANS: MembershipPlan[] = ['Basic', 'Premium', 'Vip'];

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentAttemptListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    (p: number, status: string, plan: string) => {
      setLoading(true);
      adminApi
        .getPaymentAttempts({
          page: p,
          pageSize: 25,
          status: status || undefined,
          plan: plan || undefined,
        })
        .then(setData)
        .catch((err) => setError(apiError(err)))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(page, statusFilter, planFilter);
  }, [load, page, statusFilter, planFilter]);

  const handleFilter = (status: string, plan: string) => {
    setStatusFilter(status);
    setPlanFilter(plan);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Attempts</h1>
        <p className="text-gray-500 text-sm mt-1">All payment attempts across all users.</p>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => handleFilter(e.target.value, planFilter)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Plan</label>
          <select
            className="input"
            value={planFilter}
            onChange={(e) => handleFilter(statusFilter, e.target.value)}
          >
            <option value="">All plans</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {(statusFilter || planFilter) && (
          <button
            className="btn-secondary text-sm"
            onClick={() => handleFilter('', '')}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {data && data.items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">💳</p>
              <p className="font-medium">No payment attempts found</p>
              {(statusFilter || planFilter) && (
                <p className="text-sm mt-1">Try clearing the filters.</p>
              )}
            </div>
          ) : (
            <>
              {data && (
                <p className="text-sm text-gray-500">
                  {data.totalCount} attempt{data.totalCount !== 1 ? 's' : ''}
                  {statusFilter && ` · ${statusFilter}`}
                  {planFilter && ` · ${planFilter} plan`}
                </p>
              )}

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Gateway</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data?.items.map((attempt) => (
                      <AttemptRow key={attempt.id} attempt={attempt} />
                    ))}
                  </tbody>
                </table>
              </div>

              {data && data.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="flex items-center text-sm text-gray-600 px-2">
                    Page {page} of {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.totalPages}
                    className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function AttemptRow({ attempt }: { attempt: PaymentAttemptResponse }) {
  const status = attempt.status as PaymentAttemptStatus;
  const plan   = attempt.plan   as MembershipPlan;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 truncate max-w-[180px]">{attempt.userEmail}</p>
        <p className="text-xs text-gray-400 font-mono">{attempt.orderId.slice(0, 8)}…</p>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${PLAN_BADGE[plan]}`}>{attempt.plan}</span>
      </td>
      <td className="px-4 py-3 font-semibold text-gray-900">
        ৳{attempt.amountBdt.toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${STATUS_BADGE[status]}`}>{attempt.status}</span>
        {attempt.failureReason && (
          <p className="text-xs text-red-500 mt-0.5 max-w-[140px] truncate" title={attempt.failureReason}>
            {attempt.failureReason}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">
        {attempt.gatewayName ?? <span className="text-gray-300">—</span>}
        {attempt.gatewayTransactionId && (
          <p className="text-xs font-mono text-gray-400 truncate max-w-[120px]">
            {attempt.gatewayTransactionId}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {formatDate(attempt.attemptedAt)}
        {attempt.completedAt && (
          <p className="text-xs text-gray-400">Done {formatDate(attempt.completedAt)}</p>
        )}
      </td>
    </tr>
  );
}
