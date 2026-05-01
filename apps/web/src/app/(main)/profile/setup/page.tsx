'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { profileApi } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import BasicStep from '@/components/profile/steps/BasicStep';
import PhysicalStep from '@/components/profile/steps/PhysicalStep';
import EducationStep from '@/components/profile/steps/EducationStep';
import CareerStep from '@/components/profile/steps/CareerStep';
import FamilyStep from '@/components/profile/steps/FamilyStep';
import ReligionStep from '@/components/profile/steps/ReligionStep';
import LifestyleStep from '@/components/profile/steps/LifestyleStep';
import PartnerExpectationsStep from '@/components/profile/steps/PartnerExpectationsStep';
import ContactStep from '@/components/profile/steps/ContactStep';
import VisibilityStep from '@/components/profile/steps/VisibilityStep';
import { statusBadgeClass, enumLabel, apiError } from '@/lib/utils';
import type { ProfileResponse } from '@/types';

const STEPS = [
  { id: 0, label: 'Basic', emoji: '👤' },
  { id: 1, label: 'Physical', emoji: '🏋️' },
  { id: 2, label: 'Education', emoji: '🎓' },
  { id: 3, label: 'Career', emoji: '💼' },
  { id: 4, label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { id: 5, label: 'Religion', emoji: '🕌' },
  { id: 6, label: 'Lifestyle', emoji: '🌱' },
  { id: 7, label: 'Partner', emoji: '💑' },
  { id: 8, label: 'Contact', emoji: '📱' },
  { id: 9, label: 'Visibility', emoji: '👁️' },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [initError, setInitError] = useState('');

  useEffect(() => {
    profileApi.getMe().then(setProfile).catch(async (e) => {
      if (e?.response?.status === 404) {
        // Auto-create profile on first visit
        setInitializing(true);
        try {
          const created = await profileApi.create();
          setProfile(created);
        } catch (createErr) {
          setInitError(apiError(createErr));
        } finally {
          setInitializing(false);
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSaved = (updated: ProfileResponse) => setProfile(updated);

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitLoading(true);
    try {
      const updated = await profileApi.submitForReview();
      setProfile(updated);
      setSubmitSuccess(true);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm">{initializing ? 'Setting up your profile…' : 'Loading…'}</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
          Failed to set up your profile: {initError}
        </p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const stepProps = { profile, onSaved: handleSaved };
  const isReadonly = profile.status === 'PendingReview' || profile.status === 'Active';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Complete your profile to find your match.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${statusBadgeClass(profile.status)}`}>{enumLabel(profile.status)}</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">{profile.completionPercentage}%</p>
            <p className="text-xs text-gray-500">Complete</p>
          </div>
        </div>
      </div>

      {/* Completion bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${profile.completionPercentage}%` }}
        />
      </div>

      {isReadonly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          ✏️ Your profile is currently <strong>{enumLabel(profile.status)}</strong>. You can still update sections; changes will apply immediately.
        </div>
      )}

      {/* Step tabs — desktop horizontal, mobile scrollable */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-max">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                step === s.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <span className="text-2xl">{STEPS[step].emoji}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </h2>
            <p className="text-xs text-gray-500">
              {step < STEPS.length - 1 ? 'Fill in the details and click Save & Next' : 'Final step — configure privacy settings'}
            </p>
          </div>
        </div>

        {step === 0 && <BasicStep {...stepProps} onNext={() => setStep(1)} />}
        {step === 1 && <PhysicalStep {...stepProps} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <EducationStep {...stepProps} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <CareerStep {...stepProps} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <FamilyStep {...stepProps} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
        {step === 5 && <ReligionStep {...stepProps} onNext={() => setStep(6)} onBack={() => setStep(4)} />}
        {step === 6 && <LifestyleStep {...stepProps} onNext={() => setStep(7)} onBack={() => setStep(5)} />}
        {step === 7 && <PartnerExpectationsStep {...stepProps} onNext={() => setStep(8)} onBack={() => setStep(6)} />}
        {step === 8 && <ContactStep {...stepProps} onNext={() => setStep(9)} onBack={() => setStep(7)} />}
        {step === 9 && <VisibilityStep {...stepProps} onBack={() => setStep(8)} isLast />}
      </div>

      {/* Submit section */}
      {(profile.status === 'Draft' || profile.status === 'Paused') && (
        <div className="card border-primary-200 bg-primary-50">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🚀</span>
            <div className="flex-1">
              <h3 className="font-semibold text-primary-900">Ready to submit for review?</h3>
              <p className="text-sm text-primary-700 mt-1">
                Your profile is {profile.completionPercentage}% complete.
                {profile.completionPercentage < 60
                  ? ` Complete at least 60% before submitting (${60 - profile.completionPercentage}% more needed).`
                  : " You're ready to submit!"}
              </p>
              {submitSuccess && (
                <p className="text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2 mt-2">
                  ✅ Submitted! Our team will review your profile shortly.
                </p>
              )}
            </div>
            {!submitSuccess && (
              <button
                onClick={handleSubmit}
                disabled={submitLoading || profile.completionPercentage < 60}
                className="btn-primary flex-shrink-0"
              >
                {submitLoading ? 'Submitting…' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Go to dashboard */}
      <div className="flex justify-center">
        <button onClick={() => router.push('/dashboard')} className="btn-secondary">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
