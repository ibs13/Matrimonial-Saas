'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { orderApi } from '@/lib/api';
import { formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { OrderResponse, OrderListResponse, OrderStatus } from '@/types';

const STATUS_BADGE: Record<OrderStatus, string> = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Paid:      'bg-green-100  text-green-800',
  Failed:    'bg-red-100    text-red-800',
  Cancelled: 'bg-gray-100   text-gray-600',
  Expired:   'bg-orange-100 text-orange-700',
};

export default function BillingPage() {
  const [data, setData] = useState<OrderListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    orderApi
      .getMine({ page, pageSize: 20 })
      .then(setData)
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing History</h1>
          <p className="text-gray-500 text-sm mt-1">Your past and pending plan orders.</p>
        </div>
        <Link href="/membership" className="btn-secondary text-sm">
          View plans
        </Link>
      </div>

      {/* Gateway notice */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-500">
        <span className="font-medium text-gray-700">Payment integration coming soon.</span>{' '}
        Orders are created when you choose a plan. Payment processing will be enabled in a future release.
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      {!loading && !error && data && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">🧾</p>
              <p className="font-medium">No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here once you choose a paid plan.</p>
              <Link href="/membership" className="btn-primary mt-4 inline-block">
                Browse plans
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{data.totalCount} order{data.totalCount !== 1 ? 's' : ''} total</p>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                {data.items.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>

              {data.totalPages > 1 && (
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

function OrderRow({ order }: { order: OrderResponse }) {
  const status = order.status as OrderStatus;
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors">
      {/* Plan icon */}
      <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 font-bold flex items-center justify-center flex-shrink-0 text-sm">
        {order.plan[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{order.plan} Plan</p>
          <span className={`badge text-xs ${STATUS_BADGE[status]}`}>{order.status}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {order.durationDays}-day subscription · {order.attemptCount} payment attempt{order.attemptCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-gray-900">৳{order.amountBdt.toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {order.paidAt ? `Paid ${formatDate(order.paidAt)}` : formatDate(order.createdAt)}
        </p>
      </div>
    </div>
  );
}
