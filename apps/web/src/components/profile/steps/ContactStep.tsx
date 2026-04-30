'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse } from '@/types';

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function ContactStep({ profile, onSaved, onNext, onBack }: Props) {
  const c = profile.contact;
  const gender = profile.basic?.gender;
  const [form, setForm] = useState({
    phone: c?.phone ?? '',
    guardianPhone: c?.guardianPhone ?? '',
    presentAddress: c?.presentAddress ?? '',
    permanentAddress: c?.permanentAddress ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updateContact({
        phone: form.phone || undefined,
        guardianPhone: form.guardianPhone || undefined,
        presentAddress: form.presentAddress || undefined,
        permanentAddress: form.permanentAddress || undefined,
      });
      onSaved(updated);
      if (next) onNext();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        📱 Contact information is hidden from other members. It&apos;s only shared after mutual interest is accepted.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Phone Number</label>
          <input type="tel" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} placeholder="+880 1XXX XXXXXX" />
        </div>
        {gender === 'Female' && (
          <div>
            <label className="label">Guardian&apos;s Phone</label>
            <input type="tel" className="input" value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} maxLength={20} placeholder="+880 1XXX XXXXXX" />
          </div>
        )}
      </div>
      <div>
        <label className="label">Present Address</label>
        <textarea className="input h-20 resize-none" value={form.presentAddress} onChange={(e) => set('presentAddress', e.target.value)} maxLength={300} />
      </div>
      <div>
        <label className="label">Permanent Address</label>
        <textarea className="input h-20 resize-none" value={form.permanentAddress} onChange={(e) => set('permanentAddress', e.target.value)} maxLength={300} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
