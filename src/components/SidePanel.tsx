import React, { useState } from 'react';
import { Share2, History, X, Network, Edit3 } from 'lucide-react';
import { AIReport, CitationSource } from '../types';
import { translations } from '../data/translations';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  report: AIReport;
  selectedCitationId?: string;
  language: 'VN' | 'EN';
}

export const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  report,
  selectedCitationId,
  language
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'GRAPH' | 'NOTES' | 'LOGS'>('GRAPH');
  const [notes, setNotes] = useState(
    'Ghi chú thẩm định: Dữ liệu hội thảo AI Q3 đã được đối soát với Viện CNTT. Cần lưu ý bản ghi [LOG-DEL-404] đã bị rút khỏi danh mục.'
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop for SidePanel */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed lg:static inset-y-0 right-0 z-50 lg:z-auto w-full sm:w-[380px] lg:w-[380px] shrink-0 bg-white border-l border-[#DCE1E6] flex flex-col h-full shadow-2xl lg:shadow-none overflow-hidden transition-all animate-fade-in">
        {/* Panel Top Header */}
        <div className="p-3.5 border-b border-[#DCE1E6] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#5B4B8A]" />
            <span className="font-display font-semibold text-xs tracking-wide text-[#0f1d28] uppercase">
              {t.sidePanelTitle}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#72787e] hover:text-[#0f1d28] hover:bg-[#EEF1F4] rounded transition-colors cursor-pointer"
            title="Close panel"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DCE1E6] bg-[#EEF1F4] px-2 text-xs">
        <button
          onClick={() => setActiveTab('GRAPH')}
          className={`flex-1 py-2 px-2 text-center font-medium border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'GRAPH'
              ? 'border-[#5B4B8A] text-[#5B4B8A] font-semibold bg-white'
              : 'border-transparent text-[#41474d] hover:text-[#0f1d28]'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{t.tabConnections} ({report.relatedNodes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-2 px-2 text-center font-medium border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'NOTES'
              ? 'border-[#00344c] text-[#00344c] font-semibold bg-white'
              : 'border-transparent text-[#41474d] hover:text-[#0f1d28]'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{t.tabNotes}</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`flex-1 py-2 px-2 text-center font-medium border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'LOGS'
              ? 'border-[#00344c] text-[#00344c] font-semibold bg-white'
              : 'border-transparent text-[#41474d] hover:text-[#0f1d28]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{t.tabLogs}</span>
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: KẾT NỐI (KNOWLEDGE GRAPH & ENTITIES) */}
        {activeTab === 'GRAPH' && (
          <div className="space-y-4">
            {/* Visual Graph Card */}
            <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded p-3 text-xs space-y-3">
              <div className="flex items-center justify-between text-caption-xs text-[#41474d]">
                <span className="font-semibold text-[#5B4B8A] flex items-center gap-1">
                  <Network className="w-3.5 h-3.5" />
                  {t.networkTitle}
                </span>
                <span className="font-data-mono text-[10px]">#5B4B8A</span>
              </div>

              {/* Interactive Node Graph Representations */}
              <div className="space-y-2 pt-1">
                {report.relatedNodes.map(node => (
                  <div
                    key={node.id}
                    className="p-2.5 bg-white border border-[#DCE1E6] rounded flex items-center justify-between hover:border-[#5B4B8A] transition-all"
                  >
                    <div>
                      <p className="font-semibold text-[#0f1d28] text-xs">{node.name}</p>
                      <p className="text-[10px] text-[#72787e] uppercase font-data-mono mt-0.5">
                        Type: {node.type}
                      </p>
                    </div>
                    <span className="font-data-mono text-[11px] font-semibold text-[#5B4B8A] bg-[#5B4B8A]/10 px-2 py-0.5 rounded-full">
                      {node.connectionsCount} connections
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relations List */}
            <div className="space-y-2">
              <h4 className="text-caption-xs font-semibold text-[#00344c] uppercase tracking-wide">
                Direct Relations
              </h4>
              <div className="space-y-1.5">
                {report.relatedLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#EEF1F4] border border-[#DCE1E6] rounded text-[11px] flex items-center justify-between"
                  >
                    <span className="font-medium text-[#0f1d28]">{link.relation}</span>
                    <span className="font-data-mono text-[10px] text-[#5B4B8A] font-semibold">
                      {link.source} ➔ {link.target}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GHI CHÚ (NOTES) */}
        {activeTab === 'NOTES' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-caption-xs font-semibold text-[#00344c] uppercase">
                {t.notesHeader}
              </span>
              <span className="text-[10px] text-[#72787e]">Auto-saved</span>
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={8}
              className="w-full p-3 text-xs font-body text-[#0f1d28] bg-white border border-[#DCE1E6] rounded focus:outline-none focus:border-[#00344c] leading-relaxed"
              placeholder={t.notesPlaceholder}
            />

            <div className="bg-[#edf4ff] p-3 rounded text-[11px] text-[#1b4b66] space-y-1">
              <p className="font-semibold">Quiet Authority Tip:</p>
              <p>Notes will be attached to report ID #{report.id} and included during export.</p>
            </div>
          </div>
        )}

        {/* TAB 3: LOG TRÍCH XUẤT */}
        {activeTab === 'LOGS' && (
          <div className="space-y-3">
            <h4 className="text-caption-xs font-semibold text-[#00344c] uppercase">
              {t.citationLogsHeader}
            </h4>

            <div className="space-y-2">
              {(Object.values(report.citations) as CitationSource[]).map(cit => (
                <div
                  key={cit.id}
                  className={`p-3 border rounded text-xs space-y-1 ${
                    selectedCitationId === cit.id
                      ? 'bg-white border-2 border-[#B8860B]'
                      : 'bg-[#F8FAFC] border-[#DCE1E6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-data-mono font-semibold text-[#B8860B]">
                      [{cit.id}]
                    </span>
                    <span className="font-data-mono text-[10px] text-[#72787e]">
                      {cit.publishDate}
                    </span>
                  </div>
                  <p className="font-semibold text-[#0f1d28]">{cit.title}</p>
                  <p className="text-[11px] text-[#41474d]">{cit.publisher}</p>
                  <p className="text-[10px] font-data-mono text-[#1b4b66]">
                    Status: {cit.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  </>
);
};
