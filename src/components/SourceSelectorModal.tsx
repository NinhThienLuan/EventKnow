import React from 'react';
import { Database, Check, X, Shield, Plus, HardDrive } from 'lucide-react';

interface SourceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSources: string[];
  onToggleSource: (sourceId: string) => void;
  onNavigateUpload?: () => void;
}

const AVAILABLE_SOURCES = [
  {
    id: 'Event DB Core',
    name: 'Event DB Core (Chính thức)',
    recordsCount: '1,420 bản ghi',
    description: 'Cơ sở dữ liệu hội thảo công nghệ, trí tuệ nhân tạo và kinh tế số quốc gia.',
    verified: true
  },
  {
    id: 'Viện Hàn Lâm VAST',
    name: 'Kho Tri thức Viện Hàn Lâm KH&CN',
    recordsCount: '850 bản ghi',
    description: 'Báo cáo khoa học, đề tài nghiên cứu cấp Bộ và danh mục Viện chuyên ngành.',
    verified: true
  },
  {
    id: 'APAC Tech Events Log',
    name: 'Nhật ký Trích xuất APAC Regional',
    recordsCount: '310 bản ghi',
    description: 'Tự động quét các sự kiện công nghệ trọng điểm Đông Nam Á và Singapore.',
    verified: true
  },
  {
    id: 'Báo cáo Tài trợ & Đội ngũ',
    name: 'Báo cáo Quản trị Doanh nghiệp & Tài trợ',
    recordsCount: '95 bản ghi',
    description: 'Dữ liệu đối tác, liên minh doanh nghiệp và tài trợ hội thảo.',
    verified: false
  }
];

export const SourceSelectorModal: React.FC<SourceSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedSources,
  onToggleSource,
  onNavigateUpload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#DCE1E6] rounded-lg max-w-lg w-full shadow-lg overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#DCE1E6] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#00344c]" />
            <h3 className="font-display font-semibold text-sm text-[#00344c]">
              Chọn Dữ Liệu Nguồn Để Phân Tích
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#72787e] hover:text-[#0f1d28] rounded hover:bg-[#EEF1F4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {AVAILABLE_SOURCES.map(src => {
            const isSelected = selectedSources.includes(src.id);
            return (
              <div
                key={src.id}
                onClick={() => onToggleSource(src.id)}
                className={`p-3 border rounded-md cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'bg-[#edf4ff] border-[#00344c] shadow-2xs'
                    : 'bg-white border-[#DCE1E6] hover:bg-[#F8FAFC]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 shrink-0 ${
                    isSelected ? 'bg-[#00344c] border-[#00344c] text-white' : 'border-[#c1c7cd] bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs text-[#0f1d28]">{src.name}</p>
                    <span className="font-data-mono text-[10px] text-[#1b4b66] bg-white border border-[#c1c7cd] px-1.5 py-0.2 rounded">
                      {src.recordsCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#41474d] mt-1 font-body">{src.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#DCE1E6] bg-[#EEF1F4] flex items-center justify-between gap-2">
          {onNavigateUpload && (
            <button
              onClick={() => {
                onClose();
                onNavigateUpload();
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#DCE1E6] text-[#00344c] rounded hover:bg-[#edf4ff] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tải lên file mới</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-caption-xs text-[#41474d]">
              Đã chọn <strong className="text-[#00344c]">{selectedSources.length}</strong> nguồn
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold bg-[#00344c] text-white rounded hover:bg-[#1b4b66] transition-colors cursor-pointer"
            >
              Xác nhận & Cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
