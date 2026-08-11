import React, { useState } from 'react';
import {
  Network,
  Search,
  Filter,
  User,
  Building2,
  Calendar,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { translations } from '../data/translations';

interface ConnectionsViewProps {
  language: 'VN' | 'EN';
}

interface EntityConnection {
  id: string;
  sourceName: string;
  sourceRole: string;
  sourceType: 'PERSON' | 'ORG';
  targetName: string;
  targetRole: string;
  targetType: 'PERSON' | 'ORG';
  coOccurrenceCount: number;
  lastEventDate: string;
  eventsList: string[];
  aiSummary: string;
  followUpStatus: 'NOT_CONTACTED' | 'CONTACTED' | 'DECLINED' | 'CONFIRMED';
  notes: string[];
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({ language }) => {
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PERSON' | 'ORG'>('ALL');
  const [selectedConnection, setSelectedConnection] = useState<EntityConnection | null>(null);
  const [newNote, setNewNote] = useState('');

  const [connections, setConnections] = useState<EntityConnection[]>([
    {
      id: 'CONN-101',
      sourceName: 'GS.TS. Nguyễn Văn An',
      sourceRole: 'Diễn giả chính',
      sourceType: 'PERSON',
      targetName: 'Tập đoàn Điện lực Việt Nam (EVN)',
      targetRole: 'Đơn vị Tài trợ Gold',
      targetType: 'ORG',
      coOccurrenceCount: 4,
      lastEventDate: '15/11/2023',
      eventsList: ['Hội thảo Năng lượng Xanh Q3 2023', 'Diễn đàn Hạ tầng Năng lượng 2023', 'Hội nghị Khoa học Điện lực', 'TechExpo 2022'],
      aiSummary: language === 'VN'
        ? 'GS.TS. Nguyễn Văn An đã tham gia 4 sự kiện do EVN chủ trì hoặc tài trợ từ năm 2022-2023 với vai trò báo cáo viên chính.'
        : 'Prof. Dr. Nguyen Van An attended 4 events hosted or sponsored by EVN from 2022-2023 as keynote speaker.',
      followUpStatus: 'CONFIRMED',
      notes: ['Đã gọi điện xác nhận tham dự Diễn đàn Mới 2026', 'Đã nhận bài phát biểu sơ bộ']
    },
    {
      id: 'CONN-102',
      sourceName: 'PGS.TS. Trần Thị Bình',
      sourceRole: 'Chuyên gia tư vấn',
      sourceType: 'PERSON',
      targetName: 'ThS. Lê Hoàng Nam',
      targetRole: 'Khách mời VIP',
      targetType: 'PERSON',
      coOccurrenceCount: 3,
      lastEventDate: '20/09/2023',
      eventsList: ['Diễn đàn Kinh tế Số 2023', 'Hội thảo AI & Quản trị Doanh nghiệp', 'Workshop Chuyển đổi số Q1'],
      aiSummary: language === 'VN'
        ? 'PGS.TS. Trần Thị Bình và ThS. Lê Hoàng Nam cùng đồng xuất hiện tại 3 hội thảo lớn về Chuyển đổi số & AI trong 2 năm qua.'
        : 'Assoc. Prof. Tran Thi Binh and Mr. Le Hoang Nam co-attended 3 major seminars on Digital Transformation & AI in the past 2 years.',
      followUpStatus: 'CONTACTED',
      notes: ['Gửi thư mời qua email công vụ ngày 05/08']
    },
    {
      id: 'CONN-103',
      sourceName: 'Viện Nghiên cứu Chiến lược AI',
      sourceRole: 'Đơn vị Bảo trợ Chuyên môn',
      sourceType: 'ORG',
      targetName: 'Tổng Công ty CNTT Việt Nam',
      targetRole: 'Đối tác Tổ chức',
      targetType: 'ORG',
      coOccurrenceCount: 5,
      lastEventDate: '02/12/2023',
      eventsList: ['AI Summit 2023', 'Hội nghị Thượng đỉnh Dữ liệu', 'TechForum Q2', 'Sự kiện Kết nối AI', 'Workshop Cloud 2022'],
      aiSummary: language === 'VN'
        ? 'Viện Nghiên cứu AI và Tổng công ty CNTT có mối quan hệ hợp tác chiến lược liên tục qua 5 sự kiện cấp quốc gia.'
        : 'AI Research Institute and VN IT Corp maintain strategic collaboration across 5 national summit events.',
      followUpStatus: 'NOT_CONTACTED',
      notes: []
    },
    {
      id: 'CONN-104',
      sourceName: 'TS. Phạm Minh Tuấn',
      sourceRole: 'Diễn giả',
      sourceType: 'PERSON',
      targetName: 'Trường Đại học Bách Khoa',
      targetRole: 'Đơn vị Đồng tổ chức',
      targetType: 'ORG',
      coOccurrenceCount: 2,
      lastEventDate: '18/06/2023',
      eventsList: ['Ngày hội Khởi nghiệp Sinh viên 2023', 'Hội thảo Công nghệ Vật liệu Mới'],
      aiSummary: language === 'VN'
        ? 'TS. Phạm Minh Tuấn là cựu diễn giả đại diện hợp tác với ĐH Bách Khoa trong các sự kiện khởi nghiệp.'
        : 'Dr. Pham Minh Tuan represented startup forum keynotes in partnership with Polytechnic University.',
      followUpStatus: 'DECLINED',
      notes: ['Đại biểu báo bận công tác nước ngoài tháng này']
    }
  ]);

  const filteredConnections = connections.filter(c => {
    const matchesSearch =
      c.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.eventsList.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType =
      filterType === 'ALL' ||
      c.sourceType === filterType ||
      c.targetType === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddNote = () => {
    if (!newNote.trim() || !selectedConnection) return;
    const updated = connections.map(c => {
      if (c.id === selectedConnection.id) {
        return {
          ...c,
          notes: [...c.notes, newNote.trim()]
        };
      }
      return c;
    });
    setConnections(updated);
    setSelectedConnection(prev => prev ? { ...prev, notes: [...prev.notes, newNote.trim()] } : null);
    setNewNote('');
  };

  const handleUpdateStatus = (status: EntityConnection['followUpStatus']) => {
    if (!selectedConnection) return;
    const updated = connections.map(c => {
      if (c.id === selectedConnection.id) {
        return { ...c, followUpStatus: status };
      }
      return c;
    });
    setConnections(updated);
    setSelectedConnection(prev => prev ? { ...prev, followUpStatus: status } : null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / CORE KNOWLEDGE / GRAPH
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
            <Network className="w-6 h-6 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Cơ chế Kết nối Thực thể' : 'Entity Connection Mechanism'}</span>
          </h1>
          <p className="text-body-md text-[#41474d] max-w-3xl">
            {language === 'VN'
              ? 'Tự động tính toán tần suất đồng tham dự sự kiện (Co-occurrence Matrix) giữa đại biểu, chuyên gia và tổ chức.'
              : 'Automatically calculates event co-occurrence frequencies between delegates, experts, and organizations.'}
          </p>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-[#EEF1F4] border border-[#DCE1E6] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'VN' ? 'Tìm theo tên đại biểu, tổ chức hoặc tên sự kiện...' : 'Search by delegate, organization or event title...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#DCE1E6] px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-[#72787e]" />
            <span className="text-[#72787e] font-medium">{language === 'VN' ? 'Loại thực thể:' : 'Entity:'}</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="bg-transparent font-semibold text-[#00344c] focus:outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'VN' ? 'Tất cả' : 'All'}</option>
              <option value="PERSON">{language === 'VN' ? 'Đại biểu / Cá nhân' : 'Individual'}</option>
              <option value="ORG">{language === 'VN' ? 'Tổ chức / Cơ quan' : 'Organization'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Connections List + Right Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Connections List Column */}
        <div className={`${selectedConnection ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3 transition-all`}>
          {filteredConnections.map(c => {
            const isSelected = selectedConnection?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedConnection(c)}
                className={`bg-white border rounded-xl p-4 transition-all cursor-pointer shadow-2xs hover:border-[#1b4b66] ${
                  isSelected ? 'border-[#00344c] ring-2 ring-[#00344c]/10 bg-[#edf4ff]/20' : 'border-[#DCE1E6]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Source Avatar/Icon */}
                    <div className="w-9 h-9 rounded-lg bg-[#edf4ff] text-[#00344c] border border-[#DCE1E6] flex items-center justify-center shrink-0 font-bold">
                      {c.sourceType === 'PERSON' ? <User className="w-4 h-4 text-[#1b4b66]" /> : <Building2 className="w-4 h-4 text-[#5B4B8A]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#0f1d28] truncate">{c.sourceName}</span>
                        <span className="text-[10px] text-[#72787e] bg-[#EEF1F4] px-1.5 py-0.5 rounded border border-[#DCE1E6]">
                          {c.sourceRole}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-[#1b4b66] font-bold">↔ Đồng xuất hiện</span>
                        <span className="text-xs font-semibold text-[#0f1d28] truncate">{c.targetName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Co-occurrence badge */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#00344c] text-white">
                      {c.coOccurrenceCount} {language === 'VN' ? 'Sự kiện' : 'Events'}
                    </span>
                    <p className="text-[10px] font-mono text-[#72787e] mt-1">Gần nhất: {c.lastEventDate}</p>
                  </div>
                </div>

                {/* AI Summary snippet */}
                <div className="mt-3 pt-3 border-t border-[#EEF1F4] flex items-start gap-2 bg-[#edf4ff]/30 p-2.5 rounded-lg border border-[#DCE1E6]/60">
                  <Sparkles className="w-3.5 h-3.5 text-[#1b4b66] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#41474d] italic leading-relaxed">
                    "{c.aiSummary}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connection Details & Follow-up Panel */}
        {selectedConnection && (
          <div className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-5 sticky top-20 self-start animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                <Network className="w-4 h-4 text-[#1b4b66]" />
                {language === 'VN' ? 'Chi tiết Mối quan hệ' : 'Connection Details'}
              </span>
              <button
                onClick={() => setSelectedConnection(null)}
                className="text-xs font-mono text-[#72787e] hover:text-[#0f1d28] cursor-pointer"
              >
                [Đóng]
              </button>
            </div>

            {/* AI Narrative Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-[#72787e] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#1b4b66]" />
                {language === 'VN' ? 'TỔNG QUAN TỪ AI' : 'AI NARRATIVE'}
              </span>
              <div className="p-3 bg-[#edf4ff]/50 border border-[#DCE1E6] rounded-lg text-xs text-[#0f1d28] leading-relaxed">
                {selectedConnection.aiSummary}
              </div>
            </div>

            {/* Event Co-attendance List */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-[#72787e] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#1b4b66]" />
                {language === 'VN' ? 'DANH SÁCH SỰ KIỆN ĐỒNG THAM DỰ' : 'CO-ATTENDED EVENTS'} ({selectedConnection.eventsList.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedConnection.eventsList.map((evt, idx) => (
                  <div key={idx} className="p-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded text-xs font-medium text-[#0f1d28] flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#edf4ff] text-[#00344c] font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <span className="truncate">{evt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up Status Selector (FR-8.2) */}
            <div className="space-y-2 pt-2 border-t border-[#DCE1E6]">
              <span className="text-[11px] font-mono font-bold uppercase text-[#72787e]">
                {language === 'VN' ? 'TRẠNG THÁI FOLLOW-UP MỜI ĐẠI BIỂU' : 'DELEGATE FOLLOW-UP STATUS'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleUpdateStatus('NOT_CONTACTED')}
                  className={`p-2 rounded border text-center font-semibold transition-all cursor-pointer ${
                    selectedConnection.followUpStatus === 'NOT_CONTACTED'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {language === 'VN' ? 'Chưa liên hệ' : 'Not Contacted'}
                </button>

                <button
                  onClick={() => handleUpdateStatus('CONTACTED')}
                  className={`p-2 rounded border text-center font-semibold transition-all cursor-pointer ${
                    selectedConnection.followUpStatus === 'CONTACTED'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {language === 'VN' ? 'Đã liên hệ' : 'Contacted'}
                </button>

                <button
                  onClick={() => handleUpdateStatus('CONFIRMED')}
                  className={`p-2 rounded border text-center font-semibold transition-all cursor-pointer ${
                    selectedConnection.followUpStatus === 'CONFIRMED'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  {language === 'VN' ? 'Đã xác nhận' : 'Confirmed'}
                </button>

                <button
                  onClick={() => handleUpdateStatus('DECLINED')}
                  className={`p-2 rounded border text-center font-semibold transition-all cursor-pointer ${
                    selectedConnection.followUpStatus === 'DECLINED'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  {language === 'VN' ? 'Từ chối' : 'Declined'}
                </button>
              </div>
            </div>

            {/* Audit Notes Log (FR-8.1) */}
            <div className="space-y-2 pt-2 border-t border-[#DCE1E6]">
              <span className="text-[11px] font-mono font-bold uppercase text-[#72787e] flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-[#1b4b66]" />
                {language === 'VN' ? 'NHẬT KÝ GHI CHÚ HỢP TÁC' : 'COLLABORATION NOTES'}
              </span>

              <div className="space-y-2">
                {selectedConnection.notes.length === 0 ? (
                  <p className="text-xs text-[#72787e] italic py-2">
                    {language === 'VN' ? 'Chưa có ghi chú nào.' : 'No notes recorded.'}
                  </p>
                ) : (
                  selectedConnection.notes.map((note, i) => (
                    <div key={i} className="p-2.5 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-xs text-[#0f1d28] space-y-1">
                      <p>{note}</p>
                      <div className="text-[10px] font-mono text-[#72787e] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Admin • Hôm nay</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  placeholder={language === 'VN' ? 'Nhập ghi chú liên hệ...' : 'Enter contact note...'}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
                />
                <button
                  onClick={handleAddNote}
                  className="px-3 py-1.5 bg-[#00344c] text-white rounded-lg text-xs font-semibold hover:bg-[#1b4b66] transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
