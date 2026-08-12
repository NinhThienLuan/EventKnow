import React, { useState } from 'react';
import {
  HardDrive,
  FileSpreadsheet,
  FileText,
  Search,
  Check,
  X,
  Lock,
  RefreshCw,
  Clock,
  ShieldCheck,
  CloudCheck,
  Key,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { UserProfile } from './GoogleAuthModal';
import {
  openGooglePickerPopup,
  requestGoogleAccessToken,
  requestGoogleAuthCode,
  cleanUpGooglePickerDOM,
  fetchUserDriveFiles,
  createSampleDriveFile,
} from '../lib/googleDriveApi';

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
  onGrantDrivePermission?: (token?: string) => void;
}

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
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);

  // Advanced / Dev Options State
  const [customAccessToken, setCustomAccessToken] = useState('');
  const [realDriveFiles, setRealDriveFiles] = useState<DriveFileItem[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [connectNotice, setConnectNotice] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);

  const activeToken = customAccessToken || userProfile.accessToken || '';
  const hasDriveScope = userProfile.isLoggedIn && userProfile.scopes?.some((s) => s.includes('drive'));

  React.useEffect(() => {
    if (isOpen) {
      cleanUpGooglePickerDOM();
    }
    return () => {
      cleanUpGooglePickerDOM();
    };
  }, [isOpen]);

  const handleSafeClose = () => {
    cleanUpGooglePickerDOM();
    onClose();
  };

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  /**
   * Handle granting Drive Permission via GIS Code Client (access_type=offline).
   * Obtains a single-use authorization code and posts to POST /api/auth/drive/connect
   * to store the refresh token for background sync (FR-9.1 & FR-6.2).
   */
  const handleRealGrantDriveAccess = async () => {
    setIsGrantingScope(true);
    setApiError(null);
    setConnectNotice(null);

    // Single step: Obtain Authorization Code via GIS Code Client (access_type=offline)
    requestGoogleAuthCode({
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (codeResp) => {
        setIsGrantingScope(false);

        if (codeResp.code) {
          try {
            // Send authorization code to backend endpoint
            const res = await fetch('/api/auth/drive/connect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: codeResp.code }),
            });
            const data = await res.json();
            console.log('Backend Google Drive connect response:', data);
            setConnectNotice('✅ Đã kết nối Google Drive & lưu Refresh Token thành công cho tác vụ đồng bộ nền (FR-9.1)! Vui lòng bấm "Mở Google Picker" để chọn tệp.');
            
            if (onGrantDrivePermission) {
              onGrantDrivePermission();
            }
          } catch (err) {
            console.warn('Failed to send auth code to backend:', err);
            setApiError('Lỗi gửi Authorization Code lên Server.');
          }
        } else {
          setShowDevTools(true);
          setApiError('Popup Google OAuth Code Client bị hủy hoặc không nhận được Code. Quý khách có thể dán Developer Token thủ công.');
        }
      },
    });
  };

  /**
   * Hybrid Fallback Flow: Fetch user drive files directly via REST API if Picker is blocked by browser/iframe sandbox
   */
  const handleFetchViaRestApi = async (isBlockedFallback = false) => {
    if (!activeToken) {
      setApiError('Vui lòng cấp quyền Google OAuth trước khi tải danh sách tệp.');
      return;
    }

    setIsOpeningPicker(true);
    setApiError(null);

    if (isBlockedFallback) {
      setConnectNotice('Do môi trường trình duyệt hạn chế cửa sổ Google Picker, ứng dụng chuyển sang danh sách file khả dụng trực tiếp.');
    }

    try {
      const restFiles = await fetchUserDriveFiles(activeToken);
      const convertedItems: DriveFileItem[] = restFiles.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType.includes('spreadsheet') || f.name.endsWith('.xlsx') || f.name.endsWith('.csv')
          ? 'spreadsheet'
          : f.mimeType.includes('pdf') || f.name.endsWith('.pdf')
          ? 'pdf'
          : 'document',
        size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(0)} KB` : 'Google File',
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('vi-VN') : 'Mới',
        owner: userProfile.name || 'Tôi',
        shared: true,
      }));

      setRealDriveFiles((prev) => {
        const merged = [...convertedItems, ...prev.filter((item) => !convertedItems.some((c) => c.id === item.id))];
        return merged;
      });

      if (convertedItems.length === 0) {
        if (isBlockedFallback) {
          setConnectNotice('Do môi trường trình duyệt hạn chế cửa sổ Google Picker, ứng dụng chuyển sang danh sách file khả dụng trực tiếp.');
          setApiError('Lưu ý Scope drive.file: Ứng dụng chỉ đọc được tệp do ứng dụng tạo hoặc tệp được cấp phép. Bạn có thể nhấn "Tạo Kịch Bản Mẫu On Drive (+)" bên dưới để tạo ngay tệp Google Sheet kịch bản.');
        } else {
          setApiError('Lưu ý Scope drive.file: Ứng dụng chỉ xem được các tệp do ứng dụng tự tạo hoặc do bạn chọn qua Google Picker. Quý khách có thể bấm "Tạo Kịch Bản Mẫu On Drive (+)" bên dưới.');
        }
      } else {
        setConnectNotice(
          isBlockedFallback
            ? `Do môi trường trình duyệt hạn chế cửa sổ Google Picker, ứng dụng chuyển sang danh sách file khả dụng trực tiếp. (Đã nạp ${convertedItems.length} tệp)`
            : `✅ Đã tải thành công ${convertedItems.length} tệp từ Google Drive qua REST API!`
        );
      }
    } catch (err: any) {
      console.warn('REST API fetch error:', err);
      setApiError(err?.message || 'Lỗi tải danh sách tệp qua REST API.');
    } finally {
      setIsOpeningPicker(false);
    }
  };

  /**
   * Create a sample event script Google Sheet on user's Drive via REST API
   */
  const handleCreateSampleFile = async () => {
    if (!activeToken) {
      setApiError('Vui lòng cấp quyền Google OAuth trước khi tạo tệp.');
      return;
    }

    setIsOpeningPicker(true);
    setApiError(null);
    try {
      const createdFile = await createSampleDriveFile(activeToken, `Kịch bản Sự kiện - EventKnow ${new Date().toLocaleDateString('vi-VN')}`);
      const newItem: DriveFileItem = {
        id: createdFile.id,
        name: createdFile.name,
        mimeType: 'spreadsheet',
        size: '10 KB',
        modifiedTime: 'Vừa tạo mới',
        owner: userProfile.name || 'Tôi',
        shared: true,
      };

      setRealDriveFiles((prev) => [newItem, ...prev.filter((item) => item.id !== newItem.id)]);
      setSelectedIds((prev) => Array.from(new Set([...prev, newItem.id])));
      setConnectNotice(`🎉 Đã tạo thành công tệp "${createdFile.name}" trên Google Drive của bạn! Tệp đã được tự động thêm và chọn.`);
    } catch (err: any) {
      console.warn('Failed to create sample file on Drive:', err);
      setApiError(err?.message || 'Lỗi tạo tệp kịch bản mẫu trên Google Drive.');
    } finally {
      setIsOpeningPicker(false);
    }
  };

  /**
   * Standard Flow: Always attempt native Google Picker popup first (Hybrid Approach)
   */
  const handleLaunchGooglePicker = () => {
    setApiError(null);
    setIsOpeningPicker(true);

    const openPickerWithToken = (token: string) => {
      openGooglePickerPopup({
        accessToken: token,
        onPicked: (pickedFiles) => {
          setIsOpeningPicker(false);
          processPickedFiles(pickedFiles);
        },
        onError: (err) => {
          setIsOpeningPicker(false);
          console.warn('Native Google Picker blocked by sandbox/iframe, launching Fallback Flow:', err);
          // Fallback Flow: Automatically switch to direct REST API with user notice
          handleFetchViaRestApi(true);
        },
      });
    };

    if (!activeToken) {
      requestGoogleAccessToken({
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (resp) => {
          setIsOpeningPicker(false);
          if (resp.access_token) {
            if (onGrantDrivePermission) onGrantDrivePermission(resp.access_token);
            setCustomAccessToken(resp.access_token);
            openPickerWithToken(resp.access_token);
          } else {
            setApiError('Vui lòng cấp quyền Google OAuth để mở Google Picker.');
          }
        },
      });
      return;
    }

    openPickerWithToken(activeToken);
  };

  const processPickedFiles = (pickedFiles: any[]) => {
    const convertedItems: DriveFileItem[] = pickedFiles.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType.includes('spreadsheet') || f.name.endsWith('.xlsx') || f.name.endsWith('.csv')
        ? 'spreadsheet'
        : f.mimeType.includes('pdf') || f.name.endsWith('.pdf')
        ? 'pdf'
        : 'document',
      size: f.sizeBytes ? `${(f.sizeBytes / 1024).toFixed(0)} KB` : 'Google File',
      modifiedTime: 'Vừa chọn qua Picker',
      owner: userProfile.name || 'Tôi',
      shared: true,
    }));

    setRealDriveFiles((prev) => {
      const merged = [...convertedItems, ...prev.filter((item) => !convertedItems.some((c) => c.id === item.id))];
      return merged;
    });
    setSelectedIds((prev) => Array.from(new Set([...prev, ...convertedItems.map((c) => c.id)])));
  };

  const filteredFiles = realDriveFiles.filter((file) => {
    const matchesQuery = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFileType === 'SPREADSHEET') return matchesQuery && file.mimeType === 'spreadsheet';
    if (selectedFileType === 'DOCS') return matchesQuery && (file.mimeType === 'document' || file.mimeType === 'pdf');
    return matchesQuery;
  });

  const handleImport = () => {
    const chosen = realDriveFiles.filter((f) => selectedIds.includes(f.id));
    if (chosen.length === 0) return;

    setIsImporting(true);
    setTimeout(() => {
      onImportFiles(chosen);
      setIsImporting(false);
      setSelectedIds([]);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  {language === 'VN' ? 'Google Drive (scope drive.file)' : 'Google Drive'}
                </h3>
                {activeToken && (
                  <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'VN'
                  ? 'Chọn kịch bản và báo cáo trực tiếp thông qua Giao diện Google Picker'
                  : 'Select event files via native Google Picker dialog'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSafeClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auth Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          {userProfile.isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-600 font-medium">{userProfile.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Chưa kết nối tài khoản Google</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer font-medium"
            >
              <Key className="w-3 h-3 text-amber-600" />
              <span>{showDevTools ? 'Ẩn Developer Token' : 'Developer Token'}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showDevTools ? 'rotate-180' : ''}`} />
            </button>

            {!userProfile.isLoggedIn && (
              <button
                onClick={onOpenAuthModal}
                className="text-xs font-bold text-slate-800 hover:text-black hover:underline cursor-pointer"
              >
                {language === 'VN' ? 'Đăng nhập Google' : 'Sign in Google'}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Developer Token Tools */}
        {showDevTools && (
          <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-3 space-y-2 text-xs shrink-0">
            <div className="flex items-center justify-between font-medium text-amber-900">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Key className="w-3.5 h-3.5 text-amber-700" />
                Nhập Google OAuth Access Token thủ công (Nếu bị chặn Popup):
              </span>
              <button onClick={() => setShowDevTools(false)} className="text-amber-700 hover:text-amber-900 text-[11px]">
                Đóng
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={customAccessToken}
                onChange={(e) => setCustomAccessToken(e.target.value)}
                placeholder="ya29.a0AxM51cM..."
                className="flex-1 px-3 py-1 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-slate-800"
              />
              <button
                onClick={handleLaunchGooglePicker}
                disabled={!customAccessToken.trim()}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-3 py-1 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Mở Picker</span>
              </button>
            </div>
          </div>
        )}

        {/* Notice Banner */}
        {connectNotice && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-medium">{connectNotice}</span>
            </div>
            <button onClick={() => setConnectNotice(null)} className="text-emerald-600 hover:text-emerald-900 text-[10px]">✕</button>
          </div>
        )}

        {/* Main Body */}
        {!userProfile.isLoggedIn ? (
          /* State 1: Login Needed */
          <div className="p-10 text-center space-y-4 my-auto">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-700">
              <Lock className="w-7 h-7 text-slate-700" />
            </div>
            <div className="max-w-sm mx-auto space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'VN' ? 'Đăng nhập để chọn tệp Google Drive' : 'Sign in to access Google Drive'}
              </h4>
              <p className="text-xs text-slate-500">
                {language === 'VN'
                  ? 'Ứng dụng chỉ xin quyền đọc đối với tệp bạn chủ động lựa chọn qua Google Picker (drive.file scope).'
                  : 'Only selected files will be accessed safely with drive.file scope.'}
              </p>
            </div>
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white font-medium text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{language === 'VN' ? 'Đăng nhập Google' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : !hasDriveScope ? (
          /* State 2: Request Offline Drive Access Scope */
          <div className="p-8 my-auto max-w-md mx-auto space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'VN' ? 'Kết nối & Cấp quyền Google Drive' : 'Connect & Grant Drive Scope'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'VN'
                  ? 'Bước 1: Cấp quyền kết nối nền bằng Authorization Code (offline access) để Server lưu Refresh Token chạy đồng bộ tự động (FR-9.1).'
                  : 'Step 1: Grant offline authorization code for Server background refresh token sync (FR-9.1).'}
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {language === 'VN'
                  ? '💡 Sau khi hoàn thành kết nối Server, bạn sẽ bấm "Mở Google Picker" (Bước 2) để chọn tệp kịch bản trực tiếp từ Drive (dùng scope an toàn drive.file).'
                  : '💡 After server connection, you will click "Open Google Picker" (Step 2) to pick event files safely using drive.file scope.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {language === 'VN' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleRealGrantDriveAccess}
                disabled={isGrantingScope}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                {isGrantingScope ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {isGrantingScope
                    ? (language === 'VN' ? 'Đang lấy Authorization Code...' : 'Requesting Code...')
                    : (language === 'VN' ? 'Bước 1: Kết nối Server (Code Flow)' : 'Step 1: Connect Server (Code Flow)')}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Active File Picker */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Action Bar & Search Row */}
            <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'VN'
                      ? 'Lọc tệp đã chọn từ Google Drive...'
                      : 'Filter picked files...'
                  }
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-800 focus:bg-white transition-all"
                />
              </div>

              {/* Filter pills & Launch Native Google Picker button */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setSelectedFileType('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      selectedFileType === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setSelectedFileType('SPREADSHEET')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      selectedFileType === 'SPREADSHEET'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sheets
                  </button>
                  <button
                    onClick={() => setSelectedFileType('DOCS')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      selectedFileType === 'DOCS'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Docs
                  </button>
                </div>

                <button
                  onClick={handleLaunchGooglePicker}
                  disabled={isOpeningPicker}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all shrink-0 disabled:opacity-50"
                >
                  {isOpeningPicker ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <HardDrive className="w-3.5 h-3.5 text-emerald-200" />
                  )}
                  <span>Mở Google Picker</span>
                </button>
              </div>
            </div>

            {/* Error banner if any */}
            {apiError && (
              <div className="mx-6 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-[11px]">{apiError}</span>
                </div>
                <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-800 text-[10px]">
                  Ẩn
                </button>
              </div>
            )}

            {/* File Items List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              {filteredFiles.map((file) => {
                const isSelected = selectedIds.includes(file.id);

                return (
                  <div
                    key={file.id}
                    onClick={() => toggleSelect(file.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      {file.mimeType === 'spreadsheet' ? (
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                      ) : file.mimeType === 'document' ? (
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-50 rounded-lg text-red-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{file.size}</span>
                          <span>•</span>
                          <span>{file.owner}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {file.modifiedTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        file.mimeType === 'spreadsheet'
                          ? 'bg-emerald-100/60 text-emerald-800'
                          : file.mimeType === 'document'
                          ? 'bg-blue-100/60 text-blue-800'
                          : 'bg-red-100/60 text-red-800'
                      }`}
                    >
                      {file.mimeType.toUpperCase()}
                    </span>
                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <div className="text-center py-12 px-4 text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-sm">Chưa có tệp Google Drive nào được chọn</p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                      Sử dụng Google Picker để duyệt và cấp quyền cho tệp kịch bản hoặc báo cáo cụ thể (sử dụng scope an toàn <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">drive.file</code>).
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={handleCreateSampleFile}
                      disabled={isOpeningPicker}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4 text-emerald-200" />
                      <span>Tạo Kịch Bản Mẫu Trên Drive</span>
                    </button>
                    <button
                      onClick={handleLaunchGooglePicker}
                      disabled={isOpeningPicker}
                      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span>Mở Google Picker</span>
                    </button>
                    <button
                      onClick={handleFetchViaRestApi}
                      disabled={isOpeningPicker}
                      className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <HardDrive className="w-4 h-4 text-slate-600" />
                      <span>Tải qua REST API (Fallback)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            {selectedIds.length > 0 ? (
              <span className="text-slate-900 font-bold">
                {language === 'VN'
                  ? `Đã chọn ${selectedIds.length} tệp`
                  : `Selected ${selectedIds.length} files`}
              </span>
            ) : (
              <span>
                {language === 'VN'
                  ? 'Chọn tệp để trích xuất'
                  : 'Select files to import'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {language === 'VN' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              onClick={handleImport}
              disabled={selectedIds.length === 0 || isImporting}
              className="flex items-center gap-2 bg-slate-900 hover:bg-black disabled:opacity-40 text-white font-medium text-xs px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === 'VN' ? 'Đang trích xuất...' : 'Importing...'}</span>
                </>
              ) : (
                <>
                  <CloudCheck className="w-4 h-4 text-emerald-400" />
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
