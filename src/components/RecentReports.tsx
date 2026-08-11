import React from 'react';
import { FileText, GitFork, BarChart3, Clock, ChevronRight } from 'lucide-react';
import { RecentReportItem } from '../types';
import { translations } from '../data/translations';

interface RecentReportsProps {
  reports: RecentReportItem[];
  onSelectRecentReport: (id: string) => void;
  language?: 'VN' | 'EN';
}

export const RecentReports: React.FC<RecentReportsProps> = ({ reports, onSelectRecentReport, language = 'VN' }) => {
  const t = translations[language];

  const getIcon = (type: RecentReportItem['iconType']) => {
    switch (type) {
      case 'tree':
        return <GitFork className="w-5 h-5 text-[#1b4b66]" />;
      case 'chart':
        return <BarChart3 className="w-5 h-5 text-[#5B4B8A]" />;
      case 'document':
      default:
        return <FileText className="w-5 h-5 text-[#00344c]" />;
    }
  };

  return (
    <section className="max-w-4xl mx-auto w-full py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-headline-md text-[#00344c]">
          {t.recentReportsTitle}
        </h3>
        <button className="text-caption-xs text-[#00344c] hover:underline font-semibold flex items-center gap-1 cursor-pointer">
          <span>{t.viewAll}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {reports.map(report => (
          <div
            key={report.id}
            onClick={() => onSelectRecentReport(report.id)}
            className="p-3.5 bg-[#F8FAFC] border border-[#DCE1E6] rounded-md hover:bg-white hover:border-[#1b4b66] hover:shadow-xs transition-all cursor-pointer flex items-center gap-3 group"
          >
            {/* Icon Box */}
            <div className="w-10 h-10 rounded bg-[#EEF1F4] flex items-center justify-center shrink-0 group-hover:bg-[#edf4ff] transition-colors">
              {getIcon(report.iconType)}
            </div>

            {/* Info */}
            <div className="overflow-hidden flex-1">
              <h4 className="text-xs font-semibold text-[#0f1d28] truncate group-hover:text-[#00344c] transition-colors">
                {report.title}
              </h4>
              <p className="text-caption-xs text-[#72787e] mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#72787e]" />
                <span>{report.editedTime}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
