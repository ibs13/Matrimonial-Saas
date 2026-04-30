'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, enumLabel } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, IslamicSect, PrayerHabit } from '@/types';

const SECTS: IslamicSect[] = ['Sunni', 'Shia', 'Other'];
const PRAYER_HABITS: PrayerHabit[] = ['FiveTimes', 'Sometimes', 'Rarely', 'Never'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function ReligionStep({ profile, onSaved, onNext, onBack }: Props) {
  const r = profile.religion;
  const gender = profile.basic?.gender;
  const [form, setForm] = useState({
    sect: r?.sect ?? '',
    prayerHabit: r?.prayerHabit ?? '',
    wearsHijab: r?.wearsHijab ?? false,
    wearsBeard: r?.wearsBeard ?? false,
    mazhab: r?.mazhab ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updateReligion({
        sect: (form.sect as IslamicSect) || undefined,
        prayerHabit: (form.prayerHabit as PrayerHabit) || undefined,
        wearsHijab: gender === 'Female' ? form.wearsHijab : undefined,
        wearsBeard: gender === 'Male' ? form.wearsBeard : undefined,
        mazhab: form.mazhab || undefined,
      });
      onSaved(updated);
      if (next) onNext();
    } catch (err) { setError(apiError(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {profile.basic?.religion === 'Islam' && (
        <div className="bg-primary-50 rounded-lg px-4 py-3 text-sm text-primary-700">
          These fields are specific to Muslim profiles.
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Sect</label>
          <select className="input" value={form.sect} onChange={(e) => set('sect', e.target.value)}>
            <option value="">Select…</option>
            {SECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Prayer Habit</label>
          <select className="input" value={form.prayerHabit} onChange={(e) => set('prayerHabit', e.target.value)}>
            <option value="">Select…</option>
            {PRAYER_HABITS.map((h) => <option key={h} value={h}>{enumLabel(h)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mazhab</label>
          <input className="input" value={form.mazhab} onChange={(e) => set('mazhab', e.target.value)} maxLength={60} placeholder="e.g. Hanafi" />
        </div>
      </div>
      {gender === 'Female' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={form.wearsHijab} onChange={(e) => set('wearsHijab', e.target.checked)} />
          <span className="text-sm font-medium text-gray-700">Wears Hijab</span>
        </label>
      )}
      {gender === 'Male' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={form.wearsBeard} onChange={(e) => set('wearsBeard', e.target.checked)} />
          <span className="text-sm font-medium text-gray-700">Wears Beard</span>
        </label>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
