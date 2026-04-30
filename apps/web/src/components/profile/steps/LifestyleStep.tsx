'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, enumLabel } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, DietType, SmokingHabit } from '@/types';

const DIETS: DietType[] = ['HalalOnly', 'Vegetarian', 'NonVegetarian', 'Other'];
const SMOKING: SmokingHabit[] = ['Never', 'Occasionally', 'Regularly'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function LifestyleStep({ profile, onSaved, onNext, onBack }: Props) {
  const l = profile.lifestyle;
  const [form, setForm] = useState({
    diet: l?.diet ?? '',
    smoking: l?.smoking ?? '',
    hobbiesInput: (l?.hobbies ?? []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    setSaving(true); setError('');
    try {
      const hobbies = form.hobbiesInput
        .split(',')
        .map((h) => h.trim())
        .filter(Boolean);
      const updated = await profileApi.updateLifestyle({
        diet: (form.diet as DietType) || undefined,
        smoking: (form.smoking as SmokingHabit) || undefined,
        hobbies,
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
          <label className="label">Diet</label>
          <select className="input" value={form.diet} onChange={(e) => set('diet', e.target.value)}>
            <option value="">Select…</option>
            {DIETS.map((d) => <option key={d} value={d}>{enumLabel(d)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Smoking</label>
          <select className="input" value={form.smoking} onChange={(e) => set('smoking', e.target.value)}>
            <option value="">Select…</option>
            {SMOKING.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Hobbies & Interests</label>
        <input className="input" value={form.hobbiesInput} onChange={(e) => set('hobbiesInput', e.target.value)} placeholder="Reading, Cooking, Cricket, … (comma-separated)" />
        <p className="text-xs text-gray-400 mt-1">Separate each hobby with a comma</p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
