import React, { useState } from 'react';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Lock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Building,
  Key
} from 'lucide-react';
import { translations } from '../data/translations';

interface AdminMgmtViewProps {
  language: 'VN' | 'EN';
}

interface AdminUser {
  id: string;
  email: string;
  grantedBy: string;
  grantedAt: string;
  status: 'ACTIVE' | 'PRE_AUTHORIZED';
}

export const AdminMgmtView: React.FC<AdminMgmtViewProps> = ({ language }) => {
  const t = translations[language];

  const [adminList, setAdminList] = useState<AdminUser[]>([
    {
      id: 'ADM-01',
      email: 'luanninh2005@gmail.com',
      grantedBy: 'System Bootstrap (S1)',
      grantedAt: '01/08/2026',
      status: 'ACTIVE'
    },
    {
      id: 'ADM-02',
      email: 'admin.eventknow@eventknow.com',
      grantedBy: 'luanninh2005@gmail.com',
      grantedAt: '05/08/2026',
      status: 'ACTIVE'
    }
  ]);

  const [newEmail, setNewEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const activeAdminsCount = adminList.filter(a => a.status === 'ACTIVE').length;

  const handleGrantAdmin = () => {
    setErrorMessage('');
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setErrorMessage(language === 'VN' ? 'Vui lòng nhập địa chỉ email hợp lệ.' : 'Please enter a valid email address.');
      return;
    }

    if (adminList.some(a => a.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setErrorMessage(language === 'VN' ? 'Tài khoản này đã có quyền Admin.' : 'This email is already an Admin.');
      return;
    }

    const newAdmin: AdminUser = {
      id: `ADM-0${adminList.length + 1}`,
      email: newEmail.trim(),
      grantedBy: 'luanninh2005@gmail.com',
      grantedAt: new Date().toLocaleDateString('vi-VN'),
      status: 'PRE_AUTHORIZED'
    };

    setAdminList([...adminList, newAdmin]);
    setNewEmail('');
  };

  const handleRevokeAdmin = (id: string) => {
    if (activeAdminsCount <= 1) {
      alert(
        language === 'VN'
          ? 'CẢNH BÁO KHÓA TỰ ĐỘNG (FR-10.4): Không thể thu hồi admin cuối cùng active trong hệ thống!'
          : 'LOCKOUT PROTECTION (FR-10.4): Cannot revoke the last active admin in the system!'
      );
      return;
    }

    if (confirm(language === 'VN' ? 'Xác nhận thu hồi quyền Admin của tài khoản này?' : 'Confirm revoking Admin privileges for this account?')) {
      setAdminList(adminList.filter(a => a.id !== id));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ADMINISTRATION / ADMIN MANAGEMENT
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Quản Lý Quyền Admin & Chống Khóa Chết' : 'Admin Management & Lockout Protection'}</span>
          </h1>
          <p className="text-body-md text-[#41474d] max-w-3xl">
            {language === 'VN'
              ? 'Quản lý danh sách Quản trị viên (FR-10). Đảm bảo cơ chế tự bảo vệ không bao giờ tự khóa chết Admin cuối cùng và cấu hình Break-Glass hạ tầng.'
              : 'Manages system administrators (FR-10) with automatic last-active admin lockout prevention and infrastructure break-glass rules.'}
          </p>
        </div>
      </div>

      {/* Warning Banner if only 1 active admin */}
      {activeAdminsCount === 1 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold uppercase font-mono">
              {language === 'VN' ? 'CẢNH BÁO MỀM (FR-10.1): CHỈ CÓ 1 ADMIN ĐANG ACTIVE' : 'SOFT WARNING (FR-10.1): ONLY 1 ACTIVE ADMIN REMAINING'}
            </p>
            <p>
              {language === 'VN'
                ? 'Hệ thống hiện chỉ có 1 quản trị viên duy nhất. Khuyến khích cấp thêm ít nhất 1 admin dự phòng để tránh rủi ro mất quyền truy cập.'
                : 'System currently has only 1 active admin. Recommended to grant pre-authorized backup admins.'}
            </p>
          </div>
        </div>
      )}

      {/* Grant Admin Input Card */}
      <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-3">
        <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#1b4b66]" />
          {language === 'VN' ? 'CẤP QUYỀN ADMIN MỚI (PRE-AUTHORIZATION - FR-10.3)' : 'GRANT / PRE-AUTHORIZE ADMIN EMAIL'}
        </span>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg px-3 py-2">
            <Mail className="w-4 h-4 text-[#72787e] shrink-0" />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={language === 'VN' ? 'Nhập email Google Workspace tổ chức (VD: backup.admin@domain.com)...' : 'Enter organizational Google Workspace email...'}
              className="w-full text-xs bg-transparent text-[#0f1d28] focus:outline-none"
            />
          </div>

          <button
            onClick={handleGrantAdmin}
            className="px-4 py-2 bg-[#00344c] text-white font-bold text-xs rounded-lg hover:bg-[#1b4b66] transition-colors cursor-pointer shrink-0"
          >
            {language === 'VN' ? 'Cấp quyền Pre-authorize' : 'Grant Pre-authorized Admin'}
          </button>
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
        )}
      </div>

      {/* Active Admins List Table */}
      <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
        <div className="p-3 bg-[#EEF1F4] border-b border-[#DCE1E6] flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase text-[#00344c]">
            {language === 'VN' ? 'DANH SÁCH QUẢN TRỊ VIÊN HỆ THỐNG' : 'ACTIVE SYSTEM ADMINS'}
          </span>
          <span className="text-xs font-mono text-[#72787e]">
            {activeAdminsCount} {language === 'VN' ? 'Admin Active' : 'Active Admins'}
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#edf4ff]/60 border-b border-[#DCE1E6] text-[#00344c] font-display font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">{language === 'VN' ? 'MÃ' : 'ID'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'EMAIL QUẢN TRỊ VIÊN' : 'ADMIN EMAIL'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'NGƯỜI CẤP QUYỀN' : 'GRANTED BY'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'TRẠNG THÁI' : 'STATUS'}</th>
              <th className="py-3 px-4 text-right">{language === 'VN' ? 'THAO TÁC' : 'ACTION'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE1E6]">
            {adminList.map(adm => (
              <tr key={adm.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3 px-4 font-mono text-[#72787e]">{adm.id}</td>
                <td className="py-3 px-4 font-bold text-[#0f1d28]">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#1b4b66]" />
                    <span>{adm.email}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#41474d] font-mono">{adm.grantedBy} ({adm.grantedAt})</td>
                <td className="py-3 px-4">
                  {adm.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      PRE-AUTHORIZED
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleRevokeAdmin(adm.id)}
                    className="px-2.5 py-1 text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    {language === 'VN' ? 'Thu hồi' : 'Revoke'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Break-Glass Recovery Banner (FR-10.2) */}
      <div className="p-4 bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00344c] uppercase">
          <Key className="w-4 h-4 text-[#1b4b66]" />
          <span>{language === 'VN' ? 'KHÔI PHỤC CẤP HẠ TẦNG BREAK-GLASS (FR-10.2)' : 'BREAK-GLASS RECOVERY CONFIGURATION'}</span>
        </div>
        <p className="text-xs text-[#41474d] leading-relaxed">
          {language === 'VN'
            ? 'Danh sách email dự phòng được cấu hình tại biến môi trường hạ tầng Cloud Run (RECOVERY_ADMIN_EMAILS). Bất kỳ email nào thuộc danh sách này khi đăng nhập đều tự động cấp quyền Admin kể cả khi DB bị sự cố.'
            : 'Infrastructure environment variable (RECOVERY_ADMIN_EMAILS) grants root recovery access if DB or Google Workspace domain access is interrupted.'}
        </p>
      </div>
    </div>
  );
};
