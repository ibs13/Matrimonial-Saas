'use client';

import { useState } from 'react';
import { profileApi } from '@/lib/api';
import { apiError, enumLabel } from '@/lib/utils';
import { StepActions } from './BasicStep';
import type { ProfileResponse, EducationLevel } from '@/types';

const LEVELS: EducationLevel[] = ['BelowSSC', 'SSC', 'HSC', 'Diploma', 'Bachelor', 'Masters', 'PhD', 'PostDoc'];

interface Props { profile: ProfileResponse; onSaved: (p: ProfileResponse) => void; onNext: () => void; onBack: () => void; }

export default function EducationStep({ profile, onSaved, onNext, onBack }: Props) {
  const e = profile.education;
  const [form, setForm] = useState({
    level: e?.level ?? '',
    fieldOfStudy: e?.fieldOfStudy ?? '',
    institution: e?.institution ?? '',
    graduationYear: e?.graduationYear?.toString() ?? '',
    additionalQualifications: e?.additionalQualifications ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (next = false) => {
    if (!form.level) { setError('Education level is required.'); return; }
    setSaving(true); setError('');
    try {
      const updated = await profileApi.updateEducation({
        level: form.level as EducationLevel,
        fieldOfStudy: form.fieldOfStudy || undefined,
        institution: form.institution || undefined,
        graduationYear: form.graduationYear ? parseInt(form.graduationYear) : undefined,
        additionalQualifications: form.additionalQualifications || undefined,
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
          <label className="label">Education Level <span className="text-red-500">*</span></label>
          <select className="input" value={form.level} onChange={(e) => set('level', e.target.value)}>
            <option value="">Select…</option>
            {LEVELS.map((l) => <option key={l} value={l}>{enumLabel(l)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Field of Study</label>
          <input className="input" value={form.fieldOfStudy} onChange={(e) => set('fieldOfStudy', e.target.value)} maxLength={100} placeholder="e.g. Computer Science" />
        </div>
        <div>
          <label className="label">Institution</label>
          <input className="input" value={form.institution} onChange={(e) => set('institution', e.target.value)} maxLength={150} placeholder="University or college name" />
        </div>
        <div>
          <label className="label">Graduation Year</label>
          <input type="number" className="input" value={form.graduationYear} onChange={(e) => set('graduationYear', e.target.value)} min={1970} max={2100} placeholder="e.g. 2018" />
        </div>
      </div>
      <div>
        <label className="label">Additional Qualifications</label>
        <textarea className="input h-24 resize-none" value={form.additionalQualifications} onChange={(e) => set('additionalQualifications', e.target.value)} maxLength={500} placeholder="Certifications, courses, etc." />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <StepActions onBack={onBack} onSaveNext={() => handleSave(true)} saving={saving} />
    </div>
  );
}
