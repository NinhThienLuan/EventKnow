import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Folder,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Mail,
  UserCheck,
  Search,
  Filter,
  Sparkles,
  Key,
  Layers,
  ChevronRight,
  X,
  FileSpreadsheet,
  BarChart3,
  FileText,
  UserPlus
} from 'lucide-react';
import {
  Department,
  DepartmentMember,
  MOCK_DEPARTMENT_MEMBERS
} from '../data/hrData';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../lib/identityApi';

interface PersonnelMgmtViewProps {
  language: 'VN' | 'EN';
  activeSimulatedEmail: string;
  onChangeSimulatedEmail: (email: string) => void;
  initialSubTab?: 'DEPARTMENTS' | 'MEMBERS' | 'ADMINS';
}

export const PersonnelMgmtView: React.FC<PersonnelMgmtViewProps> = ({
  language,
  activeSimulatedEmail,
  onChangeSimulatedEmail,
  initialSubTab = 'DEPARTMENTS'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'DEPARTMENTS' | 'MEMBERS' | 'ADMINS'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // State for Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');

  const loadDepartments = () => {
    getDepartments().then(data => {
      const mapped: Department[] = data.map(d => ({
        id: d.id || '',
        code: d.code,
        name: d.name,
        folderId: `folder-${d.code.toLowerCase()}`,
        folderPath: `/Shared Drive/EventKnow/${d.code}`,
        description: d.nameEn || '',
        createdDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
        headOfDeptEmail: '',
        memberCount: 0,
        fileCount: 0
      }));
      setDepartments(mapped);
    }).catch(err => {
      console.error("Failed to load backend departments:", err);
    });
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Department Modal State (Add/Edit)
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<{
    code: string;
    name: string;
    folderId: string;
    folderPath: string;
    description: string;
    headOfDeptEmail: string;
  }>({
    code: '',
    name: '',
    folderId: '',
    folderPath: '',
    description: '',
    headOfDeptEmail: ''
  });

  // State for Members
  const [members, setMembers] = useState<DepartmentMember[]>(MOCK_DEPARTMENT_MEMBERS);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Member Modal State (Add/Edit)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DepartmentMember | null>(null);
  const [memberForm, setMemberForm] = useState<{
    fullName: string;
    email: string;
    primaryDepartmentCode: string;
    allowedDepartmentCodes: string[];
    deptRole: 'TRUONG_BAN' | 'PHO_BAN' | 'CHUYEN_VIEN';
    isAppAdmin: boolean;
    notes: string;
  }>({
    fullName: '',
    email: '',
    primaryDepartmentCode: 'SIHUB_TECH_TRANSFER',
    allowedDepartmentCodes: ['SIHUB_TECH_TRANSFER'],
    deptRole: 'CHUYEN_VIEN',
    isAppAdmin: false,
    notes: ''
  });

  // Admin Management State (Integrated)
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminErrorMessage, setAdminErrorMessage] = useState('');

  // Current Active Simulated Member Object
  const currentSimulatedMember = members.find((m) => m.email === activeSimulatedEmail) || members[0];

  // ------------------------------------
  // Department Handlers
  // ------------------------------------
  const handleOpenDeptModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept);
      setDeptForm({
        code: dept.code,
        name: dept.name,
        folderId: dept.folderId,
        folderPath: dept.folderPath,
        description: dept.description,
        headOfDeptEmail: dept.headOfDeptEmail
      });
    } else {
      setEditingDept(null);
      setDeptForm({
        code: '',
        name: '',
        folderId: `fld_${Date.now().toString().slice(-6)}`,
        folderPath: '/Shared Drive/EventKnow/Phong_Moi',
        description: '',
        headOfDeptEmail: ''
      });
    }
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = () => {
    if (!deptForm.code.trim() || !deptForm.name.trim()) {
      alert(language === 'VN' ? 'Vui lòng nhập đầy đủ Mã phòng ban và Tên phòng ban.' : 'Please enter Department Code and Name.');
      return;
    }

    const payload = {
      code: deptForm.code.toUpperCase().trim(),
      name: deptForm.name.trim(),
      nameEn: deptForm.description.trim()
    };

    if (editingDept) {
      updateDepartment(editingDept.id, payload)
        .then(() => {
          loadDepartments();
          setIsDeptModalOpen(false);
        })
        .catch(err => {
          alert(language === 'VN' ? 'Lỗi cập nhật phòng ban: ' + err.message : 'Failed to update department: ' + err.message);
        });
    } else {
      createDepartment(payload)
        .then(() => {
          loadDepartments();
          setIsDeptModalOpen(false);
        })
        .catch(err => {
          alert(language === 'VN' ? 'Lỗi tạo phòng ban: ' + err.message : 'Failed to create department: ' + err.message);
        });
    }
  };

  const handleDeleteDepartment = (id: string, code: string) => {
    if (confirm(language === 'VN' ? `Xác nhận xóa phòng ban [${code}]? Mọi liên kết truy cập dữ liệu của thành viên phòng này sẽ bị thu hồi.` : `Confirm delete department [${code}]?`)) {
      deleteDepartment(id)
        .then(() => {
          loadDepartments();
        })
        .catch(err => {
          alert(language === 'VN' ? 'Lỗi xóa phòng ban: ' + err.message : 'Failed to delete department: ' + err.message);
        });
    }
  };

  // ------------------------------------
  // Member Handlers
  // ------------------------------------
  const handleOpenMemberModal = (member?: DepartmentMember) => {
    if (member) {
      setEditingMember(member);
      setMemberForm({
        fullName: member.fullName,
        email: member.email,
        primaryDepartmentCode: member.primaryDepartmentCode,
        allowedDepartmentCodes: member.allowedDepartmentCodes,
        deptRole: member.deptRole,
        isAppAdmin: member.isAppAdmin,
        notes: member.notes || ''
      });
    } else {
      setEditingMember(null);
      setMemberForm({
        fullName: '',
        email: '',
        primaryDepartmentCode: 'SIHUB_TECH_TRANSFER',
        allowedDepartmentCodes: ['SIHUB_TECH_TRANSFER'],
        deptRole: 'CHUYEN_VIEN',
        isAppAdmin: false,
        notes: ''
      });
    }
    setIsMemberModalOpen(true);
  };

  const handleToggleAllowedDeptInForm = (code: string) => {
    setMemberForm(prev => {
      const exists = prev.allowedDepartmentCodes.includes(code);
      if (exists) {
        // Must keep primary dept at minimum
        if (code === prev.primaryDepartmentCode && prev.allowedDepartmentCodes.length === 1) {
          return prev;
        }
        return {
          ...prev,
          allowedDepartmentCodes: prev.allowedDepartmentCodes.filter(c => c !== code)
        };
      } else {
        return {
          ...prev,
          allowedDepartmentCodes: [...prev.allowedDepartmentCodes, code]
        };
      }
    });
  };

  const handleSaveMember = () => {
    if (!memberForm.fullName.trim() || !memberForm.email.trim() || !memberForm.email.includes('@')) {
      alert(language === 'VN' ? 'Vui lòng nhập đầy đủ Họ tên và Email hợp lệ.' : 'Please enter valid Full Name and Email.');
      return;
    }

    // Ensure primary department code is included in allowed codes
    const finalAllowedCodes = Array.from(new Set([memberForm.primaryDepartmentCode, ...memberForm.allowedDepartmentCodes]));

    if (editingMember) {
      setMembers(prev =>
        prev.map(m =>
          m.id === editingMember.id
            ? {
              ...m,
              fullName: memberForm.fullName.trim(),
              email: memberForm.email.trim(),
              primaryDepartmentCode: memberForm.primaryDepartmentCode,
              allowedDepartmentCodes: finalAllowedCodes,
              deptRole: memberForm.deptRole,
              isAppAdmin: memberForm.isAppAdmin,
              notes: memberForm.notes.trim()
            }
            : m
        )
      );
    } else {
      const newMemberObj: DepartmentMember = {
        id: `mem-${Date.now()}`,
        fullName: memberForm.fullName.trim(),
        email: memberForm.email.trim(),
        primaryDepartmentCode: memberForm.primaryDepartmentCode,
        allowedDepartmentCodes: finalAllowedCodes,
        deptRole: memberForm.deptRole,
        isAppAdmin: memberForm.isAppAdmin,
        status: 'ACTIVE',
        joinedDate: new Date().toLocaleDateString('vi-VN'),
        notes: memberForm.notes.trim()
      };
      setMembers([...members, newMemberObj]);
    }
    setIsMemberModalOpen(false);
  };

  const handleToggleMemberStatus = (id: string) => {
    setMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : m))
    );
  };

  // ------------------------------------
  // Admin Handlers
  // ------------------------------------
  const activeAdmins = members.filter(m => m.isAppAdmin && m.status === 'ACTIVE');

  const handleGrantAdminEmail = () => {
    setAdminErrorMessage('');
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      setAdminErrorMessage(language === 'VN' ? 'Vui lòng nhập email hợp lệ.' : 'Please enter a valid email address.');
      return;
    }

    const existingMember = members.find(m => m.email.toLowerCase() === newAdminEmail.trim().toLowerCase());
    if (existingMember) {
      setMembers(prev =>
        prev.map(m => (m.id === existingMember.id ? { ...m, isAppAdmin: true } : m))
      );
    } else {
      const newAdminMember: DepartmentMember = {
        id: `mem-${Date.now()}`,
        fullName: `Quản trị viên (${newAdminEmail.split('@')[0]})`,
        email: newAdminEmail.trim(),
        primaryDepartmentCode: 'SIHUB_ADMIN',
        allowedDepartmentCodes: ['SIHUB_BOD', 'SIHUB_ADMIN', 'SIHUB_FIN', 'SIHUB_INCUBATION', 'SIHUB_PARTNERSHIP', 'SIHUB_TRAINING', 'SIHUB_MEDIA', 'SIHUB_TECH_TRANSFER'],
        deptRole: 'TRUONG_BAN',
        isAppAdmin: true,
        status: 'ACTIVE',
        joinedDate: new Date().toLocaleDateString('vi-VN'),
        notes: 'Pre-authorized Admin Granted'
      };
      setMembers([...members, newAdminMember]);
    }
    setNewAdminEmail('');
  };

  const handleRevokeAdmin = (memberId: string) => {
    if (activeAdmins.length <= 1) {
      alert(
        language === 'VN'
          ? 'CẢNH BÁO CHỐNG KHÓA CHẾT (FR-10.4): Không thể thu hồi quyền Admin duy nhất còn lại trong hệ thống!'
          : 'LOCKOUT PROTECTION (FR-10.4): Cannot revoke the last active admin!'
      );
      return;
    }

    if (confirm(language === 'VN' ? 'Xác nhận thu hồi quyền Admin của thành viên này?' : 'Revoke Admin privileges?')) {
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, isAppAdmin: false } : m))
      );
    }
  };

  // Filtered Lists
  const filteredDepartments = departments.filter(d => {
    const q = deptSearchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
  });

  const filteredMembers = members.filter(m => {
    const q = memberSearchQuery.toLowerCase();
    const matchesSearch = m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.primaryDepartmentCode.toLowerCase().includes(q);
    const matchesDept = deptFilter === 'ALL' || m.primaryDepartmentCode === deptFilter || m.allowedDepartmentCodes.includes(deptFilter);
    return matchesSearch && matchesDept;
  });

  // Helpers
  const renderRoleTitle = (role: DepartmentMember['deptRole']) => {
    switch (role) {
      case 'TRUONG_BAN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">Trưởng ban / Head</span>;
      case 'PHO_BAN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">Phó ban / Deputy</span>;
      case 'CHUYEN_VIEN':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">Chuyên viên / Staff</span>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in pb-16">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#00344c] via-[#1b4b66] to-[#0f1d28] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Users className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              {language === 'VN' ? 'Cơ cấu Nhân sự & Phân quyền Phòng ban' : 'HR & Department Scope Isolation'}
            </span>
            <span className="text-xs text-white/70 font-mono">FR-6.1 / FR-6.2 / FR-10</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            {language === 'VN' ? 'Quản lý Nhân sự, Phòng ban & Phân quyền Phạm vi' : 'Personnel, Departments & Access Scope Isolation'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {language === 'VN'
              ? 'Thiết lập cơ cấu phòng ban tổ chức, gán nhân sự và áp dụng cơ chế phân quyền giới hạn dữ liệu nghiêm ngặt. Thành viên thuộc phòng ban nào chỉ được xem các File nguồn, Dashboard phân tích và Báo cáo tổng hợp thuộc phòng ban đó.'
              : 'Configure organizational departments, assign staff, and enforce strict scope isolation. Members only access files, dashboards, and reports within their assigned department(s).'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-amber-200/90">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              {departments.length} {language === 'VN' ? 'Phòng ban' : 'Departments'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              {members.length} {language === 'VN' ? 'Thành viên / Cán bộ' : 'Staff Members'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              {activeAdmins.length} {language === 'VN' ? 'Quản trị viên Active' : 'Active System Admins'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* INTERACTIVE SCOPE SIMULATOR (USER CONTEXT TESTER) */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/40 to-blue-50 border border-amber-300 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase font-mono">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{language === 'VN' ? 'MÔ PHỎNG QUYỀN TRUY CẬP THEO PHÒNG BAN (ACTIVE SCOPE SIMULATOR)' : 'DEPARTMENT ACCESS SCOPE SIMULATOR'}</span>
            </div>
            <p className="text-xs text-amber-950 leading-relaxed">
              {language === 'VN'
                ? 'Chọn tài khoản nhân sự bên dưới để giả lập phiên làm việc. Hệ thống sẽ áp dụng quy tắc lọc File, Dashboard và Report theo phòng ban của nhân sự này.'
                : 'Select a staff member account to simulate their view session across the app.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 w-full lg:w-auto max-w-full">
            <span className="text-xs font-bold text-amber-900 shrink-0 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-700" />
              {language === 'VN' ? 'Tài khoản giả lập:' : 'Simulate Member:'}
            </span>
            <div className="relative w-full sm:w-auto min-w-0">
              <select
                value={activeSimulatedEmail}
                onChange={(e) => onChangeSimulatedEmail(e.target.value)}
                className="w-full sm:w-[280px] md:w-[320px] max-w-full px-3 py-2 pr-8 bg-white border border-amber-400 rounded-lg text-xs font-bold text-[#00344c] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs truncate appearance-none"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.email}>
                    {m.fullName} [{m.isAppAdmin ? 'ADMIN' : m.primaryDepartmentCode}]
                  </option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-amber-700 absolute right-2.5 top-2.5 pointer-events-none rotate-90" />
            </div>
          </div>
        </div>

        {/* Current Scope Banner Details */}
        <div className="bg-white/95 border border-amber-200/80 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-extrabold text-[#0f1d28] flex items-center gap-1.5 shrink-0">
              <UserCheck className="w-4 h-4 text-[#00344c]" />
              <span>{currentSimulatedMember.fullName}</span>
            </span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span className="font-mono text-[#00344c] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 truncate max-w-[220px]">
              {currentSimulatedMember.email}
            </span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            {renderRoleTitle(currentSimulatedMember.deptRole)}
            {currentSimulatedMember.isAppAdmin && (
              <span className="px-2 py-0.5 bg-emerald-700 text-white font-mono text-[10px] font-bold rounded shadow-2xs">
                SUPER ADMIN
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00344c] shrink-0">
            <span className="text-amber-900">{language === 'VN' ? 'Phạm vi xem được:' : 'Accessible Depts:'}</span>
            {currentSimulatedMember.isAppAdmin ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md shadow-2xs">
                TẤT CẢ PHÒNG BAN (ALL DEPARTMENTS)
              </span>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                {currentSimulatedMember.allowedDepartmentCodes.map((c) => (
                  <span key={c} className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded shadow-2xs">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Sub-Tab Navigation Bar */}
      <div className="bg-[#F1F5F9] border border-[#CBD5E1] rounded-2xl p-1.5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => setActiveSubTab('DEPARTMENTS')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'DEPARTMENTS'
              ? 'bg-white text-[#00344c] shadow-xs border border-[#CBD5E1]'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
              }`}
          >
            <Building2 className={`w-4 h-4 shrink-0 ${activeSubTab === 'DEPARTMENTS' ? 'text-[#00344c]' : 'text-[#64748B]'}`} />
            <span className="truncate">{language === 'VN' ? '1. Quản lý Phòng ban' : '1. Departments'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${activeSubTab === 'DEPARTMENTS' ? 'bg-[#00344c] text-white' : 'bg-slate-200 text-slate-700'
              }`}>
              {departments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('MEMBERS')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'MEMBERS'
              ? 'bg-white text-[#00344c] shadow-xs border border-[#CBD5E1]'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
              }`}
          >
            <Users className={`w-4 h-4 shrink-0 ${activeSubTab === 'MEMBERS' ? 'text-purple-600' : 'text-[#64748B]'}`} />
            <span className="truncate">{language === 'VN' ? '2. Quản lý Thành viên & Phân quyền' : '2. Staff & Permissions'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${activeSubTab === 'MEMBERS' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('ADMINS')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'ADMINS'
              ? 'bg-white text-[#00344c] shadow-xs border border-[#CBD5E1]'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
              }`}
          >
            <ShieldAlert className={`w-4 h-4 shrink-0 ${activeSubTab === 'ADMINS' ? 'text-rose-600' : 'text-[#64748B]'}`} />
            <span className="truncate">{language === 'VN' ? '3. Quản lý Quyền Admin System' : '3. System Admin Rights'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${activeSubTab === 'ADMINS' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
              {activeAdmins.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: DEPARTMENTS MANAGEMENT */}
      {/* ========================================================= */}
      {activeSubTab === 'DEPARTMENTS' && (
        <div className="space-y-4">
          {/* Search & Action Bar */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
              <input
                type="text"
                value={deptSearchQuery}
                onChange={(e) => setDeptSearchQuery(e.target.value)}
                placeholder={
                  language === 'VN'
                    ? 'Tìm phòng ban theo tên, mã (SIHUB_BOD, SIHUB_FIN...), thư mục Google Drive...'
                    : 'Search departments by name, code, folder ID...'
                }
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
              />
            </div>

            <button
              onClick={() => handleOpenDeptModal()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'VN' ? 'Thêm Phòng ban mới' : 'Add Department'}</span>
            </button>
          </div>

          {/* Department Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => {
              const deptMembersCount = members.filter(
                (m) => m.primaryDepartmentCode === dept.code || m.allowedDepartmentCodes.includes(dept.code)
              ).length;

              return (
                <div
                  key={dept.id}
                  className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded text-[11px] font-mono font-black bg-[#00344c] text-white">
                        {dept.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDeptModal(dept)}
                          className="p-1.5 text-gray-500 hover:text-[#00344c] hover:bg-gray-100 rounded cursor-pointer transition-colors"
                          title="Chỉnh sửa thông tin phòng ban"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id, dept.code)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                          title="Xóa phòng ban"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-[#0f1d28] group-hover:text-[#00344c] transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-[#41474d] line-clamp-2 leading-relaxed">{dept.description}</p>
                    </div>

                    {/* Google Drive Folder Binding */}
                    <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-2.5 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#72787e] uppercase">
                        <span>Lưu trữ Google Drive</span>
                        <span className="text-[#00344c] font-bold">FOLDER BOUND</span>
                      </div>
                      <p className="text-[11px] font-mono text-[#00344c] truncate flex items-center gap-1">
                        <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{dept.folderPath}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">ID: {dept.folderId}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div className="bg-[#EEF1F4]/70 p-2 rounded-lg border border-[#DCE1E6]/80">
                        <p className="text-[10px] font-bold text-[#72787e] uppercase">{language === 'VN' ? 'Nhân sự' : 'Staff'}</p>
                        <p className="text-base font-black text-[#00344c] font-mono">{deptMembersCount}</p>
                      </div>

                      <div className="bg-[#EEF1F4]/70 p-2 rounded-lg border border-[#DCE1E6]/80">
                        <p className="text-[10px] font-bold text-[#72787e] uppercase">{language === 'VN' ? 'File nguồn' : 'Files'}</p>
                        <p className="text-base font-black text-emerald-700 font-mono">{dept.fileCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#DCE1E6]/70 flex items-center justify-between text-[11px] text-[#72787e]">
                    <span>Trưởng ban: <strong className="text-[#0f1d28]">{dept.headOfDeptEmail || 'Chưa gán'}</strong></span>
                    <span className="font-mono text-[10px]">Tạo: {dept.createdDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: STAFF MEMBERS & ACCESS SCOPE */}
      {/* ========================================================= */}
      {activeSubTab === 'MEMBERS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#72787e] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder={
                    language === 'VN'
                      ? 'Tìm tên nhân sự, email Google Workspace, mã ban...'
                      : 'Search staff name, email, department code...'
                  }
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
                />
              </div>

              {/* Department Filter & Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-[#72787e]">{language === 'VN' ? 'Lọc theo ban:' : 'Dept:'}</span>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-xs font-semibold focus:outline-none focus:border-[#00344c] cursor-pointer"
                  >
                    <option value="ALL">{language === 'VN' ? 'Tất cả phòng ban' : 'All Departments'}</option>
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        [{d.code}] {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleOpenMemberModal()}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'VN' ? 'Thêm Cán bộ / Nhân sự' : 'Add Staff Member'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 bg-[#EEF1F4] border-b border-[#DCE1E6] flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#00344c]">
                {language === 'VN' ? 'DANH SÁCH CÁN BỘ & QUYỀN TRUY CẬP DỮ LIỆU' : 'STAFF & DATA PERMISSIONS DIRECTORY'}
              </span>
              <span className="text-xs font-mono text-[#72787e]">
                {filteredMembers.length} {language === 'VN' ? 'Thành viên' : 'Members'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#edf4ff]/60 border-b border-[#DCE1E6] text-[#00344c] font-display font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">{language === 'VN' ? 'HỌ VÀ TÊN / EMAIL' : 'STAFF NAME / EMAIL'}</th>
                    <th className="py-3 px-4">{language === 'VN' ? 'PHÒNG BAN CHÍNH' : 'PRIMARY DEPT'}</th>
                    <th className="py-3 px-4">{language === 'VN' ? 'PHẠM VI TRUY CẬP (DEPT CODES)' : 'ALLOWED DATA SCOPE'}</th>
                    <th className="py-3 px-4">{language === 'VN' ? 'CHỨC VỤ BAN' : 'DEPT ROLE'}</th>
                    <th className="py-3 px-4">{language === 'VN' ? 'QUYỀN ADMIN' : 'ADMIN ROLE'}</th>
                    <th className="py-3 px-4 text-right">{language === 'VN' ? 'THAO TÁC' : 'ACTION'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE1E6]">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-[#0f1d28]">{m.fullName}</p>
                          <p className="font-mono text-[11px] text-[#72787e]">{m.email}</p>
                          {m.notes && <p className="text-[10px] text-gray-400 italic">{m.notes}</p>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-[#00344c] text-white">
                          {m.primaryDepartmentCode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {m.isAppAdmin ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold rounded border border-emerald-300">
                            ALL (Toàn quyền)
                          </span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {m.allowedDepartmentCodes.map((c) => (
                              <span key={c} className="px-1.5 py-0.2 bg-blue-100 text-blue-900 font-mono text-[10px] font-bold rounded border border-blue-200">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">{renderRoleTitle(m.deptRole)}</td>

                      <td className="py-3 px-4">
                        {m.isAppAdmin ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white font-mono">
                            SYSTEM ADMIN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 font-mono">
                            MEMBER
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onChangeSimulatedEmail(m.email)}
                            className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            title="Mô phỏng giao diện của người dùng này"
                          >
                            Mô phỏng
                          </button>
                          <button
                            onClick={() => handleOpenMemberModal(m)}
                            className="p-1 text-[#00344c] hover:bg-gray-100 rounded cursor-pointer"
                            title="Sửa phân quyền cán bộ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: SYSTEM ADMIN RIGHTS & LOCKOUT PROTECTION */}
      {/* ========================================================= */}
      {activeSubTab === 'ADMINS' && (
        <div className="space-y-4">
          {/* Soft warning if only 1 admin active */}
          {activeAdmins.length === 1 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold uppercase font-mono">
                  {language === 'VN' ? 'CẢNH BÁO MỀM (FR-10.1): CHỈ CÓ 1 ADMIN ĐANG ACTIVE' : 'WARNING (FR-10.1): ONLY 1 ACTIVE ADMIN REMAINING'}
                </p>
                <p>
                  {language === 'VN'
                    ? 'Hệ thống hiện chỉ có 1 quản trị viên duy nhất. Khuyến khích cấp thêm quyền Admin dự phòng để đảm bảo an toàn truy cập.'
                    : 'System currently has only 1 active admin. Recommend pre-authorizing backup admins.'}
                </p>
              </div>
            </div>
          )}

          {/* Grant Admin Card */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#1b4b66]" />
              {language === 'VN' ? 'CẤP QUYỀN ADMIN MỚI (PRE-AUTHORIZATION - FR-10.3)' : 'GRANT PRE-AUTHORIZED ADMIN EMAIL'}
            </span>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg px-3 py-2">
                <Mail className="w-4 h-4 text-[#72787e] shrink-0" />
                <input
                  id="grant-admin-input"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder={language === 'VN' ? 'Nhập email Google Workspace (VD: backup.admin@domain.com)...' : 'Enter email...'}
                  className="w-full text-xs bg-transparent text-[#0f1d28] focus:outline-none"
                />
              </div>

              <button
                onClick={handleGrantAdminEmail}
                className="px-4 py-2 bg-[#00344c] text-white font-bold text-xs rounded-lg hover:bg-[#1b4b66] transition-colors cursor-pointer shrink-0"
              >
                {language === 'VN' ? 'Cấp quyền Admin' : 'Grant Admin Privileges'}
              </button>
            </div>

            {adminErrorMessage && <p className="text-xs text-rose-600 font-medium">{adminErrorMessage}</p>}
          </div>

          {/* Admins Table */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 bg-[#EEF1F4] border-b border-[#DCE1E6] flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#00344c]">
                {language === 'VN' ? 'DANH SÁCH QUẢN TRỊ VIÊN HỆ THỐNG ACTIVE' : 'SYSTEM ADMINS LIST'}
              </span>
              <span className="text-xs font-mono text-[#72787e]">
                {activeAdmins.length} Admin
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#edf4ff]/60 border-b border-[#DCE1E6] text-[#00344c] font-display font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{language === 'VN' ? 'HỌ TÊN & EMAIL' : 'ADMIN EMAIL'}</th>
                  <th className="py-3 px-4">{language === 'VN' ? 'PHÒNG BAN BAN ĐẦU' : 'DEPT'}</th>
                  <th className="py-3 px-4">{language === 'VN' ? 'TRẠNG THÁI' : 'STATUS'}</th>
                  <th className="py-3 px-4 text-right">{language === 'VN' ? 'THAO TÁC' : 'ACTION'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE1E6]">
                {activeAdmins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#1b4b66]" />
                        <div>
                          <p className="font-bold text-[#0f1d28]">{adm.fullName}</p>
                          <p className="font-mono text-[11px] text-[#72787e]">{adm.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#00344c]">{adm.primaryDepartmentCode}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        ACTIVE ADMIN
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevokeAdmin(adm.id)}
                        className="px-2.5 py-1 text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {language === 'VN' ? 'Thu hồi quyền Admin' : 'Revoke Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Break Glass Config */}
          <div className="p-4 bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-mono font-bold text-[#00344c] uppercase">
              <Key className="w-4 h-4 text-[#1b4b66]" />
              <span>{language === 'VN' ? 'CẤU HÌNH BREAK-GLASS HẠ TẦNG (FR-10.2)' : 'BREAK-GLASS INFRASTRUCTURE CONFIGURATION'}</span>
            </div>
            <p className="text-[#41474d] leading-relaxed">
              Biến môi trường Cloud Run (<code>RECOVERY_ADMIN_EMAILS</code>) tự động cấp quyền khôi phục hệ thống trong trường hợp mất kết nối cơ sở dữ liệu phân quyền.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {/* ========================================================= */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#DCE1E6] rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
              <h3 className="text-lg font-bold text-[#00344c] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1b4b66]" />
                <span>{editingDept ? (language === 'VN' ? 'Cập nhật Phòng ban' : 'Edit Department') : (language === 'VN' ? 'Thêm Phòng ban Mới' : 'Add Department')}</span>
              </h3>
              <button onClick={() => setIsDeptModalOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Mã phòng ban (Ví dụ: SIHUB_FIN):' : 'Dept Code:'}</label>
                  <input
                    type="text"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="SIHUB_BOD, SIHUB_FIN..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] font-mono uppercase font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Tên phòng ban:' : 'Dept Name:'}</label>
                  <input
                    type="text"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="Ban Khoa học & Công nghệ..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Đường dẫn Thư mục Google Drive:' : 'Google Drive Path:'}</label>
                <input
                  type="text"
                  value={deptForm.folderPath}
                  onChange={(e) => setDeptForm({ ...deptForm, folderPath: e.target.value })}
                  placeholder="/Shared Drive/EventKnow/Ban_Moi"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Email Trưởng ban phụ trách:' : 'Head Email:'}</label>
                <input
                  type="email"
                  value={deptForm.headOfDeptEmail}
                  onChange={(e) => setDeptForm({ ...deptForm, headOfDeptEmail: e.target.value })}
                  placeholder="head.dept@eventknow.gov.vn"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Mô tả nhiệm vụ phòng ban:' : 'Description:'}</label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  rows={3}
                  placeholder="Mô tả chức năng nhiệm vụ quản lý nguồn dữ liệu..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE1E6]">
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveDepartment}
                className="px-5 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold rounded-lg cursor-pointer"
              >
                Lưu thông tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT MEMBER PERMISSIONS */}
      {/* ========================================================= */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#DCE1E6] rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
              <h3 className="text-lg font-bold text-[#00344c] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1b4b66]" />
                <span>{editingMember ? (language === 'VN' ? 'Cập nhật Cán bộ & Phân quyền' : 'Edit Staff Access') : (language === 'VN' ? 'Thêm Cán bộ Mới' : 'Add New Staff')}</span>
              </h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Họ và tên cán bộ:' : 'Staff Full Name:'}</label>
                <input
                  type="text"
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm({ ...memberForm, fullName: e.target.value })}
                  placeholder="Ví dụ: GS.TS. Nguyễn Văn An"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Email Google Workspace:' : 'Google Workspace Email:'}</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="canbo@eventknow.gov.vn"
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Phòng ban chính:' : 'Primary Dept:'}</label>
                  <select
                    value={memberForm.primaryDepartmentCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setMemberForm(prev => ({
                        ...prev,
                        primaryDepartmentCode: newCode,
                        allowedDepartmentCodes: Array.from(new Set([newCode, ...prev.allowedDepartmentCodes]))
                      }));
                    }}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] font-bold cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        [{d.code}] {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Chức vụ tại ban:' : 'Dept Role:'}</label>
                  <select
                    value={memberForm.deptRole}
                    onChange={(e) => setMemberForm({ ...memberForm, deptRole: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] cursor-pointer"
                  >
                    <option value="TRUONG_BAN">Trưởng ban / Head</option>
                    <option value="PHO_BAN">Phó ban / Deputy</option>
                    <option value="CHUYEN_VIEN">Chuyên viên / Staff</option>
                  </select>
                </div>
              </div>

              {/* Department Access Checkboxes */}
              <div className="space-y-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl p-3">
                <label className="font-bold text-[#00344c] block uppercase font-mono text-[11px]">
                  {language === 'VN' ? 'Danh sách Phòng ban được phép truy cập Dữ liệu (FR-6.1):' : 'Data Scope Department Access:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {departments.map((d) => {
                    const isChecked = memberForm.allowedDepartmentCodes.includes(d.code);
                    return (
                      <label key={d.code} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAllowedDeptInForm(d.code)}
                          className="rounded text-[#00344c] focus:ring-[#00344c]"
                        />
                        <span>[{d.code}] {d.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* System Admin Privileges Checkbox */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-950">{language === 'VN' ? 'Quyền System Admin' : 'System Admin Rights'}</p>
                  <p className="text-[11px] text-emerald-800">Cấp quyền xem toàn bộ dữ liệu tất cả phòng ban</p>
                </div>
                <input
                  type="checkbox"
                  checked={memberForm.isAppAdmin}
                  onChange={(e) => setMemberForm({ ...memberForm, isAppAdmin: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0f1d28]">{language === 'VN' ? 'Ghi chú thêm:' : 'Notes:'}</label>
                <input
                  type="text"
                  value={memberForm.notes}
                  onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                  placeholder="Ghi chú phân công công tác..."
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DCE1E6]">
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveMember}
                className="px-5 py-2 bg-[#00344c] hover:bg-[#1b4b66] text-white font-bold rounded-lg cursor-pointer"
              >
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
