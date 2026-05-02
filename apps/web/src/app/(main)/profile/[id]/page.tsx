'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { interestApi, profileApi, reportApi } from '@/lib/api';
import { enumLabel, timeAgo, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import type { SearchResultItem, ReportReason, ContactStatusResponse, ContactBlockReason } from '@/types';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'Fake', label: 'Fake profile / stolen identity' },
  { value: 'Inappropriate', label: 'Inappropriate content' },
  { value: 'Scam', label: 'Scam or fraud' },
  { value: 'Harassment', label: 'Harassment' },
  { value: 'Other', label: 'Other' },
];

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<SearchResultItem | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('Fake');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    const cached = sessionStorage.getItem(`profile_${id}`);
    if (cached) {
      try {
        setProfile(JSON.parse(cached));
      } catch {
        router.replace('/search');
      }
    } else {
      router.replace('/search');
    }
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    profileApi.getPhotoForProfile(id)
      .then((res) => setPhotoUrl(res.photoUrl))
      .catch(() => {});
    profileApi.recordView(id).catch(() => {});
  }, [id]);

  const handleSubmitReport = async () => {
    setReportSubmitting(true);
    setReportError('');
    try {
      await reportApi.submit(id, { reason: reportReason, description: reportDescription.trim() || undefined });
      setReportDone(true);
      setShowReportForm(false);
    } catch (err) {
      setReportError(apiError(err));
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleSendInterest = async () => {
    setSending(true);
    setError('');
    try {
      await interestApi.send({ receiverId: id, message: message.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to search
      </button>

      {/* Profile header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-600 font-bold text-3xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoUrl} alt={profile.displayName} className="w-full h-full object-cover" />
              : (profile.displayName?.[0]?.toUpperCase() ?? '?')
            }
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
            <p className="text-gray-500 mt-1">
              {[
                profile.gender,
                profile.ageYears ? `${profile.ageYears} years` : null,
                profile.maritalStatus ? enumLabel(profile.maritalStatus) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {profile.lastActiveAt && (
              <p className="text-xs text-gray-400 mt-1">Active {timeAgo(profile.lastActiveAt)}</p>
            )}

            {/* Completion */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-[160px]">
                <div
                  className="h-2 bg-primary-400 rounded-full"
                  style={{ width: `${profile.completionPercentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{profile.completionPercentage}% complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Profile Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Religion" value={profile.religion} />
          <Field label="Education" value={profile.educationLevel ? enumLabel(profile.educationLevel) : undefined} />
          <Field label="Employment" value={profile.employmentType ? enumLabel(profile.employmentType) : undefined} />
          <Field label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : undefined} />
          <Field label="Country" value={profile.countryOfResidence} />
          <Field label="Division" value={profile.division} />
          {profile.district && <Field label="District" value={profile.district} />}
        </dl>
      </div>

      {/* Contact section */}
      <ContactSection profileId={id} />

      {/* Send Interest */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Send Interest</h2>
        {sent ? (
          <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-lg px-4 py-3">
            <span className="text-xl">✅</span>
            <p>Interest sent! They will be notified.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="label">Personal message <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="input h-24 resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={300}
                placeholder="Introduce yourself or share why you're interested…"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/300</p>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
            )}
            <button
              onClick={handleSendInterest}
              disabled={sending}
              className="btn-primary"
            >
              {sending ? 'Sending…' : 'Send Interest'}
            </button>
          </>
        )}
      </div>

      {/* Report Profile */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Report Profile</h2>
          {!reportDone && !showReportForm && (
            <button
              onClick={() => setShowReportForm(true)}
              className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2"
            >
              Report this profile
            </button>
          )}
        </div>

        {reportDone && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            Report submitted. Our team will review it.
          </p>
        )}

        {showReportForm && !reportDone && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Reason</label>
              <select
                className="input"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as ReportReason)}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Additional details <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="input h-20 resize-none"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                maxLength={500}
                placeholder="Provide any additional context…"
              />
            </div>
            {reportError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{reportError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
                className="btn-danger text-sm"
              >
                {reportSubmitting ? 'Submitting…' : 'Submit Report'}
              </button>
              <button
                onClick={() => { setShowReportForm(false); setReportError(''); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contact Section ───────────────────────────────────────────────────────────

function ContactSection({ profileId }: { profileId: string }) {
  const [status, setStatus] = useState<ContactStatusResponse | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    profileApi.getContact(profileId).then(setStatus).catch(() => {});
  }, [profileId]);

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError('');
    try {
      const result = await profileApi.unlockContact(profileId);
      setStatus(result);
    } catch (err) {
      setUnlockError(apiError(err));
    } finally {
      setUnlocking(false);
    }
  };

  // Not loaded yet, or own profile — render nothing
  if (!status || status.blockReason === 'OwnProfile') return null;

  if (status.isUnlocked) {
    const hasAny = status.email || status.phone || status.guardianPhone || status.presentAddress;
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔓</span>
          <h2 className="font-semibold text-gray-900">Contact Details</h2>
        </div>
        {hasAny ? (
          <dl className="space-y-3">
            {status.email && (
              <ContactField icon="✉️" label="Email" value={status.email} />
            )}
            {status.phone && (
              <ContactField icon="📞" label="Phone" value={status.phone} />
            )}
            {status.guardianPhone && (
              <ContactField icon="📞" label="Guardian / Wali" value={status.guardianPhone} />
            )}
            {status.presentAddress && (
              <ContactField icon="📍" label="Present Address" value={status.presentAddress} />
            )}
            {status.permanentAddress && (
              <ContactField icon="🏠" label="Permanent Address" value={status.permanentAddress} />
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">
            This member has not added contact details yet.
          </p>
        )}
      </div>
    );
  }

  // Locked — show the appropriate state
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔒</span>
        <h2 className="font-semibold text-gray-900">Contact Details</h2>
      </div>
      <LockedState
        blockReason={status.blockReason}
        canUnlock={status.canUnlock}
        unlocking={unlocking}
        unlockError={unlockError}
        onUnlock={handleUnlock}
      />
    </div>
  );
}

function LockedState({
  blockReason,
  canUnlock,
  unlocking,
  unlockError,
  onUnlock,
}: {
  blockReason?: ContactBlockReason;
  canUnlock: boolean;
  unlocking: boolean;
  unlockError: string;
  onUnlock: () => void;
}) {
  if (blockReason === 'NoPlan') {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-5 text-center">
        <p className="font-medium text-amber-900">Premium or VIP plan required</p>
        <p className="text-sm text-amber-700 mt-1">
          Upgrade your membership to view phone, email, and address information.
        </p>
        <Link href="/membership" className="btn-primary mt-3 inline-block text-sm">
          View plans
        </Link>
      </div>
    );
  }

  if (blockReason === 'NoAcceptedInterest') {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-5 text-center">
        <p className="font-medium text-gray-800">Accept each other&apos;s interest first</p>
        <p className="text-sm text-gray-500 mt-1">
          Contact details become available after a mutual interest is accepted.
        </p>
        <Link href="/interests/received" className="btn-secondary mt-3 inline-block text-sm">
          View received interests
        </Link>
      </div>
    );
  }

  if (canUnlock) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-5 text-center">
        <p className="font-medium text-green-800">Contact details available</p>
        <p className="text-sm text-green-700 mt-1">
          Your interest was accepted. Click below to reveal contact information.
        </p>
        {unlockError && (
          <p className="text-sm text-red-600 mt-2">{unlockError}</p>
        )}
        <button
          onClick={onUnlock}
          disabled={unlocking}
          className="btn-primary mt-3 text-sm"
        >
          {unlocking ? 'Unlocking…' : 'Reveal contact details'}
        </button>
      </div>
    );
  }

  return null;
}

function ContactField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="text-sm text-gray-900 mt-0.5 break-all">{value}</dd>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
    </div>
  );
}
