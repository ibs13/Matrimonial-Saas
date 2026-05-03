import type { VerificationBadges } from '@/types';

const BADGES: {
  key: keyof VerificationBadges;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: 'identityVerified', label: 'Identity Verified', icon: '🪪', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'profileApproved',  label: 'Profile Approved',  icon: '✅', color: 'bg-green-100 text-green-800 border-green-200' },
  { key: 'emailVerified',    label: 'Email Verified',    icon: '✉️', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { key: 'phoneAdded',       label: 'Phone Added',       icon: '📞', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { key: 'photoApproved',    label: 'Photo Approved',    icon: '📷', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'isPremium',        label: 'Premium Member',    icon: '⭐', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

export default function VerificationBadgeList({
  badges,
  size = 'md',
}: {
  badges?: VerificationBadges;
  size?: 'sm' | 'md';
}) {
  if (!badges) return null;

  const active = BADGES.filter((b) => badges[b.key]);
  if (active.length === 0) return null;

  const cls = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-1 gap-1';

  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map((b) => (
        <span
          key={b.key}
          title={b.label}
          className={`inline-flex items-center rounded-full border font-medium ${cls} ${b.color}`}
        >
          <span>{b.icon}</span>
          <span>{b.label}</span>
        </span>
      ))}
    </div>
  );
}
