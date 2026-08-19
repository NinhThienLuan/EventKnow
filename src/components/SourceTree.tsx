import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  HardDrive,
  FileText,
  Network,
  Upload,
  Settings,
  GitMerge,
  Tag,
  Map,
  Users,
  User,
  LogOut,
  Key,
  Database,
  Folder,
  ChevronRight,
  ChevronDown,
  Activity,
  Layers,
  Compass
} from 'lucide-react';
import { translations } from '../data/translations';
import { UserProfile } from './GoogleAuthModal';

interface SourceTreeProps {
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
  onSelectReport?: (reportId: string) => void;
  language: 'VN' | 'EN';
  activeNavView?: string;
  onSelectNavView?: (viewId: string) => void;
  isAdmin?: boolean;
  userProfile?: UserProfile;
  onOpenAuthModal?: () => void;
}

export const SourceTree: React.FC<SourceTreeProps> = ({
  selectedSourceId,
  onSelectSource,
  language,
  activeNavView = 'dashboard',
  onSelectNavView,
  isAdmin = true,
  userProfile,
  onOpenAuthModal
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'NAV' | 'DATA'>('NAV');

  // Dynamic Tree States
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expand / collapse states
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedQuarters, setExpandedQuarters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeTab === 'DATA') {
      setLoading(true);
      setError(null);
      fetch('/api/source-tree', { credentials: 'include' })
        .then(res => res.json())
        .then(json => {
          if (json.status === 'success') {
            setTreeData(json.data.departments || []);
          } else {
            setError(json.error || 'Failed to fetch tree data');
          }
        })
        .catch(err => {
          console.error(err);
          setError('Failed to fetch tree data');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [activeTab]);

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const toggleYear = (key: string) => {
    setExpandedYears(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleQuarter = (key: string) => {
    setExpandedQuarters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navItems = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'partners', label: t.navPartners, icon: Users },
    { id: 'connections', label: t.navConnections, icon: Network },
    { id: 'upload', label: t.navUpload, icon: Upload }
  ];

  const adminNavItems = [
    { id: 'personnel', label: t.navPersonnel, icon: Users },
    { id: 'extraction-jobs', label: t.navExtractionJobs, icon: Settings },
    { id: 'merge-split', label: t.navMergeSplit, icon: GitMerge },
    { id: 'alias', label: t.navAlias, icon: Tag },
    { id: 'mapping', label: t.navMapping, icon: Map }
  ];

  return (
    <aside className="w-[240px] lg:w-[260px] bg-[#EEF1F4] border-r border-[#DCE1E6] flex flex-col h-full select-none shrink-0 overflow-hidden transition-colors">
      {/* Top 2-Tab Navigation Selector */}
      <div className="flex border-b border-[#DCE1E6] bg-[#E2E7EC] p-1.5 gap-1 text-xs shrink-0">
        <button
          onClick={() => setActiveTab('NAV')}
          className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'NAV'
            ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
            : 'text-[#41474d] hover:text-[#00344c] hover:bg-white/40'
            }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#1b4b66]" />
          <span>{t.tabNavigation}</span>
        </button>

        <button
          onClick={() => setActiveTab('DATA')}
          className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'DATA'
            ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
            : 'text-[#41474d] hover:text-[#00344c] hover:bg-white/40'
            }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#5B4B8A]" />
          <span>{t.tabData}</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* TAB 1: NAVIGATION */}
        {activeTab === 'NAV' && (
          <div className="space-y-4">
            {/* Top Main Section */}
            <div className="space-y-0.5">
              <span className="px-3 text-[10px] font-mono font-semibold uppercase text-[#72787e] tracking-wider block mb-1">
                {t.mainMenu}
              </span>
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeNavView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onSelectNavView) onSelectNavView(item.id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${isActive
                      ? 'bg-white text-[#00344c] font-semibold border-l-3 border-[#1b4b66] shadow-2xs'
                      : 'text-[#41474d] hover:bg-white/60 hover:text-[#00344c]'
                      }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1b4b66]' : 'text-[#72787e]'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Divider (Chỉ hiện nếu là admin) */}
            {isAdmin && (
              <>
                <div className="border-t border-[#DCE1E6] my-2 mx-2 pt-2">
                  <span className="px-1 text-[10px] font-mono font-semibold uppercase text-[#1b4b66] tracking-wider block mb-1">
                    {t.systemAdmin}
                  </span>
                </div>

                {/* Admin Section */}
                <div className="space-y-0.5">
                  {adminNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeNavView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (onSelectNavView) onSelectNavView(item.id);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${isActive
                          ? 'bg-white text-[#00344c] font-semibold border-l-3 border-[#1b4b66] shadow-2xs'
                          : 'text-[#41474d] hover:bg-white/60 hover:text-[#00344c]'
                          }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5B4B8A]' : 'text-[#72787e]'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: DATA (CÂY NGUỒN DỮ LIỆU ĐỘNG) */}
        {activeTab === 'DATA' && (
          <div className="space-y-4 animate-fade-in">
            <div className="px-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-[#1b4b66] font-mono font-semibold flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" />
                {t.sourceTreeHeader}
              </span>
              <span className="text-[10px] font-mono text-[#72787e] bg-white px-1.5 py-0.5 rounded border border-[#DCE1E6]">
                {treeData.length} Depts
              </span>
            </div>

            {loading && (
              <p className="text-xs text-[#72787e] px-2 italic">Đang tải...</p>
            )}

            {error && (
              <p className="text-xs text-red-500 px-2 italic">{error}</p>
            )}

            {!loading && !error && treeData.length === 0 && (
              <p className="text-xs text-[#72787e] px-2 italic">Không có dữ liệu</p>
            )}

            {!loading && !error && (
              <div className="space-y-1 text-xs">
                {treeData.map(deptItem => {
                  const isDeptExpanded = !!expandedDepts[deptItem.department];
                  return (
                    <div key={deptItem.department} className="w-full">
                      {/* Department Root Node */}
                      <div
                        onClick={() => toggleDept(deptItem.department)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors text-[#41474d] hover:bg-white/50"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-[#72787e]">
                            {isDeptExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <Database className="w-3.5 h-3.5 text-[#1b4b66] shrink-0" />
                          <span className="truncate font-semibold text-[#0f1d28]">{deptItem.department}</span>
                        </div>
                        {deptItem.eventCount > 0 && (
                          <span className="font-mono text-[10px] bg-white text-[#41474d] border border-[#DCE1E6] px-1.5 py-0.2 rounded shrink-0">
                            {deptItem.eventCount}
                          </span>
                        )}
                      </div>

                      {/* Year Nodes */}
                      {isDeptExpanded && deptItem.years && (
                        <div className="pl-3.5 ml-3 border-l border-[#DCE1E6] space-y-0.5">
                          {deptItem.years.map((yearItem: any) => {
                            const yearKey = `${deptItem.department}-${yearItem.year}`;
                            const isYearExpanded = !!expandedYears[yearKey];
                            return (
                              <div key={yearItem.year} className="w-full">
                                <div
                                  onClick={() => toggleYear(yearKey)}
                                  className="flex items-center justify-between py-1 px-2 rounded cursor-pointer text-[#41474d] hover:bg-white/40"
                                >
                                  <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-[#72787e]">
                                      {isYearExpanded ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </span>
                                    <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span className="truncate text-[11px] font-medium">Năm {yearItem.year}</span>
                                  </div>
                                  <span className="text-[10px] text-[#72787e] font-mono">{yearItem.eventCount}</span>
                                </div>

                                {/* Quarter Nodes */}
                                {isYearExpanded && yearItem.quarters && (
                                  <div className="pl-3 ml-2 border-l border-[#E2E7EC] space-y-0.5">
                                    {yearItem.quarters.map((qtrItem: any) => {
                                      const qtrKey = `${yearKey}-${qtrItem.quarter}`;
                                      const isQtrExpanded = !!expandedQuarters[qtrKey];
                                      return (
                                        <div key={qtrItem.quarter} className="w-full">
                                          <div
                                            onClick={() => toggleQuarter(qtrKey)}
                                            className="flex items-center justify-between py-0.5 px-2 rounded cursor-pointer text-[#41474d] hover:bg-white/30"
                                          >
                                            <div className="flex items-center gap-1 overflow-hidden">
                                              <span className="text-[#8e9499]">
                                                {isQtrExpanded ? (
                                                  <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                  <ChevronRight className="w-3 h-3" />
                                                )}
                                              </span>
                                              <span className="text-[10px] uppercase font-bold text-[#5B4B8A] tracking-wider shrink-0">
                                                {qtrItem.quarter}
                                              </span>
                                            </div>
                                            <span className="text-[9px] text-[#72787e] font-mono">{qtrItem.eventCount}</span>
                                          </div>

                                          {/* Event Leaf Nodes */}
                                          {isQtrExpanded && qtrItem.events && (
                                            <div className="pl-3 ml-2 border-l border-[#EEF1F4] space-y-0.5">
                                              {qtrItem.events.map((evt: any) => {
                                                const isSelected = selectedSourceId === evt.eventId;
                                                return (
                                                  <div
                                                    key={evt.eventId}
                                                    onClick={() => onSelectSource(evt.eventId)}
                                                    className={`flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer transition-colors ${isSelected
                                                      ? 'bg-white text-[#1b4b66] font-semibold border-l-2 border-[#1b4b66]'
                                                      : 'text-[#555a60] hover:bg-white/50'
                                                      }`}
                                                  >
                                                    <FileText className="w-3 h-3 text-[#72787e] shrink-0" />
                                                    <span className="truncate text-[10px] text-[#2c3e50]" title={evt.eventName}>
                                                      {evt.eventName}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar + Name + Logout at Bottom */}
      <div className="p-3 border-t border-[#DCE1E6] bg-white flex items-center justify-between shrink-0">
        <div
          onClick={onOpenAuthModal}
          className="flex items-center gap-2.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-1"
          title={language === 'VN' ? 'Xem chi tiết tài khoản' : 'View account details'}
        >
          {userProfile?.isLoggedIn && userProfile.picture ? (
            <img
              src={userProfile.picture}
              alt={userProfile.name}
              className="w-8 h-8 rounded-full border border-[#DCE1E6] object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1b4b66] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#DCE1E6]">
              {userProfile?.isLoggedIn ? (
                <span className="font-bold text-[10px]">LN</span>
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold text-[#0f1d28] truncate leading-tight">
              {userProfile?.isLoggedIn ? userProfile.name : (language === 'VN' ? 'Chưa đăng nhập' : 'Not signed in')}
            </p>
            <p className="text-[10px] font-mono text-[#72787e] truncate flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${userProfile?.isLoggedIn ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {userProfile?.isLoggedIn
                ? (userProfile.role === 'ROLE_ADMIN' ? (language === 'VN' ? 'QTV (Admin)' : 'Admin Role') : (language === 'VN' ? 'Thành viên' : 'User Role'))
                : (language === 'VN' ? 'Khách ghé thăm' : 'Guest Mode')}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAuthModal}
          className="p-1.5 text-[#72787e] hover:text-[#00344c] hover:bg-[#EEF1F4] rounded transition-colors cursor-pointer"
          title={userProfile?.isLoggedIn ? t.logout : (language === 'VN' ? 'Đăng nhập' : 'Sign in')}
        >
          {userProfile?.isLoggedIn ? (
            <LogOut className="w-4 h-4" />
          ) : (
            <Key className="w-4 h-4 text-amber-600" />
          )}
        </button>
      </div>
    </aside>
  );
};
