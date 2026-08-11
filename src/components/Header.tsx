import React from 'react';
import { Search, Globe, Sun, Moon, Bell, User, Menu, X, CheckCircle } from 'lucide-react';
import { translations } from '../data/translations';
import { UserProfile } from './GoogleAuthModal';

interface HeaderProps {
  onSearchChange?: (query: string) => void;
  language: 'VN' | 'EN';
  setLanguage: (lang: 'VN' | 'EN') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
  userProfile?: UserProfile;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  theme,
  setTheme,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  userProfile,
  onOpenAuthModal
}) => {
  const t = translations[language];

  return (
    <header className="h-14 border-b border-[#DCE1E6] bg-white flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 z-30 sticky top-0 transition-colors">
      {/* Brand Identity & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-1.5 text-[#00344c] hover:bg-[#EEF1F4] rounded-md transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        <div className="w-8 h-8 bg-[#1b4b66] rounded-md flex items-center justify-center shadow-xs shrink-0">
          <span className="text-white font-display text-lg font-bold">E</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-display text-base sm:text-xl tracking-tight text-[#00344c] font-semibold truncate">
            EventKnow
          </span>
          <span className="hidden xl:inline-block text-[10px] font-mono tracking-wide uppercase px-2 py-0.5 rounded bg-[#EEF1F4] text-[#1b4b66] border border-[#c1c7cd]">
            {t.enterpriseDb}
          </span>
        </div>
      </div>

      {/* Global Quick Search with ⌘K Badge */}
      <div className="hidden md:flex items-center max-w-xs lg:max-w-md w-full mx-3 lg:mx-6">
        <div className="relative w-full flex items-center bg-[#EEF1F4] px-3 py-1.5 rounded-md border border-[#DCE1E6] focus-within:bg-white focus-within:border-[#00344c] transition-colors">
          <Search className="w-3.5 h-3.5 text-[#72787e] mr-2 shrink-0" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full text-xs font-body bg-transparent text-[#0f1d28] placeholder:text-[#72787e] focus:outline-none"
          />
          <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 border border-[#c1c7cd] rounded text-[#41474d] shrink-0 ml-2 shadow-2xs hidden lg:inline">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Language Switcher Button */}
        <button
          onClick={() => setLanguage(language === 'VN' ? 'EN' : 'VN')}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-mono font-semibold bg-[#EEF1F4] border border-[#DCE1E6] rounded hover:bg-white text-[#0f1d28] transition-all cursor-pointer shadow-2xs"
          title={t.languageName}
        >
          <Globe className="w-3.5 h-3.5 text-[#1b4b66]" />
          <span>{language}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-mono font-medium bg-[#EEF1F4] border border-[#DCE1E6] rounded hover:bg-white text-[#0f1d28] transition-all cursor-pointer shadow-2xs"
          title={t.displayMode}
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#B8860B]" />
              <span className="hidden sm:inline text-[11px]">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span className="hidden sm:inline text-[11px]">Dark</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <button
          className="relative p-1.5 text-[#41474d] hover:text-[#00344c] bg-[#EEF1F4] border border-[#DCE1E6] rounded hover:bg-white transition-colors cursor-pointer hidden sm:block"
          title={t.notifications}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#B8860B]"></span>
        </button>

        <div className="h-4 w-[1px] bg-[#DCE1E6] hidden sm:block"></div>

        {/* User Profile Pill / Google Login Button */}
        <button
          onClick={onOpenAuthModal}
          className="flex items-center space-x-2 sm:pl-1 hover:opacity-90 transition-opacity cursor-pointer group"
          title={language === 'VN' ? 'Quản lý tài khoản Google OAuth' : 'Manage Google OAuth Account'}
        >
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-[#0f1d28] leading-tight flex items-center justify-end gap-1">
              {userProfile?.isLoggedIn ? userProfile.name : t.adminRole}
              {userProfile?.isLoggedIn && (
                <CheckCircle className="w-3 h-3 text-emerald-600 inline shrink-0" />
              )}
            </p>
            <p className="text-[10px] text-[#72787e] font-mono">
              {userProfile?.isLoggedIn ? 'Google OAuth' : (language === 'VN' ? 'Đăng nhập GG' : 'Sign in')}
            </p>
          </div>

          {userProfile?.isLoggedIn && userProfile.picture ? (
            <img
              src={userProfile.picture}
              alt={userProfile.name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#00344c] object-cover shrink-0 shadow-xs"
            />
          ) : (
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              userProfile?.isLoggedIn
                ? 'bg-[#00344c] text-white border-emerald-500'
                : 'bg-[#1b4b66] text-white border-[#DCE1E6] group-hover:border-[#00344c]'
            }`}>
              {userProfile?.isLoggedIn ? (
                <span className="font-bold text-xs">LN</span>
              ) : (
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};

