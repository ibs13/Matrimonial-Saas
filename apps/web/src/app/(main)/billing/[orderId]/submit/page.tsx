'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { orderApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { OrderResponse } from '@/types';

const GATEWAYS = ['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank Transfer', 'Other'];

export default function SubmitPaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loadError, setLoadError] = useState('');

  const [gateway, setGateway] = useState('bKash');
  const [txnId, setTxnId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    orderApi
      .getMine({ page: 1, pageSize: 50 })
      .then((res) => {
        const found = res.items.find((o) => o.id === orderId);
        if (!found) {
          setLoadError('Order not found.');
        } else if (found.status !== 'Pending') {
          setLoadError(`This order is already ${found.status.toLowerCase()} and cannot accept new payments.`);
        } else {
          setOrder(found);
        }
      })
      .catch((err) => setLoadError(apiError(err)));
  }, [orderId]);

  const handleSubmit = async () => {
    if (!txnId.trim()) {
      setSubmitError('Transaction ID is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await orderApi.submitPayment(orderId, {
        gatewayName: gateway,
        transactionId: txnId.trim(),
        notes: notes.trim() || undefined,
      });
      router.push('/billing?submitted=1');
    } catch (err) {
      setSubmitError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{loadError}</p>
        <button onClick={() => router.push('/billing')} className="btn-secondary mt-4 text-sm">
          ← Back to billing
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        onClick={() => router.push('/billing')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        ← Back to billing
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Payment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter your mobile banking transaction details. Our team will verify within 24 hours.
        </p>
      </div>

      {/* Order summary */}
      <div className="card bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{order.plan} Plan</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.durationDays}-day subscription</p>
          </div>
          <p className="text-xl font-bold text-gray-900">৳{order.amountBdt.toLocaleString()}</p>
        </div>
      </div>

      {/* Rejected attempt banner */}
      {order.latestAttemptStatus === 'Failed' && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-medium text-red-800">Previous attempt was rejected</p>
          {order.latestFailureReason && (
            <p className="text-xs text-red-600 mt-0.5">{order.latestFailureReason}</p>
          )}
          <p className="text-xs text-red-600 mt-1">Please submit a new transaction ID.</p>
        </div>
      )}

      {/* Payment form */}
      <div className="card space-y-5">
        <div>
          <label className="label">Payment method</label>
          <select
            className="input"
            value={gateway}
            onChange={(e) => setGateway(e.target.value)}
          >
            {GATEWAYS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Transaction ID <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="input font-mono"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            maxLength={128}
            placeholder="e.g. 8J3K9F2A1B"
          />
          <p className="text-xs text-gray-400 mt-1">
            Send ৳{order.amountBdt.toLocaleString()} to our {gateway} number, then paste the TrxID here.
          </p>
        </div>

        <div>
          <label className="label">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            className="input h-20 resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            placeholder="Any additional information…"
          />
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Submitting…' : 'Submit for verification'}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">
        Payments are manually verified. You will receive a notification once approved.
      </p>
    </div>
  );
}
