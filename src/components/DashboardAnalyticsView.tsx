import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Building2,
  Calendar,
  Layers,
  Shield,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { translations } from '../data/translations';
import { fetchDashboardAggregate, fetchTopOrganizations } from '../lib/dashboardApi';
import { DashboardAggregate, TopOrganization } from '../types';

interface DashboardAnalyticsViewProps {
  language: 'VN' | 'EN';
  onNavigateToPrompt?: (query: string) => void;
}

export const DashboardAnalyticsView: React.FC<DashboardAnalyticsViewProps> = ({
  language,
  onNavigateToPrompt
}) => {
  const t = translations[language];

  const dashboardMode = 'SYSTEM';

  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const [data, setData] = useState<DashboardAggregate | null>(null);
  const [topOrgs, setTopOrgs] = useState<TopOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load aggregate — triggered by filters
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters: any = {};
        if (selectedDept !== 'ALL') filters.department = selectedDept;
        if (selectedYear !== 'ALL') {
          filters.startDate = `${selectedYear}-01-01`;
          filters.endDate = `${selectedYear}-12-31`;
        }

        const [aggregate, orgList] = await Promise.all([
          fetchDashboardAggregate(filters),
          fetchTopOrganizations(10)
        ]);

        if (isMounted) {
          setData(aggregate);
          setTopOrgs(orgList);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : (err.message || 'Lỗi tải dữ liệu'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => { isMounted = false; };
  }, [selectedDept, selectedYear]);

  // Fallback rendering for UNAUTHORIZED state
  if (error === 'UNAUTHORIZED') {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-[#DCE1E6] rounded-xl shadow-md text-center space-y-5 antialiased">
        <div className="w-16 h-16 bg-[#FFF5F5] border border-red-200 rounded-full flex items-center justify-center mx-auto text-red-600">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[#0f1d28]">
            {language === 'VN' ? 'Yêu Cầu Đăng Nhập' : 'Authentication Required'}
          </h3>
          <p className="text-body-md text-[#72787e] max-w-sm mx-auto">
            {language === 'VN'
              ? 'Tài khoản của quý khách chưa đăng nhập hoặc đã phiên làm việc đã hết hạn. Vui lòng nhấn nút đăng nhập ở góc trên để cấu hình quyền truy cập (RLS).'
              : 'Please authenticate via Google OAuth to inherit RLS file-access dashboard rights.'}
          </p>
        </div>
      </div>
    );
  }

  // Fallback rendering for other errors
  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-[#DCE1E6] rounded-xl shadow-md text-center space-y-4 antialiased">
        <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-[#0f1d28]">Lỗi Đồng Bộ Kết Nối</h4>
          <p className="text-xs text-[#72787e]">{error}</p>
        </div>
        <button
          onClick={() => { setSelectedDept(selectedDept); }}
          className="px-4 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          {language === 'VN' ? 'Tải Lại' : 'Retry'}
        </button>
      </div>
    );
  }

  const stats = data?.summary || {
    totalEvents: 0,
    totalAttendees: 0,
    uniqueOrganizations: 0,
    totalReports: 0,
    showUpRate: null,
    researchDomainBreakdown: {},
    academicTitleBreakdown: {},
    attendeeRoleBreakdown: {},
    followUpFunnel: {}
  };

  const health = data?.dataHealth || {
    deletedInSourceCount: 0,
    unmappedDepartmentCount: 0,
    failedExtractionJobCount: 0,
    pendingAiLabelingCount: 0
  };

  const isHealthClean = health.deletedInSourceCount === 0 && health.unmappedDepartmentCount === 0 &&
    health.failedExtractionJobCount === 0 && (!health.pendingAiLabelingCount || health.pendingAiLabelingCount === 0);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ANALYTICS / {dashboardMode === 'SYSTEM' ? 'SYSTEM DASHBOARD' : 'EVENT DASHBOARD'}
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
      </div>
      {/* Filter Toolbar (Department + temporal) */}
      <div className="flex flex-wrap items-center gap-3 bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl p-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono font-bold text-[#72787e] uppercase">
            {language === 'VN' ? 'PHÒNG BAN:' : 'DEPT:'}
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            disabled={loading}
            className="text-xs font-semibold bg-white border border-[#DCE1E6] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00344c]"
          >
            <option value="ALL">{language === 'VN' ? 'TẤT CẢ PHÒNG BAN' : 'ALL DEPARTMENTS'}</option>
            <option value="CS">Computer Science (CS)</option>
            <option value="KHCN">Khoa học & Công nghệ (KHCN)</option>
            <option value="HTQT">Hợp tác Quốc tế (HTQT)</option>
            <option value="KHTC">Kế hoạch - Tài chính (KHTC)</option>
            <option value="CNTT">CNTT & Truyền thông (CNTT)</option>
            <option value="TCCB">Tổ chức Cán bộ (TCCB)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono font-bold text-[#72787e] uppercase">
            {language === 'VN' ? 'NĂM:' : 'YEAR:'}
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={loading}
            className="text-xs font-semibold bg-white border border-[#DCE1E6] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00344c]"
          >
            <option value="ALL">{language === 'VN' ? 'TẤT CẢ NĂM' : 'ALL YEARS'}</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {loading ? (
        /* Loading Skeletons */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-[#DCE1E6] rounded-xl p-4 space-y-3 animate-pulse">
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
                <div className="h-8 w-1/2 bg-gray-200 rounded" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#DCE1E6] rounded-xl p-5 space-y-4 animate-pulse">
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                    <div className="h-3 w-full bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-xl p-5 space-y-4 animate-pulse">
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 w-2/3 bg-gray-200 rounded" />
                    <div className="h-3 w-10 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Actual Dashboard Contents */
        <div className="space-y-6">
          {/* 4 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2 hover:border-[#1b4b66] transition-all">
              <div className="flex items-center justify-between text-[#72787e]">
                <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỔNG SỐ SỰ KIỆN' : 'TOTAL EVENTS'}</span>
                <Calendar className="w-4 h-4 text-[#1b4b66]" />
              </div>
              <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalEvents}</div>
            </div>

            <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2 hover:border-[#1b4b66] transition-all">
              <div className="flex items-center justify-between text-[#72787e]">
                <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỔNG LƯỢT ĐẠI BIỂU' : 'TOTAL DELEGATES'}</span>
                <Users className="w-4 h-4 text-[#1b4b66]" />
              </div>
              <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalAttendees.toLocaleString()}</div>
            </div>

            <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2 hover:border-[#5B4B8A] transition-all">
              <div className="flex items-center justify-between text-[#72787e]">
                <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỔ CHỨC LIÊN KẾT' : 'LINKED ORGS'}</span>
                <Building2 className="w-4 h-4 text-[#5B4B8A]" />
              </div>
              <div className="text-3xl font-bold font-display text-[#00344c]">{stats.uniqueOrganizations}</div>
            </div>

            <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2 hover:border-emerald-700 transition-all">
              <div className="flex items-center justify-between text-[#72787e]">
                <span className="text-[11px] font-mono font-bold uppercase">{language === 'VN' ? 'TỶ LỆ THAM DỰ (SHOW-UP RATE)' : 'SHOW-UP RATE'}</span>
                <Activity className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-3xl font-bold font-display text-[#00344c]">
                {stats.showUpRate !== null && stats.showUpRate !== undefined
                  ? `${(stats.showUpRate * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
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

              <div className="space-y-4">
                {data?.departmentDistribution && data.departmentDistribution.length > 0 ? (
                  data.departmentDistribution.map((dept, i) => {
                    const maxVal = Math.max(...data.departmentDistribution.map((d) => d.count), 1);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-[#0f1d28]">
                          <span>{dept.department}</span>
                          <span className="font-mono text-[#1b4b66]">{dept.count} {language === 'VN' ? 'đại biểu' : 'delegates'}</span>
                        </div>
                        <div className="h-3 bg-[#EEF1F4] rounded-full overflow-hidden border border-[#DCE1E6]">
                          <div
                            className="h-full bg-[#00344c] transition-all duration-500 rounded-full"
                            style={{ width: `${(dept.count / maxVal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#72787e] italic text-center py-6">
                    {language === 'VN' ? 'Không có dữ liệu phân bổ phòng ban' : 'No department distribution statistics'}
                  </p>
                )}
              </div>
            </div>

            {/* Top Organizations Ranking */}
            <div className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#1b4b66]" />
                  <span>{language === 'VN' ? 'TOP TỔ CHỨC ĐỒNG HÀNH (RESOLVED)' : 'TOP PARTNER ORGANIZATIONS'}</span>
                </span>
              </div>

              <div className="divide-y divide-[#DCE1E6] max-h-[300px] overflow-y-auto pr-1">
                {topOrgs && topOrgs.length > 0 ? (
                  topOrgs.map((org, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-[#0f1d28] truncate">{org.orgName}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#edf4ff] text-[#00344c] shrink-0">
                        {org.attendeeCount} {language === 'VN' ? 'người' : 'delegates'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#72787e] italic text-center py-6">
                    {language === 'VN' ? 'Không có dữ liệu tổ chức liên kết' : 'No partner organization records'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CRM & Data Government indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Academic Title & Role Breakdowns */}
            <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#1b4b66]" />
                  <span>{language === 'VN' ? 'PHÂN TÍCH CHUYÊN MÔN ĐẠI BIỂU' : 'PROFESSIONAL SPECTRUM'}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Academic Title counts */}
                <div>
                  <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                    {language === 'VN' ? 'HỌC HÀM / HỌC VỊ' : 'ACADEMIC TITLES'}
                  </h4>
                  <div className="space-y-1.5">
                    {Object.keys(stats.academicTitleBreakdown).length > 0 ? (
                      Object.entries(stats.academicTitleBreakdown).map(([title, val]) => (
                        <div key={title} className="flex justify-between text-xs font-medium">
                          <span className="text-gray-700">{title}</span>
                          <span className="font-mono text-[#00344c] font-bold">{val}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No academic data</p>
                    )}
                  </div>
                </div>

                {/* Role counts */}
                <div>
                  <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                    {language === 'VN' ? 'VAI TRÒ THAM DỰ' : 'ROLES'}
                  </h4>
                  <div className="space-y-1.5">
                    {Object.keys(stats.attendeeRoleBreakdown).length > 0 ? (
                      Object.entries(stats.attendeeRoleBreakdown).map(([role, val]) => (
                        <div key={role} className="flex justify-between text-xs font-medium">
                          <span className="text-gray-700">{role}</span>
                          <span className="font-mono text-[#00344c] font-bold">{val}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No role data</p>
                    )}
                  </div>
                </div>

                {/* Research Domains */}
                <div>
                  <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                    {language === 'VN' ? 'LĨNH VỰC NGHIÊN CỨU' : 'RESEARCH DOMAINS'}
                  </h4>
                  <div className="space-y-1.5">
                    {stats.researchDomainBreakdown && Object.keys(stats.researchDomainBreakdown).length > 0 ? (
                      Object.entries(stats.researchDomainBreakdown).map(([domain, val]) => (
                        <div key={domain} className="flex justify-between text-xs font-medium">
                          <span className="text-gray-700">{domain}</span>
                          <span className="font-mono text-[#00344c] font-bold">{val}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">
                        {language === 'VN' ? 'Không có dữ liệu' : 'No domain data'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Health Governance indicators */}
            <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span>{language === 'VN' ? 'CHỈ SỐ SỨC KHỎE DỮ LIỆU PIPELINE' : 'PIPELINE GOVERNANCE HEALTH'}</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isHealthClean ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isHealthClean ? 'CLEAN' : 'ATTENTION'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">{language === 'VN' ? 'Sự kiện bị ẩn/xóa trên Drive nguồn' : 'Soft-deleted records (Drive)'}</p>
                    <p className="text-[10px] text-gray-400">is_deleted_in_source = true</p>
                  </div>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${health.deletedInSourceCount > 0 ? 'bg-red-50 text-red-600' : 'text-gray-600 bg-gray-50'}`}>
                    {health.deletedInSourceCount}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">{language === 'VN' ? 'Sự kiện thuộc Folder chưa phân loại' : 'Unmapped Department Folders'}</p>
                    <p className="text-[10px] text-gray-400">department = 'UNMAPPED'</p>
                  </div>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${health.unmappedDepartmentCount > 0 ? 'bg-amber-50 text-amber-600' : 'text-gray-600 bg-gray-50'}`}>
                    {health.unmappedDepartmentCount}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">{language === 'VN' ? 'Số luồng trích xuất Gemini thất bại' : 'Failed Gemini Extraction Jobs'}</p>
                    <p className="text-[10px] text-gray-400">extraction_jobs where status = 'FAILED'</p>
                  </div>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${health.failedExtractionJobCount > 0 ? 'bg-red-50 text-red-600' : 'text-gray-600 bg-gray-50'}`}>
                    {health.failedExtractionJobCount}
                  </span>
                </div>

                {health.pendingAiLabelingCount !== undefined && health.pendingAiLabelingCount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{language === 'VN' ? 'Đại biểu đang chờ gán nhãn chuyên môn AI' : 'Delegates Web-scraping Pending AI Labeling'}</p>
                      <p className="text-[10px] text-gray-400">ai_labeled = false</p>
                    </div>
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600">
                      {health.pendingAiLabelingCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
