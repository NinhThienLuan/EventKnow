import React, { useState, useEffect } from 'react';
import { X, Check, Shield, Lock, LogOut, User, RefreshCw } from 'lucide-react';

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  isLoggedIn: boolean;
  loginTime?: string;
  scopes?: string[];
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
  const [loginStep, setLoginStep] = useState<'IDLE' | 'AUTHING' | 'SUCCESS'>('IDLE');

  useEffect(() => {
    if (!isOpen) {
      setLoginStep('IDLE');
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateGoogleLogin = () => {
    setIsLoading(true);
    setLoginStep('AUTHING');

    setTimeout(() => {
      const googleUser: UserProfile = {
        name: 'Luân Ninh',
        email: 'luanninh2005@gmail.com',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isLoggedIn: true,
        loginTime: new Date().toLocaleTimeString('vi-VN'),
        scopes: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
      };
      setIsLoading(false);
      setLoginStep('SUCCESS');
      onLogin(googleUser);
    }, 1000);
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
                  {user.loginTime && (
                    <p className="text-[10px] text-[#72787e] mt-1">
                      {language === 'VN' ? 'Phiên đăng nhập:' : 'Session start:'} {user.loginTime}
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
                  onClick={onLogout}
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
                  {language === 'VN' ? 'Đăng nhập vào EventKnow' : 'Sign in to EventKnow'}
                </h4>
                <p className="text-xs text-[#72787e] max-w-xs mx-auto mt-1">
                  {language === 'VN'
                    ? 'Sử dụng tài khoản Google OAuth 2.0 để đồng bộ dữ liệu sự kiện và báo cáo cá nhân.'
                    : 'Use your Google OAuth 2.0 account to sync event data and personalized reports.'}
                </p>
              </div>

              {/* Login Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleSimulateGoogleLogin}
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
                      ? (language === 'VN' ? 'Đang xác thực Google OAuth...' : 'Authenticating Google OAuth...')
                      : (language === 'VN' ? 'Đăng nhập bằng Google' : 'Sign in with Google')}
                  </span>
                </button>
              </div>

              <div className="text-[10px] text-[#72787e] pt-1 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600 inline" />
                <span>Google OAuth 2.0 Client ID Verified</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
