'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi, interestApi, authApi, membershipApi } from '@/lib/api';
import { statusBadgeClass, enumLabel, formatDate, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { ProfileResponse, InterestListResponse, ProfileCompletionField, UserMembershipResponse, MembershipPlan } from '@/types';

export default function DashboardPage() {
  const { user, isEmailVerified, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sent, setSent] = useState<InterestListResponse | null>(null);
  const [received, setReceived] = useState<InterestListResponse | null>(null);
  const [membership, setMembership] = useState<UserMembershipResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    Promise.all([
      profileApi.getMe().catch((e) => {
        if (e?.response?.status === 404) setNoProfile(true);
        return null;
      }),
      interestApi.getSent({ page: 1, pageSize: 5 }).catch(() => null),
      interestApi.getReceived({ page: 1, pageSize: 5 }).catch(() => null),
      membershipApi.getMe().catch(() => null),
    ]).then(([p, s, r, m]) => {
      setProfile(p);
      setSent(s);
      setReceived(r);
      setMembership(m);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const pendingReceived = received?.items.filter((i) => i.status === 'Pending').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Email verification banner */}
      {!isEmailVerified && (
        <EmailVerificationBanner onResent={refreshUser} />
      )}

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.basic?.displayName ?? user?.email?.split('@')[0] ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your account.</p>
      </div>

      {/* No profile banner */}
      {noProfile && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 flex items-start gap-4">
          <span className="text-3xl">📝</span>
          <div className="flex-1">
            <h3 className="font-semibold text-primary-800">Set up your profile</h3>
            <p className="text-primary-700 text-sm mt-1">
              Create your matrimonial profile to start connecting with potential matches.
            </p>
          </div>
          <Link href="/profile/setup" className="btn-primary flex-shrink-0">
            Get started
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Profile"
          value={profile ? `${profile.completionPercentage}%` : '—'}
          sub="Complete"
          color="rose"
          href="/profile/setup"
        />
        <StatCard
          label="Status"
          value={profile ? enumLabel(profile.status) : '—'}
          sub="Profile status"
          color="gray"
        />
        <StatCard
          label="Sent"
          value={String(sent?.totalCount ?? '—')}
          sub="Interests sent"
          color="blue"
          href="/interests/sent"
        />
        <StatCard
          label="Received"
          value={String(received?.totalCount ?? '—')}
          sub={`${pendingReceived} pending`}
          color={pendingReceived > 0 ? 'amber' : 'gray'}
          href="/interests/received"
        />
      </div>

      {/* Membership card */}
      {membership && <MembershipCard membership={membership} />}

      {/* Profile card */}
      {profile && (
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Profile</h2>
            <span className={`badge ${statusBadgeClass(profile.status)}`}>
              {enumLabel(profile.status)}
            </span>
          </div>

          {/* Completion bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Profile completion</span>
              <span className="font-medium">{profile.completionPercentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-primary-500 rounded-full transition-all"
                style={{ width: `${profile.completionPercentage}%` }}
              />
            </div>
            {profile.completionPercentage < 60 && (
              <p className="text-xs text-gray-500 mt-1">
                Need 60% to submit for review ({60 - profile.completionPercentage}% more)
              </p>
            )}
          </div>

          {/* Missing fields */}
          {profile.missingFields && profile.missingFields.length > 0 && (
            <MissingFieldsPanel fields={profile.missingFields} />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {profile.basic?.displayName && (
              <InfoPill label="Name" value={profile.basic.displayName} />
            )}
            {profile.ageYears && <InfoPill label="Age" value={`${profile.ageYears} yrs`} />}
            {profile.basic?.religion && (
              <InfoPill label="Religion" value={profile.basic.religion} />
            )}
            {profile.basic?.countryOfResidence && (
              <InfoPill label="Location" value={profile.basic.countryOfResidence} />
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <Link href="/profile/setup" className="btn-secondary">
              Edit profile
            </Link>
            {(profile.status === 'Draft' || profile.status === 'Paused') &&
              profile.completionPercentage >= 60 && (
                <SubmitButton onSuccess={() => setProfile((p) => p ? { ...p, status: 'PendingReview' } : p)} />
              )}
          </div>

          {profile.status === 'PendingReview' && (
            <p className="text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mt-3">
              ⏳ Your profile is under review. We&apos;ll notify you once it&apos;s approved.
            </p>
          )}
          {profile.status === 'Active' && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-3">
              ✅ Your profile is live and visible to other members.
            </p>
          )}
        </div>
      )}

      {/* Recent interests */}
      {(sent || received) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {received && received.items.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Recent Received</h2>
                <Link href="/interests/received" className="text-xs text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-gray-100">
                {received.items.slice(0, 4).map((i) => (
                  <li key={i.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{i.otherDisplayName}</p>
                      <p className="text-xs text-gray-500">
                        {i.otherGender} · {i.otherAgeYears} yrs · {formatDate(i.sentAt)}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        i.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : i.status === 'Accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sent && sent.items.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Recent Sent</h2>
                <Link href="/interests/sent" className="text-xs text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-gray-100">
                {sent.items.slice(0, 4).map((i) => (
                  <li key={i.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{i.otherDisplayName}</p>
                      <p className="text-xs text-gray-500">
                        {i.otherGender} · {i.otherAgeYears} yrs · {formatDate(i.sentAt)}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        i.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : i.status === 'Accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction href="/search" emoji="🔍" label="Browse Profiles" />
          <QuickAction href="/profile/setup" emoji="✏️" label="Edit Profile" />
          <QuickAction href="/interests/received" emoji="💌" label="View Interests" />
          <QuickAction href="/interests/sent" emoji="📤" label="Sent Interests" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    rose: 'text-primary-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    gray: 'text-gray-600',
  };
  const content = (
    <div className="card h-full">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color] ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
  if (href) return <Link href={href} className="block hover:opacity-90 transition-opacity">{content}</Link>;
  return content;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}

function QuickAction({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-primary-50 hover:text-primary-700 transition-colors text-center group"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs font-medium text-gray-700 group-hover:text-primary-700">{label}</span>
    </Link>
  );
}

function EmailVerificationBanner({ onResent: _onResent }: { onResent: () => Promise<void> }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      await authApi.resendVerification();
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">📧</span>
      <div className="flex-1">
        <h3 className="font-semibold text-amber-900 text-sm">Verify your email address</h3>
        <p className="text-amber-800 text-xs mt-0.5">
          Check your inbox for a verification link. You must verify your email before submitting your profile for review.
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {sent && <p className="text-xs text-green-700 mt-1">Verification email sent — check your inbox.</p>}
      </div>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending}
          className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}

function MissingFieldsPanel({ fields }: { fields: ProfileCompletionField[] }) {
  const required = fields.filter((f) => f.isRequired);
  const recommended = fields.filter((f) => !f.isRequired);

  return (
    <div className="mb-4 rounded-lg border border-gray-200 overflow-hidden text-sm">
      {required.length > 0 && (
        <div className="px-4 py-3 bg-rose-50">
          <p className="font-medium text-rose-800 mb-1.5">Required fields missing</p>
          <ul className="flex flex-wrap gap-2">
            {required.map((f) => (
              <li
                key={f.field}
                className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                <span>!</span> {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {recommended.length > 0 && (
        <div className="px-4 py-3 bg-gray-50">
          <p className="font-medium text-gray-700 mb-1.5">Recommended fields</p>
          <ul className="flex flex-wrap gap-2">
            {recommended.map((f) => (
              <li
                key={f.field}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs"
              >
                + {f.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const PLAN_BADGE: Record<MembershipPlan, string> = {
  Free:    'bg-gray-100 text-gray-700',
  Basic:   'bg-blue-100 text-blue-700',
  Premium: 'bg-primary-100 text-primary-700',
  Vip:     'bg-amber-100 text-amber-700',
};

function MembershipCard({ membership }: { membership: UserMembershipResponse }) {
  const plan = membership.plan as MembershipPlan;
  const isUnlimited = membership.monthlyInterestLimit === -1;
  const pct = isUnlimited
    ? 100
    : Math.min(100, Math.round((membership.interestsSentThisMonth / membership.monthlyInterestLimit) * 100));
  const nearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Membership</h2>
        <span className={`badge font-semibold ${PLAN_BADGE[plan]}`}>{plan}</span>
      </div>

      {/* Monthly interest usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Interests sent this month</span>
          <span className={`font-medium ${nearLimit ? 'text-amber-600' : ''}`}>
            {isUnlimited
              ? `${membership.interestsSentThisMonth} / Unlimited`
              : `${membership.interestsSentThisMonth} / ${membership.monthlyInterestLimit}`}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ${nearLimit ? 'bg-amber-400' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {nearLimit && !isUnlimited && (
          <p className="text-xs text-amber-600 mt-1">
            Almost at your monthly limit — upgrade to send more.
          </p>
        )}
      </div>

      {/* Feature flags */}
      <div className="grid grid-cols-3 gap-2 text-xs text-center mb-4">
        <FeaturePill label="Advanced Search" enabled={membership.advancedSearch} />
        <FeaturePill label="Profile Boost"   enabled={membership.profileBoost} />
        <FeaturePill label="Contact Unlock"  enabled={membership.contactUnlock} />
      </div>

      <Link href="/membership" className="btn-secondary text-sm">
        {plan === 'Free' ? 'View plans' : 'Manage plan'}
      </Link>
    </div>
  );
}

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-2 ${enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
      <p className={`font-semibold text-base mb-0.5 ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
        {enabled ? '✓' : '✕'}
      </p>
      <p className={enabled ? 'text-green-700' : 'text-gray-400'}>{label}</p>
    </div>
  );
}

function SubmitButton({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await profileApi.submitForReview();
      onSuccess();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit for Review'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
