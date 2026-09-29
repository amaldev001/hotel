import React from 'react';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({ title = 'No items found', message = 'There are no items to display at this time.', actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-[#2a2724] bg-[#191715] my-4">
      <div className="w-14 h-14 rounded-full bg-[#24211e] text-[#a89f91] flex items-center justify-center mb-4">
        <PackageOpen className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-[#f5ede6] mb-1">{title}</h3>
      <p className="text-sm text-[#a89f91] max-w-sm mb-6">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition-colors shadow-sm min-h-touch"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
