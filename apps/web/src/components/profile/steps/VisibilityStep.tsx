'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse } from '@/types';

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onBack: () => void; isLast: boolean; }

export default function VisibilityStep({ profile, onSaved, onBack, isLast }: Props) {
  const v = profile.visibility;
  const [form, setForm] = useState({
    showFullName: v?.showFullName ?? false,
    showPhone: v?.showPhone ?? false,
    showAddress: v?.showAddress ?? false,
    profileVisible: v?.profileVisible ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (k: keyof typeof form) => setForm((f) => ({ ...f, [k]: !f[k] }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updateVisibility(form);
      onSaved(updated);
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        🔒 By default, your full name, phone, and address are hidden. You can control what others see below.
      </div>

      <div className="space-y-3">
        <ToggleRow
          label="Profile visible in search"
          description="When disabled, your profile won't appear in search results."
          checked={form.profileVisible}
          onChange={() => toggle('profileVisible')}
        />
        <ToggleRow
          label="Show full name"
          description="Display your full name instead of just your display name."
          checked={form.showFullName}
          onChange={() => toggle('showFullName')}
        />
        <ToggleRow
          label="Show phone number"
          description="Allow others to see your contact number."
          checked={form.showPhone}
          onChange={() => toggle('showPhone')}
        />
        <ToggleRow
          label="Show address"
          description="Share your present and permanent address."
          checked={form.showAddress}
          onChange={() => toggle('showAddress')}
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={saving}>← Back</button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isLast ? 'Save Settings' : 'Save & Finish'}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
        onClick={onChange}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
    </label>
  );
}
