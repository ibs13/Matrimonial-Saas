'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please check your email and try again.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(apiError(err));
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-5">
        {status === 'loading' && (
          <>
            <Spinner size="lg" />
            <p className="text-gray-600 text-sm">Verifying your email address…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl">✅</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Email verified!</h1>
              <p className="text-gray-500 text-sm mt-2">
                Your email address has been confirmed. You can now submit your profile for review.
              </p>
            </div>
            <Link href="/dashboard" className="btn-primary inline-flex">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl">❌</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Verification failed</h1>
              <p className="text-red-600 text-sm mt-2 bg-red-50 rounded-lg px-3 py-2">{message}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="btn-secondary inline-flex justify-center">
                Go to Dashboard
              </Link>
              <p className="text-xs text-gray-400">
                You can request a new verification email from your dashboard.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
