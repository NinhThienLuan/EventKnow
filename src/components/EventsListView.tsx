import React, { useState, useEffect } from 'react';
import {
    Database,
    Search,
    Filter,
    Calendar,
    Layers,
    Sliders,
    TrendingUp,
    Grid,
    FileText,
    CheckSquare,
    Square,
    ArrowRight,
    RefreshCw,
    X,
    ChevronDown,
    ChevronUp,
    Sparkles
} from 'lucide-react';
import { SourceTree } from './SourceTree';
import { PaginationControls } from './common/PaginationControls';
import { useNavigate } from 'react-router-dom';
import { updateAttendeeStatus } from '../lib/identityApi';
import { fetchRecommendationPreview, fetchPopularTags, RecommendGuest } from '../lib/recommendationApi';


interface EventItem {
    id: string;
    eventName: string;
    eventDate: string;
    department: string;
    rawEventCount: number;
}

interface EventsListViewProps {
    language: 'VN' | 'EN';
    selectedEventIds: string[];
    onToggleSelectEvent: (eventId: string) => void;
    onSelectAllEvents: (eventIds: string[], replace: boolean) => void;
    onNavigateToDashboard: () => void;
}

const DEPARTMENTS = [
    "CNTT",
    "Kỹ thuật - Công nghệ",
    "Y tế",
    "Giáo dục",
    "AgriTech",
    "Chế biến chế tạo - Tự động hóa",
    "Kinh tế - Xã hội và Môi trường",
    "Khác",
    "Chưa phân loại"
];

