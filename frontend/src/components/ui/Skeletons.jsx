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

export const InvestmentsSkeleton = () => (
  <div className="p-4 pt-8 space-y-6 pb-24 animate-pulse">
    {/* Header */}
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <SkeletonBase className="w-32 h-4 rounded-md mb-2" />
        <SkeletonBase className="w-48 h-8 rounded-lg" />
      </div>
      <SkeletonBase className="w-40 h-12 rounded-2xl" />
    </header>

    {/* Hero Card */}
    <section className="p-8 rounded-[2rem] bg-white/5 border border-white/10 h-48 relative overflow-hidden">
      <SkeletonBase className="w-32 h-4 rounded-md mb-4" />
      <SkeletonBase className="w-64 h-12 rounded-lg mb-4" />
      <SkeletonBase className="w-24 h-8 rounded-xl" />
    </section>

    {/* Ticker */}
    <section className="p-4 rounded-[2rem] bg-white/5 border border-white/10 h-16" />

    {/* Grid */}
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <article key={i} className="bg-black/30 p-6 rounded-[2rem] border border-white/5 h-48 flex flex-col justify-between">
          <div className="flex items-center gap-4">
            <SkeletonBase className="w-12 h-12 rounded-2xl" />
            <SkeletonBase className="w-32 h-6 rounded-md" />
          </div>
          <div className="space-y-4">
            <SkeletonBase className="w-full h-4 rounded-md" />
            <SkeletonBase className="w-full h-4 rounded-md" />
          </div>
        </article>
      ))}
    </section>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="p-4 pt-8 space-y-8 pb-24 max-w-7xl mx-auto animate-pulse">
    {/* Header */}
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <SkeletonBase className="w-24 h-4 rounded-md mb-2" />
        <SkeletonBase className="w-48 h-10 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <SkeletonBase className="w-32 h-12 rounded-2xl" />
        <SkeletonBase className="w-32 h-12 rounded-2xl" />
      </div>
    </header>

    {/* Tabs */}
    <div className="flex gap-2 overflow-x-hidden">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <SkeletonBase key={i} className="w-24 h-10 rounded-full" />
      ))}
    </div>

    {/* Main Content (Overview style) */}
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-3xl h-24">
            <SkeletonBase className="w-10 h-10 rounded-xl mb-2" />
            <SkeletonBase className="w-16 h-3 rounded-md mb-1" />
            <SkeletonBase className="w-20 h-4 rounded-md" />
          </div>
        ))}
      </div>
      <ChartSkeleton />
    </div>
  </div>
);

