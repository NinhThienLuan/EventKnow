import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Calendar,
    Building,
    Tag,
    FileSpreadsheet,
    Users,
    Search,
    ChevronRight,
    TrendingUp,
    UserCheck,
    AlertTriangle,
    Loader2
} from 'lucide-react';

interface RawEventNode {
    rawEventId: string;
    eventName: string;
    sourceType: string;
    sourceFileName: string;
    sheetName: string;
    driveFolderPath: string;
}

interface AttendeeRow {
    attendeeProfileId: string;
    fullName: string;
    email: string;
    organizationName: string;
    attendeeRole: string;
    sourceType: string;
    isDeletedInSource: boolean;
}

interface EventDetail {
    eventId: string;
    eventName: string;
    eventDate: string;
    department: string;
    topicTags: string[];
    rawEvents: RawEventNode[];
    attendees: AttendeeRow[];
}

interface CoAttendeeDto {
    coAttendeeId: string;
    fullName: string;
    organizationName: string;
    coAttendedCount: number;
}

interface EventDetailViewProps {
    eventId: string;
    language: 'VN' | 'EN';
    onBack: () => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
    eventId,
    language,
    onBack
}) => {
    const isVN = language === 'VN';

    // State definitions
    const [detail, setDetail] = useState<EventDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Co-attendee Inspector State
    const [selectedAttendee, setSelectedAttendee] = useState<AttendeeRow | null>(null);
    const [coAttendees, setCoAttendees] = useState<CoAttendeeDto[]>([]);
    const [coLoading, setCoLoading] = useState(false);
    const [coError, setCoError] = useState<string | null>(null);

    // Fetch Event Details
    useEffect(() => {
        if (!eventId) return;
        setLoading(true);
        setError(null);
        setSelectedAttendee(null);
        setCoAttendees([]);

        fetch(`/api/events/${eventId}`, { credentials: 'include' })
            .then(res => {
                if (res.status === 404) {
                    throw new Error(isVN ? 'Không tìm thấy sự kiện canonical.' : 'Canonical event not found.');
                }
                if (res.status === 403) {
                    throw new Error(isVN ? 'Bạn không có quyền truy cập sự kiện này.' : 'You do not have access to this event.');
                }
                return res.json();
            })
            .then(json => {
                if (json.status === 'success') {
                    setDetail(json.data);
                } else {
                    throw new Error(json.error || 'Failed to fetch details');
                }
            })
            .catch(err => {
                console.error(err);
                setError(err.message || 'Failed to load event detail');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [eventId, language]);

    // Fetch Co-attendees when an attendee is selected
    useEffect(() => {
        if (!selectedAttendee) {
            setCoAttendees([]);
            return;
        }
        setCoLoading(true);
        setCoError(null);

        fetch(`/api/attendees/${selectedAttendee.attendeeProfileId}/co-attendees`, { credentials: 'include' })
            .then(res => res.json())
            .then(json => {
                if (json.status === 'success') {
                    setCoAttendees(json.data || []);
                } else {
                    throw new Error(json.error || 'Failed to load co-attendees');
                }
            })
            .catch(err => {
                console.error(err);
                setCoError(err.message || 'Error occurred');
            })
            .finally(() => {
                setCoLoading(false);
            });
    }, [selectedAttendee]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
                <Loader2 className="w-8 h-8 text-[#1b4b66] animate-spin" />
                <p className="text-xs text-[#72787e] font-medium">{isVN ? 'Đang tải thông tin sự kiện...' : 'Loading event details...'}</p>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-xl mx-auto my-8">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-red-900 mb-1">{isVN ? 'Lỗi Tải Dữ Liệu' : 'Error Loading Data'}</h4>
                <p className="text-xs text-red-700 mb-4">{error}</p>
                <button
                    onClick={onBack}
                    className="px-4 py-1.5 bg-[#1b4b66] hover:bg-[#1b4b66]/90 text-white rounded text-xs font-semibold cursor-pointer"
                >
                    {isVN ? 'Quay lại danh sách' : 'Back to Dashboard'}
                </button>
            </div>
        );
    }

    // Filter attendees list
    const filteredAttendees = detail.attendees.filter(att => {
        const term = searchTerm.toLowerCase();
        return (
            att.fullName.toLowerCase().includes(term) ||
            att.email.toLowerCase().includes(term) ||
            att.organizationName.toLowerCase().includes(term) ||
            att.attendeeRole.toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto w-full animate-fade-in text-[#252a31]">
            {/* Title Header Bar */}
            <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#1b4b66] hover:underline cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>{isVN ? 'Quay lại' : 'Back'}</span>
                        </button>
                        <h1 className="text-lg font-bold text-[#00344c] leading-snug">{detail.eventName}</h1>
                        <div className="flex flex-wrap gap-2 text-xs text-[#72787e] font-mono">
                            <span className="flex items-center gap-1 bg-[#EEF1F4] px-2 py-0.5 rounded">
                                <Calendar className="w-3.5 h-3.5" />
                                {detail.eventDate}
                            </span>
                            <span className="flex items-center gap-1 bg-[#EEF1F4] px-2 py-0.5 rounded">
                                <Building className="w-3.5 h-3.5" />
                                {detail.department}
                            </span>
                        </div>
                    </div>

                    {/* Tags */}
                    {detail.topicTags && detail.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-w-sm justify-start md:justify-end">
                            {detail.topicTags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f4fd] text-[#1b4b66]">
                                    <Tag className="w-3 h-3 shrink-0" />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Grid View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Columns (Attendees Roster) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEF1F4] pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-[#1b4b66]" />
                                <h3 className="text-sm font-bold text-[#00344c]">
                                    {isVN ? `Danh Sách Tham Dự (${detail.attendees.length})` : `Attendees List (${detail.attendees.length})`}
                                </h3>
                            </div>

                            {/* Search Bar */}
                            <div className="relative max-w-xs w-full sm:w-60">
                                <Search className="w-3.5 h-3.5 text-[#8e9499] absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder={isVN ? 'Tìm kiếm khách mời...' : 'Search attendees...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1 text-xs bg-[#F8FAFC] border border-[#DCE1E6] rounded-lg focus:outline-none focus:border-[#1b4b66]"
                                />
                            </div>
                        </div>

                        {/* Attendees Output */}
                        {filteredAttendees.length === 0 ? (
                            <p className="text-xs text-[#72787e] italic py-4 text-center">
                                {isVN ? 'Không tìm thấy người tham dự phù hợp.' : 'No matching attendees found.'}
                            </p>
                        ) : (
                            <div className="divide-y divide-[#EEF1F4] max-h-[600px] overflow-y-auto pr-1">
                                {filteredAttendees.map(att => {
                                    const isSelected = selectedAttendee?.attendeeProfileId === att.attendeeProfileId;
                                    return (
                                        <div
                                            key={att.attendeeProfileId}
                                            onClick={() => setSelectedAttendee(att)}
                                            className={`flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${isSelected
                                                ? 'bg-[#EEF1F4] border-l-4 border-[#1b4b66]'
                                                : 'hover:bg-[#F8FAFC]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-[#e8f4fd] text-[#1b4b66] border border-[#DCE1E6] flex items-center justify-center text-xs font-semibold shrink-0">
                                                    {att.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-[#0f1d28] truncate">{att.fullName}</p>
                                                    <p className="text-[10px] text-[#72787e] truncate font-mono">{att.email || 'No email'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {att.organizationName && (
                                                    <span className="text-[10px] bg-white border border-[#DCE1E6] px-2 py-0.5 rounded text-[#41474d]">
                                                        {att.organizationName}
                                                    </span>
                                                )}
                                                <span className="text-[10px] bg-sky-50 text-[#1b4b66] font-medium px-2 py-0.5 rounded-full">
                                                    {att.attendeeRole}
                                                </span>

                                                {/* Source File Badge */}
                                                <span className="text-[9px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded">
                                                    {att.sourceType}
                                                </span>

                                                {/* Deleted in source indicator */}
                                                {att.isDeletedInSource && (
                                                    <span
                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-red-50 text-red-600 border border-red-200 font-semibold"
                                                        title={isVN ? 'Dòng dữ liệu này đã bị xóa/soft-delete trong file nguồn ban đầu' : 'Soft-deleted in source document'}
                                                    >
                                                        {isVN ? 'Đã xóa ở nguồn' : 'Deleted'}
                                                    </span>
                                                )}

                                                <ChevronRight className="w-3.5 h-3.5 text-[#8e9499]" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar (Source Files list & Co-attendee inspect pane) */}
                <div className="space-y-6">
                    {/* Source Files Section */}
                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3">
                        <h4 className="text-xs font-bold text-[#00344c] flex items-center gap-1.5 border-b border-[#EEF1F4] pb-2">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            {isVN ? 'Nguồn File Liên Kết' : 'Linked Source Files'}
                        </h4>
                        <div className="space-y-2">
                            {detail.rawEvents && detail.rawEvents.map(re => (
                                <div key={re.rawEventId} className="p-2.5 rounded-lg border border-[#DCE1E6] bg-[#F8FAFC] text-[11px] space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#0f1d28] truncate max-w-[170px]" title={re.eventName}>
                                            {re.eventName}
                                        </span>
                                        <span className="text-[8px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded shrink-0">
                                            {re.sourceType}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-[#72787e] font-mono break-all leading-tight">
                                        {re.sourceFileName} {re.sheetName ? `(Sheet: ${re.sheetName})` : ''}
                                    </p>
                                    {re.driveFolderPath && (
                                        <a
                                            href={re.driveFolderPath}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] text-[#1b4b66] font-mono hover:underline block break-all pt-0.5"
                                        >
                                            Drive Folder Path
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Co-attendee Inspector Section */}
                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-3 min-h-[260px] flex flex-col">
                        <h4 className="text-xs font-bold text-[#00344c] flex items-center gap-1.5 border-b border-[#EEF1F4] pb-2 shrink-0">
                            <TrendingUp className="w-4 h-4 text-[#5B4B8A]" />
                            {isVN ? 'Mạng Lưới Đồng Tham Dự (Top 10)' : 'Co-attendance Inspector (Top 10)'}
                        </h4>

                        {!selectedAttendee ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                <UserCheck className="w-8 h-8 text-[#8e9499] opacity-40 mb-2" />
                                <p className="text-[11px] text-[#72787e] italic">
                                    {isVN ? 'Chọn một vị khách trong danh sách bên trái để tra cứu mạng lưới co-attendees.' : 'Select an attendee to build co-attendance overlapping context.'}
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0 space-y-3">
                                <div className="bg-[#EEF1F4]/50 p-2.5 rounded-lg border border-[#DCE1E6]/50">
                                    <p className="text-[10px] uppercase font-bold text-[#72787e] tracking-wider">{isVN ? 'Đang tra cứu cho' : 'Inspecting for'}</p>
                                    <p className="text-xs font-bold text-[#0f1d28]">{selectedAttendee.fullName}</p>
                                    <p className="text-[10px] text-[#555a60] truncate">{selectedAttendee.organizationName || 'Không rõ đơn vị'}</p>
                                </div>

                                {coLoading && (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-[#5B4B8A] animate-spin" />
                                    </div>
                                )}

                                {coError && (
                                    <p className="text-xs text-red-500 italic py-2">{coError}</p>
                                )}

                                {!coLoading && !coError && coAttendees.length === 0 && (
                                    <p className="text-xs text-[#72787e] italic py-4 text-center">
                                        {isVN ? 'Không tìm thấy mối liên hệ đồng tham dự.' : 'No co-attendees found.'}
                                    </p>
                                )}

                                {!coLoading && !coError && coAttendees.length > 0 && (
                                    <div className="flex-1 overflow-y-auto divide-y divide-[#EEF1F4] min-h-[220px] max-h-[350px] pr-0.5">
                                        {coAttendees.map(co => (
                                            <div key={co.coAttendeeId} className="flex items-center justify-between py-2 text-[11px]">
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-[#0f1d28] truncate">{co.fullName}</p>
                                                    <p className="text-[9px] text-[#72787e] truncate">{co.organizationName || ''}</p>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-1">
                                                    <span className="font-mono font-bold text-[#5B4B8A] text-xs bg-[#5B4B8A]/10 px-1.5 py-0.5 rounded">
                                                        {co.coAttendedCount}
                                                    </span>
                                                    <span className="text-[9px] text-[#72787e]">{isVN ? 'sk chung' : 'shared'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
