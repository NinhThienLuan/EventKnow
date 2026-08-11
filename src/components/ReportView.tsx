import React, { useState, useMemo } from 'react';
import { AIReport, CitationSource, EventRecord } from '../types';
import { CitationChip } from './CitationChip';
import {
  Download,
  Table as TableIcon,
  FileText,
  CheckCircle2,
  Search,
  Sparkles,
  ChevronDown,
  FileCode,
  FileSpreadsheet,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Layers,
  Building2,
  Calendar,
  StickyNote,
  Lock,
  Plus,
  Trash2,
  X,
  Check,
  Edit3
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { translations } from '../data/translations';

interface ReportViewProps {
  report: AIReport;
  onSelectCitation: (cit: CitationSource) => void;
  language: 'VN' | 'EN';
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onSelectCitation, language }) => {
  const t = translations[language];
  const [tableSearch, setTableSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'TABLE' | 'INSIGHTS'>('SUMMARY');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // View mode & chart options state
  const [dataViewMode, setDataViewMode] = useState<'GRID' | 'GRAPH'>('GRID');
  const [chartType, setChartType] = useState<'BAR' | 'LINE' | 'PIE'>('BAR');
  const [chartDimension, setChartDimension] = useState<'CATEGORY' | 'ORGANIZER' | 'TIMELINE'>('CATEGORY');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('ALL');

  // Private Personal Notes State
  const [privateNotes, setPrivateNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`eventknow_private_notes_${report.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editingNoteRecord, setEditingNoteRecord] = useState<EventRecord | null>(null);
  const [noteDraftText, setNoteDraftText] = useState('');

  const handleSaveNote = () => {
    if (!editingNoteRecord) return;
    const trimmed = noteDraftText.trim();
    const updated = { ...privateNotes };
    if (trimmed) {
      updated[editingNoteRecord.id] = trimmed;
    } else {
      delete updated[editingNoteRecord.id];
    }
    setPrivateNotes(updated);
    try {
      localStorage.setItem(`eventknow_private_notes_${report.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save private notes to localStorage', e);
    }
    setEditingNoteRecord(null);
    setNoteDraftText('');
  };

  const handleDeleteNote = (recordId: string) => {
    const updated = { ...privateNotes };
    delete updated[recordId];
    setPrivateNotes(updated);
    try {
      localStorage.setItem(`eventknow_private_notes_${report.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete private note from localStorage', e);
    }
    if (editingNoteRecord?.id === recordId) {
      setEditingNoteRecord(null);
      setNoteDraftText('');
    }
  };

  // Chart Palette
  const CHART_COLORS = ['#00344c', '#1b4b66', '#5B4B8A', '#0d9488', '#d97706', '#4f46e5', '#2563eb', '#059669'];

  // Helper to parse month/year from date string
  const getMonthAndYear = (dateStr: string): { month: number | null; year: number | null } => {
    if (!dateStr) return { month: null, year: null };
    const slashMatch = dateStr.match(/\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return { month: parseInt(slashMatch[1], 10), year: parseInt(slashMatch[2], 10) };
    }
    const dashMatch = dateStr.match(/(\d{4})[-/](\d{1,2})/);
    if (dashMatch) {
      return { month: parseInt(dashMatch[2], 10), year: parseInt(dashMatch[1], 10) };
    }
    const yearMatch = dateStr.match(/20\d{2}/);
    if (yearMatch) {
      return { month: null, year: parseInt(yearMatch[0], 10) };
    }
    return { month: null, year: null };
  };

  // Helper to test if record date falls within selected time range
  const matchesTimeRange = (dateStr: string, rangeKey: string): boolean => {
    if (rangeKey === 'ALL') return true;
    const { month, year } = getMonthAndYear(dateStr);

    if (rangeKey === 'YEAR_2024') return year === 2024;
    if (rangeKey === 'YEAR_2023') return year === 2023;
    if (rangeKey === 'Q1') return month !== null && month >= 1 && month <= 3;
    if (rangeKey === 'Q2') return month !== null && month >= 4 && month <= 6;
    if (rangeKey === 'Q3') return month !== null && month >= 7 && month <= 9;
    if (rangeKey === 'Q4') return month !== null && month >= 10 && month <= 12;
    if (rangeKey === 'M_05') return month === 5;
    if (rangeKey === 'M_06') return month === 6;
    if (rangeKey === 'M_07') return month === 7;
    if (rangeKey === 'M_08') return month === 8;

    return true;
  };

  // Time-filtered records array (used by both Table and Recharts)
  const timeFilteredData = useMemo(() => {
    return report.tableData.filter(rec => matchesTimeRange(rec.eventDate, selectedTimeRange));
  }, [report.tableData, selectedTimeRange]);

  // Aggregation logic for Recharts visualization
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; count: number; activeCount: number }> = {};
    timeFilteredData.forEach(r => {
      const cat = r.category || (language === 'VN' ? 'Khác' : 'Other');
      if (!map[cat]) {
        map[cat] = { name: cat, count: 0, activeCount: 0 };
      }
      map[cat].count += 1;
      if (r.status !== 'DELETED_IN_SOURCE') {
        map[cat].activeCount += 1;
      }
    });
    return Object.values(map);
  }, [timeFilteredData, language]);

  const organizerChartData = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    timeFilteredData.forEach(r => {
      const org = r.organizer || (language === 'VN' ? 'Chưa xác định' : 'Unspecified');
      if (!map[org]) {
        map[org] = { name: org, count: 0 };
      }
      map[org].count += 1;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [timeFilteredData, language]);

  const timelineChartData = useMemo(() => {
    const map: Record<string, { date: string; count: number }> = {};
    timeFilteredData.forEach(r => {
      const dateKey = r.eventDate ? r.eventDate.substring(0, 7) : '2024-01';
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, count: 0 };
      }
      map[dateKey].count += 1;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [timeFilteredData]);

  // Selected chart data based on active dimension
  const activeChartData = useMemo(() => {
    if (chartDimension === 'ORGANIZER') return organizerChartData;
    if (chartDimension === 'TIMELINE') return timelineChartData;
    return categoryChartData;
  }, [chartDimension, categoryChartData, organizerChartData, timelineChartData]);

  // Filter Table Data
  const filteredRecords = timeFilteredData.filter(rec => {
    const matchesSearch =
      rec.eventName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      rec.organizer.toLowerCase().includes(tableSearch.toLowerCase()) ||
      rec.code.toLowerCase().includes(tableSearch.toLowerCase());

    const matchesCategory =
      selectedCategoryFilter === 'ALL' || rec.category === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(report.tableData.map(r => r.category)));

  // Helper function to render text with citation chips embedded
  const renderTextWithCitations = (text: string) => {
    // Regex matches [CITATION_ID] like [EVT-2024-08]
    const regex = /\[([A-Z0-9-]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const citationId = match[1];
      const citationObj = report.citations[citationId];

      if (citationObj) {
        parts.push(
          <CitationChip
            key={`${citationId}-${match.index}`}
            citation={citationObj}
            onSelectCitation={onSelectCitation}
          />
        );
      } else {
        parts.push(
          <span key={match.index} className="font-data-mono text-[#B8860B] font-semibold">
            [{citationId}]
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleExportCSV = () => {
    const headers = [t.colCode, t.colEventName, t.colOrganizer, t.colSpeakers, t.colDate, 'Location', t.colStatus];
    const csvRows = [
      headers.join(','),
      ...report.tableData.map(r =>
        [
          `"${r.code}"`,
          `"${r.eventName}"`,
          `"${r.organizer}"`,
          `"${r.keySpeakers.join('; ')}"`,
          `"${r.eventDate}"`,
          `"${r.location}"`,
          `"${r.status}"`
        ].join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EventKnow_Report_${report.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const mdLines = [
      `# ${report.title}`,
      ``,
      `**Report ID:** \`${report.id}\`  `,
      `**Timestamp:** ${report.timestamp}  `,
      `**Author:** ${report.author}  `,
      `**Sources Utilized:** ${report.sourcesUsed}  `,
      ``,
      `---`,
      ``,
      `## Executive Summary`,
      ``,
      ...report.summaryParagraphs.map(p => `${p}\n`),
      `## Key Insights`,
      ``,
      ...report.keyInsights.map(i => `- ${i}`),
      ``,
      `---`,
      ``,
      `## Extracted Event Records (${report.tableData.length})`,
      ``,
      `| Identifier | Event Title | Organizer | Key Speakers | Date | Location | Status |`,
      `| --- | --- | --- | --- | --- | --- | --- |`,
      ...report.tableData.map(r =>
        `| \`${r.code}\` | ${r.eventName.replace(/\|/g, '\\|')} | ${r.organizer.replace(/\|/g, '\\|')} | ${r.keySpeakers.join('; ').replace(/\|/g, '\\|')} | ${r.eventDate} | ${(r.location || 'N/A').replace(/\|/g, '\\|')} | ${r.status} |`
      ),
      ``,
      `---`,
      ``,
      `*Generated by EventKnow Enterprise Platform*`
    ];

    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `EventKnow_Report_${report.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${report.title} - PDF Export</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f1d28; line-height: 1.5; margin: 0; padding: 24px; }
          .badge { display: inline-block; font-size: 10px; font-weight: bold; color: #1b4b66; background: #edf4ff; border: 1px solid #c1c7cd; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
          h1 { color: #00344c; font-size: 22px; margin: 0 0 8px 0; font-weight: 700; line-height: 1.2; }
          .meta { font-size: 11px; color: #72787e; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #DCE1E6; font-family: monospace; }
          .section-title { font-size: 13px; color: #00344c; border-bottom: 2px solid #00344c; padding-bottom: 4px; margin-top: 24px; margin-bottom: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-p { font-size: 12px; background: #F8FAFC; border: 1px solid #DCE1E6; padding: 12px 14px; border-radius: 6px; margin-bottom: 10px; color: #0f1d28; text-align: justify; }
          .insights-box { background: #edf4ff; border: 1px solid #dceafa; padding: 14px 16px; border-radius: 6px; margin-top: 16px; }
          .insights-box h4 { margin: 0 0 8px 0; font-size: 12px; color: #00344c; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
          .insights-box ul { margin: 0; padding-left: 20px; font-size: 12px; color: #0f1d28; }
          .insights-box li { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
          th, td { border: 1px solid #DCE1E6; padding: 8px 10px; text-align: left; }
          th { background-color: #EEF1F4; color: #00344c; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .code-cell { font-family: monospace; font-weight: bold; color: #00344c; }
          .footer { margin-top: 40px; border-top: 1px solid #DCE1E6; padding-top: 12px; font-size: 10px; color: #72787e; text-align: center; }
        </style>
      </head>
      <body>
        <div class="badge">AI SYNTHESIZED REPORT</div>
        <h1>${report.title}</h1>
        <div class="meta">
          ID: ${report.id} &nbsp;|&nbsp; TIMESTAMP: ${report.timestamp} &nbsp;|&nbsp; AUTHOR: ${report.author}<br/>
          SOURCES UTILIZED: ${report.sourcesUsed}
        </div>

        <div class="section-title">Executive Summary</div>
        ${report.summaryParagraphs.map(p => `<div class="summary-p">${p}</div>`).join('')}

        <div class="insights-box">
          <h4>Key Strategic Insights</h4>
          <ul>
            ${report.keyInsights.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>

        <div class="section-title">Detailed Event Records (${report.tableData.length})</div>
        <table>
          <thead>
            <tr>
              <th>Identifier</th>
              <th>Event Title</th>
              <th>Organizer</th>
              <th>Speakers</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${report.tableData.map(r => `
              <tr>
                <td class="code-cell">${r.code}</td>
                <td>${r.eventName}</td>
                <td>${r.organizer}</td>
                <td>${r.keySpeakers.join(', ')}</td>
                <td>${r.eventDate}</td>
                <td>${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated by EventKnow Enterprise Platform • Confidential & Executive Use
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="bg-white border border-[#DCE1E6] rounded-lg shadow-2xs overflow-hidden my-6 transition-colors">
      {/* Report Banner Header */}
      <div className="p-4 lg:p-6 border-b border-[#DCE1E6] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-data-mono text-[11px] font-semibold text-[#1b4b66] bg-[#edf4ff] border border-[#c1c7cd] px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3 text-[#1b4b66]" />
              {t.aiReportBadge}
            </span>
            <span className="font-data-mono text-[11px] text-[#72787e]">
              ID: {report.id}
            </span>
            <span className="font-data-mono text-[11px] text-[#72787e]">
              {report.timestamp}
            </span>
          </div>
          <h2 className="text-headline-md text-[#00344c] font-semibold tracking-tight">
            {report.title}
          </h2>
          <p className="text-xs text-[#41474d] mt-1 font-body">
            {t.sourcesUsed}: <strong className="text-[#00344c] font-semibold">{report.sourcesUsed}</strong> | {t.author}: {report.author}
          </p>
        </div>

        {/* Top Export Actions Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-2 bg-[#00344c] hover:bg-[#1b4b66] text-white px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>{t.exportReport}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsExportMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#DCE1E6] rounded-lg shadow-lg z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-[#DCE1E6] text-[10px] font-mono font-bold text-[#72787e] uppercase">
                  {language === 'VN' ? 'Định dạng xuất báo cáo' : 'Export Formats'}
                </div>

                <button
                  onClick={() => {
                    handleExportPDF();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#0f1d28] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer font-medium"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <div>
                    <div className="font-semibold">{language === 'VN' ? 'Tải PDF (.pdf)' : 'Download PDF (.pdf)'}</div>
                    <div className="text-[10px] text-[#72787e]">{language === 'VN' ? 'Định dạng in ấn & PDF' : 'Printable PDF document'}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleExportMarkdown();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#0f1d28] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer font-medium"
                >
                  <FileCode className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-semibold">{language === 'VN' ? 'Tải Markdown (.md)' : 'Download Markdown (.md)'}</div>
                    <div className="text-[10px] text-[#72787e]">{language === 'VN' ? 'Văn bản thuần Markdown' : 'Markdown text file'}</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleExportCSV();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#0f1d28] hover:bg-[#F8FAFC] transition-colors text-left cursor-pointer font-medium border-t border-[#EEF1F4]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-semibold">{language === 'VN' ? 'Tải CSV (.csv)' : 'Download CSV (.csv)'}</div>
                    <div className="text-[10px] text-[#72787e]">{language === 'VN' ? 'Dữ liệu bảng tính CSV' : 'Raw spreadsheet data'}</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Internal View Navigation Tabs */}
      <div className="flex border-b border-[#DCE1E6] bg-[#EEF1F4] px-4">
        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'SUMMARY'
              ? 'border-[#00344c] text-[#00344c] font-semibold bg-white'
              : 'border-transparent text-[#41474d] hover:text-[#0f1d28]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.summaryHeader} ({Object.keys(report.citations).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TABLE')}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TABLE'
              ? 'border-[#00344c] text-[#00344c] font-semibold bg-white'
              : 'border-transparent text-[#41474d] hover:text-[#0f1d28]'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>{t.tableHeader} ({report.tableData.length})</span>
        </button>
      </div>

      {/* Tab 1: Summary Narrative & Citations */}
      {activeTab === 'SUMMARY' && (
        <div className="p-5 lg:p-6 space-y-6">
          {/* Narrative Paragraphs */}
          <div className="space-y-4">
            <h3 className="text-subheading-sm text-[#00344c] border-b border-[#DCE1E6] pb-1.5 flex items-center gap-2">
              <span>{t.summaryHeader}</span>
              <span className="text-[10px] font-data-mono text-[#B8860B] bg-[rgba(184,134,11,0.12)] border border-[#B8860B] px-1.5 py-0.2 rounded">
                Gold Citation Index
              </span>
            </h3>

            {report.summaryParagraphs.map((paragraph, index) => (
              <div
                key={index}
                className="text-body-md text-[#0f1d28] leading-relaxed font-body bg-[#F8FAFC] p-3.5 rounded border border-[#DCE1E6]"
              >
                {renderTextWithCitations(paragraph)}
              </div>
            ))}
          </div>

          {/* Key Insights Section */}
          <div className="bg-[#edf4ff] border border-[#dceafa] p-4 rounded-md space-y-2">
            <h4 className="text-xs font-semibold text-[#00344c] uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1b4b66]" />
              Key Insights
            </h4>
            <ul className="space-y-1.5 pl-5 list-disc text-body-md text-[#0f1d28]">
              {report.keyInsights.map((insight, i) => (
                <li key={i}>{renderTextWithCitations(insight)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: High Density Data Table & Recharts Visualizations */}
      {activeTab === 'TABLE' && (
        <div className="p-4 lg:p-6 space-y-4">
          {/* Toolbar with Grid / Graph Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] p-3 border border-[#DCE1E6] rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Grid vs Graph Toggle Pill */}
              <div className="inline-flex rounded-md border border-[#DCE1E6] p-0.5 bg-[#EEF1F4]">
                <button
                  onClick={() => setDataViewMode('GRID')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                    dataViewMode === 'GRID'
                      ? 'bg-white text-[#00344c] shadow-2xs'
                      : 'text-[#72787e] hover:text-[#0f1d28]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{language === 'VN' ? 'Dạng Bảng (Grid)' : 'Data Grid'}</span>
                </button>
                <button
                  onClick={() => setDataViewMode('GRAPH')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                    dataViewMode === 'GRAPH'
                      ? 'bg-white text-[#00344c] shadow-2xs'
                      : 'text-[#72787e] hover:text-[#0f1d28]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{language === 'VN' ? 'Biểu Đồ (Graph)' : 'Graph Analytics'}</span>
                </button>
              </div>

              {/* Time Range Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedTimeRange}
                  onChange={e => setSelectedTimeRange(e.target.value)}
                  className="pl-3 pr-7 py-1 text-xs font-body bg-white border border-[#DCE1E6] rounded text-[#0f1d28] focus:outline-none focus:border-[#00344c] cursor-pointer font-medium shadow-2xs"
                >
                  <option value="ALL">
                    {language === 'VN' ? '⏱️ Tất cả thời gian' : '⏱️ All Time Ranges'}
                  </option>
                  <optgroup label={language === 'VN' ? 'Theo Quý (Quarter)' : 'By Quarter'}>
                    <option value="Q1">{language === 'VN' ? 'Quý 1 (Th1 - Th3)' : 'Q1 (Jan - Mar)'}</option>
                    <option value="Q2">{language === 'VN' ? 'Quý 2 (Th4 - Th6)' : 'Q2 (Apr - Jun)'}</option>
                    <option value="Q3">{language === 'VN' ? 'Quý 3 (Th7 - Th9)' : 'Q3 (Jul - Sep)'}</option>
                    <option value="Q4">{language === 'VN' ? 'Quý 4 (Th10 - Th12)' : 'Q4 (Oct - Dec)'}</option>
                  </optgroup>
                  <optgroup label={language === 'VN' ? 'Theo Tháng (Month)' : 'By Month'}>
                    <option value="M_05">{language === 'VN' ? 'Tháng 5/2024' : 'May 2024'}</option>
                    <option value="M_06">{language === 'VN' ? 'Tháng 6/2024' : 'June 2024'}</option>
                    <option value="M_07">{language === 'VN' ? 'Tháng 7/2024' : 'July 2024'}</option>
                    <option value="M_08">{language === 'VN' ? 'Tháng 8/2024' : 'August 2024'}</option>
                  </optgroup>
                  <optgroup label={language === 'VN' ? 'Theo Năm (Year)' : 'By Year'}>
                    <option value="YEAR_2024">{language === 'VN' ? 'Năm 2024' : 'Year 2024'}</option>
                    <option value="YEAR_2023">{language === 'VN' ? 'Năm 2023' : 'Year 2023'}</option>
                  </optgroup>
                </select>
              </div>

              {dataViewMode === 'GRID' && (
                <>
                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={selectedCategoryFilter}
                      onChange={e => setSelectedCategoryFilter(e.target.value)}
                      className="pl-3 pr-8 py-1 text-xs font-body bg-white border border-[#DCE1E6] rounded text-[#0f1d28] focus:outline-none focus:border-[#00344c] cursor-pointer"
                    >
                      <option value="ALL">
                        {language === 'VN' ? 'Tất cả danh mục' : 'All Categories'} ({timeFilteredData.length})
                      </option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-caption-xs text-[#72787e] hidden md:inline">
                    {filteredRecords.length} / {timeFilteredData.length} {t.records}
                  </span>
                </>
              )}
            </div>

            {dataViewMode === 'GRID' ? (
              /* Table Search */
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#72787e]" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder={t.searchTablePlaceholder}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#DCE1E6] rounded text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
                />
              </div>
            ) : (
              /* Graph View Dimension & Chart Type Controls */
              <div className="flex items-center gap-2 flex-wrap">
                {/* Dimension selector */}
                <div className="flex items-center gap-1 bg-white border border-[#DCE1E6] rounded p-0.5 text-xs">
                  <button
                    onClick={() => setChartDimension('CATEGORY')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      chartDimension === 'CATEGORY' ? 'bg-[#00344c] text-white font-bold' : 'text-[#72787e] hover:text-[#0f1d28]'
                    }`}
                  >
                    {language === 'VN' ? 'Danh mục' : 'Category'}
                  </button>
                  <button
                    onClick={() => setChartDimension('ORGANIZER')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      chartDimension === 'ORGANIZER' ? 'bg-[#00344c] text-white font-bold' : 'text-[#72787e] hover:text-[#0f1d28]'
                    }`}
                  >
                    {language === 'VN' ? 'Đơn vị' : 'Organizer'}
                  </button>
                  <button
                    onClick={() => setChartDimension('TIMELINE')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      chartDimension === 'TIMELINE' ? 'bg-[#00344c] text-white font-bold' : 'text-[#72787e] hover:text-[#0f1d28]'
                    }`}
                  >
                    {language === 'VN' ? 'Thời gian' : 'Timeline'}
                  </button>
                </div>

                {/* Chart Type selector */}
                <div className="inline-flex rounded border border-[#DCE1E6] p-0.5 bg-white">
                  <button
                    onClick={() => setChartType('BAR')}
                    title="Bar Chart"
                    className={`p-1 rounded cursor-pointer ${
                      chartType === 'BAR' ? 'bg-[#1b4b66] text-white' : 'text-[#72787e] hover:text-[#0f1d28]'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setChartType('LINE')}
                    title="Line Chart"
                    className={`p-1 rounded cursor-pointer ${
                      chartType === 'LINE' ? 'bg-[#1b4b66] text-white' : 'text-[#72787e] hover:text-[#0f1d28]'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setChartType('PIE')}
                    title="Pie Chart"
                    className={`p-1 rounded cursor-pointer ${
                      chartType === 'PIE' ? 'bg-[#1b4b66] text-white' : 'text-[#72787e] hover:text-[#0f1d28]'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* VIEW MODE 1: GRID VIEW */}
          {dataViewMode === 'GRID' && (
            <div className="border border-[#DCE1E6] rounded overflow-x-auto">
              <table className="w-full text-left border-collapse">
                {/* Sticky Header */}
                <thead>
                  <tr className="bg-[#EEF1F4] border-b border-[#DCE1E6] text-[11px] font-semibold text-[#41474d] uppercase tracking-wider">
                    <th className="py-3 px-4 font-mono">{t.colCode}</th>
                    <th className="py-3 px-4">{t.colEventName}</th>
                    <th className="py-3 px-4">{t.colOrganizer}</th>
                    <th className="py-3 px-4">{t.colSpeakers}</th>
                    <th className="py-3 px-4 font-mono">{t.colDate}</th>
                    <th className="py-3 px-4">{t.colStatus}</th>
                    <th className="py-3 px-4">{language === 'VN' ? 'Ghi chú' : 'Notes'}</th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-[#DCE1E6] bg-white text-xs">
                  {filteredRecords.map(rec => {
                    const isDeleted = rec.status === 'DELETED_IN_SOURCE';
                    const citationObj = report.citations[rec.code];
                    const noteText = privateNotes[rec.id];
                    const hasNote = Boolean(noteText && noteText.trim().length > 0);

                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-[#f7f9ff] transition-colors ${
                          isDeleted ? 'opacity-40 italic' : ''
                        }`}
                      >
                        {/* Code */}
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                          {citationObj ? (
                            <CitationChip
                              citation={citationObj}
                              onSelectCitation={onSelectCitation}
                            />
                          ) : (
                            <span className="font-mono text-[11px] text-[#00344c]">
                              {rec.code}
                            </span>
                          )}
                        </td>

                        {/* Event Name */}
                        <td className="py-3.5 px-4 font-medium text-[#0f1d28] max-w-xs">
                          <span className={isDeleted ? 'line-through' : ''}>
                            {rec.eventName}
                          </span>
                        </td>

                        {/* Organizer */}
                        <td className="py-3.5 px-4 text-[#41474d]">{rec.organizer}</td>

                        {/* Speakers */}
                        <td className="py-3.5 px-4 text-[#0f1d28] max-w-xs">
                          {rec.keySpeakers.join(', ')}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {rec.eventDate}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isDeleted ? (
                            <span className="pill-status bg-slate-200 text-slate-500 uppercase">
                              {t.statusDeleted}
                            </span>
                          ) : (
                            <span className="pill-status bg-emerald-100 text-emerald-800 uppercase">
                              {t.statusActive}
                            </span>
                          )}
                        </td>

                        {/* Private Personal Note */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingNoteRecord(rec);
                              setNoteDraftText(privateNotes[rec.id] || '');
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                              hasNote
                                ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 shadow-2xs'
                                : 'text-[#72787e] hover:text-[#00344c] hover:bg-[#EEF1F4]'
                            }`}
                            title={hasNote ? noteText : (language === 'VN' ? 'Thêm ghi chú cá nhân' : 'Add private note')}
                          >
                            <StickyNote className={`w-3.5 h-3.5 ${hasNote ? 'text-amber-600 fill-amber-200' : 'text-[#72787e]'}`} />
                            {hasNote ? (
                              <span className="max-w-[110px] truncate text-[11px] font-medium">
                                {noteText}
                              </span>
                            ) : (
                              <span className="text-[11px] opacity-70">+ {language === 'VN' ? 'Ghi chú' : 'Note'}</span>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-xs text-[#72787e]">
                        No matching records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW MODE 2: GRAPH VIEW (RECHARTS) */}
          {dataViewMode === 'GRAPH' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#72787e] uppercase">
                    {language === 'VN' ? 'TỔNG SỰ KIỆN BÁO CÁO' : 'TOTAL REPORTED EVENTS'}
                  </span>
                  <div className="text-2xl font-bold font-display text-[#00344c]">
                    {timeFilteredData.length}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#72787e] uppercase">
                    {language === 'VN' ? 'DANH MỤC PHÂN BỔ' : 'CATEGORIES'}
                  </span>
                  <div className="text-2xl font-bold font-display text-[#1b4b66]">
                    {categoryChartData.length}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#72787e] uppercase">
                    {language === 'VN' ? 'ĐƠN VỊ ĐỒNG HÀNH' : 'PARTNER ORGS'}
                  </span>
                  <div className="text-2xl font-bold font-display text-[#5B4B8A]">
                    {organizerChartData.length}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-3 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#72787e] uppercase">
                    {language === 'VN' ? 'TỶ LỆ KHẢ DỤNG' : 'ACTIVE DATA RATIO'}
                  </span>
                  <div className="text-2xl font-bold font-display text-emerald-700">
                    {Math.round(
                      (timeFilteredData.filter(r => r.status !== 'DELETED_IN_SOURCE').length /
                        (timeFilteredData.length || 1)) *
                        100
                    )}
                    %
                  </div>
                </div>
              </div>

              {/* Main Recharts Container */}
              <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DCE1E6] pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1b4b66]" />
                    <span className="text-xs font-mono font-bold uppercase text-[#00344c]">
                      {chartDimension === 'CATEGORY' && (language === 'VN' ? 'PHÂN BỔ SỰ KIỆN THEO DANH MỤC' : 'EVENT DISTRIBUTION BY CATEGORY')}
                      {chartDimension === 'ORGANIZER' && (language === 'VN' ? 'TOP ĐƠN VỊ TỔ CHỨC SỰ KIỆN' : 'TOP ORGANIZERS BY EVENT COUNT')}
                      {chartDimension === 'TIMELINE' && (language === 'VN' ? 'XU HƯỚNG TẦN SUẤT THEO THỜI GIAN' : 'EVENT FREQUENCY TIMELINE')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#72787e]">
                    {language === 'VN' ? 'Trực quan hóa tự động bởi Recharts' : 'Interactive Recharts Visualization'}
                  </span>
                </div>

                <div className="w-full h-[320px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'BAR' ? (
                      <BarChart data={activeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                        <XAxis
                          dataKey={chartDimension === 'TIMELINE' ? 'date' : 'name'}
                          tick={{ fontSize: 11, fill: '#0f1d28' }}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#0f1d28' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#00344c',
                            borderColor: '#1b4b66',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          itemStyle={{ color: '#ffffff' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar
                          dataKey="count"
                          name={language === 'VN' ? 'Số lượng sự kiện' : 'Event Count'}
                          fill="#00344c"
                          radius={[4, 4, 0, 0]}
                        >
                          {activeChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : chartType === 'LINE' ? (
                      <LineChart data={activeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                        <XAxis
                          dataKey={chartDimension === 'TIMELINE' ? 'date' : 'name'}
                          tick={{ fontSize: 11, fill: '#0f1d28' }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#0f1d28' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#00344c',
                            borderColor: '#1b4b66',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          itemStyle={{ color: '#ffffff' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name={language === 'VN' ? 'Xu hướng sự kiện' : 'Event Trend'}
                          stroke="#1b4b66"
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#00344c' }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#00344c',
                            borderColor: '#1b4b66',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Pie
                          data={activeChartData}
                          dataKey="count"
                          nameKey={chartDimension === 'TIMELINE' ? 'date' : 'name'}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {activeChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Private Note Modal Dialog */}
      {editingNoteRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-[#DCE1E6] max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#00344c] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">
                  {language === 'VN' ? 'Ghi chú cá nhân' : 'Private Personal Note'}
                </span>
                <span className="text-[10px] bg-[#1b4b66] text-amber-200 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  {language === 'VN' ? 'Riêng tư' : 'Private'}
                </span>
              </div>
              <button
                onClick={() => setEditingNoteRecord(null)}
                className="text-white/70 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg p-3">
                <div className="text-[10px] font-mono font-bold text-[#72787e] uppercase">
                  {language === 'VN' ? 'Mã sự kiện / Tên sự kiện:' : 'Target Event:'}
                </div>
                <div className="text-xs font-semibold text-[#00344c] mt-0.5">
                  <span className="font-mono text-[#1b4b66] mr-1">[{editingNoteRecord.code}]</span>
                  {editingNoteRecord.eventName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f1d28] mb-1.5">
                  {language === 'VN' ? 'Nội dung ghi chú riêng tư' : 'Private Note Content'}
                </label>
                <textarea
                  value={noteDraftText}
                  onChange={e => setNoteDraftText(e.target.value)}
                  rows={4}
                  placeholder={
                    language === 'VN'
                      ? 'Nhập ghi chú cá nhân, phân tích nội bộ, thông tin liên hệ hoặc việc cần làm...'
                      : 'Write your private observations, follow-up tasks, or confidential comments...'
                  }
                  className="w-full text-xs p-3 border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#00344c] focus:ring-1 focus:ring-[#00344c] text-[#0f1d28] resize-none"
                  autoFocus
                />
                <p className="text-[10px] text-[#72787e] mt-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600 inline" />
                  <span>
                    {language === 'VN'
                      ? 'Ghi chú được lưu an toàn cục bộ trên thiết bị của bạn và không chia sẻ công khai.'
                      : 'Notes are saved securely on your local session and not shared publicly.'}
                  </span>
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#EEF1F4]">
                {privateNotes[editingNoteRecord.id] ? (
                  <button
                    onClick={() => handleDeleteNote(editingNoteRecord.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? 'Xóa ghi chú' : 'Delete note'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingNoteRecord(null)}
                    className="px-3.5 py-1.5 text-xs text-[#72787e] hover:text-[#0f1d28] font-medium transition-colors cursor-pointer"
                  >
                    {language === 'VN' ? 'Hủy' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="flex items-center gap-1.5 bg-[#00344c] hover:bg-[#1b4b66] text-white px-4 py-1.5 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{language === 'VN' ? 'Lưu ghi chú' : 'Save note'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
