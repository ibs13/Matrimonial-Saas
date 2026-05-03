'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supportApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import type { TicketCategory } from '@/types';

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'Payment',  label: 'Payment issue' },
  { value: 'Profile',  label: 'Profile help' },
  { value: 'Report',   label: 'Report a problem' },
  { value: 'Account',  label: 'Account question' },
  { value: 'Other',    label: 'Other' },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory>('Other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 5) { setError('Subject must be at least 5 characters.'); return; }
    if (body.trim().length < 10)   { setError('Message must be at least 10 characters.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const ticket = await supportApi.create({ category, subject: subject.trim(), body: body.trim() });
      router.push(`/support/${ticket.id}`);
    } catch (err) {
      setError(apiError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to support
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New Support Ticket</h1>
        <p className="text-gray-500 text-sm mt-1">Describe your issue and we&apos;ll get back to you.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Subject</label>
          <input
            type="text"
            className="input"
            placeholder="Brief summary of your issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{subject.length}/120</p>
        </div>

        <div>
          <label className="label">Message</label>
          <textarea
            className="input h-36 resize-none"
            placeholder="Describe your issue in detail…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{body.length}/2000</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit Ticket'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
