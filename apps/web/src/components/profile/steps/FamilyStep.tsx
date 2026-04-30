'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, enumLabel } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, FamilyStatus, FamilyType } from '@/types';

const FAMILY_STATUSES: FamilyStatus[] = ['LowerClass', 'MiddleClass', 'UpperMiddleClass', 'Rich'];
const FAMILY_TYPES: FamilyType[] = ['Nuclear', 'Joint'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function FamilyStep({ profile, onSaved, onNext, onBack }: Props) {
  const f = profile.family;
  const [form, setForm] = useState({
    fatherOccupation: f?.fatherOccupation ?? '',
    motherOccupation: f?.motherOccupation ?? '',
    numberOfBrothers: f?.numberOfBrothers?.toString() ?? '0',
    numberOfSisters: f?.numberOfSisters?.toString() ?? '0',
    familyStatus: f?.familyStatus ?? '',
    familyType: f?.familyType ?? '',
    familyCountry: f?.familyCountry ?? 'Bangladesh',
    familyDivision: f?.familyDivision ?? '',
    familyDistrict: f?.familyDistrict ?? '',
    aboutFamily: f?.aboutFamily ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (next = false) => {
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updateFamily({
        fatherOccupation: form.fatherOccupation || undefined,
        motherOccupation: form.motherOccupation || undefined,
        numberOfBrothers: parseInt(form.numberOfBrothers) || 0,
        numberOfSisters: parseInt(form.numberOfSisters) || 0,
        familyStatus: (form.familyStatus as FamilyStatus) || undefined,
        familyType: (form.familyType as FamilyType) || undefined,
        familyCountry: form.familyCountry || undefined,
        familyDivision: form.familyDivision || undefined,
        familyDistrict: form.familyDistrict || undefined,
        aboutFamily: form.aboutFamily || undefined,
      });
      onSaved(updated);
      if (next) onNext();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Father&apos;s Occupation</label>
          <input className="input" value={form.fatherOccupation} onChange={(e) => set('fatherOccupation', e.target.value)} maxLength={100} />
        </div>
        <div>
          <label className="label">Mother&apos;s Occupation</label>
          <input className="input" value={form.motherOccupation} onChange={(e) => set('motherOccupation', e.target.value)} maxLength={100} />
        </div>
        <div>
          <label className="label">Brothers</label>
          <input type="number" className="input" value={form.numberOfBrothers} onChange={(e) => set('numberOfBrothers', e.target.value)} min={0} max={20} />
        </div>
        <div>
          <label className="label">Sisters</label>
          <input type="number" className="input" value={form.numberOfSisters} onChange={(e) => set('numberOfSisters', e.target.value)} min={0} max={20} />
        </div>
        <div>
          <label className="label">Family Status</label>
          <select className="input" value={form.familyStatus} onChange={(e) => set('familyStatus', e.target.value)}>
            <option value="">Select…</option>
            {FAMILY_STATUSES.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Family Type</label>
          <select className="input" value={form.familyType} onChange={(e) => set('familyType', e.target.value)}>
            <option value="">Select…</option>
            {FAMILY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Family&apos;s Country</label>
          <input className="input" value={form.familyCountry} onChange={(e) => set('familyCountry', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="label">Family&apos;s Division</label>
          <input className="input" value={form.familyDivision} onChange={(e) => set('familyDivision', e.target.value)} maxLength={60} />
        </div>
      </div>
      <div>
        <label className="label">About Family</label>
        <textarea className="input h-28 resize-none" value={form.aboutFamily} onChange={(e) => set('aboutFamily', e.target.value)} maxLength={1000} placeholder="Describe your family background…" />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
