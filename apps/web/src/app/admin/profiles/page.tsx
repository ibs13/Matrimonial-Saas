'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { formatDate, enumLabel, apiError } from '@/lib/utils';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import type { PendingProfileItem, AdminProfileDetailResponse, AuditLogItem, AdminActionResponse, ReportItem } from '@/types';

type Tab = 'pending' | 'reports' | 'auditLogs';

export default function AdminProfilesPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<PendingProfileItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPages, setPendingPages] = useState(1);
  const [loadingPending, setLoadingPending] = useState(true);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditEntityFilter, setAuditEntityFilter] = useState('');

  const [detail, setDetail] = useState<AdminProfileDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [reportPages, setReportPages] = useState(1);
  const [loadingReports, setLoadingReports] = useState(false);

  const [modal, setModal] = useState<{ type: 'reject' | 'suspend' | 'suspendReport'; id: string } | null>(null);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadPending = useCallback(async (p: number) => {
    setLoadingPending(true);
    try {
      const res = await adminApi.getPendingProfiles({ page: p, pageSize: 15 });
      setPending(res.items);
      setPendingTotal(res.totalCount);
      setPendingPages(Math.ceil(res.totalCount / 15));
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const loadReports = useCallback(async (p: number) => {
    setLoadingReports(true);
    try {
      const res = await adminApi.getReports({ page: p, pageSize: 20, status: 'Active' });
      setReports(res.items);
      setReportTotal(res.totalCount);
      setReportPages(Math.ceil(res.totalCount / 20));
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadAudit = useCallback(async (p: number, entityId?: string) => {
    setLoadingAudit(true);
    try {
      const res = await adminApi.getAuditLogs({ page: p, pageSize: 20, entityId: entityId || undefined });
      setAuditLogs(res.items);
      setAuditTotal(res.totalCount);
      setAuditPages(Math.ceil(res.totalCount / 20));
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    loadPending(1);
  }, [loadPending]);

  useEffect(() => {
    if (tab === 'reports') loadReports(reportPage);
  }, [tab, reportPage, loadReports]);

  useEffect(() => {
    if (tab === 'auditLogs') loadAudit(auditPage, auditEntityFilter || undefined);
  }, [tab, auditPage, auditEntityFilter, loadAudit]);

  const handleViewDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    setActionError('');
    try {
      const d = await adminApi.getProfileDetail(id);
      setDetail(d);
    } catch (err) {
      setActionError(apiError(err));
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this profile?')) return;
    setActioning(true);
    setActionError('');
    setActionSuccess('');
    try {
      await adminApi.approveProfile(id);
      await loadPending(pendingPage);
      if (selectedId === id) setSelectedId(null);
      setActionSuccess('Profile approved.');
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setActioning(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!modal) return;
    setActioning(true);
    setActionError('');
    setActionSuccess('');
    try {
      await adminApi.rejectProfile(modal.id, reason);
      setModal(null);
      await loadPending(pendingPage);
      if (selectedId === modal.id) setSelectedId(null);
      setActionSuccess('Profile rejected.');
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setActioning(false);
    }
  };

  const handleSuspendConfirm = async (reason: string) => {
    if (!modal) return;
    setActioning(true);
    setActionError('');
    setActionSuccess('');
    try {
      if (modal.type === 'suspendReport') {
        await adminApi.suspendFromReport(modal.id, reason);
        setModal(null);
        await loadReports(reportPage);
        setActionSuccess('Profile suspended and report dismissed.');
      } else {
        await adminApi.suspendProfile(modal.id, reason);
        setModal(null);
        await loadPending(pendingPage);
        if (selectedId === modal.id) setSelectedId(null);
        setActionSuccess('Profile suspended.');
      }
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setActioning(false);
    }
  };

  const handleDismissReport = async (id: string) => {
    if (!confirm('Dismiss this report?')) return;
    setActionError('');
    setActionSuccess('');
    try {
      await adminApi.dismissReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      setReportTotal((t) => t - 1);
      setActionSuccess('Report dismissed.');
    } catch (err) {
      setActionError(apiError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin — Profile Review</h1>
        <p className="text-gray-500 text-sm mt-1">{pendingTotal} profiles pending review</p>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-red-500 hover:text-red-700 font-medium">✕</button>
        </div>
      )}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="ml-4 text-green-500 hover:text-green-700 font-medium">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['pending', 'reports', 'auditLogs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'pending'
              ? `Pending (${pendingTotal})`
              : t === 'reports'
              ? `Reports${reportTotal > 0 ? ` (${reportTotal})` : ''}`
              : 'Audit Logs'}
          </button>
        ))}
      </div>

      {/* ── PENDING TAB ── */}
      {tab === 'pending' && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-3">
            {loadingPending ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-3xl mb-2">✅</p>
                <p>No pending profiles</p>
              </div>
            ) : (
              pending.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleViewDetail(p.id)}
                  className={`w-full text-left card hover:shadow-md transition-all ${
                    selectedId === p.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                      {p.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.displayName ?? 'Unnamed'}</p>
                      <p className="text-xs text-gray-500">
                        {[p.gender, p.ageYears ? `${p.ageYears} yrs` : null, p.religion].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {p.countryOfResidence}{p.division ? `, ${p.division}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full max-w-[80px]">
                          <div className="h-1 bg-primary-400 rounded-full" style={{ width: `${p.completionPercentage}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{p.completionPercentage}%</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(p.submittedAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}

            {pendingPages > 1 && (
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pendingPages, 10) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPendingPage(p); loadPending(p); }}
                    className={`w-8 h-8 rounded text-xs ${p === pendingPage ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail pane */}
          <div className="lg:col-span-3">
            {!selectedId && (
              <div className="card flex items-center justify-center h-48 text-gray-400 text-sm">
                Select a profile to review
              </div>
            )}
            {selectedId && detailLoading && (
              <div className="card flex justify-center py-12"><Spinner /></div>
            )}
            {selectedId && detail && !detailLoading && (
              <ProfileDetailPane
                detail={detail}
                profileId={selectedId}
                actioning={actioning}
                onApprove={() => handleApprove(selectedId)}
                onReject={() => setModal({ type: 'reject', id: selectedId })}
                onSuspend={() => setModal({ type: 'suspend', id: selectedId })}
              />
            )}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{reportTotal} active report{reportTotal !== 1 ? 's' : ''}</p>

          {loadingReports ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-3xl mb-2">✅</p>
              <p>No active reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportRow
                  key={r.id}
                  report={r}
                  onDismiss={() => handleDismissReport(r.id)}
                  onSuspend={() => setModal({ type: 'suspendReport', id: r.id })}
                />
              ))}
            </div>
          )}

          {reportPages > 1 && (
            <div className="flex gap-2">
              {Array.from({ length: Math.min(reportPages, 10) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => { setReportPage(p); loadReports(p); }}
                  className={`w-9 h-9 rounded-lg text-sm ${p === reportPage ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT LOGS TAB ── */}
      {tab === 'auditLogs' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="label text-xs">Filter by Profile ID</label>
              <input
                className="input w-72 text-sm"
                placeholder="Profile UUID (optional)"
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
              />
            </div>
            <button
              className="btn-secondary text-sm"
              onClick={() => { setAuditPage(1); loadAudit(1, auditEntityFilter || undefined); }}
            >
              Filter
            </button>
            <button
              className="btn-secondary text-sm"
              onClick={() => { setAuditEntityFilter(''); setAuditPage(1); loadAudit(1); }}
            >
              Clear
            </button>
          </div>

          <p className="text-sm text-gray-500">{auditTotal} log entries</p>

          {loadingAudit ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No audit logs found</div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </div>
          )}

          {auditPages > 1 && (
            <div className="flex gap-2">
              {Array.from({ length: Math.min(auditPages, 10) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => { setAuditPage(p); loadAudit(p, auditEntityFilter || undefined); }}
                  className={`w-9 h-9 rounded-lg text-sm ${p === auditPage ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal
        title="Reject Profile"
        isOpen={modal?.type === 'reject'}
        onClose={() => setModal(null)}
        onConfirm={handleRejectConfirm}
        confirmLabel="Reject"
        confirmClass="btn-danger"
        requireReason
        reasonLabel="Reason for rejection"
        isLoading={actioning}
      />
      <Modal
        title="Suspend Profile"
        isOpen={modal?.type === 'suspend' || modal?.type === 'suspendReport'}
        onClose={() => setModal(null)}
        onConfirm={handleSuspendConfirm}
        confirmLabel="Suspend"
        confirmClass="btn-danger"
        requireReason
        reasonLabel="Reason for suspension"
        isLoading={actioning}
      />
    </div>
  );
}

function ProfileDetailPane({
  detail,
  actioning,
  onApprove,
  onReject,
  onSuspend,
}: {
  detail: AdminProfileDetailResponse;
  profileId: string;
  actioning: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
}) {
  const p = detail.profile;
  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{p.basic?.displayName ?? 'Unnamed'}</h2>
          <p className="text-sm text-gray-500">{detail.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {[p.basic?.gender, p.ageYears ? `${p.ageYears} yrs` : null, p.basic?.religion, p.basic?.maritalStatus ? enumLabel(p.basic.maritalStatus) : null]
              .filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">{p.completionPercentage}%</p>
          <p className="text-xs text-gray-400">Complete</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={onApprove} disabled={actioning} className="btn-primary">
          ✅ Approve
        </button>
        <button onClick={onReject} disabled={actioning} className="btn-danger">
          ❌ Reject
        </button>
        <button onClick={onSuspend} disabled={actioning} className="btn-secondary text-orange-700 border-orange-300 hover:bg-orange-50">
          ⏸ Suspend
        </button>
      </div>

      {/* Profile sections */}
      <div className="divide-y divide-gray-100 text-sm">
        {p.basic?.aboutMe && (
          <Section label="About">
            <p className="text-gray-700 whitespace-pre-wrap">{p.basic.aboutMe}</p>
          </Section>
        )}
        {p.education && (
          <Section label="Education">
            <DetailGrid items={[
              ['Level', p.education.level ? enumLabel(p.education.level) : null],
              ['Field', p.education.fieldOfStudy],
              ['Institution', p.education.institution],
              ['Year', p.education.graduationYear?.toString()],
            ]} />
          </Section>
        )}
        {p.career && (
          <Section label="Career">
            <DetailGrid items={[
              ['Employment', p.career.employmentType ? enumLabel(p.career.employmentType) : null],
              ['Occupation', p.career.occupation],
              ['Organization', p.career.organization],
              ['Income', p.career.annualIncome ? `${p.career.annualIncome} ${p.career.incomeCurrency ?? 'BDT'}` : null],
            ]} />
          </Section>
        )}
        {p.contact && (
          <Section label="Contact (Admin view)">
            <DetailGrid items={[
              ['Phone', p.contact.phone],
              ['Guardian Phone', p.contact.guardianPhone],
              ['Present Address', p.contact.presentAddress],
            ]} />
          </Section>
        )}
        {p.physical && (
          <Section label="Physical">
            <DetailGrid items={[
              ['Height', p.physical.heightCm ? `${p.physical.heightCm} cm` : null],
              ['Body Type', p.physical.bodyType],
              ['Complexion', p.physical.complexion],
              ['Blood Group', p.physical.bloodGroup],
            ]} />
          </Section>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Profile created {p.createdAt ? formatDate(p.createdAt) : '—'} · Updated {p.updatedAt ? formatDate(p.updatedAt) : '—'}
      </p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  );
}

function DetailGrid({ items }: { items: [string, string | null | undefined][] }) {
  const visible = items.filter(([, v]) => v);
  if (visible.length === 0) return <p className="text-gray-400 text-xs">—</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
      {visible.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-gray-500">{k}</dt>
          <dd className="text-sm text-gray-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportRow({
  report,
  onDismiss,
  onSuspend,
}: {
  report: ReportItem;
  onDismiss: () => void;
  onSuspend: () => void;
}) {
  return (
    <div className="card flex items-start gap-4 py-3 px-4">
      <span className="badge flex-shrink-0 mt-0.5 bg-red-100 text-red-800">{report.reason}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {report.reportedDisplayName || 'Unknown profile'}
        </p>
        <p className="text-xs text-gray-400 font-mono">{report.reportedUserId}</p>
        {report.description && (
          <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{report.description}&rdquo;</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(report.createdAt)}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={onDismiss} className="btn-secondary text-xs py-1 px-2.5">
          Dismiss
        </button>
        <button onClick={onSuspend} className="btn-danger text-xs py-1 px-2.5">
          Suspend
        </button>
      </div>
    </div>
  );
}

function AuditLogRow({ log }: { log: AuditLogItem }) {
  const actionColor =
    log.action === 'ApproveProfile'
      ? 'bg-green-100 text-green-800'
      : log.action === 'RejectProfile'
      ? 'bg-red-100 text-red-800'
      : 'bg-orange-100 text-orange-800';

  return (
    <div className="card flex items-start gap-4 py-3 px-4">
      <span className={`badge flex-shrink-0 mt-0.5 ${actionColor}`}>
        {log.action.replace('Profile', '')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{log.adminEmail}</span>
          {' → '}
          <Link href="#" className="text-primary-600 hover:underline font-mono text-xs">{log.entityId}</Link>
        </p>
        {log.reason && <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{log.reason}&rdquo;</p>}
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.createdAt)}</p>
      </div>
    </div>
  );
}
