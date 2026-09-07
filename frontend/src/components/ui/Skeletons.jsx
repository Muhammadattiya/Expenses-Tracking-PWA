import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
);

export const SkeletonBase = ({ className = '', style = {} }) => (
  <div 
    className={`relative overflow-hidden bg-white/[0.05] border border-white/[0.06] backdrop-blur-sm ${className}`}
    style={style}
  >
    <Shimmer />
  </div>
);

export const TransactionSkeleton = () => (
  <div className="flex items-center justify-between p-3.5 mb-2.5 liquidglass rounded-2xl border border-white/10 shadow-sm">
    <div className="flex items-center gap-3">
      <SkeletonBase className="w-11 h-11 rounded-2xl shrink-0" />
      <div className="space-y-2">
        <SkeletonBase className="w-28 h-4 rounded-md" />
        <SkeletonBase className="w-18 h-3 rounded-md" />
      </div>
    </div>
    <div className="space-y-1.5 flex flex-col items-end">
      <SkeletonBase className="w-20 h-5 rounded-md" />
      <SkeletonBase className="w-12 h-2.5 rounded-md" />
    </div>
  </div>
);

export const DashboardSummarySkeleton = () => (
  <div className="relative overflow-hidden liquidglass p-6 rounded-[2.2rem] shadow-[0_16px_40px_rgba(0,0,0,0.4)] border border-white/15 mb-6">
    {/* Subtle Glows */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-[#8D6346]/20 rounded-full blur-2xl pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#8D6346]/10 rounded-full blur-2xl pointer-events-none" />

    {/* Top Header */}
    <div className="flex justify-between items-center mb-6 relative z-10">
      <SkeletonBase className="w-28 h-8 rounded-full" />
      <SkeletonBase className="w-9 h-9 rounded-full" />
    </div>

    {/* Hero Balance Metric */}
    <div className="flex flex-col items-center mb-6 space-y-2.5 relative z-10">
      <SkeletonBase className="w-24 h-3.5 rounded-md" />
      <SkeletonBase className="w-44 h-10 rounded-xl" />
    </div>

    {/* Income & Expense Split Cards */}
    <div className="grid grid-cols-2 gap-3 relative z-10">
      <div className="bg-white/[0.04] rounded-2xl p-3.5 flex flex-col items-center border border-white/10 space-y-2">
        <SkeletonBase className="w-8 h-8 rounded-xl" />
        <SkeletonBase className="w-16 h-3 rounded-md" />
        <SkeletonBase className="w-20 h-4 rounded-md" />
      </div>
      <div className="bg-white/[0.04] rounded-2xl p-3.5 flex flex-col items-center border border-white/10 space-y-2">
        <SkeletonBase className="w-8 h-8 rounded-xl" />
        <SkeletonBase className="w-16 h-3 rounded-md" />
        <SkeletonBase className="w-20 h-4 rounded-md" />
      </div>
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="w-full h-64 liquidglass rounded-[2rem] p-6 flex items-end gap-3 justify-center border border-white/10 shadow-lg">
    {[40, 75, 50, 95, 65, 35, 80].map((h, i) => (
      <SkeletonBase 
        key={i} 
        className="w-8 rounded-t-xl" 
        style={{ height: `${h}%` }} 
      />
    ))}
  </div>
);

export const ListSkeleton = ({ count = 5 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: count }).map((_, i) => (
      <TransactionSkeleton key={i} />
    ))}
  </div>
);

export const InvestmentsSkeleton = () => (
  <div className="p-4 pt-6 space-y-6 pb-24 animate-pulse">
    {/* Header */}
    <div className="flex items-center justify-between gap-4">
      <div>
        <SkeletonBase className="w-28 h-4 rounded-md mb-2" />
        <SkeletonBase className="w-44 h-8 rounded-xl" />
      </div>
      <SkeletonBase className="w-32 h-10 rounded-full" />
    </div>

    {/* Hero Card */}
    <div className="p-6 rounded-[2rem] liquidglass border border-white/15 h-44 relative overflow-hidden flex flex-col justify-between">
      <SkeletonBase className="w-28 h-4 rounded-md" />
      <SkeletonBase className="w-52 h-10 rounded-xl" />
      <SkeletonBase className="w-24 h-6 rounded-full" />
    </div>

    {/* Ticker */}
    <SkeletonBase className="w-full h-14 rounded-2xl" />

    {/* Grid of Investments */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="liquidglass p-5 rounded-[1.8rem] border border-white/10 h-40 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBase className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <SkeletonBase className="w-28 h-4 rounded-md" />
              <SkeletonBase className="w-16 h-3 rounded-md" />
            </div>
            <SkeletonBase className="w-16 h-5 rounded-md" />
          </div>
          <div className="space-y-2">
            <SkeletonBase className="w-full h-3.5 rounded-md" />
            <SkeletonBase className="w-3/4 h-3.5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="p-4 pt-6 space-y-6 pb-24 max-w-7xl mx-auto animate-pulse">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <SkeletonBase className="w-24 h-4 rounded-md mb-2" />
        <SkeletonBase className="w-44 h-9 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <SkeletonBase className="w-28 h-10 rounded-full" />
        <SkeletonBase className="w-28 h-10 rounded-full" />
      </div>
    </div>

    {/* Category Tabs */}
    <div className="flex gap-2 overflow-x-hidden">
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonBase key={i} className="w-20 h-9 rounded-full shrink-0" />
      ))}
    </div>

    {/* Metric Cards Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="liquidglass border border-white/10 p-4 rounded-2xl h-24 flex flex-col justify-between">
          <SkeletonBase className="w-7 h-7 rounded-lg" />
          <SkeletonBase className="w-16 h-3 rounded-md" />
          <SkeletonBase className="w-20 h-4 rounded-md" />
        </div>
      ))}
    </div>

    {/* Chart */}
    <ChartSkeleton />
  </div>
);

export const CardSkeleton = () => (
  <div className="p-5 liquidglass rounded-2xl border border-white/10 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-10 h-10 rounded-xl" />
        <div className="space-y-1.5">
          <SkeletonBase className="w-28 h-4 rounded-md" />
          <SkeletonBase className="w-16 h-3 rounded-md" />
        </div>
      </div>
      <SkeletonBase className="w-16 h-5 rounded-md" />
    </div>
    <SkeletonBase className="w-full h-2 rounded-full" />
  </div>
);
