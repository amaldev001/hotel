import React from 'react';

export const Skeleton = ({ className = '', count = 1 }) => {
  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-[#262320] rounded-xl ${className}`}
        />
      ))}
    </>
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-3 p-4 bg-[#191715] rounded-xl border border-[#2a2724]">
      <div className="flex space-x-4 pb-2 border-b border-[#2a2724]">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex space-x-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;

