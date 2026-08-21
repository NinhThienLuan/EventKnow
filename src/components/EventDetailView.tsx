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
    X,
    Mail,
    Phone,
    FileText,
    Building2,
    Plus,
    CheckCircle2,
    Loader2,
    MessageSquare,
    Activity,
    Layers,
    Printer,
    BarChart3,
    Shield
} from 'lucide-react';
import { updateAttendeeStatus } from '../lib/identityApi';
import { fetchDashboardAggregate } from '../lib/dashboardApi';
import { updateEventTopicTags, fetchPopularTags } from '../lib/recommendationApi';
import { DashboardAggregate } from '../types';



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

    // Editing topic tags states
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [editingTagsList, setEditingTagsList] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [popularTagsList, setPopularTagsList] = useState<string[]>([]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Attendee Inspector Detail State
    const [selectedAttendee, setSelectedAttendee] = useState<AttendeeRow | null>(null);
    const [inspectorProfile, setInspectorProfile] = useState<any | null>(null);
    const [inspectorLoading, setInspectorLoading] = useState(false);
    const [inspectorError, setInspectorError] = useState<string | null>(null);

    // Tabs state
    const [activeTab, setActiveTab] = useState<'members' | 'analytics'>('members');

    // Scoped Analytics State
    const [analyticsData, setAnalyticsData] = useState<DashboardAggregate | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);

    // Profile Inspector State
    const [inspectedGuestId, setInspectedGuestId] = useState<string | null>(null);
    const [inspectedProfile, setInspectedProfile] = useState<any | null>(null);
    const [inspectedLoading, setInspectedLoading] = useState(false);
    const [inspectedError, setInspectedError] = useState<string | null>(null);


    // Load single event dashboard analytics
    useEffect(() => {
        if (activeTab === 'analytics' && eventId) {
            setAnalyticsLoading(true);
            setAnalyticsError(null);
            fetchDashboardAggregate({ eventIds: [eventId] })
                .then(data => {
                    setAnalyticsData(data);
                })
                .catch(err => {
                    console.error("Error loading event analytics:", err);
                    setAnalyticsError(err.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : (err.message || 'Lỗi tải dữ liệu.'));
                })
                .finally(() => {
                    setAnalyticsLoading(false);
                });
        }
    }, [activeTab, eventId]);


    const handleOpenInspectModal = (id: string) => {
        setInspectedGuestId(id);
        setInspectedLoading(true);
        setInspectedError(null);
        setInspectedProfile(null);

        fetch(`/api/attendees/${id}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) {
                    if (res.status === 403) {
                        throw new Error("ACCESS_DENIED");
                    }
                    throw new Error("Failed to load profile details");
                }
                return res.json();
            })
            .then(json => {
                if (json.status === 'success') {
                    setInspectedProfile(json.data);
                } else {
                    throw new Error(json.error || "Failed loading data");
                }
            })
            .catch(err => {
                console.error(err);
                if (err.message === "ACCESS_DENIED") {
                    setInspectedError(isVN ? "Bạn không có quyền xem thông tin này." : "Access Denied.");
                } else {
                    setInspectedError(err.message || "Error");
                }
            })
            .finally(() => {
                setInspectedLoading(false);
            });
    };


    // Fetch Event Details
    useEffect(() => {
        if (!eventId) return;
        setLoading(true);
        setError(null);
        setSelectedAttendee(null);
        setInspectorProfile(null);

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

    // Fetch popular tags on demand for autocomplete edit suggestions
    useEffect(() => {
        if (isEditingTags && popularTagsList.length === 0) {
            fetchPopularTags()
                .then(tags => setPopularTagsList(tags || []))
                .catch(err => console.error("Failed to load popular tags:", err));
        }
    }, [isEditingTags, popularTagsList.length]);

    // Tag autocomplete suggestions logic
    useEffect(() => {
        if (!newTagInput.trim()) {
            setTagSuggestions([]);
            return;
        }
        const query = newTagInput.toLowerCase();
        const matches = popularTagsList.filter(tag =>
            tag.toLowerCase().includes(query) &&
            !editingTagsList.includes(tag)
        ).slice(0, 10);
        setTagSuggestions(matches);
    }, [newTagInput, popularTagsList, editingTagsList]);

    const handleAddEditingTag = (tag: string) => {
        const cleanTag = tag.trim();
        if (!cleanTag) return;

        // Deduplicate case-insensitively
        const hasDuplicate = editingTagsList.some(t => t.toLowerCase() === cleanTag.toLowerCase());
        if (hasDuplicate) {
            setNewTagInput('');
            setShowSuggestions(false);
            return;
        }

        if (editingTagsList.length >= 20) {
            setSaveError(isVN ? 'Tối đa 20 chủ đề (topic tags).' : 'Maximum of 20 topic tags.');
            return;
        }
        setEditingTagsList([...editingTagsList, cleanTag]);
        setNewTagInput('');
        setShowSuggestions(false);
        setSaveError(null);
    };

    const handleRemoveEditingTag = (tag: string) => {
        setEditingTagsList(editingTagsList.filter(t => t !== tag));
        setSaveError(null);
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddEditingTag(newTagInput);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleSaveTopicTags = async () => {
        if (!detail) return;
        if (editingTagsList.length === 0) {
            setSaveError(isVN ? 'Danh sách chủ đề không được để trống.' : 'Topic tags cannot be empty.');
            return;
        }
        setSaveLoading(true);
        setSaveError(null);
        try {
            await updateEventTopicTags(detail.eventId, editingTagsList);
            // Update local state detail
            setDetail({
                ...detail,
                topicTags: editingTagsList
            });
            setIsEditingTags(false);
        } catch (err: any) {
            console.error("Save error:", err);
            setSaveError(err.message || 'Lỗi lưu chủ đề.');
        } finally {
            setSaveLoading(false);
        }
    };

    // Fetch Attendee Profile details when selected
    useEffect(() => {
        if (!selectedAttendee) {
            setInspectorProfile(null);
            return;
        }
        setInspectorLoading(true);
        setInspectorError(null);

        fetch(`/api/attendees/${selectedAttendee.attendeeProfileId}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) {
                    throw new Error(isVN ? 'Không thể tải thông tin chi tiết.' : 'Failed to load details.');
                }
                return res.json();
            })
            .then(json => {
                if (json.status === 'success') {
                    setInspectorProfile(json.data || null);
                } else {
                    throw new Error(json.error || 'Failed to parse payload');
                }
            })
            .catch(err => {
                console.error(err);
                setInspectorError(err.message || 'Error occurred');
            })
            .finally(() => {
                setInspectorLoading(false);
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

                    {/* Tags Section with Edit Option */}
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        {isEditingTags ? (
                            <div className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl p-3 max-w-sm w-full space-y-2 relative text-left">
                                <div className="flex items-center justify-between gap-2 border-b border-[#EEF1F4] pb-1.5">
                                    <span className="text-[10px] font-bold text-[#00344c] uppercase tracking-wider">{isVN ? 'Sửa Chủ Đề Gợi Ý' : 'Edit Topic Tags'}</span>
                                    <button
                                        className="text-[#72787e] hover:text-[#0f1d28] p-0.5 cursor-pointer"
                                        onClick={() => {
                                            setIsEditingTags(false);
                                            setSaveError(null);
                                        }}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {saveError && (
                                    <p className="text-[10px] text-red-500 font-medium">{saveError}</p>
                                )}

                                <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto border border-[#DCE1E6] p-1.5 rounded bg-white w-full">
                                    {editingTagsList.map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#e8f4fd] text-[#1b4b66] text-[9px] font-semibold border border-[#cce4f7]">
                                            <span>{tag}</span>
                                            <button
                                                onClick={() => handleRemoveEditingTag(tag)}
                                                className="text-[#1b4b66] hover:text-red-500 font-bold ml-0.5 hover:underline focus:outline-none cursor-pointer"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                    {editingTagsList.length === 0 && (
                                        <span className="text-[10px] text-[#8e9499] italic">{isVN ? 'Chưa chọn tag nào...' : 'No tags selected...'}</span>
                                    )}
                                </div>

                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={isVN ? 'Nhập tag và Enter hoặc chọn dưới...' : 'Type tag and Enter...'}
                                        value={newTagInput}
                                        onChange={(e) => {
                                            setNewTagInput(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onKeyDown={handleTagInputKeyDown}
                                        className="w-full px-2 py-1 text-[11px] border border-[#DCE1E6] rounded focus:outline-none focus:border-[#5B4B8A] bg-white font-medium text-[#252a31]"
                                    />

                                    {/* Recommendations dropdown */}
                                    {showSuggestions && tagSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#DCE1E6] rounded-md shadow-lg z-30 max-h-[120px] overflow-y-auto divide-y divide-[#EEF1F4]">
                                            {tagSuggestions.map(tag => (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => handleAddEditingTag(tag)}
                                                    className="w-full text-left px-2.5 py-1 text-[10px] text-[#41474d] hover:bg-[#EEF1F4] hover:text-[#00344c] font-medium cursor-pointer"
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-1.5 pt-1.5 border-t border-[#EEF1F4]">
                                    <button
                                        onClick={() => {
                                            setIsEditingTags(false);
                                            setSaveError(null);
                                        }}
                                        className="px-2 py-1 border border-[#DCE1E6] text-[#41474d] hover:bg-gray-50 rounded text-[10px] font-bold cursor-pointer"
                                    >
                                        {isVN ? 'Hủy' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={handleSaveTopicTags}
                                        disabled={saveLoading}
                                        className="px-2.5 py-1 bg-[#1b4b66] hover:bg-[#1b4b66]/90 text-white rounded text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                    >
                                        {saveLoading && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                        <span>{isVN ? 'Lưu' : 'Save'}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-start md:items-end gap-1.5">
                                <div className="flex flex-wrap gap-1.5 max-w-sm justify-start md:justify-end">
                                    {detail.topicTags && detail.topicTags.length > 0 ? (
                                        detail.topicTags.map(tag => (
                                            <span key={tag} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e8f4fd] text-[#1b4b66] border border-[#cce4f7]">
                                                <Tag className="w-3 h-3 shrink-0" />
                                                {tag}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-[#72787e] italic">{isVN ? 'Chưa có chủ đề nào' : 'No topic tags defined'}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingTagsList(detail.topicTags || []);
                                        setIsEditingTags(true);
                                    }}
                                    className="text-[10px] text-[#1b4b66] hover:text-[#1b4b66]/85 font-black hover:underline cursor-pointer flex items-center gap-1 select-none"
                                >
                                    <span>{isVN ? '✏️ Sửa chủ đề' : '✏️ Edit topics'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-[#DCE1E6] gap-6 text-sm font-semibold pb-1 no-print">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`pb-3 px-1 transition-colors cursor-pointer border-b-2 font-bold ${activeTab === 'members'
                        ? 'border-[#1b4b66] text-[#00344c]'
                        : 'border-transparent text-[#72787e] hover:text-[#00344c]'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {isVN ? 'Thành viên tham gia' : 'Members'}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`pb-3 px-1 transition-colors cursor-pointer border-b-2 font-bold ${activeTab === 'analytics'
                        ? 'border-[#1b4b66] text-[#00344c]'
                        : 'border-transparent text-[#72787e] hover:text-[#00344c]'
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        {isVN ? 'Bảng số liệu' : 'Analytics'}
                    </span>
                </button>
            </div>

            {activeTab === 'members' && (
                <div className="space-y-4">
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
                                                            <p
                                                                className="text-xs font-bold text-[#0f1d28] truncate hover:text-[#1b4b66] hover:underline cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenInspectModal(att.attendeeProfileId);
                                                                }}
                                                            >
                                                                {att.fullName}
                                                            </p>
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

                            {/* Attendee Inspector Section */}
                            <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-4 min-h-[260px] flex flex-col">
                                <h4 className="text-xs font-bold text-[#00344c] flex items-center gap-1.5 border-b border-[#EEF1F4] pb-2 shrink-0">
                                    <Users className="w-4 h-4 text-[#1b4b66]" />
                                    {isVN ? 'Thông Tin Chi Tiết Đại Biểu' : 'Attendee Details'}
                                </h4>

                                {!selectedAttendee ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                        <UserCheck className="w-8 h-8 text-[#8e9499] opacity-40 mb-2" />
                                        <p className="text-[11px] text-[#72787e] italic">
                                            {isVN ? 'Chọn một vị khách trong danh sách bên trái để xem thông tin chi tiết.' : 'Select an attendee on the left to view detailed profile info.'}
                                        </p>
                                    </div>
                                ) : inspectorLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2 shrink-0">
                                        <Loader2 className="w-6 h-6 text-[#1b4b66] animate-spin" />
                                        <p className="text-[10px] text-[#72787e]">{isVN ? 'Đang tải chi tiết hồ sơ...' : 'Loading profile details...'}</p>
                                    </div>
                                ) : inspectorError ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-red-500 gap-1">
                                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                                        <p className="text-xs font-bold">{isVN ? 'Không thể tải hồ sơ' : 'Failed to load profile'}</p>
                                        <p className="text-[10px] text-[#72787e]">{inspectorError}</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col min-h-0 space-y-4 font-body animate-fade-in">
                                        {/* Header Section */}
                                        <div className="bg-[#EEF1F4]/50 p-3 rounded-lg border border-[#DCE1E6]/50 space-y-1">
                                            <h4 className="text-xs font-black text-[#00344c]">{selectedAttendee.fullName}</h4>
                                            <p className="text-[10px] font-semibold text-[#72787e]">
                                                {selectedAttendee.organizationName || (inspectorProfile && inspectorProfile.organizationName) || (isVN ? 'Không rõ cơ quan' : 'Unknown Org')}
                                            </p>
                                        </div>

                                        {/* Basic Information */}
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-mono font-bold text-[#72787e] uppercase tracking-wider">{isVN ? 'THÔNG TIN CƠ BẢN' : 'BASIC INFORMATION'}</h5>
                                            <div className="space-y-1.5 text-[#41474d] text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-[#8e9499] shrink-0" />
                                                    <span className="font-mono truncate">{selectedAttendee.email || (inspectorProfile && inspectorProfile.email) || 'N/A'}</span>
                                                </div>
                                                {inspectorProfile && inspectorProfile.phone && (
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 text-[#8e9499] shrink-0" />
                                                        <span className="font-mono">{inspectorProfile.phone}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3.5 h-3.5 text-[#8e9499] shrink-0" />
                                                    <span className="truncate">
                                                        {selectedAttendee.organizationName || (inspectorProfile && inspectorProfile.organizationName) || (isVN ? 'Không có thông tin' : 'No Org metadata')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Event particulars */}
                                        <div className="space-y-3 min-h-0 flex-1 flex flex-col">
                                            <h5 className="text-[10px] font-mono font-bold text-[#72787e] uppercase tracking-wider border-b border-[#EEF1F4] pb-1 shrink-0">
                                                {isVN ? 'CHI TIẾT SỰ KIỆN NÀY' : 'PARTICULARS IN THIS EVENT'}
                                            </h5>
                                            <div className="space-y-2 text-xs flex-1 flex flex-col min-h-0">
                                                <div className="flex justify-between items-center bg-[#F8FAFC] border border-[#EEF1F4] p-2 rounded-lg shrink-0">
                                                    <span className="text-[#72787e]">{isVN ? 'Vai trò:' : 'Role:'}</span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#edf4ff] text-[#00344c]">
                                                        {selectedAttendee.attendeeRole || (isVN ? 'Đại biểu' : 'Delegate')}
                                                    </span>
                                                </div>

                                                {/* File/Sheet scoped info */}
                                                {(() => {
                                                    const currentEventSheet = inspectorProfile?.sourceSheets?.find(
                                                        (s: any) => s.eventName?.toLowerCase() === detail?.eventName?.toLowerCase()
                                                    );

                                                    if (!currentEventSheet) return (
                                                        <div className="flex justify-between items-center bg-[#F8FAFC] border border-[#EEF1F4] p-2 rounded-lg shrink-0">
                                                            <span className="text-[#72787e]">{isVN ? 'Nguồn gốc:' : 'Source Type:'}</span>
                                                            <span className="font-mono text-[10px] font-bold text-[#41474d] flex items-center gap-1">
                                                                <FileSpreadsheet className="w-3.5 h-3.5 text-[#1b4b66]" />
                                                                {selectedAttendee.sourceType}
                                                            </span>
                                                        </div>
                                                    );

                                                    return (
                                                        <div className="flex-1 flex flex-col min-h-0 space-y-2">
                                                            <div className="bg-[#F8FAFC] border border-[#EEF1F4] p-2.5 rounded-lg text-[11px] text-[#41474d] space-y-1 shrink-0">
                                                                <div className="flex justify-between items-center font-semibold text-[#00344c] border-b border-gray-100 pb-1 mb-1">
                                                                    <span>{isVN ? 'Liên kết sheet nguồn:' : 'Source Link:'}</span>
                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-mono font-bold uppercase">
                                                                        {currentEventSheet.attendanceStatus || 'CONFIRMED'}
                                                                    </span>
                                                                </div>
                                                                <p className="font-mono text-[10px] leading-tight break-all">
                                                                    File: <code className="bg-gray-100 px-1 py-0.2 rounded text-[10px]">{currentEventSheet.fileName || 'N/A'}</code>
                                                                </p>
                                                                <p className="font-mono text-[10px]">
                                                                    Sheet: <code className="bg-gray-100 px-1 py-0.2 rounded text-[10px]">{currentEventSheet.sheetName || 'N/A'}</code>
                                                                </p>
                                                            </div>

                                                            {/* Render Event Attributes scoped to snapshotData */}
                                                            {currentEventSheet.snapshotData && Object.keys(currentEventSheet.snapshotData).length > 0 && (
                                                                <div className="flex-1 flex flex-col min-h-0 space-y-2 mt-2 pt-2 border-t border-[#EEF1F4]">
                                                                    <span className="text-[10px] font-mono font-bold text-[#72787e] uppercase tracking-wider block shrink-0">
                                                                        {isVN ? 'THUỘC TÍNH SỰ KIỆN' : 'EVENT ATTRIBUTES'}
                                                                    </span>
                                                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[300px]">
                                                                        {Object.entries(currentEventSheet.snapshotData)
                                                                            .filter(([key]) => ![
                                                                                'extracted_full_name',
                                                                                'extracted_email',
                                                                                'extracted_phone',
                                                                                'extracted_academic_title_raw',
                                                                                'source_row_number',
                                                                                'raw_event_id',
                                                                                'is_deleted_in_source'
                                                                            ].includes(key))
                                                                            .map(([key, val]) => (
                                                                                <div key={key} className="bg-[#EEF1F4]/40 p-2 rounded border border-[#DCE1E6]/50 space-y-0.5">
                                                                                    <p className="text-[9px] font-bold text-[#72787e] uppercase font-mono tracking-wide leading-tight">{key}</p>
                                                                                    <p className="text-[11px] font-semibold text-[#0f1d28] whitespace-pre-wrap leading-snug">{String(val || '')}</p>
                                                                                </div>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {selectedAttendee.isDeletedInSource && (
                                                    <div className="flex items-start gap-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[10.5px] shrink-0">
                                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                        <span>
                                                            {isVN
                                                                ? 'Đăng ký đã bị đánh dấu xóa hoặc không tồn tại trong sheet nguồn gốc.'
                                                                : 'Registration marked as deleted/missing in original sheet.'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {
                activeTab === 'analytics' && (
                    <div className="space-y-6">
                        {analyticsLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="w-8 h-8 text-[#1b4b66] animate-spin" />
                                <p className="text-xs font-semibold text-[#72787e]">{isVN ? 'Đang tổng hợp dữ liệu thống kê...' : 'Aggregating event analytics...'}</p>
                            </div>
                        ) : analyticsError ? (
                            <div className="p-8 bg-white border border-[#DCE1E6] rounded-xl text-center space-y-3">
                                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                                <p className="text-xs text-[#72787e]">{analyticsError}</p>
                            </div>
                        ) : analyticsData ? (
                            <div className="space-y-6 animate-fade-in pb-8">
                                {/* Key Stats Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 hover:border-[#1b4b66] transition-all">
                                        <div className="flex items-center justify-between text-[#72787e]">
                                            <span className="text-[10px] font-mono font-bold uppercase">{isVN ? 'TỔNG LƯỢT ĐẠI BIỂU' : 'TOTAL DELEGATES'}</span>
                                            <Users className="w-4 h-4 text-[#1b4b66]" />
                                        </div>
                                        <div className="text-3xl font-bold font-display text-[#00344c]">
                                            {(analyticsData.summary?.totalAttendees || 0).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 hover:border-[#5B4B8A] transition-all">
                                        <div className="flex items-center justify-between text-[#72787e]">
                                            <span className="text-[10px] font-mono font-bold uppercase">{isVN ? 'TỔ CHỨC ĐỒNG HÀNH' : 'LINKED ORGS'}</span>
                                            <Building2 className="w-4 h-4 text-[#5B4B8A]" />
                                        </div>
                                        <div className="text-3xl font-bold font-display text-[#00344c]">
                                            {analyticsData.summary?.uniqueOrganizations || 0}
                                        </div>
                                    </div>

                                    <div className="bg-white border border-[#DCE1E6] rounded-xl p-4 shadow-2xs space-y-1 hover:border-emerald-700 transition-all">
                                        <div className="flex items-center justify-between text-[#72787e]">
                                            <span className="text-[10px] font-mono font-bold uppercase">{isVN ? 'TỶ LỆ THAM DỰ' : 'SHOW-UP RATE'}</span>
                                            <Activity className="w-4 h-4 text-emerald-700" />
                                        </div>
                                        <div className="text-3xl font-bold font-display text-[#00344c]">
                                            {analyticsData.summary?.showUpRate !== null && analyticsData.summary?.showUpRate !== undefined
                                                ? `${(analyticsData.summary.showUpRate * 100).toFixed(1)}%`
                                                : '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Department Distributions & Top Partners */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Department distribution ratios */}
                                    <div className="lg:col-span-7 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
                                        <div className="flex items-center justify-between border-b border-[#EEF1F4] pb-3">
                                            <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                                                <Layers className="w-4 h-4 text-[#1b4b66]" />
                                                <span>{isVN ? 'PHÂN BỐ THEO PHÒNG BAN' : 'DEPARTMENT DISTRIBUTION'}</span>
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {analyticsData.departmentDistribution && analyticsData.departmentDistribution.length > 0 ? (
                                                analyticsData.departmentDistribution.map((dept, i) => {
                                                    const maxVal = Math.max(...analyticsData.departmentDistribution.map(d => d.count), 1);
                                                    return (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between text-xs font-semibold text-[#0f1d28]">
                                                                <span>{dept.department}</span>
                                                                <span className="font-mono text-[#1b4b66]">{dept.count} {isVN ? 'đại biểu' : 'delegates'}</span>
                                                            </div>
                                                            <div className="h-3 bg-[#EEF1F4] rounded-full overflow-hidden border border-[#DCE1E6]">
                                                                <div
                                                                    className="h-full bg-[#5B4B8A] transition-all duration-500 rounded-full"
                                                                    style={{ width: `${(dept.count / maxVal) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-xs text-[#72787e] italic text-center py-6">
                                                    {isVN ? 'Không có dữ liệu phân bổ phòng ban' : 'No department distribution data'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Top organizations list */}
                                    <div className="lg:col-span-5 bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4 font-body">
                                        <div className="flex items-center justify-between border-b border-[#EEF1F4] pb-3 font-mono font-bold">
                                            <span className="text-xs uppercase text-[#00344c] flex items-center gap-1.5 font-bold">
                                                <Building2 className="w-4 h-4 text-[#1b4b66]" />
                                                <span>{isVN ? 'TOP TỔ CHỨC ĐỒNG HÀNH' : 'TOP PARTNER ORGANIZATIONS'}</span>
                                            </span>
                                        </div>

                                        <div className="divide-y divide-[#DCE1E6] max-h-[300px] overflow-y-auto pr-1">
                                            {analyticsData.summary?.researchDomainBreakdown ? (
                                                (() => {
                                                    const counts: Record<string, number> = {};
                                                    detail?.attendees?.forEach(a => {
                                                        const org = a.organizationName || (isVN ? 'Khác/Không rõ' : 'Other/Unknown');
                                                        counts[org] = (counts[org] || 0) + 1;
                                                    });
                                                    const sorted = Object.entries(counts)
                                                        .map(([orgName, count]) => ({ orgName, count }))
                                                        .sort((a, b) => b.count - a.count)
                                                        .slice(0, 10);

                                                    if (sorted.length === 0) {
                                                        return <p className="text-xs text-[#72787e] italic text-center py-6">{isVN ? 'Không có dữ liệu tổ chức' : 'No partner organization data'}</p>;
                                                    }

                                                    return sorted.map((org, idx) => (
                                                        <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="font-bold text-[#0f1d28] truncate">{org.orgName}</p>
                                                            </div>
                                                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#edf4ff] text-[#00344c] shrink-0 font-extrabold">
                                                                {org.count} {isVN ? 'đại biểu' : 'delegates'}
                                                            </span>
                                                        </div>
                                                    ));
                                                })()
                                            ) : (
                                                <p className="text-xs text-[#72787e] italic text-center py-6">{isVN ? 'Không có dữ liệu tổ chức' : 'No partner organizations data'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Spectrum breakdown details */}
                                <div className="bg-white border border-[#DCE1E6] rounded-xl p-5 shadow-2xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-[#EEF1F4] pb-3">
                                        <span className="text-xs font-mono font-bold uppercase text-[#00344c] flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-[#1b4b66]" />
                                            <span>{isVN ? 'PHÂN TÍCH CHUYÊN MÔN ĐẠI BIỂU' : 'PROFESSIONAL SPECTRUM'}</span>
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Academic Breakdowns */}
                                        <div>
                                            <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                                                {isVN ? 'HỌC HÀM / HỌC VỊ' : 'ACADEMIC TITLES'}
                                            </h4>
                                            <div className="space-y-1.5">
                                                {analyticsData.summary?.academicTitleBreakdown && Object.keys(analyticsData.summary.academicTitleBreakdown).length > 0 ? (
                                                    Object.entries(analyticsData.summary.academicTitleBreakdown).map(([title, val]) => (
                                                        <div key={title} className="flex justify-between text-xs font-medium">
                                                            <span className="text-gray-700">{title}</span>
                                                            <span className="font-mono text-[#00344c] font-bold">{val}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 italic">{isVN ? 'Không có dữ liệu' : 'No data'}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Attendance Roles */}
                                        <div>
                                            <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                                                {isVN ? 'VAI TRÒ THAM DỰ' : 'ROLES'}
                                            </h4>
                                            <div className="space-y-1.5">
                                                {analyticsData.summary?.attendeeRoleBreakdown && Object.keys(analyticsData.summary.attendeeRoleBreakdown).length > 0 ? (
                                                    Object.entries(analyticsData.summary.attendeeRoleBreakdown).map(([role, val]) => (
                                                        <div key={role} className="flex justify-between text-xs font-medium">
                                                            <span className="text-gray-700">{role}</span>
                                                            <span className="font-mono text-[#00344c] font-bold">{val}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 italic">{isVN ? 'Không có dữ liệu' : 'No data'}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Research domains */}
                                        <div>
                                            <h4 className="text-[11px] font-mono font-bold text-[#72787e] uppercase mb-2 border-b border-gray-100 pb-1">
                                                {isVN ? 'LĨNH VỰC NGHIÊN CỨU' : 'RESEARCH DOMAINS'}
                                            </h4>
                                            <div className="space-y-1.5">
                                                {analyticsData.summary?.researchDomainBreakdown && Object.keys(analyticsData.summary.researchDomainBreakdown).length > 0 ? (
                                                    Object.entries(analyticsData.summary.researchDomainBreakdown).map(([domain, val]) => (
                                                        <div key={domain} className="flex justify-between text-xs font-medium">
                                                            <span className="text-gray-700">{domain}</span>
                                                            <span className="font-mono text-[#00344c] font-bold">{val}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 italic font-medium">{isVN ? 'Không có dữ liệu' : 'No domain mapping info'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )
            }

            {/* PROFILE DETAIL MODAL: INDIVIDUAL */}
            {
                inspectedGuestId && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
                        <div className="bg-white border border-[#DCE1E6] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-auto flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 bg-gradient-to-r from-[#00344c] to-[#1b4b66] text-white rounded-t-2xl flex items-start justify-between gap-4 sticky top-0 z-10">
                                {inspectedLoading ? (
                                    <h3 className="text-lg font-bold">{isVN ? 'Đang tải thông tin khách mời...' : 'Loading guest details...'}</h3>
                                ) : inspectedError ? (
                                    <h3 className="text-lg font-bold text-red-350">{isVN ? 'Lỗi tải thông tin' : 'Error Loading Profile'}</h3>
                                ) : inspectedProfile ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-200 border border-sky-500/30 font-bold uppercase tracking-wider font-mono">
                                                {inspectedProfile.attendeeRole}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#EEF1F4]/20 text-[#EEF1F4] border border-white/20 font-bold uppercase tracking-wider font-mono">
                                                {inspectedProfile.followUpStatus}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/20 text-white border border-white/30">
                                                ID: {inspectedProfile.id.substring(0, 8)}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-white">{inspectedProfile.fullName}</h3>
                                        <p className="text-xs text-amber-200 font-semibold">{inspectedProfile.position || (isVN ? 'Chưa định nghĩa chức danh' : 'Position not defined')}</p>
                                        <p className="text-xs text-slate-200 flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span>{inspectedProfile.organizationName || (isVN ? 'Không rõ cơ quan' : 'Unknown Org')}</span>
                                        </p>
                                    </div>
                                ) : null}

                                <button
                                    onClick={() => {
                                        setInspectedGuestId(null);
                                        setInspectedProfile(null);
                                        setInspectedError(null);
                                    }}
                                    className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 flex-1 text-xs">
                                {inspectedLoading && (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                        <Loader2 className="w-8 h-8 text-[#1b4b66] animate-spin" />
                                        <p className="text-xs text-[#72787e] font-medium">{isVN ? 'Đang truy vấn dữ liệu...' : 'Querying database profiles...'}</p>
                                    </div>
                                )}

                                {inspectedError && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                        <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1.5" />
                                        <p className="text-xs font-bold text-red-900">{isVN ? 'Không thể truy cập hồ sơ' : 'Profile Access Error'}</p>
                                        <p className="text-[11px] text-red-700 mt-1">{inspectedError}</p>
                                    </div>
                                )}

                                {!inspectedLoading && !inspectedError && inspectedProfile && (
                                    <>
                                        {/* Quick Contact & Normalized Academic Info */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#DCE1E6]">
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider">
                                                    {isVN ? 'Thông tin liên hệ & Định danh' : 'Contact & Identity'}
                                                </h4>
                                                <div className="space-y-1.5 text-[#41474d]">
                                                    <p className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-[#72787e]" />
                                                        <span className="font-mono">{inspectedProfile.email || 'N/A'}</span>
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 text-[#72787e]" />
                                                        <span className="font-mono">{inspectedProfile.phone || 'N/A'}</span>
                                                    </p>
                                                    <p className="flex items-center gap-2 text-[11px] text-[#72787e]">
                                                        <span className="font-bold">{isVN ? 'Tên chuẩn hóa:' : 'Normalized:'}</span>
                                                        <span className="font-mono bg-gray-200 px-1.5 py-0.2 rounded text-[10px]">{inspectedProfile.normalizedName}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider">
                                                    {isVN ? 'Học hàm / Học vị (Parsed)' : 'Academic Titles'}
                                                </h4>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[#72787e] font-semibold">{isVN ? 'Chuỗi gốc:' : 'Raw string:'}</span>
                                                        <span className="font-mono bg-gray-100 px-1.5 py-0.2 rounded font-bold text-[#00344c]">{inspectedProfile.academicTitleRaw || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[#72787e] font-semibold">{isVN ? 'Mảng Tag chuẩn hóa:' : 'Normalized tags:'}</span>
                                                        {inspectedProfile.academicTitleNormalized && inspectedProfile.academicTitleNormalized.length > 0 ? (
                                                            inspectedProfile.academicTitleNormalized.map((t: string) => (
                                                                <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00344c] text-white">
                                                                    {t}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 italic">None</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Source Sheets & Attendance History */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                                <span>{isVN ? 'Lịch sử Sự kiện & File Sheet Nguồn' : 'Event & Source Sheet History'}</span>
                                            </h4>

                                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                                {inspectedProfile.sourceSheets && inspectedProfile.sourceSheets.length > 0 ? (
                                                    inspectedProfile.sourceSheets.map((s: any, idx: number) => (
                                                        <div key={idx} className="bg-white border border-[#DCE1E6] rounded-xl p-3.5 space-y-2 shadow-2xs">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-extrabold text-[#00344c] text-xs">{s.eventName}</span>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                                                                    {s.attendanceStatus}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#72787e]">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5 text-[#72787e]" />
                                                                    {s.eventDate}
                                                                </span>

                                                                <span className="flex items-center gap-1 text-[#00344c] font-semibold">
                                                                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                                                    File: <code className="bg-gray-100 px-1 py-0.2 rounded text-[10px] truncate max-w-[150px]">{s.fileName}</code> (Sheet: {s.sheetName})
                                                                </span>
                                                            </div>

                                                            <div className="text-[11px] text-[#41474d] bg-[#F8FAFC] p-2 rounded border border-[#DCE1E6]">
                                                                <span className="font-bold text-[#1b4b66]">{isVN ? 'Vai trò trong sự kiện:' : 'Event Role:'}</span> {s.roleInEvent}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#72787e] italic py-2">{isVN ? 'Không tìm thấy lịch sử lưu trữ.' : 'No source files linked.'}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Operational Notes (Read-only for EventDetailView context) */}
                                        <div className="space-y-3 pt-4 border-t border-[#DCE1E6]">
                                            <h4 className="text-xs font-bold text-[#0f1d28] uppercase font-mono tracking-wider flex items-center gap-1.5">
                                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                                <span>{isVN ? 'Nhật ký Ghi chú Hợp tác' : 'Operational Notes Log'}</span>
                                            </h4>

                                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                                {inspectedProfile.notes && inspectedProfile.notes.length > 0 ? (
                                                    inspectedProfile.notes.map((n: any) => (
                                                        <div key={n.id} className="bg-[#F8FAFC] border border-[#DCE1E6] rounded-xl p-3 space-y-1">
                                                            <p className="text-xs text-[#0f1d28] leading-relaxed">{n.noteText}</p>
                                                            <div className="flex items-center justify-between text-[10px] font-mono text-[#72787e]">
                                                                <span>Tác giả: {n.createdByEmail}</span>
                                                                <span>{n.createdAt}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-[#72787e] italic py-2">
                                                        {isVN ? 'Chưa có ghi chú vận hành nào.' : 'No operational notes recorded.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-[#F8FAFC] border-t border-[#DCE1E6] rounded-b-2xl flex items-center justify-between text-xs shrink-0">
                                <span className="text-[#72787e] font-mono">
                                    {isVN ? 'Thông tin đối soát hai chiều FR-8' : 'Two-way audit support FR-8'}
                                </span>

                                <button
                                    onClick={() => {
                                        setInspectedGuestId(null);
                                        setInspectedProfile(null);
                                        setInspectedError(null);
                                    }}
                                    className="px-5 py-2 bg-[#EEF1F4] hover:bg-[#DCE1E6] text-[#0f1d28] font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                    {isVN ? 'Đóng' : 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
