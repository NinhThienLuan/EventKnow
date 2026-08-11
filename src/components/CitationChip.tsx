import React, { useState } from 'react';
import { ExternalLink, ShieldCheck, Calendar, Bookmark, FileText } from 'lucide-react';
import { CitationSource } from '../types';

interface CitationChipProps {
  citation: CitationSource;
  onSelectCitation?: (cit: CitationSource) => void;
}

export const CitationChip: React.FC<CitationChipProps> = ({ citation, onSelectCitation }) => {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <span className="relative inline-block mx-0.5 group">
      {/* Gold Citation Chip Button */}
      <button
        type="button"
        onClick={() => onSelectCitation?.(citation)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        className="citation-chip inline-flex items-center gap-1 text-[11px] font-data-mono font-medium rounded-xs transition-all cursor-pointer"
        style={{
          backgroundColor: 'rgba(184, 134, 11, 0.12)',
          color: '#B8860B',
          borderColor: '#B8860B'
        }}
      >
        <span>[{citation.id}]</span>
      </button>

      {/* Hover Elevation Level 1 Popover */}
      {showPopover && (
        <div
          className="absolute z-50 left-0 bottom-full mb-2 w-72 sm:w-80 p-3 bg-white border border-[#DCE1E6] rounded-md shadow-lg text-left text-xs pointer-events-auto"
          style={{ boxShadow: '0px 4px 12px rgba(26, 39, 51, 0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[#DCE1E6] pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-data-mono text-[#B8860B] font-semibold text-[11px]">
              <Bookmark className="w-3.5 h-3.5" />
              <span>[{citation.id}]</span>
            </div>
            <span
              className={`text-[10px] font-data-mono font-semibold px-1.5 py-0.5 rounded ${
                citation.status === 'VERIFIED'
                  ? 'bg-[#edf4ff] text-[#00344c]'
                  : citation.status === 'DELETED_IN_SOURCE'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {citation.status === 'VERIFIED'
                ? 'Đã xác thực (98%)'
                : citation.status === 'DELETED_IN_SOURCE'
                ? 'Đã bãi bỏ tại nguồn'
                : 'Đã cập nhật'}
            </span>
          </div>

          {/* Title & Publisher */}
          <div className="font-display font-semibold text-xs text-[#0f1d28] leading-tight mb-1">
            {citation.title}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#41474d] mb-2 font-body">
            <span className="truncate">{citation.publisher}</span>
            <span className="flex items-center gap-1 shrink-0 font-data-mono text-[10px]">
              <Calendar className="w-3 h-3 text-[#72787e]" />
              {citation.publishDate}
            </span>
          </div>

          {/* Snippet box with bg-sunken */}
          <div className="bg-[#EEF1F4] border border-[#DCE1E6] p-2 rounded text-[11px] text-[#0f1d28] italic leading-relaxed font-body mb-2">
            "{citation.snippet}"
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-[#72787e] font-data-mono text-[10px]">
              Độ tin cậy: {citation.confidenceScore}%
            </span>
            <button
              onClick={() => onSelectCitation?.(citation)}
              className="flex items-center gap-1 text-[#00344c] font-semibold hover:underline cursor-pointer"
            >
              <span>Xem chi tiết nguồn</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </span>
  );
};
