import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalElements?: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalElements,
    onPageChange,
}) => {
    if (totalPages <= 1 || (totalElements !== undefined && totalElements === 0)) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#DCE1E6] bg-[#f8fafc]/50">
            <span className="text-xs font-medium text-[#72787e] font-body">
                Trang {currentPage} / {totalPages} {totalElements !== undefined ? `(${totalElements} bản ghi)` : ''}
            </span>
            <div className="flex space-x-2">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-3 py-1 text-xs font-semibold border border-[#DCE1E6] rounded-md bg-white text-[#41474d] hover:bg-[#EEF1F4] disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                    Trước
                </button>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-3 py-1 text-xs font-semibold border border-[#DCE1E6] rounded-md bg-white text-[#41474d] hover:bg-[#EEF1F4] disabled:opacity-50 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                    Sau
                </button>
            </div>
        </div>
    );
};
