'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chatApi } from '@/lib/api';
import { timeAgo, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { ConversationListItem } from '@/types';

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await chatApi.getConversations();
      setConversations(data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chat is available after an interest request is accepted.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {conversations.length === 0 && !error && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">No conversations yet</p>
          <p className="text-sm mt-1 text-gray-400">
            Accept an interest request to start chatting.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {conversations.map((conv) => (
          <li key={conv.conversationId}>
            <button
              onClick={() => router.push(`/chat/${conv.otherUserId}`)}
              className="w-full text-left card hover:shadow-md transition-shadow flex items-center gap-3"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {conv.otherPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={conv.otherPhotoUrl}
                    alt={conv.otherDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  conv.otherDisplayName[0]?.toUpperCase() ?? '?'
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-semibold truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {conv.otherDisplayName}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                    {conv.lastMessageAt && (
                      <span className="text-xs text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
                    )}
                  </div>
                </div>
                <p className={`text-sm truncate mt-0.5 ${
                  conv.isBlocked ? 'text-red-400 italic' :
                  conv.isClosed ? 'text-orange-400 italic' :
                  conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                }`}>
                  {conv.isBlocked
                    ? 'Blocked'
                    : conv.isClosed
                    ? 'Closed by admin'
                    : conv.lastMessage ?? 'No messages yet'}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
