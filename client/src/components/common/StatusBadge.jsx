import React from 'react';

const STATUS_COLORS = {
  // Order Statuses
  PAYMENT_PENDING: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  PLACED: 'bg-sky-900/40 text-sky-300 border border-sky-700/50',
  CONFIRMED: 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50',
  PREPARING: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  READY: 'bg-teal-900/40 text-teal-300 border border-teal-700/50',
  OUT_FOR_DELIVERY: 'bg-sky-900/40 text-sky-300 border border-sky-700/50',
  DELIVERED: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
  COMPLETED: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
  REJECTED: 'bg-rose-900/40 text-rose-300 border border-rose-700/50',
  CANCELLED: 'bg-rose-900/40 text-rose-300 border border-rose-700/50',
  EXPIRED: 'bg-[#262320] text-[#787065] border border-[#2a2724]',

  // Account / Restaurant Statuses
  ACTIVE: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50',
  SUSPENDED: 'bg-rose-900/40 text-rose-300 border border-rose-700/50',

  // Payment Statuses
  PENDING: 'bg-amber-900/40 text-amber-300 border border-amber-700/50',
  FAILED: 'bg-rose-900/40 text-rose-300 border border-rose-700/50',
  REFUND_PENDING: 'bg-orange-900/40 text-orange-300 border border-orange-700/50',
  REFUNDED: 'bg-purple-900/40 text-purple-300 border border-purple-700/50',
};

export const StatusBadge = ({ status }) => {
  const colorClass = STATUS_COLORS[status] || 'bg-stone-100 text-stone-700 border border-stone-200';
  const label = status ? status.replace(/_/g, ' ') : 'UNKNOWN';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${colorClass}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
