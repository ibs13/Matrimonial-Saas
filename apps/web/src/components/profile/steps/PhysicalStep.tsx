'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, BodyType, Complexion } from '@/types';

const BODY_TYPES: BodyType[] = ['Slim', 'Average', 'Athletic', 'Heavy'];
const COMPLEXIONS: Complexion[] = ['VeryFair', 'Fair', 'Wheatish', 'Dark'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function PhysicalStep({ profile, onSaved, onNext, onBack }: Props) {
  const p = profile.physical;
  const [form, setForm] = useState({
    heightCm: p?.heightCm?.toString() ?? '',
    weightKg: p?.weightKg?.toString() ?? '',
    bodyType: p?.bodyType ?? '',
    complexion: p?.complexion ?? '',
    bloodGroup: p?.bloodGroup ?? '',
    hasPhysicalDisability: p?.hasPhysicalDisability ?? false,
    physicalDisabilityDetails: p?.physicalDisabilityDetails ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updatePhysical({
        heightCm: form.heightCm ? parseInt(form.heightCm) : undefined,
        weightKg: form.weightKg ? parseInt(form.weightKg) : undefined,
        bodyType: (form.bodyType as BodyType) || undefined,
        complexion: (form.complexion as Complexion) || undefined,
        bloodGroup: form.bloodGroup || undefined,
        hasPhysicalDisability: form.hasPhysicalDisability,
        physicalDisabilityDetails: form.physicalDisabilityDetails || undefined,
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
          <label className="label">Height (cm)</label>
          <input type="number" className="input" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} min={100} max={250} placeholder="e.g. 170" />
        </div>
        <div>
          <label className="label">Weight (kg)</label>
          <input type="number" className="input" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} min={30} max={300} placeholder="e.g. 65" />
        </div>
        <div>
          <label className="label">Body Type</label>
          <select className="input" value={form.bodyType} onChange={(e) => set('bodyType', e.target.value)}>
            <option value="">Select…</option>
            {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Complexion</label>
          <select className="input" value={form.complexion} onChange={(e) => set('complexion', e.target.value)}>
            <option value="">Select…</option>
            {COMPLEXIONS.map((c) => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Blood Group</label>
          <select className="input" value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
            <option value="">Select…</option>
            {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={form.hasPhysicalDisability} onChange={(e) => set('hasPhysicalDisability', e.target.checked)} />
          <span className="text-sm font-medium text-gray-700">Has physical disability</span>
        </label>
        {form.hasPhysicalDisability && (
          <textarea className="input mt-2 h-20 resize-none" value={form.physicalDisabilityDetails} onChange={(e) => set('physicalDisabilityDetails', e.target.value)} maxLength={500} placeholder="Please describe…" />
        )}
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
