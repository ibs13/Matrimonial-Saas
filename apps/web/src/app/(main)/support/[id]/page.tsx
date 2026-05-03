'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supportApi } from '@/lib/api';
import { formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { TicketDetailResponse, TicketStatus } from '@/types';

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open:       'bg-blue-100 text-blue-800',
  InProgress: 'bg-amber-100 text-amber-800',
  Resolved:   'bg-green-100 text-green-800',
  Closed:     'bg-gray-100 text-gray-600',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supportApi.getDetail(id)
      .then(setTicket)
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const updated = await supportApi.addMessage(id, reply.trim());
      setTicket(updated);
      setReply('');
    } catch (err) {
      setSendError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12 text-gray-500">
          <p className="text-3xl mb-2">⚠️</p>
          <p>{error || 'Ticket not found.'}</p>
          <button onClick={() => router.back()} className="btn-secondary mt-4 text-sm">Go back</button>
        </div>
      </div>
    );
  }

  const isClosed = ticket.status === 'Closed';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to support
      </button>

      {/* Ticket header */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`badge ${STATUS_COLORS[ticket.status]}`}>{ticket.status}</span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{ticket.category}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-xs text-gray-400 mt-1">Opened {formatDate(ticket.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {ticket.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl px-4 py-3 text-sm ${
              msg.isStaff
                ? 'bg-primary-50 border border-primary-100 ml-8'
                : 'bg-white border border-gray-200 mr-8'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-semibold ${msg.isStaff ? 'text-primary-700' : 'text-gray-700'}`}>
                {msg.isStaff ? '🛡 Support Team' : 'You'}
              </span>
              <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply form */}
      {isClosed ? (
        <div className="card text-center py-6 text-gray-500 text-sm">
          This ticket is closed. <Link href="/support/new" className="text-primary-600 hover:underline">Open a new ticket</Link> if you need further help.
        </div>
      ) : (
        <form onSubmit={handleSend} className="card space-y-3">
          <label className="label">Add a reply</label>
          <textarea
            className="input h-24 resize-none"
            placeholder="Type your message…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-gray-400 text-right">{reply.length}/2000</p>
          {sendError && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{sendError}</p>
          )}
          <button type="submit" disabled={sending || !reply.trim()} className="btn-primary">
            {sending ? 'Sending…' : 'Send Reply'}
          </button>
        </form>
      )}
    </div>
  );
}

function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return <a href={href} className={className}>{children}</a>;
}
