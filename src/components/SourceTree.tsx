import React, { useState } from 'react';
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
  Database,
  Folder,
  ChevronRight,
  ChevronDown,
  Activity,
  Layers,
  Compass
} from 'lucide-react';
import { RECENT_REPORTS_LIST } from '../data/mockData';
import { translations } from '../data/translations';

interface SourceTreeProps {
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
  onSelectReport?: (reportId: string) => void;
  language: 'VN' | 'EN';
  activeNavView?: string;
  onSelectNavView?: (viewId: string) => void;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'folder' | 'database' | 'log';
  count?: number;
  children?: TreeNode[];
}

const TREE_DATA: TreeNode[] = [
  {
    id: 'db-core',
    label: 'Event DB Core',
    type: 'database',
    count: 1420,
    children: [
      { id: 'src-q3-2024', label: 'Sự kiện Q3 2024', type: 'folder', count: 480 },
      { id: 'src-ai-expert', label: 'Hội thảo Chuyên gia AI', type: 'folder', count: 320 },
      { id: 'src-econ-forum', label: 'Diễn đàn Kinh tế & Bán dẫn', type: 'folder', count: 620 }
    ]
  },
  {
    id: 'db-vast',
    label: 'Viện Hàn Lâm & Nghiên cứu',
    type: 'database',
    count: 850,
    children: [
      { id: 'src-it-inst', label: 'Viện Công nghệ Thông tin (VAST)', type: 'folder', count: 210 },
      { id: 'src-math-inst', label: 'Viện Toán học & Viện Mẫu', type: 'folder', count: 180 }
    ]
  },
  {
    id: 'db-partners',
    label: 'Báo cáo Đối tác & Tài trợ',
    type: 'database',
    count: 310
  },
  {
    id: 'db-logs',
    label: 'Nhật ký Trích xuất Automated Logs',
    type: 'log',
    count: 95
  }
];

export const SourceTree: React.FC<SourceTreeProps> = ({
  selectedSourceId,
  onSelectSource,
  onSelectReport,
  language,
  activeNavView = 'dashboard',
  onSelectNavView
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'NAV' | 'DATA'>('NAV');
  const [isAdmin] = useState<boolean>(true); // Default admin role

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'db-core': true,
    'db-vast': true
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const navItems = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'partners', label: t.navPartners, icon: Users },
    { id: 'reports', label: t.navReports, icon: FileText },
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
          className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'NAV'
              ? 'bg-white text-[#00344c] shadow-2xs border border-[#DCE1E6]'
              : 'text-[#41474d] hover:text-[#00344c] hover:bg-white/40'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#1b4b66]" />
          <span>{t.tabNavigation}</span>
        </button>

        <button
          onClick={() => setActiveTab('DATA')}
          className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'DATA'
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
                      if (item.id === 'reports') {
                        setActiveTab('DATA');
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
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
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          isActive
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

        {/* TAB 2: DATA (BAO GỒM BÁO CÁO VÀ CÂY NGUỒN DỮ LIỆU) */}
        {activeTab === 'DATA' && (
          <div className="space-y-5">
            {/* 1. Reports Section inside Data Tab (placed ON TOP as requested) */}
            <div className="space-y-2">
              <div className="px-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#00344c] font-mono font-semibold flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#00344c]" />
                  {t.reportsListHeader}
                </span>
                <span className="text-[10px] font-mono text-[#72787e] bg-white px-1.5 py-0.5 rounded border border-[#DCE1E6]">
                  {RECENT_REPORTS_LIST.length}
                </span>
              </div>

              <div className="space-y-1">
                {RECENT_REPORTS_LIST.map(report => (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport && onSelectReport(report.id)}
                    className="p-2 bg-white border border-[#DCE1E6] rounded hover:border-[#1b4b66] hover:bg-[#edf4ff]/30 transition-all cursor-pointer flex items-center gap-2 group shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#1b4b66] shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <p className="text-[11px] font-semibold text-[#0f1d28] truncate group-hover:text-[#00344c]">
                        {report.title}
                      </p>
                      <p className="text-[10px] font-mono text-[#72787e]">{report.editedTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Source Tree Section (placed BELOW Reports) */}
            <div className="pt-2 border-t border-[#DCE1E6] space-y-2">
              <div className="px-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#1b4b66] font-mono font-semibold flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  {t.sourceTreeHeader}
                </span>
                <span className="text-[10px] font-mono text-[#72787e] bg-white px-1.5 py-0.5 rounded border border-[#DCE1E6]">
                  4 DBs
                </span>
              </div>

              <div className="space-y-0.5 text-xs">
                {TREE_DATA.map(node => {
                  const isExpanded = expandedFolders[node.id];
                  const isSelected = selectedSourceId === node.id;

                  return (
                    <div key={node.id} className="w-full">
                      {/* Database Root Node */}
                      <div
                        onClick={() => {
                          if (node.children) toggleFolder(node.id);
                          onSelectSource(node.id);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-white text-[#1b4b66] font-semibold border-l-3 border-[#1b4b66] shadow-2xs'
                            : 'text-[#41474d] hover:bg-white/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {node.children ? (
                            <span className="text-[#72787e]">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                          ) : (
                            <span className="w-3.5 h-3.5"></span>
                          )}
                          {node.type === 'database' && (
                            <Database className="w-3.5 h-3.5 text-[#1b4b66] shrink-0" />
                          )}
                          {node.type === 'log' && (
                            <Activity className="w-3.5 h-3.5 text-[#5B4B8A] shrink-0" />
                          )}
                          <span className="truncate font-medium">{node.label}</span>
                        </div>
                        {node.count && (
                          <span className="font-mono text-[10px] bg-white text-[#41474d] border border-[#DCE1E6] px-1.5 py-0.2 rounded shrink-0">
                            {node.count}
                          </span>
                        )}
                      </div>

                      {/* Children Sub-folders */}
                      {isExpanded && node.children && (
                        <div className="pl-4 space-y-0.5 border-l border-[#DCE1E6] ml-3 my-0.5">
                          {node.children.map(child => {
                            const childSelected = selectedSourceId === child.id;
                            return (
                              <div
                                key={child.id}
                                onClick={() => onSelectSource(child.id)}
                                className={`flex items-center justify-between pr-2 py-1 pl-2 rounded cursor-pointer transition-colors ${
                                  childSelected
                                    ? 'bg-white text-[#1b4b66] font-semibold border-l-2 border-[#1b4b66]'
                                    : 'text-[#41474d] hover:bg-white/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Folder className="w-3.5 h-3.5 text-[#72787e] shrink-0" />
                                  <span className="truncate text-[11px]">{child.label}</span>
                                </div>
                                {child.count && (
                                  <span className="font-mono text-[10px] text-[#72787e]">
                                    {child.count}
                                  </span>
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
            </div>
          </div>
        )}
      </div>

      {/* User Avatar + Name + Logout at Bottom */}
      <div className="p-3 border-t border-[#DCE1E6] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-[#1b4b66] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#DCE1E6]">
            <User className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-[#0f1d28] truncate leading-tight">
              {t.adminRole}
            </p>
            <p className="text-[10px] font-mono text-[#72787e] truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              EventKnow Core
            </p>
          </div>
        </div>

        <button
          className="p-1.5 text-[#72787e] hover:text-[#00344c] hover:bg-[#EEF1F4] rounded transition-colors cursor-pointer"
          title={t.logout}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

