'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, enumLabel } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, EducationLevel, MaritalStatus, Religion, FamilyStatus } from '@/types';

const EDUCATION_LEVELS: EducationLevel[] = ['BelowSSC', 'SSC', 'HSC', 'Diploma', 'Bachelor', 'Masters', 'PhD', 'PostDoc'];
const MARITAL_STATUSES: MaritalStatus[] = ['NeverMarried', 'Divorced', 'Widowed', 'Separated'];
const RELIGIONS: Religion[] = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Other'];
const FAMILY_STATUSES: FamilyStatus[] = ['LowerClass', 'MiddleClass', 'UpperMiddleClass', 'Rich'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function PartnerExpectationsStep({ profile, onSaved, onNext, onBack }: Props) {
  const pe = profile.partnerExpectations;
  const [form, setForm] = useState({
    ageMin: pe?.ageMin?.toString() ?? '',
    ageMax: pe?.ageMax?.toString() ?? '',
    heightMinCm: pe?.heightMinCm?.toString() ?? '',
    heightMaxCm: pe?.heightMaxCm?.toString() ?? '',
    minEducationLevel: pe?.minEducationLevel ?? '',
    acceptedMaritalStatuses: pe?.acceptedMaritalStatuses ?? [],
    acceptedReligions: pe?.acceptedReligions ?? [],
    preferredCountriesInput: (pe?.preferredCountries ?? []).join(', '),
    minFamilyStatus: pe?.minFamilyStatus ?? '',
    additionalExpectations: pe?.additionalExpectations ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleList = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const handleSave = async (next = false) => {
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updatePartnerExpectations({
        ageMin: form.ageMin ? parseInt(form.ageMin) : undefined,
        ageMax: form.ageMax ? parseInt(form.ageMax) : undefined,
        heightMinCm: form.heightMinCm ? parseInt(form.heightMinCm) : undefined,
        heightMaxCm: form.heightMaxCm ? parseInt(form.heightMaxCm) : undefined,
        minEducationLevel: (form.minEducationLevel as EducationLevel) || undefined,
        acceptedMaritalStatuses: form.acceptedMaritalStatuses,
        acceptedReligions: form.acceptedReligions,
        preferredCountries: form.preferredCountriesInput.split(',').map((c) => c.trim()).filter(Boolean),
        minFamilyStatus: (form.minFamilyStatus as FamilyStatus) || undefined,
        additionalExpectations: form.additionalExpectations || undefined,
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
          <label className="label">Age Range</label>
          <div className="flex gap-2 items-center">
            <input type="number" className="input" value={form.ageMin} onChange={(e) => set('ageMin', e.target.value)} min={18} max={80} placeholder="Min" />
            <span className="text-gray-400">–</span>
            <input type="number" className="input" value={form.ageMax} onChange={(e) => set('ageMax', e.target.value)} min={18} max={80} placeholder="Max" />
          </div>
        </div>
        <div>
          <label className="label">Height Range (cm)</label>
          <div className="flex gap-2 items-center">
            <input type="number" className="input" value={form.heightMinCm} onChange={(e) => set('heightMinCm', e.target.value)} min={100} max={250} placeholder="Min" />
            <span className="text-gray-400">–</span>
            <input type="number" className="input" value={form.heightMaxCm} onChange={(e) => set('heightMaxCm', e.target.value)} min={100} max={250} placeholder="Max" />
          </div>
        </div>
        <div>
          <label className="label">Min Education</label>
          <select className="input" value={form.minEducationLevel} onChange={(e) => set('minEducationLevel', e.target.value)}>
            <option value="">Any</option>
            {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{enumLabel(l)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Min Family Status</label>
          <select className="input" value={form.minFamilyStatus} onChange={(e) => set('minFamilyStatus', e.target.value)}>
            <option value="">Any</option>
            {FAMILY_STATUSES.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Accepted Marital Statuses</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {MARITAL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('acceptedMaritalStatuses', toggleList(form.acceptedMaritalStatuses, s))}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                form.acceptedMaritalStatuses.includes(s)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Accepted Religions</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {RELIGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set('acceptedReligions', toggleList(form.acceptedReligions, r))}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                form.acceptedReligions.includes(r)
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Preferred Countries</label>
        <input className="input" value={form.preferredCountriesInput} onChange={(e) => set('preferredCountriesInput', e.target.value)} placeholder="Bangladesh, UK, USA … (comma-separated)" />
      </div>

      <div>
        <label className="label">Additional Expectations</label>
        <textarea className="input h-28 resize-none" value={form.additionalExpectations} onChange={(e) => set('additionalExpectations', e.target.value)} maxLength={1000} placeholder="Any other preferences or requirements…" />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
