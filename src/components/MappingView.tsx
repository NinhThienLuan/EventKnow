import React, { useState } from 'react';
import {
  FolderTree,
  Folder,
  Building2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ChevronRight,
  Trash2,
  Edit
} from 'lucide-react';
import { translations } from '../data/translations';

interface MappingViewProps {
  language: 'VN' | 'EN';
}

interface DepartmentFolderMapping {
  id: string;
  driveFolderPath: string;
  departmentName: string;
  status: 'MAPPED' | 'FALLBACK_REQUIRED' | 'UNMAPPED';
  lastSyncedAt: string;
  filesCount: number;
}

export const MappingView: React.FC<MappingViewProps> = ({ language }) => {
  const t = translations[language];

  const [mappings, setMappings] = useState<DepartmentFolderMapping[]>([
    {
      id: 'MAP-01',
      driveFolderPath: 'Drive_ROOT/SuKien_2024/BanGiamDoc/',
      departmentName: 'Ban Giám đốc',
      status: 'MAPPED',
      lastSyncedAt: '10/08/2026 10:30 AM',
      filesCount: 18
    },
    {
      id: 'MAP-02',
      driveFolderPath: 'Drive_ROOT/SuKien_2024/PhongTaiChinh/',
      departmentName: 'Phòng Tài chính',
      status: 'MAPPED',
      lastSyncedAt: '10/08/2026 10:15 AM',
      filesCount: 24
    },
    {
      id: 'MAP-03',
      driveFolderPath: 'Drive_ROOT/SuKien_2024/KinhDoanh_Marketing/',
      departmentName: 'Phòng Kinh doanh',
      status: 'MAPPED',
      lastSyncedAt: '10/08/2026 09:45 AM',
      filesCount: 31
    },
    {
      id: 'MAP-04',
      driveFolderPath: 'Drive_ROOT/Unsorted_Uploads_Q3/',
      departmentName: 'Chưa chọn (Fallback)',
      status: 'FALLBACK_REQUIRED',
      lastSyncedAt: '09/08/2026 04:20 PM',
      filesCount: 6
    }
  ]);

  const [newPath, setNewPath] = useState('');
  const [newDept, setNewDept] = useState('Phòng Pháp chế');

  const handleAddMapping = () => {
    if (!newPath.trim()) return;
    const item: DepartmentFolderMapping = {
      id: `MAP-0${mappings.length + 1}`,
      driveFolderPath: newPath.trim(),
      departmentName: newDept,
      status: 'MAPPED',
      lastSyncedAt: 'Vừa xong',
      filesCount: 0
    };
    setMappings([...mappings, item]);
    setNewPath('');
  };

  const handleDelete = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ADMINISTRATION / FOLDER MAPPING
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Cấu Hình Phòng Ban Mapping (Drive Folders)' : 'Department Folder Mapping'}</span>
          </h1>
          <p className="text-body-md text-[#41474d] max-w-3xl">
            {language === 'VN'
              ? 'Ánh xạ thư mục Google Drive tương ứng với Phòng Ban (FR-5.1). Khi folder không có cấp bậc rõ ràng, hệ thống dùng field fallback chọn phòng ban thủ công lúc upload.'
              : 'Maps Google Drive folders to corporate departments with manual selection fallback for unmapped roots.'}
          </p>
        </div>
      </div>

      {/* Add New Mapping Card */}
      <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3">
        <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#1b4b66]" />
          {language === 'VN' ? 'THÊM MAPPING THƯ MỤC DRIVE MỚI' : 'ADD NEW DRIVE FOLDER MAPPING'}
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 flex items-center gap-2 bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg px-3 py-1.5">
            <HardDrive className="w-4 h-4 text-[#72787e] shrink-0" />
            <input
              type="text"
              value={newPath}
              onChange={e => setNewPath(e.target.value)}
              placeholder={language === 'VN' ? 'Đường dẫn folder Google Drive (VD: Drive_ROOT/PhongPhapChe/...)' : 'Google Drive folder path...'}
              className="w-full text-xs bg-transparent text-[#0f1d28] focus:outline-none"
            />
          </div>

          <select
            value={newDept}
            onChange={e => setNewDept(e.target.value)}
            className="sm:col-span-4 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg font-bold text-[#00344c] focus:outline-none cursor-pointer"
          >
            <option value="Ban Giám đốc">{language === 'VN' ? 'Ban Giám đốc' : 'Board of Directors'}</option>
            <option value="Phòng Tài chính">{language === 'VN' ? 'Phòng Tài chính' : 'Finance Dept'}</option>
            <option value="Phòng Kinh doanh">{language === 'VN' ? 'Phòng Kinh doanh' : 'Sales Dept'}</option>
            <option value="Phòng Pháp chế">{language === 'VN' ? 'Phòng Pháp chế' : 'Legal Dept'}</option>
            <option value="Phòng Marketing">Marketing</option>
            <option value="Phòng R&D">R&D</option>
          </select>

          <button
            onClick={handleAddMapping}
            className="sm:col-span-2 px-3 py-1.5 bg-[#00344c] text-white font-bold text-xs rounded-lg hover:bg-[#1b4b66] transition-colors cursor-pointer"
          >
            {language === 'VN' ? 'Ánh Xạ' : 'Map Folder'}
          </button>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#edf4ff]/60 border-b border-[#DCE1E6] text-[#00344c] font-display font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">{language === 'VN' ? 'MÃ' : 'ID'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'THƯ MỤC DRIVE NGUỒN' : 'GOOGLE DRIVE FOLDER PATH'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'PHÒNG BAN ÁNH XẠ' : 'MAPPED DEPARTMENT'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'TRẠNG THÁI' : 'STATUS'}</th>
              <th className="py-3 px-4">{language === 'VN' ? 'ĐỒNG BỘ GẦN NHẤT' : 'LAST SYNC'}</th>
              <th className="py-3 px-4 text-right">{language === 'VN' ? 'THAO TÁC' : 'ACTIONS'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE1E6]">
            {mappings.map(map => (
              <tr key={map.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3 px-4 font-mono text-[#72787e]">{map.id}</td>
                <td className="py-3 px-4 font-mono text-[#0f1d28] font-semibold">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[#1b4b66] shrink-0" />
                    <span className="truncate max-w-xs">{map.driveFolderPath}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-bold text-[#00344c]">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#5B4B8A]" />
                    <span>{map.departmentName}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {map.status === 'MAPPED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      MAPPED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      FALLBACK
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-[#72787e] font-mono">{map.lastSyncedAt}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleDelete(map.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Xóa mapping"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
