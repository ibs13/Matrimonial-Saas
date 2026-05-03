'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { MessageResponse, MessageThreadResponse } from '@/types';

export default function ChatThreadPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [thread, setThread] = useState<MessageThreadResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [blocking, setBlocking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const myId = user?.id ?? '';

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThread = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await chatApi.getThread(userId, { page: 1, pageSize: 50 });
        setThread(data);
        setMessages(data.messages);
        setError('');
        // Mark incoming messages as read
        chatApi.markRead(userId).catch(() => undefined);
      } catch (err) {
        setError(apiError(err));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Scroll to bottom when messages load or new ones arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll every 10 seconds for new messages
  useEffect(() => {
    const timer = setInterval(() => loadThread(true), 10_000);
    return () => clearInterval(timer);
  }, [loadThread]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    setSending(true);
    setSendError('');
    try {
      const msg = await chatApi.sendMessage(userId, text);
      setMessages((prev) => [...prev, msg]);
      setBody('');
    } catch (err) {
      setSendError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  const handleBlock = async () => {
    setBlocking(true);
    try {
      await chatApi.blockUser(userId);
      await loadThread(true);
    } catch (err) {
      setSendError(apiError(err));
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async () => {
    setBlocking(true);
    try {
      await chatApi.unblockUser(userId);
      await loadThread(true);
    } catch (err) {
      setSendError(apiError(err));
    } finally {
      setBlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => router.back()} className="btn-secondary text-sm">
          Go back
        </button>
      </div>
    );
  }

  const isBlocked = thread?.isBlocked ?? false;
  const otherName = thread?.otherDisplayName ?? 'User';
  const otherPhoto = thread?.otherPhotoUrl;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <button
          onClick={() => router.push('/chat')}
          className="text-gray-500 hover:text-gray-800 transition-colors"
          aria-label="Back to conversations"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
          {otherPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherPhoto} alt={otherName} className="w-full h-full object-cover" />
          ) : (
            otherName[0]?.toUpperCase() ?? '?'
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{otherName}</p>
          {isBlocked && (
            <p className="text-xs text-red-500">Blocked</p>
          )}
        </div>

        {/* Block / Unblock */}
        <div className="relative">
          {isBlocked ? (
            <button
              onClick={handleUnblock}
              disabled={blocking}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {blocking ? '…' : 'Unblock'}
            </button>
          ) : (
            <button
              onClick={handleBlock}
              disabled={blocking}
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              {blocking ? '…' : 'Block'}
            </button>
          )}
        </div>
      </div>

      {/* Blocked notice */}
      {isBlocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 mt-3 text-center">
          Messaging is disabled — one of you has blocked the other.
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-12">
            No messages yet. Say hello!
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === myId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                  isMine
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-primary-200' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMine && (
                    <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>
                  )}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          <span>{sendError}</span>
          <button onClick={() => setSendError('')} className="ml-3 text-red-400 font-bold">✕</button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 pt-3 border-t border-gray-200"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder={isBlocked ? 'Messaging disabled' : 'Type a message… (Enter to send)'}
          disabled={isBlocked || sending}
          maxLength={1000}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          type="submit"
          disabled={isBlocked || sending || !body.trim()}
          className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Spinner size="sm" /> : 'Send'}
        </button>
      </form>
    </div>
  );
}
