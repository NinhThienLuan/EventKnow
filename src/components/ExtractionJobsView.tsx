import React, { useState } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
  XCircle,
  Pause,
  Play,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2
} from 'lucide-react';
import { translations } from '../data/translations';

interface ExtractionJobsViewProps {
  language: 'VN' | 'EN';
}

interface JobItem {
  id: string;
  fileName: string;
  department: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED' | 'PENDING';
  progress: number;
  updatedAt: string;
}

export const ExtractionJobsView: React.FC<ExtractionJobsViewProps> = ({ language }) => {
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [jobs, setJobs] = useState<JobItem[]>([
    {
      id: 'JOB-8821',
      fileName: 'Bieu_mau_Bao_cao_Tai_chinh_Q3_2023.pdf',
      department: 'Phòng Tài chính',
      status: 'FAILED',
      progress: 45,
      updatedAt: '10:42 AM'
    },
    {
      id: 'JOB-8820',
      fileName: 'Quyet_dinh_nhan_su_HDQT_112.docx',
      department: 'Ban Giám đốc',
      status: 'PROCESSING',
      progress: 72,
      updatedAt: '10:40 AM'
    },
    {
      id: 'JOB-8819',
      fileName: 'Danh_sach_khach_hang_VIP_2024.xlsx',
      department: 'Phòng Kinh doanh',
      status: 'COMPLETED',
      progress: 100,
      updatedAt: '10:35 AM'
    },
    {
      id: 'JOB-8818',
      fileName: 'Hop_dong_cung_cap_dich_vu_IT.pdf',
      department: 'Phòng Pháp chế',
      status: 'PENDING',
      progress: 0,
      updatedAt: '10:30 AM'
    },
    {
      id: 'JOB-8817',
      fileName: 'Nghiencuu_thi_truong_DongNamA_2024.pptx',
      department: 'Phòng Marketing',
      status: 'COMPLETED',
      progress: 100,
      updatedAt: '09:50 AM'
    },
    {
      id: 'JOB-8816',
      fileName: 'Danh_sach_nhan_su_R_and_D_v3.xlsx',
      department: 'Phòng R&D',
      status: 'COMPLETED',
      progress: 100,
      updatedAt: '09:12 AM'
    },
    {
      id: 'JOB-8815',
      fileName: 'Khao_sat_y_kien_nhan_vien_Q2.csv',
      department: 'Phòng HR',
      status: 'FAILED',
      progress: 18,
      updatedAt: 'Yesterday'
    }
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleRetryJob = (id: string) => {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'PROCESSING', progress: 10 } : j))
    );

    // Simulate progress
    setTimeout(() => {
      setJobs(prev =>
        prev.map(j => (j.id === id ? { ...j, status: 'COMPLETED', progress: 100 } : j))
      );
    }, 2500);
  };

  const handleTogglePause = (id: string) => {
    setJobs(prev =>
      prev.map(j => {
        if (j.id === id) {
          if (j.status === 'PROCESSING') return { ...j, status: 'PENDING' };
          if (j.status === 'PENDING') return { ...j, status: 'PROCESSING', progress: Math.max(j.progress, 20) };
        }
        return j;
      })
    );
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      selectedStatus === 'ALL' || job.status === selectedStatus;
    const matchesDept =
      selectedDept === 'ALL' || job.department.includes(selectedDept);
    return matchesSearch && matchesStatus && matchesDept;
  });

  const totalJobs = 1248;
  const completedJobs = 1102;
  const processingJobs = 143;
  const failedJobs = 3;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ADMINISTRATION / EXTRACTION
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display">
            {language === 'VN' ? 'Tiến trình trích xuất' : 'Extraction Jobs'}
          </h1>
          <p className="text-body-md text-[#41474d] max-w-2xl">
            {language === 'VN'
              ? 'Theo dõi và xử lý dữ liệu hàng loạt.'
              : 'Monitor and batch process extracted data.'}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00344c] text-white font-semibold text-xs rounded-lg hover:bg-[#1b4b66] transition-all shadow-2xs cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{language === 'VN' ? 'Làm mới dữ liệu' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total */}
        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#72787e]">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
              {language === 'VN' ? 'TỔNG SỐ TỆP' : 'TOTAL FILES'}
            </span>
            <FileText className="w-4 h-4 text-[#1b4b66]" />
          </div>
          <div className="text-2xl font-bold font-display text-[#00344c]">
            {totalJobs.toLocaleString()}
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {language === 'VN' ? 'HOÀN THÀNH' : 'COMPLETED'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-bold font-display text-[#00344c]">
            {completedJobs.toLocaleString()}
          </div>
        </div>

        {/* Card 3: Processing */}
        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {language === 'VN' ? 'ĐANG XỬ LÝ' : 'PROCESSING'}
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-bold font-display text-[#00344c]">
            {processingJobs.toLocaleString()}
          </div>
        </div>

        {/* Card 4: Failed */}
        <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {language === 'VN' ? 'LỖI (FAILED)' : 'FAILED'}
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-2xl font-bold font-display text-[#00344c]">
            {failedJobs}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#EEF1F4] border border-[#DCE1E6] rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={language === 'VN' ? 'Tìm tên tệp nguồn hoặc ID...' : 'Search source file name or ID...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 bg-white border border-[#DCE1E6] px-2.5 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-[#72787e]" />
            <span className="text-[#72787e] font-medium">{language === 'VN' ? 'Trạng thái:' : 'Status:'}</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-[#00344c] focus:outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'VN' ? 'Tất cả' : 'All'}</option>
              <option value="COMPLETED">{language === 'VN' ? 'Hoàn thành' : 'Completed'}</option>
              <option value="PROCESSING">{language === 'VN' ? 'Đang xử lý' : 'Processing'}</option>
              <option value="FAILED">{language === 'VN' ? 'Lỗi' : 'Failed'}</option>
              <option value="PENDING">{language === 'VN' ? 'Chờ xử lý' : 'Pending'}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-[#DCE1E6] px-2.5 py-1.5 rounded-lg text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#72787e]" />
            <span className="text-[#72787e] font-medium">{language === 'VN' ? 'Phòng ban:' : 'Department:'}</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent font-semibold text-[#00344c] focus:outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'VN' ? 'Tất cả phòng ban' : 'All Departments'}</option>
              <option value="Tài chính">{language === 'VN' ? 'Phòng Tài chính' : 'Finance'}</option>
              <option value="Giám đốc">{language === 'VN' ? 'Ban Giám đốc' : 'Board'}</option>
              <option value="Kinh doanh">{language === 'VN' ? 'Phòng Kinh doanh' : 'Sales'}</option>
              <option value="Pháp chế">{language === 'VN' ? 'Phòng Pháp chế' : 'Legal'}</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Jobs Table */}
      <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#edf4ff]/60 border-b border-[#DCE1E6] text-[#00344c] font-display font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{language === 'VN' ? 'TỆP NGUỒN' : 'SOURCE FILE'}</th>
                <th className="py-3 px-4">{language === 'VN' ? 'PHÒNG BAN' : 'DEPARTMENT'}</th>
                <th className="py-3 px-4">{language === 'VN' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                <th className="py-3 px-4">{language === 'VN' ? 'TIẾN ĐỘ' : 'PROGRESS'}</th>
                <th className="py-3 px-4 text-right">{language === 'VN' ? 'THAO TÁC' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE1E6]">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#72787e]">
                    {language === 'VN' ? 'Không tìm thấy tiến trình phù hợp.' : 'No matching jobs found.'}
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* File Name */}
                    <td className="py-3.5 px-4 font-semibold text-[#0f1d28]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#1b4b66] shrink-0" />
                        <span className="truncate max-w-xs sm:max-w-md">{job.fileName}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-[#41474d] font-medium">
                      {job.department}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      {job.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          {language === 'VN' ? 'LỖI' : 'FAILED'}
                        </span>
                      )}
                      {job.status === 'PROCESSING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00344c] text-white shadow-2xs">
                          {language === 'VN' ? 'ĐANG XỬ LÝ' : 'PROCESSING'}
                        </span>
                      )}
                      {job.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {language === 'VN' ? 'HOÀN THÀNH' : 'COMPLETED'}
                        </span>
                      )}
                      {job.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          {language === 'VN' ? 'CHỜ XỬ LÝ' : 'PENDING'}
                        </span>
                      )}
                    </td>

                    {/* Progress Bar & % */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#EEF1F4] rounded-full overflow-hidden border border-[#DCE1E6]">
                          <div
                            className={`h-full transition-all duration-300 ${
                              job.status === 'FAILED'
                                ? 'bg-rose-600'
                                : job.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : job.status === 'PROCESSING'
                                ? 'bg-[#00344c]'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[#41474d] w-9 text-right">
                          {job.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Action Controls */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#DCE1E6] text-[#00344c] hover:bg-[#edf4ff] hover:border-[#00344c] rounded font-medium text-[11px] transition-colors cursor-pointer shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3 text-[#00344c]" />
                            <span>{language === 'VN' ? 'Thử lại' : 'Retry'}</span>
                          </button>
                        )}

                        {job.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleTogglePause(job.id)}
                            className="p-1.5 text-[#72787e] hover:text-[#00344c] hover:bg-[#EEF1F4] rounded transition-colors cursor-pointer"
                            title="Tạm dừng"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {job.status === 'PENDING' && (
                          <button
                            onClick={() => handleTogglePause(job.id)}
                            className="p-1.5 text-[#72787e] hover:text-[#00344c] hover:bg-[#EEF1F4] rounded transition-colors cursor-pointer"
                            title="Tiếp tục"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}

                        {job.status === 'COMPLETED' && (
                          <button
                            onClick={() => alert(language === 'VN' ? `Xem kết quả trích xuất cho ${job.fileName}` : `Viewing extracted output for ${job.fileName}`)}
                            className="p-1.5 text-[#72787e] hover:text-[#00344c] hover:bg-[#EEF1F4] rounded transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-3 bg-[#edf4ff]/30 border-t border-[#DCE1E6] flex items-center justify-between text-xs font-mono text-[#72787e]">
          <span>
            {language === 'VN' ? 'Hiển thị 1-7 trong tổng số 1,248 tiến trình' : 'Showing 1-7 of 1,248 jobs'}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 text-[#72787e] hover:text-[#00344c] disabled:opacity-30 rounded cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                currentPage === 1 ? 'bg-[#00344c] text-white' : 'hover:bg-[#EEF1F4] text-[#0f1d28]'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                currentPage === 2 ? 'bg-[#00344c] text-white' : 'hover:bg-[#EEF1F4] text-[#0f1d28]'
              }`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                currentPage === 3 ? 'bg-[#00344c] text-white' : 'hover:bg-[#EEF1F4] text-[#0f1d28]'
              }`}
            >
              3
            </button>
            <span>...</span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1 text-[#72787e] hover:text-[#00344c] rounded cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
