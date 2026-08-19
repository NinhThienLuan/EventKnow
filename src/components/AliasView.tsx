import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Tag,
  Sparkles,
  Info,
  Trash2,
  Edit2,
  Play
} from 'lucide-react';
import { translations } from '../data/translations';
import { PaginationControls } from './common/PaginationControls';

interface AliasViewProps {
  language: 'VN' | 'EN';
}

interface AliasRule {
  id: string;
  rawString: string;
  normalizedTitle: 'GS' | 'PGS' | 'TS' | 'ThS' | 'CN' | 'KS' | 'KHAC';
  description: string;
}

export const AliasView: React.FC<AliasViewProps> = ({ language }) => {
  const t = translations[language];

  const [searchTerm, setSearchTerm] = useState('');
  const [testInput, setTestInput] = useState('GS.TS. Nguyễn Văn A');
  const [testResult, setTestResult] = useState<string[]>(['GS', 'TS']);

  const [rules, setRules] = useState<AliasRule[]>([
    { id: 'R-01', rawString: 'GS.TS', normalizedTitle: 'GS', description: 'Giáo sư Tiến sĩ' },
    { id: 'R-02', rawString: 'GS', normalizedTitle: 'GS', description: 'Giáo sư' },
    { id: 'R-03', rawString: 'PGS.TS', normalizedTitle: 'PGS', description: 'Phó Giáo sư Tiến sĩ' },
    { id: 'R-04', rawString: 'PGS', normalizedTitle: 'PGS', description: 'Phó Giáo sư' },
    { id: 'R-05', rawString: 'TS', normalizedTitle: 'TS', description: 'Tiến sĩ' },
    { id: 'R-06', rawString: 'Dr.', normalizedTitle: 'TS', description: 'Doctorate Degree (EN)' },
    { id: 'R-07', rawString: 'ThS', normalizedTitle: 'ThS', description: 'Thạc sĩ' },
    { id: 'R-08', rawString: 'M.Sc', normalizedTitle: 'ThS', description: 'Master of Science (EN)' },
    { id: 'R-09', rawString: 'CN', normalizedTitle: 'CN', description: 'Cử nhân' },
    { id: 'R-10', rawString: 'KS', normalizedTitle: 'KS', description: 'Kỹ sư' }
  ]);

  const [newRaw, setNewRaw] = useState('');
  const [newNorm, setNewNorm] = useState<'GS' | 'PGS' | 'TS' | 'ThS' | 'CN' | 'KS' | 'KHAC'>('TS');
  const [newDesc, setNewDesc] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const handleAddRule = () => {
    if (!newRaw.trim()) return;
    const rule: AliasRule = {
      id: `R-${(rules.length + 1).toString().padStart(2, '0')}`,
      rawString: newRaw.trim(),
      normalizedTitle: newNorm,
      description: newDesc.trim() || 'Custom alias mapping'
    };
    setRules([rule, ...rules]);
    setNewRaw('');
    setNewDesc('');
    setCurrentPage(1);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    setCurrentPage(1);
  };

  const handleRunTest = () => {
    if (!testInput.trim()) return;
    const str = testInput.toUpperCase();
    const tags: string[] = [];
    rules.forEach(r => {
      if (str.includes(r.rawString.toUpperCase())) {
        if (!tags.includes(r.normalizedTitle)) {
          tags.push(r.normalizedTitle);
        }
      }
    });
    setTestResult(tags.length > 0 ? tags : ['KHAC']);
  };

  const filteredRules = rules.filter(r =>
    r.rawString.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.normalizedTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRules.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRules = filteredRules.slice(startIndex, startIndex + pageSize);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 space-y-6 antialiased font-body animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE1E6] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-medium text-[#72787e] uppercase tracking-wider">
            / ADMINISTRATION / ALIAS ENGINE
          </div>
          <h1 className="text-display-md text-[#00344c] tracking-tight font-bold font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'Bảng Tra Cứu Học Hàm / Học Vị (Title Alias Table)' : 'Academic Title Alias Table'}</span>
          </h1>
          <p className="text-body-md text-[#41474d] max-w-3xl">
            {language === 'VN'
              ? 'Quy tắc chuẩn hóa học hàm học vị rule-based (FR-2.2). Tách chuỗi ghép, đối chiếu bảng Alias không tiêu tốn quota Gemini AI.'
              : 'Rule-based normalization lookup table for academic titles without consuming Gemini AI API quota.'}
          </p>
        </div>
      </div>

      {/* Grid: Left Rule Creator & List + Right Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rule Table & Add Form */}
        <div className="lg:col-span-8 space-y-4">
          {/* Add Rule Form */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#1b4b66]" />
              {language === 'VN' ? 'THÊM QUY TẮC MÁP MỚI' : 'ADD NEW ALIAS MAPPING RULE'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="text"
                value={newRaw}
                onChange={e => setNewRaw(e.target.value)}
                placeholder={language === 'VN' ? 'Chuỗi gốc (VD: Prof. Dr., Th.S...)' : 'Raw string (e.g. Prof. Dr., Th.S...)'}
                className="sm:col-span-4 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
              />

              <select
                value={newNorm}
                onChange={e => setNewNorm(e.target.value as any)}
                className="sm:col-span-3 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg font-bold text-[#00344c] focus:outline-none cursor-pointer"
              >
                <option value="GS">GS (Giáo sư)</option>
                <option value="PGS">PGS (Phó Giáo sư)</option>
                <option value="TS">TS (Tiến sĩ)</option>
                <option value="ThS">ThS (Thạc sĩ)</option>
                <option value="CN">CN (Cử nhân)</option>
                <option value="KS">KS (Kỹ sư)</option>
                <option value="KHAC">Khác</option>
              </select>

              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder={language === 'VN' ? 'Mô tả bổ sung...' : 'Description...'}
                className="sm:col-span-3 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
              />

              <button
                onClick={handleAddRule}
                className="sm:col-span-2 px-3 py-1.5 bg-[#00344c] text-white font-bold text-xs rounded-lg hover:bg-[#1b4b66] transition-colors cursor-pointer"
              >
                {language === 'VN' ? 'Thêm' : 'Add'}
              </button>
            </div>
          </div>

          {/* Rules List Table */}
          <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
            <div className="p-3 bg-[#EEF1F4] border-b border-[#DCE1E6] flex items-center justify-between">
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-[#72787e] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={language === 'VN' ? 'Lọc danh sách alias...' : 'Filter alias list...'}
                  className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-[#DCE1E6] rounded text-[#0f1d28] focus:outline-none"
                />
              </div>

              <span className="text-[11px] font-mono text-[#72787e]">
                {filteredRules.length} {language === 'VN' ? 'quy tắc active' : 'active rules'}
              </span>
            </div>

            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#edf4ff]/60 border-b border-[#DCE1E6] text-[#00344c] font-display font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">{language === 'VN' ? 'MÃ' : 'ID'}</th>
                  <th className="py-2.5 px-4">{language === 'VN' ? 'CHUỖI NGUỒN GỐC' : 'RAW STRING'}</th>
                  <th className="py-2.5 px-4">{language === 'VN' ? 'HỌC HÀM CHUẨN' : 'NORMALIZED'}</th>
                  <th className="py-2.5 px-4">{language === 'VN' ? 'MÔ TẢ' : 'DESCRIPTION'}</th>
                  <th className="py-2.5 px-4 text-right">{language === 'VN' ? 'XÓA' : 'ACTION'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE1E6]">
                {paginatedRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[#72787e]">{rule.id}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-[#0f1d28]">{rule.rawString}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00344c] text-white">
                        {rule.normalizedTitle}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#41474d]">{rule.description}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Xóa quy tắc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalElements={filteredRules.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* Right Column: Title Parser Tester Component */}
        <div className="lg:col-span-4 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4 self-start">
          <div className="flex items-center gap-1.5 border-b border-[#DCE1E6] pb-3 text-xs font-mono font-bold uppercase text-[#00344c]">
            <Sparkles className="w-4 h-4 text-[#1b4b66]" />
            <span>{language === 'VN' ? 'CÔNG CỤ THỬ NHIỆM ALIAS PARSER' : 'ALIAS PARSER TESTER'}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#41474d]">
              {language === 'VN' ? 'Nhập chuỗi họ tên/học hàm raw:' : 'Enter raw title name string:'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg text-[#0f1d28] focus:outline-none focus:border-[#00344c]"
              />
              <button
                onClick={handleRunTest}
                className="px-3 py-1.5 bg-[#00344c] text-white rounded-lg text-xs font-bold hover:bg-[#1b4b66] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="p-4 bg-[#edf4ff]/50 border border-[#DCE1E6] rounded-xl space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-[#72787e]">
              {language === 'VN' ? 'KẾT QUẢ CHUẨN HÓA ENUM (TAGS)' : 'PARSED ENUM TAGS'}
            </span>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {testResult.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#00344c] text-white shadow-2xs flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[#72787e] pt-1 leading-relaxed">
              {language === 'VN'
                ? 'Code BE băm chuỗi ghép "GS.TS" thành 2 tag đầy đủ ["GS", "TS"], không làm mất giá trị.'
                : 'BE code parses compound titles "GS.TS" into 2 complete tags ["GS", "TS"] without info loss.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

