import React, { useState } from 'react';
import {
  HardDrive,
  Folder,
  FileSpreadsheet,
  FileText,
  Search,
  Check,
  Download,
  X,
  ExternalLink,
  Lock,
  RefreshCw,
  FolderPlus,
  Clock,
  ShieldCheck,
  CloudCheck,
  Key,
  Info
} from 'lucide-react';
import { UserProfile } from './GoogleAuthModal';
import { fetchRealGoogleDriveFiles, GoogleDriveRealFile } from '../lib/googleDriveApi';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: 'spreadsheet' | 'document' | 'folder' | 'pdf';
  size: string;
  modifiedTime: string;
  owner: string;
  shared: boolean;
  selected?: boolean;
}

interface GoogleDrivePickerProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onImportFiles: (files: DriveFileItem[]) => void;
  language: 'VN' | 'EN';
  onOpenAuthModal?: () => void;
  onGrantDrivePermission?: () => void;
}

const MOCK_DRIVE_FILES: DriveFileItem[] = [
  {
    id: 'gdrive-1',
    name: 'Danh_Sach_Dai_Bieu_Hoi_Thao_Sankei_2026.xlsx',
    mimeType: 'spreadsheet',
    size: '1.4 MB',
    modifiedTime: '2026-08-09 14:30',
    owner: 'Luan Ninh',
    shared: true,
  },
  {
    id: 'gdrive-2',
    name: 'Kich_Ban_Dieu_Hanh_Event_Sankei_Building.docx',
    mimeType: 'document',
    size: '850 KB',
    modifiedTime: '2026-08-08 09:15',
    owner: 'Luan Ninh',
    shared: false,
  },
  {
    id: 'gdrive-3',
    name: 'Bao_Cao_Ngan_Sach_Su_Kien_Q3_Draft.xlsx',
    mimeType: 'spreadsheet',
    size: '2.1 MB',
    modifiedTime: '2026-08-07 18:45',
    owner: 'Financial Dept',
    shared: true,
  },
  {
    id: 'gdrive-4',
    name: 'Ho_So_Cap_Phep_An_Ninh_To_Chuc_Su_Kien.pdf',
    mimeType: 'pdf',
    size: '4.8 MB',
    modifiedTime: '2026-08-05 11:20',
    owner: 'Legal Team',
    shared: true,
  },
  {
    id: 'gdrive-5',
    name: 'Thong_Ke_Checkin_Khach_Moi_Live_2026.xlsx',
    mimeType: 'spreadsheet',
    size: '980 KB',
    modifiedTime: 'Hôm nay, 10:12',
    owner: 'Luan Ninh',
    shared: true,
  },
  {
    id: 'gdrive-6',
    name: 'Thu_Moi_Dien_Gia_Chuyen_Gia_AI.docx',
    mimeType: 'document',
    size: '620 KB',
    modifiedTime: '2026-08-02 16:00',
    owner: 'Marketing Team',
    shared: false,
  },
];

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({
  isOpen,
  onClose,
  userProfile,
  onImportFiles,
  language,
  onOpenAuthModal,
  onGrantDrivePermission,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<'ALL' | 'SPREADSHEET' | 'DOCS'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isGrantingScope, setIsGrantingScope] = useState(false);

  // Live Drive API States
  const [customAccessToken, setCustomAccessToken] = useState('');
  const [isFetchingRealDrive, setIsFetchingRealDrive] = useState(false);
  const [realDriveFiles, setRealDriveFiles] = useState<DriveFileItem[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);

  if (!isOpen) return null;

  const hasDriveScope = userProfile.isLoggedIn && userProfile.scopes?.some((s) => s.includes('drive'));
  const activeFilesList = realDriveFiles ?? MOCK_DRIVE_FILES;

  const handleSimulateGrantDriveAccess = () => {
    setIsGrantingScope(true);
    setTimeout(() => {
      if (onGrantDrivePermission) {
        onGrantDrivePermission();
      }
      setIsGrantingScope(false);
    }, 800);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFetchRealDrive = async (tokenToUse?: string) => {
    const token = tokenToUse || customAccessToken;
    if (!token) {
      setShowTokenInput(true);
      return;
    }

    setIsFetchingRealDrive(true);
    setApiError(null);

    try {
      const realFiles = await fetchRealGoogleDriveFiles(token);
      const converted: DriveFileItem[] = realFiles.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType.includes('spreadsheet')
          ? 'spreadsheet'
          : f.mimeType.includes('pdf')
          ? 'pdf'
          : 'document',
        size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(0)} KB` : 'Google Doc',
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('vi-VN') : 'Gần đây',
        owner: f.owners?.[0]?.displayName || userProfile.name || 'Tôi',
        shared: true,
      }));

      setRealDriveFiles(converted);
      setShowTokenInput(false);
    } catch (err: any) {
      setApiError(err.message || 'Không thể kết nối Google Drive API v3. Vui lòng kiểm tra Access Token.');
    } finally {
      setIsFetchingRealDrive(false);
    }
  };

  const filteredFiles = activeFilesList.filter((file) => {
    const matchesQuery = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFileType === 'SPREADSHEET') return matchesQuery && file.mimeType === 'spreadsheet';
    if (selectedFileType === 'DOCS') return matchesQuery && (file.mimeType === 'document' || file.mimeType === 'pdf');
    return matchesQuery;
  });

  const handleImport = () => {
    const chosen = activeFilesList.filter((f) => selectedIds.includes(f.id));
    if (chosen.length === 0) return;

    setIsImporting(true);
    setTimeout(() => {
      onImportFiles(chosen);
      setIsImporting(false);
      setSelectedIds([]);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-[#DCE1E6] max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#00344c] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1b4b66] rounded-lg border border-[#305c75]">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold leading-none">
                  {language === 'VN' ? 'Bộ chọn tệp Google Drive' : 'Google Drive File Picker'}
                </h3>
                <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  OAuth 2.0 Connected
                </span>
              </div>
              <p className="text-[11px] text-[#A0AEC0] mt-1">
                {language === 'VN'
                  ? 'Trích xuất và đồng bộ tài liệu sự kiện trực tiếp từ Google Drive'
                  : 'Import and sync event documents directly from Google Drive'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Auth Banner */}
        <div className="bg-[#F8FAFC] border-b border-[#DCE1E6] px-5 py-2.5 flex items-center justify-between text-xs text-[#0f1d28] shrink-0">
          {userProfile.isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#72787e]">{language === 'VN' ? 'Tài khoản:' : 'Account:'}</span>
              <span className="font-semibold text-[#00344c]">{userProfile.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {language === 'VN'
                  ? 'Bạn chưa kết nối tài khoản Google. Vui lòng đăng nhập OAuth.'
                  : 'Google account not authenticated. Please sign in.'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="text-xs font-bold text-[#1b4b66] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3 h-3" />
              <span>{language === 'VN' ? 'Nhập OAuth Access Token' : 'Enter OAuth Token'}</span>
            </button>

            {!userProfile.isLoggedIn && (
              <button
                onClick={onOpenAuthModal}
                className="text-xs font-bold text-[#00344c] hover:underline cursor-pointer"
              >
                {language === 'VN' ? 'Đăng nhập Google' : 'Sign in Google'}
              </button>
            )}
          </div>
        </div>

        {/* Live Drive API Token Input Drawer */}
        {showTokenInput && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-5 py-3 space-y-2 shrink-0 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-700" />
                {language === 'VN' ? 'Kết nối Google Drive REST API v3 Thực tế:' : 'Live Google Drive REST API v3 Integration:'}
              </span>
              <button
                onClick={() => setShowTokenInput(false)}
                className="text-amber-700 hover:text-amber-900 text-[11px]"
              >
                Đóng
              </button>
            </div>
            <p className="text-[11px] text-amber-800 leading-normal">
              {language === 'VN'
                ? 'Nhập Google OAuth Access Token thực tế của bạn để tải danh sách tệp trực tiếp từ tài khoản Drive thực:'
                : 'Enter your live Google OAuth Access Token to fetch actual files from your personal Drive:'}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={customAccessToken}
                onChange={(e) => setCustomAccessToken(e.target.value)}
                placeholder="ya29.a0AxM51cM..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-gray-800 font-mono focus:outline-none focus:border-[#00344c]"
              />
              <button
                onClick={() => handleFetchRealDrive()}
                disabled={isFetchingRealDrive || !customAccessToken.trim()}
                className="flex items-center gap-1.5 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {isFetchingRealDrive ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                <span>{language === 'VN' ? 'Tải tệp thực tế' : 'Fetch Real Files'}</span>
              </button>
            </div>
            {apiError && (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{apiError}</p>
            )}
          </div>
        )}

        {/* Live / Demo Mode Banner Explanation */}
        <div className="bg-[#EEF1F4]/80 px-5 py-2.5 border-b border-[#DCE1E6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#41474d] shrink-0">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#00344c] shrink-0" />
            <span>
              {userProfile.isLoggedIn ? (
                language === 'VN' ? (
                  <>
                    <strong className="text-emerald-800">Đã đồng bộ Google OAuth 2.0:</strong> Người dùng phổ thông chỉ cần bấm nút <strong>&quot;Cho phép / Allow&quot;</strong> trên màn hình xin quyền của Google. Hệ thống tự động truy cập tệp Google Drive mà <strong>không yêu cầu nhập token thủ công</strong>.
                  </>
                ) : (
                  'Google OAuth 2.0 connected. Non-tech users simply click "Allow" on Google consent screen.'
                )
              ) : (
                language === 'VN' ? (
                  <>
                    <strong className="text-amber-800">Người dùng phổ thông:</strong> Bấm <strong>&quot;Đăng nhập Google&quot;</strong> để ứng dụng hiện hộp thoại <i>Xin quyền truy cập Google Drive</i> (Google OAuth Consent) để chọn tệp trực tiếp.
                  </>
                ) : (
                  'Non-tech users: Click "Sign in Google" to authorize access via standard Google OAuth Consent popup.'
                )
              )}
            </span>
          </div>

          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-[10px] font-bold text-[#1b4b66] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Key className="w-3 h-3" />
            <span>{showTokenInput ? 'Ẩn Developer Token' : 'Dành cho Cán bộ Kỹ thuật (Token API)'}</span>
          </button>
        </div>

        {/* Body Content: Either Consent Request Screen or File List View */}
        {!userProfile.isLoggedIn ? (
          /* Step 1: Not Logged in */
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 bg-[#EEF1F4] border border-[#DCE1E6] rounded-full flex items-center justify-center mx-auto text-[#00344c]">
              <Lock className="w-8 h-8 text-[#00344c]" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-bold text-[#0f1d28]">
                {language === 'VN' ? 'Cần đăng nhập tài khoản Google' : 'Google Account Sign-in Required'}
              </h4>
              <p className="text-xs text-[#72787e]">
                {language === 'VN'
                  ? 'Đăng nhập tiêu chuẩn chỉ lấy Thông tin cá nhân cơ bản (Tên & Email). Quyền truy cập Google Drive chỉ được yêu cầu ở bước tiếp theo.'
                  : 'Standard sign-in only accesses basic profile (Name & Email). Google Drive permission will be requested incrementally next.'}
              </p>
            </div>
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm cursor-pointer transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'VN' ? 'Đăng nhập Google SSO' : 'Sign in with Google SSO'}</span>
            </button>
          </div>
        ) : !hasDriveScope ? (
          /* Step 2: Logged in, but Drive scope NOT granted -> Incremental OAuth Consent Request */
          <div className="p-6 my-auto max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                {userProfile.picture ? (
                  <img
                    src={userProfile.picture}
                    alt={userProfile.name}
                    className="w-10 h-10 rounded-full border-2 border-[#00344c] object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#00344c] text-white font-bold flex items-center justify-center text-xs shrink-0">
                    LN
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-[#0f1d28]">{userProfile.name}</h4>
                  <p className="text-xs font-mono text-[#72787e]">{userProfile.email}</p>
                </div>
              </div>

              <div className="border-t border-amber-200/80 pt-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    {language === 'VN'
                      ? 'Yêu cầu cấp quyền bổ sung (Incremental OAuth Consent):'
                      : 'Incremental OAuth Permission Request:'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {language === 'VN'
                    ? 'Ứng dụng EventKnow xin phép truy cập quyền đọc tệp trên Google Drive của bạn để hỗ trợ tìm kiếm và trích xuất tài liệu hội thảo:'
                    : 'EventKnow requests permission to read files from your Google Drive for document extraction:'}
                </p>

                <div className="bg-white rounded-lg p-3 border border-amber-200 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Xem các tệp Google Drive của bạn (Read-Only)</span>
                  </div>
                  <p className="text-[11px] text-[#72787e] font-mono pl-6">
                    https://www.googleapis.com/auth/drive.readonly
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#72787e] hover:text-[#0f1d28] cursor-pointer"
                >
                  {language === 'VN' ? 'Từ chối' : 'Deny'}
                </button>
                <button
                  onClick={handleSimulateGrantDriveAccess}
                  disabled={isGrantingScope}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  {isGrantingScope ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>
                    {isGrantingScope
                      ? (language === 'VN' ? 'Đang cấp quyền Google Drive...' : 'Granting Drive Scope...')
                      : (language === 'VN' ? 'Cho phép truy cập Google Drive' : 'Allow Google Drive Access')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 3: Has Drive Scope -> Show File Picker & Search */
          <>
            {/* Filter & Search Bar */}
            <div className="p-4 bg-[#EEF1F4] border-b border-[#DCE1E6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'VN'
                      ? 'Tìm kiếm tệp trong Google Drive (danh sách, báo cáo, kịch bản...)'
                      : 'Search Google Drive files...'
                  }
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
                />
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  onClick={() => setSelectedFileType('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedFileType === 'ALL'
                      ? 'bg-[#00344c] text-white shadow-2xs'
                      : 'bg-white text-[#41474d] hover:bg-gray-100 border border-[#DCE1E6]'
                  }`}
                >
                  {language === 'VN' ? 'Tất cả tệp' : 'All Files'}
                </button>
                <button
                  onClick={() => setSelectedFileType('SPREADSHEET')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedFileType === 'SPREADSHEET'
                      ? 'bg-[#00344c] text-white shadow-2xs'
                      : 'bg-white text-[#41474d] hover:bg-gray-100 border border-[#DCE1E6]'
                  }`}
                >
                  Google Sheets
                </button>
                <button
                  onClick={() => setSelectedFileType('DOCS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedFileType === 'DOCS'
                      ? 'bg-[#00344c] text-white shadow-2xs'
                      : 'bg-white text-[#41474d] hover:bg-gray-100 border border-[#DCE1E6]'
                  }`}
                >
                  Docs & PDF
                </button>
              </div>
            </div>

            {/* File List View */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-[#DCE1E6]/70">
              {filteredFiles.map((file) => {
                const isSelected = selectedIds.includes(file.id);

                return (
                  <div
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={`py-3 px-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border border-amber-300 shadow-2xs'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[#00344c] border-[#00344c] text-white'
                            : 'border-[#DCE1E6] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      {file.mimeType === 'spreadsheet' ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : file.mimeType === 'document' ? (
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-red-600 shrink-0" />
                      )}

                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-[#0f1d28] truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-[10px] text-[#72787e] mt-0.5 font-mono">
                          <span>{file.size}</span>
                          <span>•</span>
                          <span>Chủ sở hữu: {file.owner}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {file.modifiedTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                          file.mimeType === 'spreadsheet'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : file.mimeType === 'document'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {file.mimeType.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <div className="text-center py-12 text-xs text-[#72787e]">
                  Không tìm thấy tệp Google Drive phù hợp.
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="bg-[#F8FAFC] border-t border-[#DCE1E6] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-[#72787e]">
            {selectedIds.length > 0 ? (
              <span className="font-bold text-[#00344c]">
                {language === 'VN'
                  ? `Đã chọn ${selectedIds.length} tệp Google Drive`
                  : `Selected ${selectedIds.length} Drive files`}
              </span>
            ) : (
              <span>
                {language === 'VN'
                  ? 'Chọn 1 hoặc nhiều tệp để trích xuất dữ liệu'
                  : 'Select files to import'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#72787e] hover:text-[#0f1d28] transition-colors cursor-pointer"
            >
              {language === 'VN' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              onClick={handleImport}
              disabled={selectedIds.length === 0 || isImporting}
              className="flex items-center gap-2 bg-[#00344c] hover:bg-[#1b4b66] disabled:opacity-50 text-white font-bold text-xs px-5 py-2 rounded-lg transition-all shadow-2xs cursor-pointer"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'VN' ? 'Đang trích xuất từ Google Drive...' : 'Importing from Drive...'}</span>
                </>
              ) : (
                <>
                  <CloudCheck className="w-4 h-4 text-emerald-300" />
                  <span>{language === 'VN' ? 'Trích xuất vào EventKnow' : 'Import to EventKnow'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
