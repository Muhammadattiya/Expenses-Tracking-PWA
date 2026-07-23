import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
);

export const SkeletonBase = ({ className }) => (
  <div className={`relative overflow-hidden bg-black/10 dark:bg-white/5 ${className}`}>
    <Shimmer />
  </div>
);

export const TransactionSkeleton = () => (
  <div className="flex items-center justify-between p-4 mb-3 glass-panel rounded-2xl border border-[var(--color-border)]">
    <div className="flex items-center gap-3">
      <SkeletonBase className="w-12 h-12 rounded-xl" />
      <div className="space-y-2">
        <SkeletonBase className="w-32 h-4 rounded-md" />
        <SkeletonBase className="w-20 h-3 rounded-md" />
      </div>
    </div>
    <SkeletonBase className="w-16 h-5 rounded-md" />
  </div>
);

export const DashboardSummarySkeleton = () => (
  <div className="relative overflow-hidden glass-panel p-7 rounded-[2rem] shadow-2xl mb-8">
    <div className="flex justify-between items-center mb-8">
      <SkeletonBase className="w-10 h-10 rounded-2xl" />
      <SkeletonBase className="w-32 h-5 rounded-md" />
      <SkeletonBase className="w-10 h-10 rounded-2xl" />
    </div>
    <div className="flex flex-col items-center mb-8 space-y-3">
      <SkeletonBase className="w-24 h-4 rounded-md" />
      <SkeletonBase className="w-48 h-10 rounded-md" />
    </div>
    <div className="flex justify-between gap-4">
      <div className="flex-1 bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col items-center border border-[var(--color-border)]">
        <SkeletonBase className="w-10 h-10 rounded-xl mb-2" />
        <SkeletonBase className="w-16 h-3 rounded-md mb-1" />
        <SkeletonBase className="w-20 h-4 rounded-md" />
      </div>
      <div className="flex-1 bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col items-center border border-[var(--color-border)]">
        <SkeletonBase className="w-10 h-10 rounded-xl mb-2" />
        <SkeletonBase className="w-16 h-3 rounded-md mb-1" />
        <SkeletonBase className="w-20 h-4 rounded-md" />
      </div>
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="w-full h-64 glass-panel rounded-3xl p-6 flex items-end gap-2 justify-center">
    {[40, 70, 45, 90, 65, 30].map((h, i) => (
      <SkeletonBase key={i} className="w-8 rounded-t-md" style={{ height: `${h}%` }} />
    ))}
  </div>
);

export const ListSkeleton = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <TransactionSkeleton key={i} />
    ))}
  </div>
);
