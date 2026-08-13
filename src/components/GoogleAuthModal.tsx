import React, { useState, useEffect } from 'react';
import { X, Check, Shield, Lock, LogOut, User, RefreshCw, Key, AlertCircle } from 'lucide-react';
import { requestGoogleAccessToken } from '../lib/googleDriveApi';
import { signInWithGoogleFirebase } from '../lib/firebaseAuth';

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  isLoggedIn: boolean;
  loginTime?: string;
  scopes?: string[];
  accessToken?: string;
  role?: string;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  language: 'VN' | 'EN';
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  language,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setAuthError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const exchangeTokenWithBackend = async (accessToken: string): Promise<any | null> => {
    try {
      const response = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error || `HTTP ${response.status}: ${response.statusText}`;
        setAuthError(`Lỗi trao đổi token với Backend: ${errMsg}`);
        return null;
      }

      return response.json();
    } catch (err: any) {
      setAuthError(`Lỗi kết nối Backend: ${err.message || err}`);
      return null;
    }
  };

  const handleRealGoogleOAuth = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const fbResult = await signInWithGoogleFirebase();
      if (fbResult?.accessToken) {
        const backendUser = await exchangeTokenWithBackend(fbResult.accessToken);
        if (!backendUser) {
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        const googleUser: UserProfile = {
          name: backendUser.name || fbResult.user.displayName || user.name || 'Luân Ninh',
          email: backendUser.email || fbResult.user.email || user.email || 'luanninh2005@gmail.com',
          picture: backendUser.picture || fbResult.user.photoURL || user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isLoggedIn: true,
          loginTime: new Date().toLocaleTimeString('vi-VN'),
          accessToken: fbResult.accessToken,
          role: backendUser.role,
          scopes: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/drive.file',
          ],
        };
        onLogin(googleUser);
        return;
      }
    } catch (fbErr: any) {
      console.warn('Firebase Auth popup failed or cancelled, trying GIS fallback:', fbErr);
    }

    requestGoogleAccessToken({
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
      callback: async (resp) => {
        if (resp.access_token) {
          const backendUser = await exchangeTokenWithBackend(resp.access_token);
          setIsLoading(false);
          if (!backendUser) return;

          const googleUser: UserProfile = {
            name: backendUser.name || user.name || 'Luân Ninh',
            email: backendUser.email || user.email || 'luanninh2005@gmail.com',
            picture: backendUser.picture || user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            isLoggedIn: true,
            loginTime: new Date().toLocaleTimeString('vi-VN'),
            accessToken: resp.access_token,
            role: backendUser.role,
            scopes: [
              'https://www.googleapis.com/auth/userinfo.profile',
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/drive.file',
            ],
          };
          onLogin(googleUser);
        } else {
          setIsLoading(false);
          const errDetail = resp.error?.message || resp.error || 'Xác thực Google OAuth không thành công';
          setAuthError(`Lỗi OAuth: ${errDetail}. Quý khách có thể dán Google OAuth Access Token trực tiếp bên dưới.`);
          setShowManualInput(true);
        }
      },
    });
  };

  const handleApplyManualToken = async () => {
    if (!manualTokenInput.trim()) return;
    setIsLoading(true);
    const backendUser = await exchangeTokenWithBackend(manualTokenInput.trim());
    setIsLoading(false);
    if (!backendUser) return;

    const googleUser: UserProfile = {
      name: backendUser.name || user.name || 'Luân Ninh',
      email: backendUser.email || user.email || 'luanninh2005@gmail.com',
      picture: backendUser.picture || user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isLoggedIn: true,
      loginTime: new Date().toLocaleTimeString('vi-VN'),
      accessToken: manualTokenInput.trim(),
      role: backendUser.role,
      scopes: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/drive.file',
      ],
    };
    onLogin(googleUser);
    setAuthError(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => { });
    } finally {
      onLogout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-[#DCE1E6] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#00344c] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-bold leading-none">
                {language === 'VN' ? 'Đăng nhập Google OAuth 2.0' : 'Google OAuth 2.0 Authentication'}
              </h3>
              <p className="text-[11px] text-[#A0AEC0] mt-1">
                EventKnow SSO & Workspace Integration
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

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {user.isLoggedIn ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-12 h-12 rounded-full border-2 border-[#00344c] object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#00344c] text-white flex items-center justify-center font-bold text-base shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-[#0f1d28] truncate">{user.name}</h4>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                      <Check className="w-2.5 h-2.5" />
                      {language === 'VN' ? 'Đã xác thực' : 'Verified'}
                    </span>
                  </div>
                  <p className="text-xs text-[#72787e] font-mono truncate">{user.email}</p>
                  {user.accessToken ? (
                    <p className="text-[10px] text-emerald-700 font-medium mt-1 truncate">
                      ✓ Token: {user.accessToken.slice(0, 15)}...
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-700 font-medium mt-1">
                      ⚠️ Chưa có OAuth Token thực (vui lòng kết nối để tránh lỗi 403)
                    </p>
                  )}
                </div>
              </div>

              {/* Granted Scopes */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  <span>{language === 'VN' ? 'Quyền Google OAuth đã cấp:' : 'Granted OAuth Scopes:'}</span>
                </div>
                <div className="space-y-1">
                  {user.scopes?.map((scope) => (
                    <div key={scope} className="flex items-center gap-1.5 text-[11px] font-mono text-amber-800">
                      <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{scope}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'VN' ? 'Đăng xuất Google' : 'Sign out Google'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold bg-[#00344c] hover:bg-[#1b4b66] text-white rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  {language === 'VN' ? 'Đóng' : 'Close'}
                </button>
              </div>
            </div>
          ) : (
            /* Login state */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#EEF1F4] border border-[#DCE1E6] rounded-full flex items-center justify-center mx-auto text-[#00344c]">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>

              <div>
                <h4 className="text-base font-bold text-[#0f1d28]">
                  {language === 'VN' ? 'Đăng nhập Google OAuth 2.0' : 'Sign in with Google OAuth 2.0'}
                </h4>
                <p className="text-xs text-[#72787e] max-w-xs mx-auto mt-1">
                  {language === 'VN'
                    ? 'Yêu cầu quyền drive.file chính thức để đọc tệp từ Google Drive & Google Picker.'
                    : 'Requests official drive.file scope to pick and read Google Drive files.'}
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-left text-xs text-red-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Lỗi xác thực OAuth</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{authError}</p>
                </div>
              )}

              {/* Login Action Button */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleRealGoogleOAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00344c]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>
                    {isLoading
                      ? (language === 'VN' ? 'Mở cửa sổ xác thực Google OAuth...' : 'Opening Google OAuth Popup...')
                      : (language === 'VN' ? 'Đăng nhập Google OAuth (Cấp drive.file)' : 'Sign in Google OAuth (grant drive.file)')}
                  </span>
                </button>

                {/* Option to input manual OAuth Token if needed */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="text-[11px] text-[#00344c] hover:underline flex items-center justify-center gap-1 mx-auto font-medium"
                  >
                    <Key className="w-3 h-3 text-amber-600" />
                    <span>{showManualInput ? 'Ẩn ô nhập Token' : 'Nhập Google OAuth Access Token thủ công (Nếu bị chặn Popup)'}</span>
                  </button>

                  {showManualInput && (
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left space-y-2">
                      <label className="text-[11px] font-bold text-amber-900 block">
                        Google OAuth Access Token (Scope drive.file):
                      </label>
                      <input
                        type="password"
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        placeholder="Paste ya29... token tại đây"
                        className="w-full text-xs font-mono px-3 py-2 bg-white border border-amber-300 rounded focus:outline-none focus:border-[#00344c]"
                      />
                      <button
                        onClick={handleApplyManualToken}
                        disabled={!manualTokenInput.trim()}
                        className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-1.5 rounded transition-all disabled:opacity-50 cursor-pointer"
                      >
                        Lưu Token & Đăng nhập
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-[#72787e] pt-1 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600 inline" />
                <span>Scope drive.file được Google xác thực an toàn</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

