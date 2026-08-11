import React, { useState } from 'react';
import {
  Users,
  Building2,
  Search,
  Filter,
  UserCheck,
  Award,
  FileSpreadsheet,
  Calendar,
  MessageSquare,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Globe,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
  FileText
} from 'lucide-react';
import {
  MOCK_ATTENDEE_PROFILES,
  MOCK_ORGANIZATION_PROFILES,
  AttendeeProfile,
  OrganizationProfile
} from '../data/partnerData';

interface PartnersMgmtViewProps {
  language: 'VN' | 'EN';
  onNavigateToMergeSplit?: () => void;
}

export const PartnersMgmtView: React.FC<PartnersMgmtViewProps> = ({
  language,
  onNavigateToMergeSplit
}) => {
  const [activeTab, setActiveTab] = useState<'INDIVIDUALS' | 'ORGANIZATIONS'>('INDIVIDUALS');

  // Individual Filters State
  const [attendees, setAttendees] = useState<AttendeeProfile[]>(MOCK_ATTENDEE_PROFILES);
  const [indSearchQuery, setIndSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SPEAKER' | 'EXPERT' | 'GUEST' | 'SPONSOR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CHUA_LIEN_HE' | 'DA_LIEN_HE' | 'DANG_HOP_TAC' | 'TU_CHOI'>('ALL');
  const [academicFilter, setAcademicFilter] = useState<string>('ALL');

  // Organization Filters State
  const [organizations, setOrganizations] = useState<OrganizationProfile[]>(MOCK_ORGANIZATION_PROFILES);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgCategoryFilter, setOrgCategoryFilter] = useState<string>('ALL');

  // Profile Detail Modal State
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeProfile | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationProfile | null>(null);

  // Note Input State
  const [newNoteText, setNewNoteText] = useState('');

  // -----------------------
  // Handlers for Attendees
  // -----------------------
  const handleUpdateAttendeeStatus = (
    id: string,
    newStatus: 'CHUA_LIEN_HE' | 'DA_LIEN_HE' | 'DANG_HOP_TAC' | 'TU_CHOI'
  ) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, followUpStatus: newStatus } : a))
    );
    if (selectedAttendee && selectedAttendee.id === id) {
      setSelectedAttendee((prev) => (prev ? { ...prev, followUpStatus: newStatus } : null));
    }
  };

  const handleAddAttendeeNote = () => {
    if (!newNoteText.trim() || !selectedAttendee) return;
    const newNote = {
      id: `n-${Date.now()}`,
      noteText: newNoteText.trim(),
      createdByEmail: 'admin.know@eventknow.gov.vn',
      createdAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN').slice(0, 5)
    };

    const updatedNotes = [newNote, ...selectedAttendee.notes];
    setAttendees((prev) =>
      prev.map((a) => (a.id === selectedAttendee.id ? { ...a, notes: updatedNotes } : a))
    );
    setSelectedAttendee({ ...selectedAttendee, notes: updatedNotes });
    setNewNoteText('');
  };

  // -----------------------
  // Handlers for Orgs
  // -----------------------
  const handleAddOrgNote = () => {
    if (!newNoteText.trim() || !selectedOrg) return;
    const newNote = {
      id: `on-${Date.now()}`,
      noteText: newNoteText.trim(),
      createdByEmail: 'admin.know@eventknow.gov.vn',
      createdAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN').slice(0, 5)
    };

    const updatedNotes = [newNote, ...selectedOrg.notes];
    setOrganizations((prev) =>
      prev.map((o) => (o.id === selectedOrg.id ? { ...o, notes: updatedNotes } : o))
    );
    setSelectedOrg({ ...selectedOrg, notes: updatedNotes });
    setNewNoteText('');
  };

  // -----------------------
  // Filter Logic
  // -----------------------
  const filteredAttendees = attendees.filter((att) => {
    const q = indSearchQuery.toLowerCase();
    const matchesSearch =
      att.fullName.toLowerCase().includes(q) ||
      att.organizationName.toLowerCase().includes(q) ||
      att.email.toLowerCase().includes(q) ||
      att.academicTitleRaw.toLowerCase().includes(q) ||
      att.sourceSheets.some((s) => s.eventName.toLowerCase().includes(q) || s.fileName.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'ALL' || att.attendeeRole === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || att.followUpStatus === statusFilter;
    const matchesAcademic =
      academicFilter === 'ALL' ||
      att.academicTitleNormalized.includes(academicFilter as any);

    return matchesSearch && matchesRole && matchesStatus && matchesAcademic;
  });

  const filteredOrgs = organizations.filter((org) => {
    const q = orgSearchQuery.toLowerCase();
    const matchesSearch =
      org.orgName.toLowerCase().includes(q) ||
      org.normalizedName.includes(q) ||
      org.emailDomain.toLowerCase().includes(q) ||
      org.address.toLowerCase().includes(q);

    const matchesCategory = orgCategoryFilter === 'ALL' || org.category === orgCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Helpers
  const renderRoleBadge = (role: AttendeeProfile['attendeeRole']) => {
    switch (role) {
      case 'SPEAKER':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-600" />
            {language === 'VN' ? 'Diễn giả' : 'Speaker'}
          </span>
        );
      case 'EXPERT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            {language === 'VN' ? 'Chuyên gia' : 'Expert'}
          </span>
        );
      case 'SPONSOR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <Building2 className="w-3 h-3 text-amber-600" />
            {language === 'VN' ? 'Nhà tài trợ / Đối tác' : 'Sponsor / Partner'}
          </span>
        );
      case 'GUEST':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-500" />
            {language === 'VN' ? 'Khách mời' : 'Guest'}
          </span>
        );
    }
  };

  const renderStatusBadge = (status: AttendeeProfile['followUpStatus']) => {
    switch (status) {
      case 'DANG_HOP_TAC':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {language === 'VN' ? 'Đang hợp tác' : 'Collaborating'}
          </span>
        );
      case 'DA_LIEN_HE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" />
            {language === 'VN' ? 'Đã liên hệ' : 'Contacted'}
          </span>
        );
      case 'TU_CHOI':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            {language === 'VN' ? 'Từ chối' : 'Declined'}
          </span>
        );
      case 'CHUA_LIEN_HE':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-gray-500" />
            {language === 'VN' ? 'Chưa liên hệ' : 'Uncontacted'}
          </span>
        );
    }
  };

  const renderOrgCategoryLabel = (category: OrganizationProfile['category']) => {
    switch (category) {
      case 'RESEARCH_INSTITUTE':
        return language === 'VN' ? 'Viện Nghiên cứu' : 'Research Institute';
      case 'UNIVERSITY':
        return language === 'VN' ? 'Trường Đại học' : 'University';
      case 'TECH_ENTERPRISE':
        return language === 'VN' ? 'Doanh nghiệp Công nghệ' : 'Tech Enterprise';
      case 'GOVERNMENT':
        return language === 'VN' ? 'Cơ quan Nhà nước' : 'Government Agency';
      case 'INTERNATIONAL':
        return language === 'VN' ? 'Tổ chức Quốc tế' : 'International Org';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#00344c] via-[#1b4b66] to-[#00283d] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Building2 className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              {language === 'VN' ? 'Profile Tổng hợp từ Sheet' : 'Synthesized Profiles'}
            </span>
            <span className="text-xs text-white/70 font-mono">FR-2 / FR-3 / FR-8</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {language === 'VN' ? 'Quản lý Đối tác, Khách mời & Tổ chức' : 'Partners, Guests & Organizations Directory'}
          </h2>

          <p className="text-xs text-slate-200 leading-relaxed">
            {language === 'VN'
              ? 'Hệ thống tự động tổng hợp thông tin cá nhân, học hàm chuẩn hóa, lịch sử tham dự sự kiện và mạng lưới tổ chức từ các file Google Sheets & Excel. Cho phép lưu nhật ký làm việc và theo dõi tiến độ hợp tác.'
              : 'Automated profile aggregation for individuals, normalized academic titles, event attendance history, and organizational networks from Google Sheets & Excel files.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-amber-200/90">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              {attendees.length} {language === 'VN' ? 'Cá nhân (Chuyên gia/Diễn giả/Khách)' : 'Individuals'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              {organizations.length} {language === 'VN' ? 'Tổ chức & Doanh nghiệp' : 'Organizations'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              {language === 'VN' ? 'Đã đối soát từ 12 File Sheet' : 'Synced across 12 Sheets'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Bar & Actions */}
      <div className="bg-white border border-[#DCE1E6] rounded-xl p-2 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-[#EEF1F4] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('INDIVIDUALS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'INDIVIDUALS'
                ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
                : 'text-[#72787e] hover:text-[#0f1d28]'
            }`}
          >
            <Users className="w-4 h-4 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Cá nhân (Khách mời, Diễn giả, Đối tác)' : 'Individuals & Speakers'}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800">
              {attendees.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ORGANIZATIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ORGANIZATIONS'
                ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
                : 'text-[#72787e] hover:text-[#0f1d28]'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#5B4B8A]" />
            <span>{language === 'VN' ? 'Tổ chức & Doanh nghiệp' : 'Organizations'}</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800">
              {organizations.length}
            </span>
          </button>
        </div>

        {/* Action button to Merge/Split */}
        {onNavigateToMergeSplit && (
          <button
            onClick={onNavigateToMergeSplit}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00344c] bg-[#EEF1F4] hover:bg-[#DCE1E6] rounded-lg border border-[#DCE1E6] transition-all cursor-pointer shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-[#00344c]" />
            <span>{language === 'VN' ? 'Công cụ Gộp / Tách Profile' : 'Merge / Split Tools'}</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: INDIVIDUALS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'INDIVIDUALS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={indSearchQuery}
                  onChange={(e) => setIndSearchQuery(e.target.value)}
                  placeholder={
                    language === 'VN'
                      ? 'Tìm theo tên, email, học hàm (GS, TS), tổ chức, tên sheet...'
                      : 'Search name, email, academic title, org, sheet name...'
                  }
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
                />
              </div>

              {/* Role Quick Filters */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 shrink-0">
                <span className="text-[11px] font-bold text-[#72787e] mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {language === 'VN' ? 'Vai trò:' : 'Role:'}
                </span>

                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === 'ALL'
                      ? 'bg-[#00344c] text-white shadow-2xs'
                      : 'bg-[#EEF1F4] text-[#41474d] hover:bg-gray-200'
                  }`}
                >
                  {language === 'VN' ? 'Tất cả' : 'All'}
                </button>
                <button
                  onClick={() => setRoleFilter('SPEAKER')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === 'SPEAKER'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  {language === 'VN' ? 'Diễn giả' : 'Speakers'}
                </button>
                <button
                  onClick={() => setRoleFilter('EXPERT')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === 'EXPERT'
                      ? 'bg-blue-700 text-white shadow-2xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  {language === 'VN' ? 'Chuyên gia' : 'Experts'}
                </button>
                <button
                  onClick={() => setRoleFilter('SPONSOR')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === 'SPONSOR'
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {language === 'VN' ? 'Đối tác / Tài trợ' : 'Sponsors'}
                </button>
                <button
                  onClick={() => setRoleFilter('GUEST')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === 'GUEST'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {language === 'VN' ? 'Khách mời' : 'Guests'}
                </button>
              </div>
            </div>

            {/* Secondary Filters: Status & Academic Tag */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#DCE1E6]/60 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#72787e] font-semibold">{language === 'VN' ? 'Trạng thái hợp tác:' : 'Status:'}</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1 bg-[#F8FAFC] border border-[#DCE1E6] rounded-md text-xs font-medium focus:outline-none focus:border-[#00344c] cursor-pointer"
                  >
                    <option value="ALL">{language === 'VN' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
                    <option value="CHUA_LIEN_HE">{language === 'VN' ? 'Chưa liên hệ' : 'Uncontacted'}</option>
                    <option value="DA_LIEN_HE">{language === 'VN' ? 'Đã liên hệ' : 'Contacted'}</option>
                    <option value="DANG_HOP_TAC">{language === 'VN' ? 'Đang hợp tác' : 'Collaborating'}</option>
                    <option value="TU_CHOI">{language === 'VN' ? 'Từ chối' : 'Declined'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#72787e] font-semibold">{language === 'VN' ? 'Học hàm chuẩn hóa:' : 'Academic Tag:'}</span>
                  <select
                    value={academicFilter}
                    onChange={(e) => setAcademicFilter(e.target.value)}
                    className="px-2.5 py-1 bg-[#F8FAFC] border border-[#DCE1E6] rounded-md text-xs font-medium focus:outline-none focus:border-[#00344c] cursor-pointer"
                  >
                    <option value="ALL">{language === 'VN' ? 'Tất cả học hàm' : 'All Titles'}</option>
                    <option value="GS">GS (Giáo sư)</option>
                    <option value="PGS">PGS (Phó Giáo sư)</option>
                    <option value="TS">TS (Tiến sĩ)</option>
                    <option value="ThS">ThS (Thạc sĩ)</option>
                    <option value="KS">KS (Kỹ sư)</option>
                    <option value="CN">CN (Cử nhân)</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#72787e]">
                {language === 'VN' ? `Hiển thị ${filteredAttendees.length} / ${attendees.length} cá nhân` : `Showing ${filteredAttendees.length} / ${attendees.length} individuals`}
              </div>
            </div>
          </div>

          {/* Individual Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttendees.map((att) => (
              <div
                key={att.id}
                onClick={() => setSelectedAttendee(att)}
                className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-[#1b4b66] transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative"
              >
                <div className="space-y-3">
                  {/* Top Bar: Role & Status */}
                  <div className="flex items-center justify-between gap-2">
                    {renderRoleBadge(att.attendeeRole)}
                    {renderStatusBadge(att.followUpStatus)}
                  </div>

                  {/* Profile Name & Title */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-[#0f1d28] group-hover:text-[#00344c] transition-colors">
                        {att.fullName}
                      </h3>
                    </div>

                    <p className="text-xs font-semibold text-[#1b4b66] truncate">{att.position}</p>

                    <p className="text-xs text-[#72787e] flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[#72787e] shrink-0" />
                      <span className="truncate">{att.organizationName}</span>
                    </p>
                  </div>

                  {/* Academic Title Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-semibold text-[#72787e]">Học hàm:</span>
                    {att.academicTitleNormalized.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#EEF1F4] text-[#00344c] border border-[#DCE1E6]"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="text-[10px] text-gray-400 font-mono">({att.academicTitleRaw})</span>
                  </div>

                  {/* Source Sheets Contribution Summary */}
                  <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#00344c]">
                      <span className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Nguồn Sheet tổng hợp</span>
                      </span>
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                        {att.sourceSheets.length} file
                      </span>
                    </div>

                    <div className="space-y-1">
                      {att.sourceSheets.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="text-[11px] text-[#41474d] truncate flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-semibold truncate">{s.eventName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Footer: Notes count & View detail button */}
                <div className="pt-3 border-t border-[#DCE1E6]/70 flex items-center justify-between text-xs text-[#72787e]">
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    {att.notes.length} {language === 'VN' ? 'ghi chú' : 'notes'}
                  </span>

                  <span className="text-xs font-bold text-[#00344c] group-hover:underline flex items-center gap-0.5">
                    {language === 'VN' ? 'Xem Profile' : 'View Profile'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}

            {filteredAttendees.length === 0 && (
              <div className="col-span-full bg-white border border-[#DCE1E6] rounded-xl p-12 text-center text-[#72787e] space-y-2">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold">
                  {language === 'VN' ? 'Không tìm thấy cá nhân nào phù hợp bộ lọc.' : 'No individuals match your filter criteria.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ORGANIZATIONS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'ORGANIZATIONS' && (
        <div className="space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orgSearchQuery}
                  onChange={(e) => setOrgSearchQuery(e.target.value)}
                  placeholder={
                    language === 'VN'
                      ? 'Tìm kiếm tổ chức, tên viết tắt, email domain (@vast.vn), địa chỉ...'
                      : 'Search organization name, acronym, email domain, address...'
                  }
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
                />
              </div>

              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-[#72787e]">{language === 'VN' ? 'Phân loại:' : 'Category:'}</span>
                <select
                  value={orgCategoryFilter}
                  onChange={(e) => setOrgCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#00344c] cursor-pointer"
                >
                  <option value="ALL">{language === 'VN' ? 'Tất cả phân loại' : 'All Categories'}</option>
                  <option value="RESEARCH_INSTITUTE">{language === 'VN' ? 'Viện Nghiên cứu' : 'Research Institute'}</option>
                  <option value="UNIVERSITY">{language === 'VN' ? 'Trường Đại học' : 'University'}</option>
                  <option value="TECH_ENTERPRISE">{language === 'VN' ? 'Doanh nghiệp Công nghệ' : 'Tech Enterprise'}</option>
                  <option value="GOVERNMENT">{language === 'VN' ? 'Cơ quan Nhà nước' : 'Government'}</option>
                  <option value="INTERNATIONAL">{language === 'VN' ? 'Tổ chức Quốc tế' : 'International'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Organizations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs hover:shadow-md hover:border-[#1b4b66] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {renderOrgCategoryLabel(org.category)}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#EEF1F4] text-[#00344c] border border-[#DCE1E6]">
                      @{org.emailDomain}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-[#0f1d28] group-hover:text-[#00344c] transition-colors">
                      {org.orgName}
                    </h3>

                    <p className="text-xs text-[#72787e] line-clamp-1">{org.address}</p>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-2 text-center">
                      <p className="text-[10px] text-[#72787e] font-semibold">{language === 'VN' ? 'Nhân sự / Diễn giả' : 'Members'}</p>
                      <p className="text-sm font-black text-[#00344c] font-mono">{org.memberCount}</p>
                    </div>

                    <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-2 text-center">
                      <p className="text-[10px] text-[#72787e] font-semibold">{language === 'VN' ? 'Sự kiện tham gia' : 'Events'}</p>
                      <p className="text-sm font-black text-emerald-700 font-mono">{org.eventsCount}</p>
                    </div>
                  </div>

                  {/* Source Sheets Contribution */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[11px] font-bold text-[#72787e] flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      {language === 'VN' ? 'Vai trò đóng góp trong Sheet:' : 'Roles in Sheets:'}
                    </span>
                    {org.sourceSheets.map((s, idx) => (
                      <div key={idx} className="text-[11px] text-[#41474d] truncate bg-[#EEF1F4]/60 p-1.5 rounded border border-[#DCE1E6]/50">
                        <span className="font-bold text-[#00344c]">{s.contributionRole}</span> - {s.eventName}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#DCE1E6]/70 flex items-center justify-between text-xs text-[#72787e]">
                  <span className="flex items-center gap-1 text-[11px] font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    {org.notes.length} {language === 'VN' ? 'ghi chú' : 'notes'}
                  </span>

                  <span className="text-xs font-bold text-[#00344c] group-hover:underline flex items-center gap-0.5">
                    {language === 'VN' ? 'Xem Profile Tổ chức' : 'View Org Profile'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}

            {filteredOrgs.length === 0 && (
              <div className="col-span-full bg-white border border-[#DCE1E6] rounded-xl p-12 text-center text-[#72787e] space-y-2">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold">
                  {language === 'VN' ? 'Không tìm thấy tổ chức nào phù hợp.' : 'No organizations found matching filter.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PROFILE DETAIL MODAL: INDIVIDUAL */}
      {/* ========================================================= */}
      {selectedAttendee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#DCE1E6] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#00344c] to-[#1b4b66] text-white rounded-t-2xl flex items-start justify-between gap-4 sticky top-0 z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {renderRoleBadge(selectedAttendee.attendeeRole)}
                  {renderStatusBadge(selectedAttendee.followUpStatus)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30">
                    ID: {selectedAttendee.id}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white">{selectedAttendee.fullName}</h3>

                <p className="text-xs text-amber-200 font-semibold">{selectedAttendee.position}</p>

                <p className="text-xs text-slate-200 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{selectedAttendee.organizationName}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedAttendee(null)}
                className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Quick Contact & Normalized Academic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#DCE1E6]">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider">
                    {language === 'VN' ? 'Thông tin liên hệ & Định danh' : 'Contact & Identity'}
                  </h4>
                  <div className="space-y-1.5 text-[#41474d]">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#72787e]" />
                      <span className="font-mono">{selectedAttendee.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#72787e]" />
                      <span className="font-mono">{selectedAttendee.phone}</span>
                    </p>
                    <p className="flex items-center gap-2 text-[11px] text-[#72787e]">
                      <span className="font-bold">{language === 'VN' ? 'Tên chuẩn hóa:' : 'Normalized:'}</span>
                      <span className="font-mono bg-gray-200 px-1.5 py-0.2 rounded text-[10px]">{selectedAttendee.normalizedName}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider">
                    {language === 'VN' ? 'Học hàm / Học vị (Rule-Based Parsed)' : 'Academic Titles'}
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#72787e] font-semibold">{language === 'VN' ? 'Chuỗi gốc từ Sheet:' : 'Raw string:'}</span>
                      <span className="font-bold text-[#00344c]">{selectedAttendee.academicTitleRaw}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[#72787e] font-semibold">{language === 'VN' ? 'Mảng Tag chuẩn hóa:' : 'Normalized tags:'}</span>
                      {selectedAttendee.academicTitleNormalized.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00344c] text-white">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Attributes Extracted from Sheets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{language === 'VN' ? 'Thuộc tính Động trích xuất từ Sheet' : 'Dynamic Sheet Attributes'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(selectedAttendee.dynamicAttributes).map(([key, val]) => (
                    <div key={key} className="bg-[#EEF1F4]/70 p-3 rounded-lg border border-[#DCE1E6] space-y-0.5">
                      <p className="text-[10px] font-bold text-[#72787e] uppercase font-mono">{key}</p>
                      <p className="text-xs font-semibold text-[#0f1d28]">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Sheets & Attendance History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'VN' ? 'Lịch sử Sự kiện & File Sheet Nguồn' : 'Event & Source Sheet History'}</span>
                </h4>

                <div className="space-y-2">
                  {selectedAttendee.sourceSheets.map((s, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE1E6] rounded-xl p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#00344c] text-xs">{s.eventName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                          {s.attendanceStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#72787e]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#72787e]" />
                          {s.eventDate}
                        </span>

                        <span className="flex items-center gap-1 text-[#00344c] font-semibold">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          File: <code className="bg-gray-100 px-1 py-0.2 rounded">{s.fileName}</code> (Sheet: {s.sheetName})
                        </span>
                      </div>

                      <div className="text-[11px] text-[#41474d] bg-[#F8FAFC] p-2 rounded border border-[#DCE1E6]">
                        <span className="font-bold text-[#1b4b66]">{language === 'VN' ? 'Vai trò trong sự kiện:' : 'Event Role:'}</span> {s.roleInEvent}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Operational Status & Notes */}
              <div className="space-y-4 pt-4 border-t border-[#DCE1E6]">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span>{language === 'VN' ? 'Nhật ký Vận hành & Ghi chú Hợp tác' : 'Operational Notes & Status'}</span>
                  </h4>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#72787e] font-semibold">{language === 'VN' ? 'Cập nhật trạng thái:' : 'Change Status:'}</span>
                    <select
                      value={selectedAttendee.followUpStatus}
                      onChange={(e) => handleUpdateAttendeeStatus(selectedAttendee.id, e.target.value as any)}
                      className="px-3 py-1.5 bg-[#EEF1F4] border border-[#DCE1E6] rounded-lg text-xs font-bold text-[#00344c] focus:outline-none focus:border-[#00344c] cursor-pointer"
                    >
                      <option value="CHUA_LIEN_HE">CHUA_LIEN_HE (Chưa liên hệ)</option>
                      <option value="DA_LIEN_HE">DA_LIEN_HE (Đã liên hệ)</option>
                      <option value="DANG_HOP_TAC">DANG_HOP_TAC (Đang hợp tác)</option>
                      <option value="TU_CHOI">TU_CHOI (Từ chối)</option>
                    </select>
                  </div>
                </div>

                {/* Add Note Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder={
                      language === 'VN'
                        ? 'Thêm ghi chú vận hành hợp tác mới...'
                        : 'Add new operational note...'
                    }
                    className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c]"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAttendeeNote()}
                  />
                  <button
                    onClick={handleAddAttendeeNote}
                    className="px-4 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? 'Lưu ghi chú' : 'Add Note'}</span>
                  </button>
                </div>

                {/* Existing Notes List */}
                <div className="space-y-2">
                  {selectedAttendee.notes.map((n) => (
                    <div key={n.id} className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl p-3 space-y-1">
                      <p className="text-xs text-[#0f1d28] leading-relaxed">{n.noteText}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#72787e]">
                        <span>Tác giả: {n.createdByEmail}</span>
                        <span>{n.createdAt}</span>
                      </div>
                    </div>
                  ))}

                  {selectedAttendee.notes.length === 0 && (
                    <p className="text-xs text-[#72787e] italic py-2">
                      {language === 'VN' ? 'Chưa có ghi chú vận hành nào cho cá nhân này.' : 'No operational notes yet.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#DCE1E6] rounded-b-2xl flex items-center justify-between text-xs">
              <span className="text-[#72787e] font-mono">
                {language === 'VN' ? 'Hỗ trợ đối soát hai chiều FR-8' : 'Two-way audit support FR-8'}
              </span>

              <button
                onClick={() => setSelectedAttendee(null)}
                className="px-5 py-2 bg-[#EEF1F4] hover:bg-[#DCE1E6] text-[#0f1d28] font-bold rounded-lg cursor-pointer transition-colors"
              >
                {language === 'VN' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PROFILE DETAIL MODAL: ORGANIZATION */}
      {/* ========================================================= */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#DCE1E6] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#00344c] via-[#1b4b66] to-[#5B4B8A] text-white rounded-t-2xl flex items-start justify-between gap-4 sticky top-0 z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
                    {renderOrgCategoryLabel(selectedOrg.category)}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-400 text-amber-950">
                    @{selectedOrg.emailDomain}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white">{selectedOrg.orgName}</h3>

                <p className="text-xs text-slate-200 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{selectedOrg.website}</span>
                  <span className="mx-2">•</span>
                  <span>{selectedOrg.address}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedOrg(null)}
                className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Dynamic Attributes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#00344c]" />
                  <span>{language === 'VN' ? 'Thông tin Hoạt động & Thuộc tính Tổ chức' : 'Organization Properties'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(selectedOrg.dynamicAttributes).map(([key, val]) => (
                    <div key={key} className="bg-[#EEF1F4]/70 p-3 rounded-lg border border-[#DCE1E6] space-y-0.5">
                      <p className="text-[10px] font-bold text-[#72787e] uppercase font-mono">{key}</p>
                      <p className="text-xs font-semibold text-[#0f1d28]">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Sheets & Contribution History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{language === 'VN' ? 'Lịch sử Đồng hành & File Sheet Nguồn' : 'Source Sheet Contributions'}</span>
                </h4>

                <div className="space-y-2">
                  {selectedOrg.sourceSheets.map((s, idx) => (
                    <div key={idx} className="bg-white border border-[#DCE1E6] rounded-xl p-3.5 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-[#00344c] text-xs">{s.eventName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {s.contributionRole}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#72787e]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#72787e]" />
                          {s.eventDate}
                        </span>

                        <span className="flex items-center gap-1 text-[#00344c] font-semibold">
                          <FileText className="w-3 h-3 text-emerald-600" />
                          File: <code className="bg-gray-100 px-1 py-0.2 rounded">{s.fileName}</code> (Sheet: {s.sheetName})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Members Belonging to this Org */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>{language === 'VN' ? 'Nhân sự / Diễn giả Trực thuộc Tổ chức' : 'Affiliated Members & Speakers'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attendees
                    .filter((a) => a.organizationName === selectedOrg.orgName || a.organizationId === selectedOrg.id)
                    .map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setSelectedOrg(null);
                          setSelectedAttendee(member);
                        }}
                        className="p-3 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg hover:border-[#00344c] transition-all cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-[#0f1d28] hover:text-[#00344c]">{member.fullName}</p>
                          <p className="text-[11px] text-[#72787e]">{member.position}</p>
                        </div>
                        {renderRoleBadge(member.attendeeRole)}
                      </div>
                    ))}
                </div>
              </div>

              {/* Operational Notes for Org */}
              <div className="space-y-4 pt-4 border-t border-[#DCE1E6]">
                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>{language === 'VN' ? 'Ghi chú Hợp tác Tổ chức' : 'Organization Operational Notes'}</span>
                </h4>

                {/* Add Note Form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder={
                      language === 'VN'
                        ? 'Thêm ghi chú hợp tác tổ chức...'
                        : 'Add organization note...'
                    }
                    className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c]"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOrgNote()}
                  />
                  <button
                    onClick={handleAddOrgNote}
                    className="px-4 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? 'Lưu ghi chú' : 'Add Note'}</span>
                  </button>
                </div>

                {/* Notes List */}
                <div className="space-y-2">
                  {selectedOrg.notes.map((n) => (
                    <div key={n.id} className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl p-3 space-y-1">
                      <p className="text-xs text-[#0f1d28] leading-relaxed">{n.noteText}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#72787e]">
                        <span>Tác giả: {n.createdByEmail}</span>
                        <span>{n.createdAt}</span>
                      </div>
                    </div>
                  ))}

                  {selectedOrg.notes.length === 0 && (
                    <p className="text-xs text-[#72787e] italic py-2">
                      {language === 'VN' ? 'Chưa có ghi chú nào cho tổ chức này.' : 'No notes recorded.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#DCE1E6] rounded-b-2xl flex items-center justify-between text-xs">
              <span className="text-[#72787e] font-mono">
                {language === 'VN' ? 'Dữ liệu đối soát tự động từ Sheets' : 'Auto-synced from Sheets'}
              </span>

              <button
                onClick={() => setSelectedOrg(null)}
                className="px-5 py-2 bg-[#EEF1F4] hover:bg-[#DCE1E6] text-[#0f1d28] font-bold rounded-lg cursor-pointer transition-colors"
              >
                {language === 'VN' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
