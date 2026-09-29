import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage = 1, totalPages = 1, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4 px-2">
      <p className="text-xs text-[#787065]">
        Page <span className="font-semibold text-[#f5ede6]">{currentPage}</span> of{' '}
        <span className="font-semibold text-[#f5ede6]">{totalPages}</span>
      </p>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-xl border border-[#2a2724] bg-[#191715] text-[#a89f91] hover:bg-[#24211e] hover:text-[#f5ede6] disabled:opacity-40 disabled:cursor-not-allowed min-h-touch min-w-touch flex items-center justify-center transition-colors"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-xl border border-[#2a2724] bg-[#191715] text-[#a89f91] hover:bg-[#24211e] hover:text-[#f5ede6] disabled:opacity-40 disabled:cursor-not-allowed min-h-touch min-w-touch flex items-center justify-center transition-colors"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

