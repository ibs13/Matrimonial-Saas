'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, enumLabel } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, EmploymentType } from '@/types';

const EMP_TYPES: EmploymentType[] = ['Employed', 'SelfEmployed', 'BusinessOwner', 'Student', 'Unemployed'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function CareerStep({ profile, onSaved, onNext, onBack }: Props) {
  const c = profile.career;
  const [form, setForm] = useState({
    employmentType: c?.employmentType ?? '',
    occupation: c?.occupation ?? '',
    organization: c?.organization ?? '',
    annualIncome: c?.annualIncome?.toString() ?? '',
    incomeCurrency: c?.incomeCurrency ?? 'BDT',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    if (!form.employmentType) { setError('Employment type is required.'); return; }
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updateCareer({
        employmentType: form.employmentType as EmploymentType,
        occupation: form.occupation || undefined,
        organization: form.organization || undefined,
        annualIncome: form.annualIncome ? parseFloat(form.annualIncome) : undefined,
        incomeCurrency: form.incomeCurrency || 'BDT',
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
          <label className="label">Employment Type <span className="text-red-500">*</span></label>
          <select className="input" value={form.employmentType} onChange={(e) => set('employmentType', e.target.value)}>
            <option value="">Select…</option>
            {EMP_TYPES.map((t) => <option key={t} value={t}>{enumLabel(t)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Occupation / Job Title</label>
          <input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} maxLength={100} placeholder="e.g. Software Engineer" />
        </div>
        <div>
          <label className="label">Organization</label>
          <input className="input" value={form.organization} onChange={(e) => set('organization', e.target.value)} maxLength={150} placeholder="Company or employer name" />
        </div>
        <div>
          <label className="label">Annual Income</label>
          <div className="flex gap-2">
            <input type="number" className="input flex-1" value={form.annualIncome} onChange={(e) => set('annualIncome', e.target.value)} min={0} placeholder="e.g. 600000" />
            <select className="input w-24" value={form.incomeCurrency} onChange={(e) => set('incomeCurrency', e.target.value)}>
              <option value="BDT">BDT</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
