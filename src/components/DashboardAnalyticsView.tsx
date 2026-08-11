import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Building2,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Download,
  Filter,
  Layers,
  PieChart as PieChartIcon
} from 'lucide-react';
import { translations } from '../data/translations';

interface DashboardAnalyticsViewProps {
  language: 'VN' | 'EN';
  onNavigateToPrompt?: (query: string) => void;
}

export const DashboardAnalyticsView: React.FC<DashboardAnalyticsViewProps> = ({
  language,
  onNavigateToPrompt
}) => {
  const t = translations[language];

  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('2024');

  // Deterministic Mock Aggregates (FR-4.1 - computed from backend SQL)
  const stats = {
    totalEvents: 48,
    totalAttendees: 1420,
    totalOrganizations: 186,
    totalReports: 24
  };

  const departmentData = [
    { name: 'Ban Khoa học & Công nghệ (KHCN)', code: 'KHCN', events: 14, attendees: 450 },
    { name: 'Ban Hợp tác Quốc tế (HTQT)', code: 'HTQT', events: 9, attendees: 320 },
    { name: 'Ban Kế hoạch - Tài chính (KHTC)', code: 'KHTC', events: 11, attendees: 380 },
    { name: 'Phòng CNTT & Truyền thông (CNTT)', code: 'CNTT', events: 8, attendees: 210 },
    { name: 'Ban Tổ chức Cán bộ (TCCB)', code: 'TCCB', events: 6, attendees: 160 }
  ];

  const topOrganizations = [
    { name: 'Tập đoàn Điện lực Việt Nam (EVN)', count: 8, type: 'Đơn vị Tài trợ' },
    { name: 'Viện Nghiên cứu AI & Dữ liệu', count: 6, type: 'Bảo trợ Chuyên môn' },
    { name: 'Trường Đại học Bách Khoa', count: 5, type: 'Đồng tổ chức' },
    { name: 'Tổng Công ty CNTT Việt Nam', count: 4, type: 'Đối tác' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ANALYTICS / DETERMINISTIC DASHBOARD
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Bảng Điều Khiển & Thống Kê Tổng Hợp' : 'Executive Analytics Dashboard'}</span>
          </h1>
          <p className="text-body-md text-[#41474d] max-w-3xl">
            {language === 'VN'
              ? 'Số liệu chính xác tính 100% bằng code SQL backend (FR-4.1). Đảm bảo tính nhất quán tuyệt đối trước khi AI tổng hợp narrative.'
              : 'Deterministic metrics aggregate 100% via SQL backend (FR-4.1) prior to AI narrative synthesis.'}
          </p>
        </div>

        <button
          onClick={() => {
            if (onNavigateToPrompt) {
              onNavigateToPrompt('Tổng hợp thống kê tình hình tham dự sự kiện của các phòng ban trong năm 2024');
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#00344c] text-white text-xs font-bold rounded-lg hover:bg-[#1b4b66] transition-all cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <span>{language === 'VN' ? 'Tạo Báo Cáo AI Từ Dashboard' : 'Generate AI Report'}</span>
        </button>
      </div>

      {/* 4 Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#72787e]">
            <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỔNG SỐ SỰ KIỆN' : 'TOTAL EVENTS'}</span>
            <Calendar className="w-4 h-4 text-[#1b4b66]" />
          </div>
          <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalEvents}</div>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#72787e]">
            <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỔNG LƯỢT ĐẠI BIỂU' : 'TOTAL DELEGATES'}</span>
            <Users className="w-4 h-4 text-[#1b4b66]" />
          </div>
          <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalAttendees.toLocaleString()}</div>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#72787e]">
            <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỔ CHỨC LIÊN KẾT' : 'LINKED ORGS'}</span>
            <Building2 className="w-4 h-4 text-[#5B4B8A]" />
          </div>
          <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalOrganizations}</div>
        </div>

        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#72787e]">
            <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'BÁO CÁO AI ĐÃ ĐÓNG BĂNG' : 'SYNTHESIZED REPORTS'}</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalReports}</div>
        </div>
      </div>

      {/* Main Charts & Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Breakdowns */}
        <div className="lg:col-span-7 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1b4b66]" />
              <span>{language === 'VN' ? 'PHÂN BỔ THEO PHÒNG BAN (DEPARTMENT DISTRIBUTION)' : 'DEPARTMENT DISTRIBUTION'}</span>
            </span>
          </div>

          <div className="space-y-3">
            {departmentData.map((dept, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[#0f1d28]">
                  <span>{dept.name}</span>
                  <span className="font-mono text-[#1b4b66]">{dept.attendees} đại biểu • {dept.events} sự kiện</span>
                </div>
                <div className="h-3 bg-[#EEF1F4] rounded-full overflow-hidden border border-[#DCE1E6]">
                  <div
                    className="h-full bg-[#00344c] transition-all duration-500 rounded-full"
                    style={{ width: `${(dept.attendees / 500) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Organizations Ranking */}
        <div className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#1b4b66]" />
              <span>{language === 'VN' ? 'TOP TỔ CHỨC ĐỒNG HÀNH' : 'TOP PARTNER ORGANIZATIONS'}</span>
            </span>
          </div>

          <div className="divide-y divide-[#DCE1E6]">
            {topOrganizations.map((org, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#0f1d28] truncate max-w-[200px]">{org.name}</p>
                  <p className="text-[10px] font-mono text-[#72787e]">{org.type}</p>
                </div>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#edf4ff] text-[#00344c]">
                  {org.count} {language === 'VN' ? 'lần' : 'events'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
