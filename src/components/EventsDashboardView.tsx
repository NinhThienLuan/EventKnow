import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Users,
    Building2,
    Calendar,
    Layers,
    Activity,
    ArrowLeft,
    Printer,
    Shield,
    AlertTriangle,
    FileSpreadsheet
} from 'lucide-react';
import { fetchDashboardAggregate, fetchTopOrganizations } from '../lib/dashboardApi';
import { DashboardAggregate, TopOrganization } from '../types';

interface EventsDashboardViewProps {
    language: 'VN' | 'EN';
    selectedEventIds: string[];
    onBack: () => void;
}

export const EventsDashboardView: React.FC<EventsDashboardViewProps> = ({
    language,
    selectedEventIds,
    onBack
}) => {
    const [data, setData] = useState<DashboardAggregate | null>(null);
    const [topOrgs, setTopOrgs] = useState<TopOrganization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedEventIds.length === 0) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [aggregate, orgList] = await Promise.all([
                    fetchDashboardAggregate({ eventIds: selectedEventIds }),
                    fetchTopOrganizations(10)
                ]);

                if (isMounted) {
                    setData(aggregate);
                    setTopOrgs(orgList);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : (err.message || 'Lỗi tải dữ liệu.'));
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [selectedEventIds]);

    const handlePrint = () => {
        window.print();
    };

    const isVN = language === 'VN';
    const t = {
        back: isVN ? 'Quay lại' : 'Back',
        print: isVN ? 'In báo cáo' : 'Print Report',
        title: isVN ? 'Thống kê Sự kiện được Chọn' : 'Selected Events Analytics',
        subtitle: isVN ? `Xem phân tích tổng hợp từ ${selectedEventIds.length} sự kiện được chọn` : `General analytics rollup for ${selectedEventIds.length} selected events`,
        noEvents: isVN ? 'Chưa chọn sự kiện nào để xem báo cáo.' : 'No events selected to view reports.',
        loading: isVN ? 'Đang tổng hợp dữ liệu sự kiện...' : 'Aggregating event analytics data...',
        unauthorized: isVN ? 'Yêu Cầu Đăng Nhập' : 'Authentication Required',
        authTip: isVN
            ? 'Vui lòng đăng nhập để thừa hưởng quyền RLS từ Google Drive.'
            : 'Please login to inherit RLS file-access dashboard rights.',
        totalEvents: isVN ? 'TỔNG SỐ SỰ KIỆN' : 'TOTAL EVENTS',
        totalDelegates: isVN ? 'TỔNG LƯỢT ĐẠI BIỂU' : 'TOTAL DELEGATES',
        linkedOrgs: isVN ? 'TỔ CHỨC ĐỒNG HÀNH' : 'LINKED ORGS',
        showUpRate: isVN ? 'TỶ LỆ THAM DỰ (SHOW-UP RATE)' : 'SHOW-UP RATE',
        deptDist: isVN ? 'PHÂN BỐ THEO PHÒNG BAN' : 'DEPARTMENT DISTRIBUTION',
        delegates: isVN ? 'đại biểu' : 'delegates',
        topPartners: isVN ? 'TOP TỔ CHỨC ĐỒNG HÀNH' : 'TOP PARTNER ORGANIZATIONS',
        noDeptData: isVN ? 'Không có dữ liệu phân bổ phòng ban' : 'No department distribution data',
        noOrgData: isVN ? 'Không có dữ liệu tổ chức' : 'No partner organizations data',
        acadTitle: isVN ? 'HỌC HÀM / HỌC VỊ' : 'ACADEMIC TITLES',
        roles: isVN ? 'VAI TRÒ THAM DỰ' : 'ROLES',
        domains: isVN ? 'LĨNH VỰC NGHIÊN CỨU' : 'RESEARCH DOMAINS',
        professionalSpectrum: isVN ? 'PHÂN TÍCH CHUYÊN MÔN ĐẠI BIỂU' : 'PROFESSIONAL SPECTRUM',
        healthTitle: isVN ? 'CHỈ SỐ SỨC KHỎE PIPELINE GẮN VỚI SỰ KIỆN' : 'PIPELINE HEALTH INDEX FOR SELECTED EVENTS'
    };

    if (selectedEventIds.length === 0) {
        return (
            <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-[#DCE1E6] rounded-xl shadow-md text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="text-lg font-bold text-[#0f1d28]">{t.noEvents}</h3>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                    {t.back}
                </button>
            </div>
        );
    }

    // Under RLS unauthorized logic
    if (error === 'UNAUTHORIZED') {
        return (
            <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-[#DCE1E6] rounded-xl shadow-md text-center space-y-5 antialiased">
                <div className="w-16 h-16 bg-[#FFF5F5] border border-red-200 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <Shield className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[#0f1d28]">{t.unauthorized}</h3>
                    <p className="text-xs text-[#72787e] max-w-sm mx-auto">{t.authTip}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-[#DCE1E6] rounded-xl shadow-md text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                <p className="text-xs text-[#72787e]">{error}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                    {t.back}
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
        <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in print-container">
            {/* Dynamic CSS injecting print media rules */}
            <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #DCE1E6 !important;
            background: white !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
            gap: 1rem !important;
          }
          .print-col-7 {
            grid-column: span 7 / span 7 !important;
          }
          .print-col-5 {
            grid-column: span 5 / span 5 !important;
          }
        }
      `}</style>

            {/* Toolbar / Actions */}
            <div className="flex items-center justify-between no-print border-b border-[#DCE1E6] pb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#00344c] hover:bg-[#EEF1F4] rounded-lg transition-colors cursor-pointer border border-[#DCE1E6]"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t.back}</span>
                </button>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#5B4B8A] hover:bg-[#6D5D9E] rounded-lg transition-all shadow-2xs cursor-pointer"
                >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t.print}</span>
                </button>
            </div>

            {/* Header Banner */}
            <div className="space-y-1">
                <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
                    / {isVN ? 'PHÂN TÍCH NHÓM SỰ KIỆN' : 'SCOPED EVENT DASHBOARD'}
                </div>
                <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-[#5B4B8A]" />
                    <span>{t.title}</span>
                </h1>
                <p className="text-xs text-[#72787e] mt-1">{t.subtitle}</p>
            </div>

            {loading ? (
                /* Loading skeleton state */
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
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
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                                        <div className="h-3 w-full bg-gray-200 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-xl p-5 space-y-4 animate-pulse">
                            <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            ) : (
                /* Dashboard Content panels */
                <div className="space-y-6">
                    {/* 4 Card Key stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 print-card hover:border-[#1b4b66] transition-all">
                            <div className="flex items-center justify-between text-[#72787e]">
                                <span className="text-[10px] font-mono font-bold uppercase">{t.totalEvents}</span>
                                <Calendar className="w-4 h-4 text-[#1b4b66]" />
                            </div>
                            <div className="text-3xl font-bold font-display text-[#00344c]">{selectedEventIds.length}</div>
                        </div>

                        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 print-card hover:border-[#1b4b66] transition-all">
                            <div className="flex items-center justify-between text-[#72787e]">
                                <span className="text-[10px] font-mono font-bold uppercase">{t.totalDelegates}</span>
                                <Users className="w-4 h-4 text-[#1b4b66]" />
                            </div>
                            <div className="text-3xl font-bold font-display text-[#00344c]">{stats.totalAttendees.toLocaleString()}</div>
                        </div>

                        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 print-card hover:border-[#5B4B8A] transition-all">
                            <div className="flex items-center justify-between text-[#72787e]">
                                <span className="text-[10px] font-mono font-bold uppercase">{t.linkedOrgs}</span>
                                <Building2 className="w-4 h-4 text-[#5B4B8A]" />
                            </div>
                            <div className="text-3xl font-bold font-display text-[#00344c]">{stats.uniqueOrganizations}</div>
                        </div>

                        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 print-card hover:border-emerald-700 transition-all">
                            <div className="flex items-center justify-between text-[#72787e]">
                                <span className="text-[10px] font-mono font-bold uppercase">{t.showUpRate}</span>
                                <Activity className="w-4 h-4 text-emerald-700" />
                            </div>
                            <div className="text-3xl font-bold font-display text-[#00344c]">
                                {stats.showUpRate !== null && stats.showUpRate !== undefined
                                    ? `${(stats.showUpRate * 100).toFixed(1)}%`
                                    : '—'}
                            </div>
                        </div>
                    </div>

                    {/* Department Distributions and Partners ranking */}
                    <div className="print-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Department ratios */}
                        <div className="lg:col-span-7 print-col-7 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs print-card space-y-4">
                            <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                                <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-[#1b4b66]" />
                                    <span>{t.deptDist}</span>
                                </span>
                            </div>

                            <div className="space-y-4">
                                {data?.departmentDistribution && data.departmentDistribution.length > 0 ? (
                                    data.departmentDistribution.map((dept, i) => {
                                        const maxVal = Math.max(...data.departmentDistribution.map(d => d.count), 1);
                                        return (
                                            <div key={i} className="space-y-1">
                                                <div className="flex justify-between text-xs font-semibold text-[#0f1d28]">
                                                    <span>{dept.department}</span>
                                                    <span className="font-mono text-[#1b4b66]">{dept.count} {t.delegates}</span>
                                                </div>
                                                <div className="h-3 bg-[#EEF1F4] rounded-full overflow-hidden border border-[#DCE1E6]">
                                                    <div
                                                        className="h-full bg-[#5B4B8A] transition-all duration-500 rounded-full"
                                                        style={{ width: `${(dept.count / maxVal) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-[#72787e] italic text-center py-6">{t.noDeptData}</p>
                                )}
                            </div>
                        </div>

                        {/* Partners Organizations list */}
                        <div className="lg:col-span-5 print-col-5 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs print-card space-y-4">
                            <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                                <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-[#1b4b66]" />
                                    <span>{t.topPartners}</span>
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
                                                {org.attendeeCount} {isVN ? 'đại biểu' : 'delegates'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-[#72787e] italic text-center py-6">{t.noOrgData}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CRM details grid */}
                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs print-card space-y-4">
                        <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-[#1b4b66]" />
                                <span>{t.professionalSpectrum}</span>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Academic break status */}
                            <div>
                                <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                                    {t.acadTitle}
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

                            {/* Attendance scope roles */}
                            <div>
                                <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                                    {t.roles}
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

                            {/* Research categories */}
                            <div>
                                <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                                    {t.domains}
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
                                        <p className="text-[10px] text-gray-400 italic">No domain mapping info</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Pipeline Indicator */}
                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs print-card space-y-4 no-print">
                        <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-emerald-700" />
                                <span>{t.healthTitle}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isHealthClean ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {isHealthClean ? 'CLEAN' : 'ATTENTION'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                            <div className="flex items-center justify-between p-3 border border-[#DCE1E6] rounded-lg bg-[#F8FAFC]">
                                <div>
                                    <p className="font-semibold text-gray-800">{isVN ? 'Nhãn trích xuất Gemini lỗi' : 'Failed Gemini Extraction'}</p>
                                </div>
                                <span className={`font-mono font-bold px-2 py-0.5 rounded ${health.failedExtractionJobCount > 0 ? 'bg-red-100 text-red-600' : 'text-gray-600 bg-gray-100'}`}>
                                    {health.failedExtractionJobCount}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 border border-[#DCE1E6] rounded-lg bg-[#F8FAFC]">
                                <div>
                                    <p className="font-semibold text-gray-800">{isVN ? 'Folder phòng ban chưa khớp' : 'Unmapped Folders'}</p>
                                </div>
                                <span className={`font-mono font-bold px-2 py-0.5 rounded ${health.unmappedDepartmentCount > 0 ? 'bg-amber-100 text-amber-600' : 'text-gray-600 bg-gray-100'}`}>
                                    {health.unmappedDepartmentCount}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 border border-[#DCE1E6] rounded-lg bg-[#F8FAFC]">
                                <div>
                                    <p className="font-semibold text-gray-800">{isVN ? 'Đại biểu chứa nhãn chờ AI' : 'Pending AI labels'}</p>
                                </div>
                                <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-600">
                                    {health.pendingAiLabelingCount || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
