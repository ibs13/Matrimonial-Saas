'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import type { ProfileResponse, Gender, Religion, MaritalStatus } from '@/types';

const GENDERS: Gender[] = ['Male', 'Female'];
const RELIGIONS: Religion[] = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'];
const MARITAL_STATUSES: MaritalStatus[] = ['NeverMarried', 'Divorced', 'Widowed', 'Separated'];

interface Props {
  profile: ProfileResponse;
  onSaved: (p: ProfileResponse) => void;
  onNext: () => void;
}

export default function BasicStep({ profile, onSaved, onNext }: Props) {
  const b = profile.basic;
  const [form, setForm] = useState({
    displayName: b?.displayName ?? '',
    fullName: b?.fullName ?? '',
    gender: b?.gender ?? '',
    dateOfBirth: b?.dateOfBirth ? b.dateOfBirth.substring(0, 10) : '',
    religion: b?.religion ?? '',
    maritalStatus: b?.maritalStatus ?? '',
    nationality: b?.nationality ?? 'Bangladeshi',
    motherTongue: b?.motherTongue ?? 'Bengali',
    countryOfResidence: b?.countryOfResidence ?? 'Bangladesh',
    division: b?.division ?? '',
    district: b?.district ?? '',
    aboutMe: b?.aboutMe ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    if (!form.displayName || !form.gender || !form.dateOfBirth || !form.religion || !form.maritalStatus || !form.countryOfResidence) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await profileApi.updateBasic({
        displayName: form.displayName,
        fullName: form.fullName || undefined,
        gender: form.gender as Gender,
        dateOfBirth: new Date(form.dateOfBirth).toISOString(),
        religion: form.religion as Religion,
        maritalStatus: form.maritalStatus as MaritalStatus,
        nationality: form.nationality || 'Bangladeshi',
        motherTongue: form.motherTongue || 'Bengali',
        countryOfResidence: form.countryOfResidence,
        division: form.division || undefined,
        district: form.district || undefined,
        aboutMe: form.aboutMe || undefined,
      });
      onSaved(updated);
      if (next) onNext();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Display Name <span className="text-red-500">*</span></label>
          <input className="input" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} maxLength={60} placeholder="Public name shown to others" />
        </div>
        <div>
          <label className="label">Full Name <span className="text-gray-400 text-xs">(hidden by default)</span></label>
          <input className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} maxLength={100} />
        </div>
        <div>
          <label className="label">Gender <span className="text-red-500">*</span></label>
          <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select…</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date of Birth <span className="text-red-500">*</span></label>
          <input type="date" className="input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} max={new Date(Date.now() - 18 * 365.25 * 86400_000).toISOString().substring(0, 10)} />
        </div>
        <div>
          <label className="label">Religion <span className="text-red-500">*</span></label>
          <select className="input" value={form.religion} onChange={(e) => set('religion', e.target.value)}>
            <option value="">Select…</option>
            {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Marital Status <span className="text-red-500">*</span></label>
          <select className="input" value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
            <option value="">Select…</option>
            {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m.replace(/([A-Z])/g, ' $1').trim()}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Country of Residence <span className="text-red-500">*</span></label>
          <input className="input" value={form.countryOfResidence} onChange={(e) => set('countryOfResidence', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="label">Division / State</label>
          <input className="input" value={form.division} onChange={(e) => set('division', e.target.value)} maxLength={60} placeholder="e.g. Dhaka" />
        </div>
        <div>
          <label className="label">District</label>
          <input className="input" value={form.district} onChange={(e) => set('district', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="label">Nationality</label>
          <input className="input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} maxLength={60} />
        </div>
        <div>
          <label className="label">Mother Tongue</label>
          <input className="input" value={form.motherTongue} onChange={(e) => set('motherTongue', e.target.value)} maxLength={60} />
        </div>
      </div>
      <div>
        <label className="label">About Me</label>
        <textarea className="input h-28 resize-none" value={form.aboutMe} onChange={(e) => set('aboutMe', e.target.value)} maxLength={1000} placeholder="Tell potential matches about yourself…" />
        <p className="text-xs text-right text-gray-400 mt-1">{form.aboutMe.length}/1000</p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onSave={() => handleSave(false)} onSaveNext={() => handleSave(true)} saving={saving} showSave />
    </div>
  );
}

export function StepActions({ onSave, onSaveNext, onBack, saving, isFirst, showSave }: { onSave?: () => void; onSaveNext: () => void; onBack?: () => void; saving: boolean; isFirst?: boolean; showSave?: boolean }) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div>
        {!isFirst && onBack && (
          <button type="button" className="btn-secondary" onClick={onBack} disabled={saving}>← Back</button>
        )}
      </div>
      <div className="flex gap-3">
        {showSave && onSave && (
          <button type="button" className="btn-secondary" onClick={onSave} disabled={saving}>Save</button>
        )}
        <button type="button" className="btn-primary" onClick={onSaveNext} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Next →'}
        </button>
      </div>
    </div>
  );
}
