'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { notificationApi, chatApi } from '@/lib/api';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/search', label: 'Search' },
  { href: '/matches', label: 'Matches' },
  { href: '/chat', label: 'Chat' },
  { href: '/shortlist', label: 'Shortlist' },
  { href: '/interests/sent', label: 'Sent' },
  { href: '/interests/received', label: 'Received' },
  { href: '/profile/viewers', label: 'Viewers' },
  { href: '/membership', label: 'Plans' },
  { href: '/billing', label: 'Billing' },
  { href: '/support', label: 'Support' },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Admin Dashboard' },
  { href: '/admin/profiles', label: 'Review Queue' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/support', label: 'Support Queue' },
];

export default function Navbar() {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCounts = async () => {
      try {
        const [notif, chat] = await Promise.allSettled([
          notificationApi.getUnreadCount(),
          chatApi.getUnreadCount(),
        ]);
        if (notif.status === 'fulfilled') setUnreadCount(notif.value.count);
        if (chat.status === 'fulfilled') setUnreadMessages(chat.value.count);
      } catch {
        // silently ignore — badges are non-critical
      }
    };

    fetchCounts();
    const timer = setInterval(fetchCounts, 60_000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">💍</span>
            <span className="font-bold text-primary-700 text-lg hidden sm:block">MatrimonialBD</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {l.label}
                {l.href === '/chat' && unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin &&
              adminLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(l.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <Link href="/profile/setup" className="btn-primary hidden sm:inline-flex">
              My Profile
            </Link>

            {/* Notification bell */}
            <Link
              href="/notifications"
              className={`relative p-2 rounded-lg transition-colors ${
                pathname === '/notifications'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center text-sm">
                  {user?.email?.[0]?.toUpperCase() ?? '?'}
                </div>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                    <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 truncate">
                      {user?.email}
                    </p>
                    <Link
                      href="/profile/setup"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      Edit Profile
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          href="/admin/profiles"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin — Review Queue
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 pb-2 overflow-x-auto">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
                isActive(l.href)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {l.label}
              {l.href === '/chat' && unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </Link>
          ))}
          {isAdmin &&
            adminLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive(l.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
