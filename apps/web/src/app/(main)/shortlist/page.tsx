'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { savedApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { SavedProfileResponse } from '@/types';

export default function ShortlistPage() {
  const [items, setItems] = useState<SavedProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    savedApi
      .getAll()
      .then(setItems)
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    if (!confirm('Remove from shortlist?')) return;
    setRemoving(id);
    setError('');
    try {
      await savedApi.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shortlist</h1>
        <p className="text-gray-500 text-sm mt-1">{items.length} saved profile{items.length !== 1 ? 's' : ''}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 text-red-500 hover:text-red-700 font-medium">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🔖</p>
          <p className="font-medium">No saved profiles yet</p>
          <p className="text-sm mt-1">Save profiles from search to keep track of them here</p>
          <Link href="/search" className="btn-primary mt-4 inline-flex">Browse Profiles</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center flex-shrink-0">
                {item.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.displayName || 'Unknown'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[item.gender, item.ageYears ? `${item.ageYears} yrs` : null, item.countryOfResidence]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {item.religion && (
                  <p className="text-xs text-gray-400">{item.religion}</p>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/profile/${item.savedUserId}`}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  View
                </Link>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="btn-danger text-xs py-1.5 px-3"
                >
                  {removing === item.id ? '…' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