const YEARS = ["2026", "2025", "2024", "2023", "2022"];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export const EventsListView: React.FC<EventsListViewProps> = ({
    language,
    selectedEventIds,
    onToggleSelectEvent,
    onSelectAllEvents,
    onNavigateToDashboard
}) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters State
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [quarterFilter, setQuarterFilter] = useState('');

    // Pagination State
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 10;

    // Recommendation Preview Sandbox State
    const [sandboxOpen, setSandboxOpen] = useState(false);
    const [sandboxTags, setSandboxTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [popularTags, setPopularTags] = useState<string[]>([]);
    const [minOverlap, setMinOverlap] = useState(1);
    const [sandboxResults, setSandboxResults] = useState<RecommendGuest[]>([]);
    const [sandboxLoading, setSandboxLoading] = useState(false);
    const [sandboxError, setSandboxError] = useState<string | null>(null);
    const [sandboxPage, setSandboxPage] = useState(0);
    const [sandboxTotalPages, setSandboxTotalPages] = useState(0);
    const [sandboxTotalElements, setSandboxTotalElements] = useState(0);
    const [contactedMap, setContactedMap] = useState<Record<string, 'DA_LIEN_HE' | 'CHUA_LIEN_HE'>>({});
    const [sandboxLayout, setSandboxLayout] = useState<'gallery' | 'list'>('gallery');

    // Fetch popular tags when sandbox is opened
    useEffect(() => {
        if (sandboxOpen && popularTags.length === 0) {
            const loadTags = async () => {
                try {
                    const tagsList = await fetchPopularTags();
                    setPopularTags(tagsList || []);
                } catch (err) {
                    console.error('Failed to load popular tags', err);
                }
            };
            loadTags();
        }
    }, [sandboxOpen, popularTags.length]);

    const handleRunPreview = async (pageIdx = 0, layoutOverride?: 'gallery' | 'list') => {
        if (sandboxTags.length === 0) {
            setSandboxError(language === 'VN' ? 'Vui lòng chọn ít nhất một tag để xem thử.' : 'Please select at least one tag.');
            return;
        }
        setSandboxLoading(true);
        setSandboxError(null);
        try {
            const activeLayout = layoutOverride || sandboxLayout;
            const size = activeLayout === 'gallery' ? 6 : 10;
            const res = await fetchRecommendationPreview(sandboxTags, minOverlap, pageIdx, size);
            setSandboxResults(res.content || []);
            setSandboxTotalPages(res.totalPages || 0);
            setSandboxTotalElements(res.totalElements || 0);
            setSandboxPage(pageIdx);
        } catch (err: any) {
            console.error(err);
            setSandboxError(err.message || 'Lỗi gợi ý xem thử.');
        } finally {
            setSandboxLoading(false);
        }
    };

    const handleToggleContactStatus = async (guestId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'DA_LIEN_HE' ? 'CHUA_LIEN_HE' : 'DA_LIEN_HE';
            await updateAttendeeStatus(guestId, newStatus);
            setContactedMap((prev) => ({
                ...prev,
                [guestId]: newStatus,
            }));
        } catch (err: any) {
            console.error(err);
            alert(language === 'VN' ? 'Cập nhật trạng thái liên hệ thất bại.' : 'Failed to update contact status.');
        }
    };

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [search, deptFilter, yearFilter, quarterFilter]);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (deptFilter) params.append('department', deptFilter);
            if (yearFilter) params.append('year', yearFilter);
            if (quarterFilter) params.append('quarter', quarterFilter);
            params.append('page', page.toString());
            params.append('size', pageSize.toString());

            const res = await fetch(`/api/events?${params.toString()}`, { credentials: 'include' });
            if (!res.ok) {
                throw new Error('Không thể tải danh sách sự kiện.');
            }
            const json = await res.json();
            const paged = json.data || json; // backend wraps in { status, data: Page }
            setEvents(paged.content || []);
            setTotalPages(paged.totalPages || 0);
            setTotalElements(paged.totalElements || 0);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Lỗi kết nối máy chủ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'table') {
            fetchEvents();
        }
    }, [search, deptFilter, yearFilter, quarterFilter, page, viewMode]);

    const handleSelectPageAll = () => {
        const pageIds = events.map(e => e.id);
        const allSelected = pageIds.length > 0 && pageIds.every(id => selectedEventIds.includes(id));
        if (allSelected) {
            // Remove all elements of current page
            onSelectAllEvents(pageIds, false);
        } else {
            // Add all elements of current page
            onSelectAllEvents(pageIds, true);
        }
    };

    // Translations
    const isVN = language === 'VN';
    const t = {
        title: isVN ? 'Quản lý Sự kiện' : 'Events Management',
        subtitle: isVN ? 'Xem danh sách và lọc toàn bộ sự kiện trong hệ thống' : 'View lists and filter all system events',
        searchPlaceholder: isVN ? 'Tìm tên sự kiện...' : 'Search event name...',
        deptLabel: isVN ? 'Khoa ban' : 'Department',
        allDepts: isVN ? 'Tất cả khoa ban' : 'All departments',
        yearLabel: isVN ? 'Năm' : 'Year',
        allYears: isVN ? 'Tất cả năm' : 'All years',
        quarterLabel: isVN ? 'Quý' : 'Quarter',
        allQuarters: isVN ? 'Tất cả quý' : 'All quarters',
        selectedItems: isVN ? 'Đã chọn {n} sự kiện' : 'Selected {n} events',
        btnShowDashboard: isVN ? 'Xem phân tích Dashboard' : 'View Dashboard Analytics',
        tableMode: isVN ? 'Dạng bảng' : 'Table View',
        treeMode: isVN ? 'Cây sơ đồ' : 'Tree View',
        eventName: isVN ? 'Tên sự kiện' : 'Event Name',
        eventDate: isVN ? 'Ngày tổ chức' : 'Event Date',
        eventDept: isVN ? 'Khoa ban phụ trách' : 'Department',
        records: isVN ? 'Số bản ghi' : 'Records',
        noData: isVN ? 'Không có sự kiện nào được tìm thấy' : 'No events found',
        loading: isVN ? 'Đang tải...' : 'Loading events...'
    };

    const isCurrentPageAllSelected = events.length > 0 && events.map(e => e.id).every(id => selectedEventIds.includes(id));

    return (
        <div className="space-y-6 max-w-6xl mx-auto w-full animate-fade-in pb-20 relative">
            {/* Header and Toggle Mode */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[#00344c] flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#5B4B8A]" />
                        <span>{t.title}</span>
                    </h1>
                    <p className="text-xs text-[#72787e] mt-1">{t.subtitle}</p>
                </div>

                {/* Toggle Mode Buttons */}
                <div className="bg-[#E2E7EC] p-1 rounded-lg flex items-center self-start md:self-auto border border-[#DCE1E6] text-xs font-semibold shrink-0">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'table'
                            ? 'bg-white text-[#00344c] shadow-xs'
                            : 'text-[#41474d] hover:text-[#00344c]'
                            }`}
                    >
                        <Grid className="w-3.5 h-3.5" />
                        <span>{t.tableMode}</span>
                    </button>
                    <button
                        onClick={() => setViewMode('tree')}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${viewMode === 'tree'
                            ? 'bg-white text-[#00344c] shadow-xs'
                            : 'text-[#41474d] hover:text-[#00344c]'
                            }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{t.treeMode}</span>
                    </button>
                </div>
            </div>

            {/* Recommendation Preview Sandbox Panel */}
            <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs transition-all duration-300">
                <button
                    onClick={() => setSandboxOpen(!sandboxOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#EEF1F4]/30 transition-colors text-left focus:outline-none cursor-pointer"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#5B4B8A]" />
                        <span className="font-semibold text-sm text-[#00344c]">
                            {isVN ? '🔍 Thử nghiệm: Ai sẽ phù hợp cho sự kiện mới ?' : '🔍 Sandbox: Who would a new event match?'}
                        </span>
                    </div>
                    {sandboxOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#72787e]" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-[#72787e]" />
                    )}
                </button>

                {sandboxOpen && (
                    <div className="border-t border-[#EEF1F4] p-5 space-y-4 bg-[#F8FAFC]/50 text-left">
                        {/* Filters row: Tags selector & minOverlap and action button */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            {/* Autocomplete Tag Selector */}
                            <div className="md:col-span-3 space-y-1.5 relative">
                                <label className="text-xs font-bold text-[#72787e] block">
                                    {isVN ? 'Nhãn chủ đề sự kiện thử nghiệm (Gõ chọn hoặc tự nhập):' : 'Topic tags for sandbox event (Search or type):'}
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-[#DCE1E6] rounded-lg min-h-[36px] items-center shadow-3xs">
                                    {sandboxTags.map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 animate-fade-in">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => setSandboxTags(sandboxTags.filter(t => t !== tag))}
                                                className="text-indigo-400 hover:text-indigo-700 focus:outline-none cursor-pointer"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => {
                                            setTagInput(e.target.value);
                                            setShowTagSuggestions(true);
                                        }}
                                        onFocus={() => setShowTagSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 250)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && tagInput.trim()) {
                                                e.preventDefault();
                                                const val = tagInput.trim();
                                                if (!sandboxTags.includes(val)) {
                                                    setSandboxTags([...sandboxTags, val]);
                                                }
                                                setTagInput('');
                                            }
                                        }}
                                        placeholder={isVN ? 'Gõ và Enter hoặc chọn gợi ý...' : 'Type & Enter or select suggestion...'}
                                        className="flex-1 bg-transparent border-none text-xs focus:outline-none p-0 min-w-[120px]"
                                    />
                                </div>
                                {showTagSuggestions && popularTags.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#DCE1E6] rounded-lg shadow-md z-30 max-h-40 overflow-y-auto">
                                        {popularTags
                                            .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !sandboxTags.includes(t))
                                            .map(t => (
                                                <div
                                                    key={t}
                                                    onMouseDown={() => {
                                                        setSandboxTags([...sandboxTags, t]);
                                                        setTagInput('');
                                                        setShowTagSuggestions(false);
                                                    }}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs transition-colors"
                                                >
                                                    {t}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Match Count */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#72787e] block">
                                    {isVN ? 'Độ khớp tối thiểu:' : 'Minimum Overlap:'}
                                </label>
                                <select
                                    value={minOverlap}
                                    onChange={(e) => setMinOverlap(Number(e.target.value))}
                                    className="w-full bg-white border border-[#DCE1E6] rounded-lg px-3 py-2 text-xs font-medium text-[#1b2b36] outline-none shadow-3xs cursor-pointer focus:border-[#5B4B8A]"
                                >
                                    <option value={1}>{isVN ? 'Khớp ≥ 1 tag' : 'Overlap ≥ 1 tag'}</option>
                                    <option value={2}>{isVN ? 'Khớp ≥ 2 tags' : 'Overlap ≥ 2 tags'}</option>
                                    <option value={3}>{isVN ? 'Khớp ≥ 3 tags' : 'Overlap ≥ 3 tags'}</option>
                                </select>
                            </div>

                            {/* Actions button */}
                            <div>
                                <button
                                    onClick={() => handleRunPreview(0)}
                                    disabled={sandboxLoading}
                                    className="w-full bg-[#5B4B8A] hover:bg-[#6D5D9E] active:bg-[#4E3E75] text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 min-h-[36px]"
                                >
                                    {sandboxLoading ? (
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-white" />
                                    ) : (
                                        <Search className="w-3.5 h-3.5" />
                                    )}
                                    <span>{isVN ? 'Xem thử' : 'Preview'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Error box */}
                        {sandboxError && (
                            <div className="p-3 bg-red-50 text-red-500 rounded-lg text-xs font-medium border border-red-200">
                                {sandboxError}
                            </div>
                        )}

                        {/* Sandbox Results Cards */}
                        {sandboxResults.length > 0 ? (
                            <div className="space-y-3 pt-3 border-t border-[#EEF1F4]">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <h3 className="text-xs font-bold text-[#00344c] flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-[#5B4B8A]" />
                                        <span>
                                            {isVN
                                                ? `Gợi ý được ${sandboxTotalElements} khách mời phù hợp nhất:`
                                                : `Found ${sandboxTotalElements} matches:`}
                                        </span>
                                    </h3>

                                    {/* Display Layout Switcher */}
                                    <div className="bg-[#E2E7EC] p-0.5 rounded-lg flex items-center border border-[#DCE1E6] text-[10px] font-semibold self-start sm:self-auto shrink-0 select-none">
                                        <button
                                            onClick={() => {
                                                setSandboxLayout('gallery');
                                                handleRunPreview(0, 'gallery');
                                            }}
                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${sandboxLayout === 'gallery'
                                                ? 'bg-white text-[#00344c] shadow-xs'
                                                : 'text-[#41474d] hover:text-[#00344c]'
                                                }`}
                                        >
                                            {isVN ? 'Dạng lưới (6)' : 'Gallery (6)'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSandboxLayout('list');
                                                handleRunPreview(0, 'list');
                                            }}
                                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${sandboxLayout === 'list'
                                                ? 'bg-white text-[#00344c] shadow-xs'
                                                : 'text-[#41474d] hover:text-[#00344c]'
                                                }`}
                                        >
                                            {isVN ? 'Danh sách (10)' : 'List (10)'}
                                        </button>
                                    </div>
                                </div>

                                {sandboxLayout === 'list' ? (
                                    <div className="flex flex-col gap-2.5 animate-fade-in">
                                        {sandboxResults.map(guest => {
                                            const isContacted = contactedMap[guest.resolvedPersonId]
                                                ? contactedMap[guest.resolvedPersonId] === 'DA_LIEN_HE'
                                                : guest.followUpStatus === 'DA_LIEN_HE';

                                            return (
                                                <div key={guest.resolvedPersonId} className="bg-white border border-[#DCE1E6] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs hover:shadow-2xs transition-all text-left">
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-1 min-w-0">
                                                        <div className="font-semibold text-xs text-[#0f1d28] truncate hover:text-[#5B4B8A] cursor-pointer min-w-[120px]" onClick={() => navigate(`/attendee-detail/${guest.resolvedPersonId}`)}>
                                                            {guest.fullName}
                                                        </div>
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-250 shrink-0 select-none">
                                                            {guest.matchCount} tag
                                                        </span>
                                                        <p className="text-[10px] text-[#72787e] font-medium truncate max-w-[200px]">
                                                            {guest.organizationName || (isVN ? '(Không có tổ chức)' : '(No Organization)')}
                                                        </p>
                                                        <p className="text-[10px] text-[#5B4B8A] bg-indigo-50/40 px-2 py-0.5 rounded-md italic font-semibold border border-indigo-100/50 truncate max-w-[280px]">
                                                            {guest.reason}
                                                        </p>
                                                        <p className="text-[9px] text-[#72787e] font-mono shrink-0">
                                                            {isVN ? `Đã dự: ${guest.totalEventsAttended} sự kiện` : `Attended: ${guest.totalEventsAttended} events`}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#EEF1F4]/75">
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isContacted
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-orange-50 text-orange-700 border-orange-200'
                                                            }`}>
                                                            {isContacted
                                                                ? (isVN ? 'Đã liên hệ' : 'Contacted')
                                                                : (isVN ? 'Chưa liên hệ' : 'Not Contacted')}
                                                        </span>

                                                        <button
                                                            onClick={() => handleToggleContactStatus(guest.resolvedPersonId, isContacted ? 'DA_LIEN_HE' : 'CHUA_LIEN_HE')}
                                                            className="text-[10px] text-[#5B4B8A] hover:text-[#4E3E75] font-bold hover:underline cursor-pointer focus:outline-none"
                                                        >
                                                            {isContacted
                                                                ? (isVN ? 'Đánh dấu chưa liên hệ' : 'Mark uncontacted')
                                                                : (isVN ? 'Đánh dấu đã liên hệ' : 'Mark contacted')}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                                        {sandboxResults.map(guest => {
                                            const isContacted = contactedMap[guest.resolvedPersonId]
                                                ? contactedMap[guest.resolvedPersonId] === 'DA_LIEN_HE'
                                                : guest.followUpStatus === 'DA_LIEN_HE';

                                            return (
                                                <div key={guest.resolvedPersonId} className="bg-white border border-[#DCE1E6] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-3xs hover:shadow-2xs transition-shadow text-left">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-semibold text-xs text-[#0f1d28] truncate hover:text-[#5B4B8A] cursor-pointer" onClick={() => navigate(`/attendee-detail/${guest.resolvedPersonId}`)}>
                                                                {guest.fullName}
                                                            </div>
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-250 select-none">
                                                                {guest.matchCount} tag
                                                            </span>
                                                        </div>

                                                        <p className="text-[10px] text-[#72787e] font-medium truncate">
                                                            {guest.organizationName || (isVN ? '(Không có tổ chức)' : '(No Organization)')}
                                                        </p>

                                                        <div className="flex flex-wrap gap-1">
                                                            {guest.matchedTags.map(tag => (
                                                                <span key={tag} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <p className="text-[10px] text-[#5B4B8A] bg-indigo-50/40 p-1.5 rounded-md italic font-semibold leading-relaxed border border-indigo-100/50">
                                                            {guest.reason}
                                                        </p>

                                                        <p className="text-[9px] text-[#72787e] font-mono">
                                                            {isVN ? `Đã dự: ${guest.totalEventsAttended} sự kiện` : `Attended: ${guest.totalEventsAttended} events`}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EEF1F4]/75">
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isContacted
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-orange-50 text-orange-700 border-orange-200'
                                                            }`}>
                                                            {isContacted
                                                                ? (isVN ? 'Đã liên hệ' : 'Contacted')
                                                                : (isVN ? 'Chưa liên hệ' : 'Not Contacted')}
                                                        </span>

                                                        <button
                                                            onClick={() => handleToggleContactStatus(guest.resolvedPersonId, isContacted ? 'DA_LIEN_HE' : 'CHUA_LIEN_HE')}
                                                            className="text-[10px] text-[#5B4B8A] hover:text-[#4E3E75] font-bold hover:underline cursor-pointer focus:outline-none"
                                                        >
                                                            {isContacted
                                                                ? (isVN ? 'Đánh dấu chưa liên hệ' : 'Mark uncontacted')
                                                                : (isVN ? 'Đánh dấu đã liên hệ' : 'Mark contacted')}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Sandbox Pagination */}
                                {sandboxTotalPages > 1 && (
                                    <div className="pt-2">
                                        <PaginationControls
                                            currentPage={sandboxPage + 1}
                                            totalPages={sandboxTotalPages}
                                            totalElements={sandboxTotalElements}
                                            pageSize={5}
                                            onPageChange={(p) => handleRunPreview(p - 1)}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            !sandboxLoading && sandboxTags.length > 0 && (
                                <div className="p-8 text-center text-xs text-[#72787e] border-t border-[#EEF1F4] bg-white rounded-lg select-none">
                                    {isVN ? 'Không tìm thấy khách mời nào phù hợp với bộ nhãn này.' : 'No matched candidates found for this set of tags.'}
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            {viewMode === 'table' ? (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#72787e]" />
                            <input
                                type="text"
                                placeholder={t.searchPlaceholder}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-[#1b4b66] focus:border-[#1b4b66] outline-none"
                            />
                        </div>

                        {/* Department Filter */}
                        <select
                            value={deptFilter}
                            onChange={e => setDeptFilter(e.target.value)}
                            className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg px-3 py-2 text-xs text-[#0f1d28] font-medium outline-none focus:border-[#1b4b66] cursor-pointer max-w-[170px]"
                        >
                            <option value="">{t.allDepts}</option>
                            {DEPARTMENTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>

                        {/* Year Filter */}
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                            className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg px-3 py-2 text-xs text-[#0f1d28] font-medium outline-none focus:border-[#1b4b66] cursor-pointer"
                        >
                            <option value="">{t.allYears}</option>
                            {YEARS.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        {/* Quarter Filter */}
                        <select
                            value={quarterFilter}
                            onChange={e => setQuarterFilter(e.target.value)}
                            className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg px-3 py-2 text-xs text-[#0f1d28] font-medium outline-none focus:border-[#1b4b66] cursor-pointer"
                        >
                            <option value="">{t.allQuarters}</option>
                            {QUARTERS.map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>

                        {/* Clear Filters or Refresh Button */}
                        {(search || deptFilter || yearFilter || quarterFilter) && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setDeptFilter('');
                                    setYearFilter('');
                                    setQuarterFilter('');
                                }}
                                className="p-2 text-[#72787e] hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title={isVN ? "Xoá bộ lọc" : "Clear filters"}
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Table Container */}
                    <div className="bg-white border border-[#DCE1E6] rounded-xl shadow-2xs overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-xs text-[#72787e] flex flex-col items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-[#5B4B8A]" />
                                <span>{t.loading}</span>
                            </div>
                        ) : error ? (
                            <div className="p-12 text-center text-xs text-red-500">{error}</div>
                        ) : events.length === 0 ? (
                            <div className="p-12 text-center text-xs text-[#72787e]">{t.noData}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[#EEF1F4]/70 border-b border-[#DCE1E6] text-[#72787e] uppercase font-mono font-semibold select-none">
                                            <th className="py-3 px-4 w-12 text-center">
                                                <button
                                                    onClick={handleSelectPageAll}
                                                    className="text-[#72787e] hover:text-[#00344c] cursor-pointer"
                                                    title={isVN ? "Chọn tất cả trang này" : "Select all this page"}
                                                >
                                                    {isCurrentPageAllSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-[#5B4B8A]" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-[#72787e]" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3 px-4">{t.eventName}</th>
                                            <th className="py-3 px-4 w-32">{t.eventDate}</th>
                                            <th className="py-3 px-4 w-48">{t.eventDept}</th>
                                            <th className="py-3 px-4 w-28 text-center">{t.records}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EEF1F4]">
                                        {events.map(event => {
                                            const isSelected = selectedEventIds.includes(event.id);
                                            return (
                                                <tr
                                                    key={event.id}
                                                    className={`hover:bg-[#F8FAFC] transition-colors ${isSelected ? 'bg-[#5B4B8A]/5 font-semibold text-[#00344c]' : ''
                                                        }`}
                                                >
                                                    <td className="py-3 px-4 text-center">
                                                        <button
                                                            onClick={() => onToggleSelectEvent(event.id)}
                                                            className="cursor-pointer"
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="w-4 h-4 text-[#5B4B8A]" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-[#72787e]" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div
                                                            onClick={() => navigate(`/event-detail/${event.id}`)}
                                                            className="font-semibold text-[#0f1d28] hover:text-[#5B4B8A] cursor-pointer flex items-center gap-1.5 truncate max-w-md"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-[#72787e]" />
                                                            <span title={event.eventName}>{event.eventName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-[#72787e] font-mono">
                                                        {event.eventDate || '—'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="bg-[#E2E7EC] text-[#41474d] px-2 py-0.5 rounded text-[10px] font-bold">
                                                            {event.department || 'Chưa phân loại'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono font-medium text-[#72787e]">
                                                        {event.rawEventCount}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination controls helper */}
                        <PaginationControls
                            currentPage={page + 1}
                            totalPages={totalPages}
                            totalElements={totalElements}
                            pageSize={pageSize}
                            onPageChange={(p) => setPage(p - 1)}
                        />
                    </div>
                </div>
            ) : (
                /* Tree Layout Mode */
                <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs max-w-lg mx-auto w-full">
                    <p className="text-xs text-[#72787e] mb-4 text-center font-medium">
                        {isVN
                            ? 'Nhấp chuột vào từng thẻ sự kiện cuối trong sơ đồ cây dưới đây để tích chọn nhanh sự kiện.'
                            : 'Click on each end-event node in the source tree diagram below to quick select events.'
                        }
                    </p>
                    <SourceTree
                        selectedSourceId=""
                        onSelectSource={onToggleSelectEvent}
                        selectedEventIds={selectedEventIds}
                        language={language}
                        mode="tree"
                    />
                </div>
            )}

            {/* Floating Action Dock at Bottom */}
            {selectedEventIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#00344c] text-white border border-[#1b4b66] shadow-xl px-4 py-3 rounded-full flex items-center justify-between gap-6 z-50 animate-bounce-in min-w-[340px] sm:min-w-[420px]">
                    <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 font-mono ml-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>{t.selectedItems.replace('{n}', selectedEventIds.length.toString())}</span>
                    </span>

                    <button
                        onClick={onNavigateToDashboard}
                        className="bg-[#5B4B8A] hover:bg-[#6D5D9E] active:bg-[#4E3E75] text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                        <span>{t.btnShowDashboard}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
};
