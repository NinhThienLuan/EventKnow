import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  Split,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  User,
  Building2,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Info,
  History
} from 'lucide-react';
import { translations } from '../data/translations';
import {
  fetchDuplicateCandidates,
  mergeEntities,
  splitEntities
} from '../lib/identityApi';

interface MergeSplitViewProps {
  language: 'VN' | 'EN';
  isAdmin?: boolean;
}

interface MergeCandidate {
  id: string;
  type: 'PERSON' | 'ORG' | 'EVENT';
  confidenceScore: number; // e.g. 92%
  primary: {
    id: string;
    name: string;
    detail1: string;
    detail2: string;
    eventsCount: number;
  };
  secondary: {
    id: string;
    name: string;
    detail1: string;
    detail2: string;
    eventsCount: number;
  };
  status: 'PENDING_REVIEW' | 'MERGED' | 'REJECTED';
}

export const MergeSplitView: React.FC<MergeSplitViewProps> = ({ language, isAdmin = false }) => {
  const t = translations[language];

  if (!isAdmin) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center bg-white border border-red-200 rounded-xl space-y-4 my-12 shadow-md">
        <AlertCircle className="w-12 h-12 text-red-650 mx-auto" />
        <h2 className="text-lg font-bold text-red-800">{language === 'VN' ? 'TRUY CẬP BỊ HẠN CHẾ' : 'ACCESS RESTRICTED'}</h2>
        <p className="text-sm text-gray-600">
          {language === 'VN'
            ? 'Chỉ quản trị viên hệ thống (ROLE_ADMIN) mới có quyền thực hiện các thao tác gộp và tách hồ sơ.'
            : 'Only system administrators (ROLE_ADMIN) have permissions to merge or split profiles.'}
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'MERGE_LOGS'>('CANDIDATES');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PERSON' | 'ORG' | 'EVENT'>('ALL');

  const [candidates, setCandidates] = useState<MergeCandidate[]>([]);
  const [mergeLogs, setMergeLogs] = useState<any[]>([
    {
      id: 'b5be9d33-4f91-4df2-a384-633095392e21',
      mergedAt: '10/08/2026 09:30 AM',
      mergedBy: 'admin.know@eventknow.gov.vn',
      entityType: 'PERSON',
      primaryName: 'PGS.TS. Trần Thị Bình',
      secondaryName: 'Tran Thi Binh (PGS)',
      snapshotLogId: 'SNAP-LOG-7721'
    }
  ]);

  useEffect(() => {
    const loadAllDuplicates = async () => {
      try {
        const [peopleDups, orgDups] = await Promise.all([
          fetchDuplicateCandidates('PERSON', 0.4),
          fetchDuplicateCandidates('ORGANIZATION', 0.4)
        ]);

        const mappedPeople = peopleDups.map((dup, idx) => ({
          id: `DUP-P-${idx}-${dup.idA.slice(0, 4)}`,
          type: 'PERSON' as const,
          confidenceScore: Math.round((dup.score || 0.85) * 100),
          primary: {
            id: dup.idA,
            name: dup.nameA,
            detail1: dup.matchReason || 'Trùng lặp tên/email',
            detail2: '',
            eventsCount: 0
          },
          secondary: {
            id: dup.idB,
            name: dup.nameB,
            detail1: 'Ứng viên trùng lặp',
            detail2: '',
            eventsCount: 0
          },
          status: 'PENDING_REVIEW' as const
        }));

        const mappedOrgs = orgDups.map((dup, idx) => ({
          id: `DUP-O-${idx}-${dup.idA.slice(0, 4)}`,
          type: 'ORG' as const,
          confidenceScore: Math.round((dup.score || 0.8) * 100),
          primary: {
            id: dup.idA,
            name: dup.nameA,
            detail1: dup.matchReason || 'Trùng lặp tên/tên miền',
            detail2: '',
            eventsCount: 0
          },
          secondary: {
            id: dup.idB,
            name: dup.nameB,
            detail1: 'Ứng viên trùng lặp',
            detail2: '',
            eventsCount: 0
          },
          status: 'PENDING_REVIEW' as const
        }));

        setCandidates([...mappedPeople, ...mappedOrgs]);
      } catch (err) {
        console.error('Failed to load duplicate candidates:', err);
      }
    };
    loadAllDuplicates();
  }, []);

  const handleConfirmMerge = async (id: string) => {
    const candidate = candidates.find(c => c.id === id);
    if (!candidate) return;

    try {
      const beType = candidate.type === 'ORG' ? 'ORGANIZATION' : candidate.type;
      const res = await mergeEntities(beType, candidate.primary.id, candidate.secondary.id);

      setCandidates(prev =>
        prev.map(c => (c.id === id ? { ...c, status: 'MERGED' } : c))
      );

      const snapshotId = res.snapshotLogId || res.mergeLogId || `SNAP-LOG-${Math.floor(1000 + Math.random() * 9000)}`;

      setMergeLogs(prev => [
        {
          id: res.mergeLogId || `LOG-${Date.now().toString().slice(-3)}`,
          mergedAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          mergedBy: 'admin.know@eventknow.gov.vn',
          entityType: candidate.type,
          primaryName: candidate.primary.name,
          secondaryName: candidate.secondary.name,
          snapshotLogId: snapshotId
        },
        ...prev
      ]);
    } catch (err: any) {
      alert(language === 'VN' ? `Lỗi gộp: ${err.message}` : `Merge failed: ${err.message}`);
    }
  };

  const handleRejectMerge = (id: string) => {
    setCandidates(prev =>
      prev.map(c => (c.id === id ? { ...c, status: 'REJECTED' } : c))
    );
  };

  const handleSplitRecord = async (logId: string) => {
    const log = mergeLogs.find(l => l.id === logId);
    if (!log) return;

    try {
      await splitEntities(log.id);

      alert(
        language === 'VN'
          ? `Đã khôi phục và tách hồ sơ thành công.`
          : `Record restored and split successfully.`
      );
      setMergeLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err: any) {
      alert(language === 'VN' ? `Lỗi tách hồ sơ: ${err.message}` : `Split failed: ${err.message}`);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch =
      c.primary.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.secondary.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ADMINISTRATION / IDENTITY RESOLUTION
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Gộp & Tách Hồ Sơ (Identity Resolution)' : 'Merge & Split Management'}</span>
          </h1>
          <p className="text-body-md text-[#41474d] max-w-3xl">
            {language === 'VN'
              ? 'Xử lý gộp trùng đại biểu, tổ chức và sự kiện (FR-3.4 & FR-3.5) với nhật ký snapshot cho phép tách lại chính xác.'
              : 'Deduplicate delegates, organizations, and canonical events with full snapshot rollback audit logs.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DCE1E6] gap-2 text-xs font-mono font-bold">
        <button
          onClick={() => setActiveTab('CANDIDATES')}
          className={`pb-2 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'CANDIDATES'
            ? 'border-[#00344c] text-[#00344c]'
            : 'border-transparent text-[#72787e] hover:text-[#0f1d28]'
            }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>{language === 'VN' ? 'CẶP TRÙNG CẦN DUYỆT' : 'DEDUPE QUEUE'} ({candidates.filter(c => c.status === 'PENDING_REVIEW').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MERGE_LOGS')}
          className={`pb-2 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'MERGE_LOGS'
            ? 'border-[#00344c] text-[#00344c]'
            : 'border-transparent text-[#72787e] hover:text-[#0f1d28]'
            }`}
        >
          <History className="w-4 h-4" />
          <span>{language === 'VN' ? 'NHẬT KÝ GỘP & TÁCH' : 'AUDIT MERGE LOGS'} ({mergeLogs.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      {activeTab === 'CANDIDATES' && (
        <div className="bg-[#EEF1F4] border border-[#DCE1E6] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'VN' ? 'Tìm tên hồ sơ trùng...' : 'Search matching profile name...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-[#DCE1E6] px-2.5 py-1.5 rounded-lg text-xs">
              <span className="text-[#72787e] font-medium">{language === 'VN' ? 'Loại:' : 'Type:'}</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="bg-transparent font-semibold text-[#00344c] focus:outline-none cursor-pointer"
              >
                <option value="ALL">{language === 'VN' ? 'Tất cả' : 'All'}</option>
                <option value="PERSON">{language === 'VN' ? 'Người (Attendee)' : 'Person'}</option>
                <option value="ORG">{language === 'VN' ? 'Tổ chức (Organization)' : 'Organization'}</option>
                <option value="EVENT">{language === 'VN' ? 'Sự kiện (Event)' : 'Event'}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content Tab 1: Candidates Queue */}
      {activeTab === 'CANDIDATES' && (
        <div className="space-y-4">
          {filteredCandidates.map(item => (
            <div
              key={item.id}
              className={`bg-white border rounded-xl p-5 shadow-2xs space-y-4 transition-all ${item.status === 'MERGED'
                ? 'border-emerald-300 bg-emerald-50/20 opacity-75'
                : item.status === 'REJECTED'
                  ? 'border-slate-300 bg-slate-50/50 opacity-60'
                  : 'border-[#DCE1E6]'
                }`}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00344c] text-white">
                    {item.type}
                  </span>
                  <span className="text-xs font-mono font-semibold text-[#72787e]">
                    ID: {item.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {language === 'VN' ? `Độ tin cậy AI: ${item.confidenceScore}%` : `AI Match Confidence: ${item.confidenceScore}%`}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                {/* Primary Profile */}
                <div className="md:col-span-5 p-4 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#1b4b66] bg-[#edf4ff] px-2 py-0.5 rounded">
                      {language === 'VN' ? 'HỒ SƠ CHÍNH (GIỮ LẠI)' : 'PRIMARY PROFILE (KEEP)'}
                    </span>
                    <span className="text-xs font-mono text-[#72787e]">{item.primary.id}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#0f1d28]">{item.primary.name}</h3>
                  <p className="text-xs text-[#41474d]">{item.primary.detail1}</p>
                  <p className="text-xs text-[#72787e]">{item.primary.detail2}</p>
                  <p className="text-[11px] font-mono text-[#00344c] font-semibold pt-1">
                    {language === 'VN' ? `Đã tham dự: ${item.primary.eventsCount} sự kiện` : `Attended: ${item.primary.eventsCount} events`}
                  </p>
                </div>

                {/* Arrow Icon */}
                <div className="md:col-span-1 flex items-center justify-center text-[#1b4b66]">
                  <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0" />
                </div>

                {/* Secondary Profile */}
                <div className="md:col-span-5 p-4 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {language === 'VN' ? 'HỒ SƠ PHỤ (SẼ GỘP)' : 'SECONDARY PROFILE (MERGE)'}
                    </span>
                    <span className="text-xs font-mono text-[#72787e]">{item.secondary.id}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[#0f1d28]">{item.secondary.name}</h3>
                  <p className="text-xs text-[#41474d]">{item.secondary.detail1}</p>
                  <p className="text-xs text-[#72787e]">{item.secondary.detail2}</p>
                  <p className="text-[11px] font-mono text-[#00344c] font-semibold pt-1">
                    {language === 'VN' ? `Đã tham dự: ${item.secondary.eventsCount} sự kiện` : `Attended: ${item.secondary.eventsCount} events`}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#DCE1E6]">
                <div className="text-xs text-[#72787e] italic flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>
                    {language === 'VN'
                      ? 'Gộp hồ sơ sẽ lưu snapshot vào identity_merge_log để có thể tách lại bất kỳ lúc nào.'
                      : 'Merging saves state snapshot to identity_merge_log for reversible split.'}
                  </span>
                </div>

                {item.status === 'PENDING_REVIEW' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectMerge(item.id)}
                      className="px-3 py-1.5 bg-white border border-[#DCE1E6] text-[#41474d] hover:bg-[#EEF1F4] rounded text-xs font-semibold cursor-pointer"
                    >
                      {language === 'VN' ? 'Bỏ qua / Giữ riêng' : 'Reject / Keep Separate'}
                    </button>
                    <button
                      onClick={() => handleConfirmMerge(item.id)}
                      className="px-4 py-1.5 bg-[#00344c] text-white hover:bg-[#1b4b66] rounded text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>{language === 'VN' ? 'Xác nhận Gộp' : 'Confirm Merge'}</span>
                    </button>
                  </div>
                )}

                {item.status === 'MERGED' && (
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'VN' ? 'Đã gộp thành công' : 'Merged Successfully'}
                  </span>
                )}

                {item.status === 'REJECTED' && (
                  <span className="text-xs font-bold font-mono text-slate-600 bg-slate-200 px-3 py-1 rounded-full">
                    {language === 'VN' ? 'Đã giữ riêng' : 'Kept Separate'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Tab 2: Merge Logs & Split Rollback */}
      {activeTab === 'MERGE_LOGS' && (
        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-4">
          <div className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5 border-b border-[#DCE1E6] pb-2">
            <History className="w-4 h-4 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'LỊCH SỬ GỘP & KHẢ NĂNG TÁCH HỒ SƠ (COPY-ON-WRITE SNAPSHOTS)' : 'MERGE HISTORY & REVERSIBLE SPLIT LOGS'}</span>
          </div>

          <div className="divide-y divide-[#DCE1E6]">
            {mergeLogs.map(log => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#00344c]">{log.id}</span>
                    <span className="text-[10px] font-mono bg-[#EEF1F4] text-[#41474d] px-2 py-0.5 rounded border border-[#DCE1E6]">
                      {log.entityType}
                    </span>
                    <span className="text-xs font-mono text-[#72787e]">{log.mergedAt}</span>
                  </div>

                  <p className="text-xs text-[#0f1d28] font-medium">
                    {language === 'VN' ? `Đã gộp "${log.secondaryName}" vào "${log.primaryName}"` : `Merged "${log.secondaryName}" into "${log.primaryName}"`}
                  </p>
                  <p className="text-[11px] font-mono text-[#72787e]">
                    Thực hiện bởi: {log.mergedBy} • Snapshot ID: {log.snapshotLogId}
                  </p>
                </div>

                <button
                  onClick={() => handleSplitRecord(log.id)}
                  className="px-3 py-1.5 bg-white border border-[#DCE1E6] text-[#00344c] hover:bg-[#edf4ff] hover:border-[#00344c] rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <Split className="w-3.5 h-3.5 text-[#1b4b66]" />
                  <span>{language === 'VN' ? 'Tách Hồ Sơ (Split)' : 'Split Record'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
