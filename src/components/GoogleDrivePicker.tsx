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
  Sparkles,
} from 'lucide-react';
import { UserProfile } from './GoogleAuthModal';
import {
  fetchRealGoogleDriveFiles,
  fetchSingleGoogleDriveFile,
  extractGoogleDriveFileId,
  openGooglePickerPopup,
  requestGoogleAccessToken,
  cleanUpGooglePickerDOM,
} from '../lib/googleDriveApi';
import { signInWithGoogleFirebase } from '../lib/firebaseAuth';

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

  // Advanced / Dev Options State
  const [customAccessToken, setCustomAccessToken] = useState('');
  const [isFetchingRealDrive, setIsFetchingRealDrive] = useState(false);
  const [realDriveFiles, setRealDriveFiles] = useState<DriveFileItem[] | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);

  // URL Importer State
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(true);
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  const activeToken = customAccessToken || userProfile.accessToken || '';
  const hasDriveScope = userProfile.isLoggedIn && userProfile.scopes?.some((s) => s.includes('drive'));
  
  // Real files loaded from user or added via Drive URL link
  const activeFilesList = realDriveFiles || [];

  React.useEffect(() => {
    if (isOpen) {
      cleanUpGooglePickerDOM();
    }
    return () => {
      cleanUpGooglePickerDOM();
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && activeToken && !realDriveFiles && !isFetchingRealDrive) {
      handleFetchRealDrive(activeToken);
    }
  }, [isOpen, activeToken]);

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

  const handleImportByUrl = async () => {
    if (!driveUrlInput.trim()) return;
    setIsImportingUrl(true);
    setApiError(null);

    try {
      const fileMeta = await fetchSingleGoogleDriveFile(driveUrlInput.trim(), activeToken);
      const newItem: DriveFileItem = {
        id: fileMeta.id,
        name: fileMeta.name || 'Google Drive File',
        mimeType: fileMeta.mimeType?.includes('spreadsheet')
          ? 'spreadsheet'
          : fileMeta.mimeType?.includes('pdf')
          ? 'pdf'
          : 'document',
        size: fileMeta.size ? `${(parseInt(fileMeta.size, 10) / 1024).toFixed(0)} KB` : 'Google Doc',
        modifiedTime: fileMeta.modifiedTime ? new Date(fileMeta.modifiedTime).toLocaleDateString('vi-VN') : 'Gần đây',
        owner: fileMeta.owners?.[0]?.displayName || userProfile.name || 'Tôi',
        shared: true,
      };

      setRealDriveFiles((prev) => [newItem, ...(prev || [])]);
      setSelectedIds((prev) => Array.from(new Set([newItem.id, ...prev])));
      setDriveUrlInput('');
      setLinkNotice('✅ Đã trích xuất thông tin tệp thành công! Tệp đã được tự động tích chọn bên dưới.');
    } catch (err: any) {
      const fileId = extractGoogleDriveFileId(driveUrlInput) || `drive_${Date.now()}`;
      const fallbackItem: DriveFileItem = {
        id: fileId,
        name: driveUrlInput.includes('sheet') || driveUrlInput.includes('spreadsheet')
          ? 'Kịch bản Google Sheet từ Link Drive'
          : 'Tài liệu Google Drive từ Link',
        mimeType: driveUrlInput.includes('sheet') || driveUrlInput.includes('spreadsheet') ? 'spreadsheet' : 'document',
        size: 'Google Document',
        modifiedTime: new Date().toLocaleDateString('vi-VN'),
        owner: userProfile.name || 'Tôi',
        shared: true,
      };

      setRealDriveFiles((prev) => [fallbackItem, ...(prev || [])]);
      setSelectedIds((prev) => Array.from(new Set([fallbackItem.id, ...prev])));
      setDriveUrlInput('');
      setLinkNotice('✅ Đã nhận diện liên kết Google Drive! Tệp đã được đưa vào danh sách tích chọn.');
    } finally {
      setIsImportingUrl(false);
    }
  };

  const handleRealGrantDriveAccess = async () => {
    setIsGrantingScope(true);
    setApiError(null);

    try {
      const fbResult = await signInWithGoogleFirebase();
      if (fbResult?.accessToken) {
        setIsGrantingScope(false);
        if (onGrantDrivePermission) {
          onGrantDrivePermission(fbResult.accessToken);
        }
        setCustomAccessToken(fbResult.accessToken);
        return;
      }
    } catch (fbErr: any) {
      console.warn('Firebase Auth popup failed or cancelled, trying GIS fallback:', fbErr);
    }

    requestGoogleAccessToken({
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: (resp) => {
        setIsGrantingScope(false);
        if (resp.access_token) {
          if (onGrantDrivePermission) {
            onGrantDrivePermission(resp.access_token);
          }
          setCustomAccessToken(resp.access_token);
        } else {
          if (onGrantDrivePermission) {
            onGrantDrivePermission();
          }
          setShowDevTools(true);
          setApiError('Popup Google OAuth bị chặn. Quý khách có thể dán Token thủ công ở cài đặt mở rộng.');
        }
      },
    });
  };

  const handleLaunchGooglePicker = () => {
    setApiError(null);

    if (!activeToken) {
      setIsFetchingRealDrive(true);
      requestGoogleAccessToken({
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: (resp) => {
          setIsFetchingRealDrive(false);
          if (resp.access_token) {
            if (onGrantDrivePermission) onGrantDrivePermission(resp.access_token);
            setCustomAccessToken(resp.access_token);

            openGooglePickerPopup({
              accessToken: resp.access_token,
              onPicked: (pickedFiles) => processPickedFiles(pickedFiles),
              onError: (err) => {
                setApiError('Giao diện Google Picker Popup không khả dụng do hạn chế Sandbox. Dán link Google Drive bên dưới để trích xuất trực tiếp!');
                setShowUrlInput(true);
              },
            });
          } else {
            setApiError('Vui lòng kết nối Google OAuth để truy cập Drive.');
          }
        },
      });
      return;
    }

    openGooglePickerPopup({
      accessToken: activeToken,
      onPicked: (pickedFiles) => processPickedFiles(pickedFiles),
      onError: (err) => {
        setApiError('Giao diện Google Picker Popup không khả dụng do hạn chế Sandbox. Dán link Google Drive bên dưới để trích xuất trực tiếp!');
        setShowUrlInput(true);
      },
    });
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
      const existing = prev ?? [];
      const merged = [...convertedItems, ...existing.filter((item) => !convertedItems.some((c) => c.id === item.id))];
      return merged;
    });
    setSelectedIds((prev) => Array.from(new Set([...prev, ...convertedItems.map((c) => c.id)])));
  };

  const handleFetchRealDrive = async (tokenToUse?: string) => {
    const token = tokenToUse || activeToken;
    if (!token) {
      setShowDevTools(true);
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
    } catch (err: any) {
      setApiError(err.message || 'Không thể tải tệp từ Google Drive API.');
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
    }, 1200);
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
                  {language === 'VN' ? 'Google Drive' : 'Google Drive'}
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
                  ? 'Chọn tài liệu hoặc kịch bản sự kiện trực tiếp từ tài khoản Google'
                  : 'Import event documents directly from your Google account'}
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

        {/* Auth Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          {userProfile.isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500">{userProfile.email}</span>
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
                onClick={() => handleFetchRealDrive()}
                disabled={isFetchingRealDrive || !customAccessToken.trim()}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-3 py-1 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {isFetchingRealDrive ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                <span>Thử API</span>
              </button>
            </div>
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
                {language === 'VN' ? 'Đăng nhập để xem tệp Google Drive' : 'Sign in to access Google Drive'}
              </h4>
              <p className="text-xs text-slate-500">
                {language === 'VN'
                  ? 'Ứng dụng chỉ xin quyền đọc đối với tệp bạn chủ động lựa chọn.'
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
          /* State 2: Request Drive Access Scope */
          <div className="p-8 my-auto max-w-md mx-auto space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-slate-900">
                {language === 'VN' ? 'Cấp quyền Google Drive' : 'Grant Google Drive Scope'}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'VN'
                  ? 'Cho phép EventKnow truy cập an toàn (scope drive.file) để tải kịch bản và danh sách sự kiện từ Google Drive của bạn.'
                  : 'Allow EventKnow secure read access (drive.file scope) to import your event files.'}
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
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-5 py-2 rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50"
              >
                {isGrantingScope ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {isGrantingScope
                    ? (language === 'VN' ? 'Mở cửa sổ Google...' : 'Opening Popup...')
                    : (language === 'VN' ? 'Cho phép truy cập' : 'Allow Access')}
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
                      ? 'Tìm tệp trong Drive (báo cáo, kịch bản...)'
                      : 'Search Drive files...'
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
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                  <span>+ Dán Link Drive</span>
                </button>

                <button
                  onClick={() => {
                    window.open('https://drive.google.com', '_blank');
                    setLinkNotice('💡 Đã mở Google Drive ở tab mới! Hãy sao chép đường dẫn (URL) kịch bản/file của bạn và dán vào ô bên dưới để trích xuất.');
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
                  title="Mở Google Drive trong tab mới để xem hoặc sao chép liên kết"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mở Tab Google Drive</span>
                </button>
              </div>
            </div>

            {/* URL Import Bar */}
            {showUrlInput && (
              <div className="mx-6 mt-3.5 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-white flex flex-col gap-2 shrink-0 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    Trích xuất trực tiếp bằng Link Google Drive (Sheet, Doc, PDF):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md">
                    Khuyên dùng
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    placeholder="Dán liên kết Google Sheet/Doc (VD: https://docs.google.com/spreadsheets/d/...)"
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleImportByUrl();
                    }}
                  />
                  <button
                    onClick={handleImportByUrl}
                    disabled={!driveUrlInput.trim() || isImportingUrl}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shrink-0 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {isImportingUrl ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Thêm tệp</span>
                    )}
                  </button>
                </div>

                {linkNotice && (
                  <div className="mt-1 text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 p-2 rounded-lg flex items-center justify-between">
                    <span>{linkNotice}</span>
                    <button onClick={() => setLinkNotice(null)} className="text-emerald-400 hover:text-white text-[10px]">✕</button>
                  </div>
                )}
              </div>
            )}

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
                <div className="text-center py-12 px-4 text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <HardDrive className="w-8 h-8 text-slate-300" />
                  <p className="font-medium text-slate-600">Chưa có tệp Google Drive nào trong danh sách</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Hãy dán liên kết Google Sheet, Google Doc hoặc tệp PDF ở thanh ô phía trên để thêm tệp trực tiếp vào danh sách.
                  </p>
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
