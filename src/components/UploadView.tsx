import React, { useState, useRef } from 'react';
import {
  Upload,
  Link,
  FileText,
  CloudUpload,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Filter,
  Sparkles,
  ChevronDown,
  X,
  File,
  ExternalLink,
  Info,
  HardDrive
} from 'lucide-react';
import { translations } from '../data/translations';
import { UserProfile } from './GoogleAuthModal';

interface UploadViewProps {
  language: 'VN' | 'EN';
  onExtractionComplete?: (fileName: string, dept: string) => void;
  userProfile?: UserProfile;
  onOpenDrivePicker?: () => void;
  onOpenAuthModal?: () => void;
}

interface UploadItem {
  id: string;
  fileName: string;
  time: string;
  department: string;
  status: 'PROCESSED' | 'EXTRACTING' | 'ERROR';
  errorDetail?: string;
}

export const UploadView: React.FC<UploadViewProps> = ({
  language,
  onExtractionComplete,
  userProfile,
  onOpenDrivePicker,
  onOpenAuthModal,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'FILE' | 'DRIVE'>('FILE');
  const [selectedDepartment, setSelectedDepartment] = useState('HR - Human Resources');
  const [driveUrl, setDriveUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; id: string }[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedErrorLog, setSelectedErrorLog] = useState<{ file: string; detail: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recentUploads, setRecentUploads] = useState<UploadItem[]>([
    {
      id: '1',
      fileName: 'Q3_Employee_Roster_Final_v2.xlsx',
      time: '10:42 AM',
      department: 'HR Dept',
      status: 'PROCESSED'
    },
    {
      id: '2',
      fileName: 'Financial_Report_2023_Draft.csv',
      time: '09:15 AM',
      department: 'Finance',
      status: 'EXTRACTING'
    },
    {
      id: '3',
      fileName: 'Corrupted_Data_Export.txt',
      time: 'Yesterday',
      department: 'IT Dept',
      status: 'ERROR',
      errorDetail: 'Schema mismatch on row 42: Column [Event_Date] expected ISO-8601 string, found invalid timestamp.'
    },
    {
      id: '4',
      fileName: 'Marketing_Campaign_Metrics_Drive.csv',
      time: 'Oct 12',
      department: 'Marketing',
      status: 'PROCESSED'
    }
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      const newFiles = filesArray.map(f => ({ file: f, id: Math.random().toString(36).substring(7) }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newFiles = filesArray.map(f => ({ file: f, id: Math.random().toString(36).substring(7) }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleStartExtraction = () => {
    if (activeTab === 'FILE' && uploadedFiles.length === 0) {
      alert(language === 'VN' ? 'Vui lòng chọn ít nhất 1 file để trích xuất!' : 'Please select at least 1 file to extract!');
      return;
    }
    if (activeTab === 'DRIVE' && !driveUrl.trim()) {
      alert(language === 'VN' ? 'Vui lòng nhập đường dẫn Google Drive hợp lệ!' : 'Please enter a valid Google Drive URL!');
      return;
    }

    setIsExtracting(true);

    const newFileName = activeTab === 'FILE'
      ? uploadedFiles[0].file.name
      : driveUrl.split('/').pop() || 'Drive_Document_Extracted.xlsx';

    const newId = Math.random().toString(36).substring(7);

    // Add item with EXTRACTING state
    const newItem: UploadItem = {
      id: newId,
      fileName: newFileName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      department: selectedDepartment.split('-')[0].trim(),
      status: 'EXTRACTING'
    };

    setRecentUploads(prev => [newItem, ...prev]);

    // Simulate extraction delay
    setTimeout(() => {
      setRecentUploads(prev =>
        prev.map(item => item.id === newId ? { ...item, status: 'PROCESSED' } : item)
      );
      setIsExtracting(false);
      setUploadedFiles([]);
      setDriveUrl('');
      if (onExtractionComplete) {
        onExtractionComplete(newFileName, selectedDepartment);
      }
    }, 2800);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Page Header */}
      <div className="space-y-1 border-b border-[#DCE1E6] pb-4">
        <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
          / KNOWLEDGE BASE V2.4
        </div>
        <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display">
          Upload & Link Data
        </h1>
        <p className="text-body-md text-[#41474d] max-w-2xl">
          Import raw data files or connect directly to Google Drive. Ensure your files comply with the standard extraction schemas.
        </p>
      </div>

      {/* Main Grid: Upload Area (Left) & Recent Uploads (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload Box & Mapping Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-[#EEF1F4] border border-[#DCE1E6] rounded-xl p-5 shadow-xs space-y-5">
            {/* Top Tabs */}
            <div className="flex items-center gap-2 border-b border-[#DCE1E6] pb-3">
              <button
                onClick={() => setActiveTab('FILE')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'FILE'
                    ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
                    : 'text-[#41474d] hover:bg-white/50'
                }`}
              >
                <FileText className="w-4 h-4 text-[#1b4b66]" />
                <span>Tải lên file</span>
              </button>

              <button
                onClick={() => setActiveTab('DRIVE')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'DRIVE'
                    ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
                    : 'text-[#41474d] hover:bg-white/50'
                }`}
              >
                <Link className="w-4 h-4 text-[#5B4B8A]" />
                <span>Dán link Drive</span>
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD ZONE */}
            {activeTab === 'FILE' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 lg:p-12 text-center transition-all bg-white flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                  isDragging
                    ? 'border-[#00344c] bg-[#edf4ff]'
                    : 'border-[#c1c7cd] hover:border-[#1b4b66] hover:bg-[#F8FAFC]'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept=".xlsx,.csv,.txt"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-[#00344c] text-white flex items-center justify-center shadow-md">
                  <CloudUpload className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-body-lg font-bold text-[#00344c]">
                    Kéo thả file vào đây
                  </h3>
                  <p className="text-caption-xs text-[#72787e]">
                    Hỗ trợ định dạng .xlsx, .csv, .txt. Kích thước tối đa 50MB mỗi file.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#00344c] text-white text-xs font-medium rounded-md hover:bg-[#1b4b66] transition-colors shadow-2xs cursor-pointer"
                >
                  <File className="w-3.5 h-3.5" />
                  <span>Chọn file từ máy tính</span>
                </button>
              </div>
            ) : (
              /* TAB 2: DRIVE LINK INPUT & OAUTH PICKER */
              <div className="bg-white border border-[#DCE1E6] rounded-xl p-6 space-y-5">
                {/* Drive OAuth Picker Launch Card */}
                <div className="bg-[#00344c] text-white rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-[#1b4b66] rounded-lg border border-[#305c75] shrink-0">
                      <HardDrive className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">
                        {language === 'VN' ? 'Đồng bộ trực tiếp Google Drive OAuth 2.0' : 'Direct Google Drive Sync'}
                      </h4>
                      <p className="text-xs text-[#A0AEC0] mt-0.5">
                        {userProfile?.isLoggedIn
                          ? (language === 'VN'
                              ? `Đã kết nối tài khoản (${userProfile.email})`
                              : `Connected account (${userProfile.email})`)
                          : (language === 'VN'
                              ? 'Chưa kết nối tài khoản. Vui lòng xác thực OAuth để chọn tệp trực tiếp.'
                              : 'Not connected. Authenticate OAuth to pick files directly.')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onOpenDrivePicker}
                    className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-[#00344c] font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>{language === 'VN' ? 'Mở Bộ chọn tệp Google Drive' : 'Open Google Drive Picker'}</span>
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[#DCE1E6] w-full" />
                  <span className="bg-white px-3 text-[10px] font-mono text-[#72787e] uppercase shrink-0">
                    {language === 'VN' ? 'Hoặc dán URL công khai' : 'Or paste public URL'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-caption-xs font-semibold text-[#00344c] uppercase tracking-wide block">
                    Đường dẫn tệp Google Drive
                  </label>
                  <div className="relative flex items-center">
                    <Link className="w-4 h-4 text-[#72787e] absolute left-3" />
                    <input
                      type="url"
                      value={driveUrl}
                      onChange={e => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/1a2b3c4d5e6f.../view?usp=sharing"
                      className="w-full pl-9 pr-3 py-2 text-xs font-body bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="bg-[#edf4ff] p-3 rounded-lg flex items-start gap-2.5 text-xs text-[#1b4b66]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Đảm bảo file Google Drive của bạn đã được cài đặt chế độ chia sẻ <strong>&quot;Bất kỳ ai có liên kết&quot;</strong> để hệ thống EventKnow trích xuất tự động.
                  </p>
                </div>

                {/* Quick Google Drive File List Selector */}
                <div className="space-y-2 pt-1 border-t border-[#DCE1E6]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#00344c] uppercase tracking-wide">
                      Tệp đề xuất từ Google Drive cá nhân:
                    </span>
                    <button
                      onClick={onOpenDrivePicker}
                      className="text-[11px] font-bold text-[#1b4b66] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Xem tất cả tệp</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { name: 'Danh_Sach_Dai_Bieu_Hoi_Thao_Sankei_2026.xlsx', type: 'Sheets', size: '1.4 MB' },
                      { name: 'Kich_Ban_Dieu_Hanh_Event_Sankei_Building.docx', type: 'Docs', size: '850 KB' },
                      { name: 'Bao_Cao_Ngan_Sach_Su_Kien_Q3_Draft.xlsx', type: 'Sheets', size: '2.1 MB' },
                      { name: 'Ho_So_Cap_Phep_An_Ninh_To_Chuc_Su_Kien.pdf', type: 'PDF', size: '4.8 MB' },
                    ].map((file) => (
                      <div
                        key={file.name}
                        onClick={() => {
                          setDriveUrl(`https://drive.google.com/file/d/${file.name}/view`);
                        }}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          driveUrl.includes(file.name)
                            ? 'bg-amber-50 border-amber-300 shadow-2xs'
                            : 'bg-[#F8FAFC] border-[#DCE1E6] hover:bg-white hover:border-[#00344c]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#0f1d28] truncate text-[11px]">{file.name}</p>
                          <p className="text-[10px] text-[#72787e] font-mono mt-0.5">
                            {file.type} • {file.size}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDriveUrl(`https://drive.google.com/file/d/${file.name}/view`);
                          }}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors shrink-0 cursor-pointer ${
                            driveUrl.includes(file.name)
                              ? 'bg-[#00344c] text-white'
                              : 'bg-white text-[#00344c] border border-[#DCE1E6] hover:bg-[#EEF1F4]'
                          }`}
                        >
                          {driveUrl.includes(file.name) ? 'Đã chọn' : 'Chọn tệp'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded File Queue List */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white border border-[#DCE1E6] rounded-lg p-3 space-y-2">
                <p className="text-caption-xs font-semibold text-[#00344c] uppercase">
                  Tệp đã chuẩn bị trích xuất ({uploadedFiles.length})
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {uploadedFiles.map(({ file, id }) => (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-[#1b4b66] shrink-0" />
                        <span className="truncate font-medium text-[#0f1d28]">{file.name}</span>
                        <span className="font-data-mono text-[10px] text-[#72787e] bg-white px-1.5 py-0.2 rounded border border-[#DCE1E6] shrink-0">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(id)}
                        className="p-1 text-[#72787e] hover:text-red-600 rounded transition-colors"
                        title="Xóa"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Controls: Department Mapping & Extraction Action */}
            <div className="pt-2 border-t border-[#DCE1E6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1 max-w-xs">
                <label className="text-caption-xs font-bold text-[#00344c] uppercase tracking-wide block">
                  Department Mapping
                </label>
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    onChange={e => setSelectedDepartment(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-body bg-white border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c] appearance-none cursor-pointer shadow-2xs font-medium"
                  >
                    <option value="HR - Human Resources">HR - Human Resources</option>
                    <option value="Finance - Tài chính">Finance - Tài chính</option>
                    <option value="Marketing - Truyền thông">Marketing - Truyền thông</option>
                    <option value="R&D - Research & Development">R&D - Research & Development</option>
                    <option value="IT - Information Technology">IT - Information Technology</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#72787e] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleStartExtraction}
                disabled={isExtracting}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 bg-[#00344c] text-white font-semibold text-xs rounded-lg hover:bg-[#1b4b66] transition-all shadow-xs cursor-pointer ${
                  isExtracting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang trích xuất dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Bắt đầu trích xuất</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Uploads Card (4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-xs overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#DCE1E6] bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#00344c]" />
                <h2 className="font-display font-bold text-sm text-[#00344c]">
                  Recent Uploads
                </h2>
              </div>
              <button
                className="p-1 text-[#72787e] hover:text-[#00344c] rounded hover:bg-[#EEF1F4]"
                title="Lọc danh sách"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Uploads List */}
            <div className="p-3 space-y-3 divide-y divide-[#DCE1E6]/60">
              {recentUploads.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 overflow-hidden">
                      {item.status === 'ERROR' ? (
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#1b4b66] shrink-0 mt-0.5" />
                      )}
                      <div className="overflow-hidden">
                        <p className={`text-xs font-semibold truncate ${item.status === 'ERROR' ? 'text-red-600' : 'text-[#0f1d28]'}`}>
                          {item.fileName}
                        </p>
                        <p className="text-[10px] font-mono text-[#72787e] mt-0.5">
                          {item.time}
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-[#72787e] shrink-0">
                      {item.time}
                    </span>
                  </div>

                  {/* Status & Tag Row */}
                  <div className="flex items-center justify-between pl-6 text-[11px]">
                    <span className="font-data-mono text-[10px] text-[#41474d] bg-[#EEF1F4] border border-[#DCE1E6] px-1.5 py-0.2 rounded font-medium">
                      {item.department}
                    </span>

                    {item.status === 'PROCESSED' && (
                      <span className="flex items-center gap-1 font-data-mono text-[10px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>PROCESSED</span>
                      </span>
                    )}

                    {item.status === 'EXTRACTING' && (
                      <span className="flex items-center gap-1 font-data-mono text-[10px] font-bold text-amber-600">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                        <span>EXTRACTING</span>
                      </span>
                    )}

                    {item.status === 'ERROR' && (
                      <div className="text-right">
                        <button
                          onClick={() => setSelectedErrorLog({ file: item.fileName, detail: item.errorDetail || 'Unknown error' })}
                          className="font-data-mono text-[10px] font-semibold text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>View Log</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub error detail if any */}
                  {item.status === 'ERROR' && item.errorDetail && (
                    <p className="text-[10px] text-red-500 font-mono pl-6 truncate">
                      {item.errorDetail.split(':')[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Footer Link */}
            <div className="p-3 border-t border-[#DCE1E6] bg-[#F8FAFC] text-center">
              <button
                onClick={() => alert(language === 'VN' ? 'Đang mở toàn bộ lịch sử trích xuất dữ liệu...' : 'Opening full extraction history...')}
                className="text-xs font-bold text-[#00344c] hover:underline font-mono cursor-pointer"
              >
                View All History
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Log Inspection Modal */}
      {selectedErrorLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE1E6] rounded-xl max-w-lg w-full shadow-xl overflow-hidden animate-fade-in">
            <div className="p-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Schema Validation Error Log</h3>
              </div>
              <button
                onClick={() => setSelectedErrorLog(null)}
                className="p-1 text-red-500 hover:bg-red-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 font-mono text-xs">
              <p className="text-[#0f1d28]">
                <strong>File:</strong> {selectedErrorLog.file}
              </p>
              <div className="bg-[#1e293b] text-red-300 p-3 rounded-lg overflow-x-auto text-[11px] leading-relaxed">
                <code>{selectedErrorLog.detail}</code>
              </div>
            </div>

            <div className="p-3 bg-[#EEF1F4] border-t border-[#DCE1E6] text-right">
              <button
                onClick={() => setSelectedErrorLog(null)}
                className="px-4 py-1.5 bg-[#00344c] text-white text-xs font-semibold rounded hover:bg-[#1b4b66]"
              >
                Đóng nhật ký
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
