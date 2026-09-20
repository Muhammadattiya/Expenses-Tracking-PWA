import React from 'react';

/**
 * Sweeping specular shimmer animation across pure Liquid Glass elements
 */
export const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />
);

/**
 * Foundational Liquid Glass skeleton element with specular rim and subtle inner well depth
 */
export const SkeletonBase = ({ className = '', style = {} }) => (
  <div 
    className={`relative overflow-hidden bg-white/[0.06] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-md ${className}`}
    style={style}
  >
    <Shimmer />
  </div>
);

/**
 * Standard Finova Obsidian Ambient Background for Page Skeletons
 */
export const SkeletonAtmosphere = () => (
  <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115] overflow-hidden">
    <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
    <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
    <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#8D6346] rounded-full blur-[140px] opacity-35" />
  </div>
);

/**
 * Debts Ambient Background (Obsidian Debts #100E11 theme)
 */
export const SkeletonAtmosphereDebts = () => (
  <div className="fixed inset-0 pointer-events-none -z-10 bg-[#100E11] overflow-hidden">
    <div className="absolute top-[-50px] left-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full" />
    <div className="absolute top-[30%] right-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full" />
    <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full" />
  </div>
);

/**
 * Transaction row skeleton
 */
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

/**
 * Dashboard Hero Summary Skeleton
 */
export const DashboardSummarySkeleton = () => (
  <div className="relative overflow-hidden liquidglass p-6 rounded-[2.2rem] shadow-[0_16px_40px_rgba(0,0,0,0.4)] border border-white/15 mb-6">
    <div className="absolute top-0 right-0 w-32 h-32 bg-[#8D6346]/20 rounded-full blur-2xl pointer-events-none" />
    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#8D6346]/10 rounded-full blur-2xl pointer-events-none" />

    <div className="flex justify-between items-center mb-6 relative z-10">
      <SkeletonBase className="w-28 h-8 rounded-full" />
      <SkeletonBase className="w-9 h-9 rounded-full" />
    </div>

    <div className="flex flex-col items-center mb-6 space-y-2.5 relative z-10">
      <SkeletonBase className="w-24 h-3.5 rounded-md" />
      <SkeletonBase className="w-44 h-10 rounded-xl" />
    </div>

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

/**
 * 1. SETTINGS SKELETON
 * 1:1 Architectural match for Settings.jsx
 */
export const SettingsSkeleton = () => (
  <div className="p-4 pt-8 pb-32 space-y-6 relative min-h-[100dvh] max-w-lg mx-auto select-none">
    <SkeletonAtmosphere />

    {/* Header with Back Button and Centered Title */}
    <div className="relative z-10 grid grid-cols-[3rem_1fr_3rem] items-center mb-6 min-h-[3rem]">
      <div className="flex justify-start">
        <div className="bg-[#2B2321] rounded-full w-10 h-10 flex items-center justify-center border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]">
          <SkeletonBase className="w-4 h-4 rounded-full" />
        </div>
      </div>
      <SkeletonBase className="w-28 h-7 rounded-xl mx-auto" />
      <div className="w-10" />
    </div>

    {/* Sleek Settings Navigation Rows */}
    <div className="relative z-10 flex flex-col gap-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i} 
          className="w-full flex items-center justify-between py-4 px-3 rounded-[24px] bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
              <SkeletonBase className="w-5 h-5 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <SkeletonBase className="w-32 sm:w-36 h-4 rounded-md" />
              <SkeletonBase className="w-20 sm:w-24 h-2.5 rounded-md opacity-60" />
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] flex items-center justify-center shrink-0">
            <SkeletonBase className="w-3 h-3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * 2. ADD TRANSACTION SKELETON
 * 1:1 Architectural match for AddTransaction.jsx
 */
export const AddTransactionSkeleton = () => (
  <div className="w-full max-w-lg mx-auto select-none flex flex-col gap-3 sm:gap-4 px-4 pt-3 pb-32 min-h-screen relative">
    <SkeletonAtmosphere />

    {/* Top Header Bar */}
    <div className="flex items-center justify-between w-full px-1">
      <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <SkeletonBase className="w-4 h-4 rounded-full" />
      </div>
      <SkeletonBase className="w-24 h-5 rounded-md" />
      <div className="w-11 h-11" />
    </div>

    {/* Top Segmented Control (Expense / Income / Transfer) */}
    <div className="w-full shrink-0">
      <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 rounded-full shadow-inner w-full h-11 sm:h-12 items-center gap-1">
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
      </div>
    </div>

    {/* Main Responsive Liquid Glass Form Card */}
    <div className="w-full rounded-[28px] sm:rounded-[36px] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.15)] flex flex-col gap-4 sm:gap-5">
      {/* Amount Hero Section */}
      <div className="flex flex-col items-center justify-center w-full py-1 sm:py-2">
        <SkeletonBase className="w-16 h-3.5 rounded-md mb-3" />
        <div className="flex items-center justify-center gap-2 relative w-full">
          <div className="absolute start-1 sm:start-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/20 border border-white/5 flex items-center justify-center">
            <SkeletonBase className="w-4 h-4 rounded-md" />
          </div>
          <SkeletonBase className="w-48 sm:w-56 h-12 sm:h-14 rounded-2xl mx-auto" />
          <SkeletonBase className="w-10 h-4 rounded-md self-end mb-2" />
        </div>
      </div>

      {/* Date Pill Toggle */}
      <div className="flex bg-black/20 border border-white/5 p-1 rounded-full h-11 items-center gap-1">
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
      </div>

      {/* Description Field */}
      <div className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between px-4">
        <SkeletonBase className="w-36 h-3.5 rounded-md" />
        <SkeletonBase className="w-7 h-7 rounded-full" />
      </div>

      {/* Account Selector Pill */}
      <div className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <SkeletonBase className="w-6 h-6 rounded-lg" />
          <SkeletonBase className="w-28 h-3.5 rounded-md" />
        </div>
        <SkeletonBase className="w-4 h-4 rounded-full" />
      </div>

      {/* Category Grid */}
      <div className="space-y-2 pt-1">
        <SkeletonBase className="w-20 h-3.5 rounded-md" />
        <div className="grid grid-cols-4 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-2 rounded-2xl bg-white/[0.02] border border-white/5">
              <SkeletonBase className="w-11 h-11 rounded-full" />
              <SkeletonBase className="w-12 h-2.5 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Confirm Button */}
      <div className="w-full h-14 rounded-full bg-[#8D6346]/30 border border-[#8D6346]/40 flex items-center justify-center mt-2 shadow-[0_4px_20px_rgba(141,99,70,0.25)]">
        <SkeletonBase className="w-32 h-4 rounded-md" />
      </div>
    </div>
  </div>
);

/**
 * Debts Content Section Skeleton (for PersonalDebts and GroupExpenses tabs)
 */
export const DebtsSectionSkeleton = () => (
  <div className="space-y-6 select-none animate-fade-in w-full">
    {/* Two Authentic Hero Cards ("I Owe" & "Owed To Me") */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
      {/* I Owe Card */}
      <div className="flex items-center justify-between p-5 sm:p-6 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <SkeletonBase className="w-6 h-6 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBase className="w-16 h-3.5 rounded-md" />
            <SkeletonBase className="w-20 h-2.5 rounded-md opacity-60" />
          </div>
        </div>
        <SkeletonBase className="w-28 sm:w-32 h-8 rounded-xl" />
      </div>

      {/* Owed To Me Card */}
      <div className="flex items-center justify-between p-5 sm:p-6 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[16px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <SkeletonBase className="w-6 h-6 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBase className="w-20 h-3.5 rounded-md" />
            <SkeletonBase className="w-20 h-2.5 rounded-md opacity-60" />
          </div>
        </div>
        <SkeletonBase className="w-28 sm:w-32 h-8 rounded-xl" />
      </div>
    </div>

    {/* Action Bar (List Header + Filter + Add Button) */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 mb-6">
      <SkeletonBase className="w-32 h-5 rounded-md" />
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex bg-black/20 p-1 rounded-full h-11 items-center border border-white/5 flex-1 sm:w-52 gap-1">
          <SkeletonBase className="flex-1 h-full rounded-full" />
          <SkeletonBase className="flex-1 h-full rounded-full" />
          <SkeletonBase className="flex-1 h-full rounded-full" />
        </div>
        <div className="h-11 rounded-full bg-[#8D6346]/20 border border-[#8D6346]/30 px-5 flex items-center gap-2 shrink-0">
          <SkeletonBase className="w-4 h-4 rounded-full" />
          <SkeletonBase className="w-20 h-3.5 rounded-md" />
        </div>
      </div>
    </div>

    {/* Debts List Cards */}
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="p-4 sm:p-5 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBase className="w-10 h-10 rounded-full" />
              <div className="space-y-1.5">
                <SkeletonBase className="w-28 h-4 rounded-md" />
                <SkeletonBase className="w-20 h-2.5 rounded-md opacity-60" />
              </div>
            </div>
            <SkeletonBase className="w-24 h-6 rounded-lg" />
          </div>
          <SkeletonBase className="w-full h-2 rounded-full" />
          <div className="flex justify-between items-center pt-1">
            <SkeletonBase className="w-24 h-3 rounded-md" />
            <SkeletonBase className="w-16 h-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * 3. DEBTS & RECEIVABLES SKELETON
 * 1:1 Architectural match for Receivables.jsx & PersonalDebts.jsx
 */
export const DebtsSkeleton = () => (
  <div className="w-full pb-40 max-w-7xl mx-auto pt-6 sm:pt-2 px-4 sm:px-6 relative select-none">
    <SkeletonAtmosphereDebts />

    {/* Header */}
    <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <SkeletonBase className="w-36 h-8 rounded-xl" />
        <SkeletonBase className="w-52 h-4 rounded-md mt-2" />
      </div>
    </header>

    {/* Top Segmented Tabs (Group Expenses vs Personal Debts) */}
    <div className="flex justify-center mb-8">
      <div className="flex p-1 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full h-12 items-center w-full max-w-sm gap-1">
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
      </div>
    </div>

    <DebtsSectionSkeleton />
  </div>
);

/**
 * 4. BILLS SKELETON
 * 1:1 Architectural match for Bills.jsx
 */
export const BillsSkeleton = () => (
  <div className="w-full relative min-h-screen pb-32 overflow-x-hidden px-4 pt-6 space-y-6 max-w-lg mx-auto select-none">
    <SkeletonAtmosphere />

    {/* Centered Header */}
    <header className="flex justify-center items-center pt-1">
      <SkeletonBase className="w-28 h-7 rounded-xl" />
    </header>

    {/* 2-Section Authentic Bill Ticket Hero Card */}
    <div className="relative bg-[#221A1C] border border-[#8D6346]/35 rounded-[2.5rem] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
      <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#8D6346]/50 to-transparent pointer-events-none" />

      {/* Section 1: Total Value & Bills Count */}
      <div className="flex justify-between items-center">
        <div>
          <SkeletonBase className="w-20 h-3 rounded-md mb-2" />
          <SkeletonBase className="w-36 sm:w-40 h-9 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner">
          <SkeletonBase className="w-3.5 h-3.5 rounded-full" />
          <SkeletonBase className="w-16 h-3 rounded-md" />
        </div>
      </div>

      {/* Perforated Divider with Circular Notches */}
      <div className="relative my-5">
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#141115] border border-r-[#8D6346]/35 border-t-transparent border-b-transparent border-l-transparent" />
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#141115] border border-l-[#8D6346]/35 border-t-transparent border-b-transparent border-r-transparent" />
        <div className="border-t-2 border-dashed border-white/15 w-full" />
      </div>

      {/* Section 2: Closest Due Bill */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <SkeletonBase className="w-2 h-2 rounded-full" />
            <SkeletonBase className="w-20 h-2.5 rounded-md" />
          </div>
          <SkeletonBase className="w-32 h-4 rounded-md" />
        </div>
        <div className="flex flex-col items-end space-y-1.5 shrink-0">
          <SkeletonBase className="w-20 h-3 rounded-md" />
          <SkeletonBase className="w-24 h-5 rounded-md" />
        </div>
      </div>
    </div>

    {/* Filter Segmented Control + Add Bill Button */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex bg-black/20 p-1 rounded-full h-11 items-center border border-white/5 flex-1 gap-1">
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
        <SkeletonBase className="flex-1 h-full rounded-full" />
      </div>
      <div className="h-11 rounded-full bg-[#8D6346]/20 border border-[#8D6346]/30 px-4 flex items-center gap-2 shrink-0">
        <SkeletonBase className="w-4 h-4 rounded-full" />
        <SkeletonBase className="w-16 h-3 rounded-md" />
      </div>
    </div>

    {/* Bills List Items */}
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="rounded-[2rem] bg-[#221A1C] border border-white/10 p-4 sm:p-5 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <SkeletonBase className="w-5 h-5 rounded-md" />
            </div>
            <div className="space-y-1.5">
              <SkeletonBase className="w-28 h-4 rounded-md" />
              <SkeletonBase className="w-20 h-2.5 rounded-md opacity-60" />
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1.5">
            <SkeletonBase className="w-20 h-4 rounded-md" />
            <SkeletonBase className="w-16 h-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * 5. INVESTMENTS SKELETON
 * 1:1 Architectural match for Investments.jsx
 */
export const InvestmentsSkeleton = () => (
  <div className="relative text-white pb-32 pt-2 max-w-md mx-auto px-4 select-none">
    <SkeletonAtmosphere />

    {/* Top Header */}
    <header className="flex flex-col gap-3.5 mb-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <SkeletonBase className="w-3 h-3 rounded-full" />
            <SkeletonBase className="w-20 h-2.5 rounded-md" />
          </div>
          <SkeletonBase className="w-28 h-6 rounded-xl" />
        </div>
        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <SkeletonBase className="w-3.5 h-3.5 rounded-full" />
        </div>
      </div>

      {/* 3 Quick Action Buttons (Add Gold, Add Stock, Add Currency) */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="py-2.5 px-2 rounded-full bg-[#8D6346]/25 border border-[#8D6346]/40 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <SkeletonBase className="w-3 h-3 rounded-full" />
            <SkeletonBase className="w-14 h-3 rounded-md" />
          </div>
        ))}
      </div>
    </header>

    {/* Premium Luxury Portfolio Hero Card */}
    <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-5 relative overflow-hidden mb-5">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBase className="w-24 h-3 rounded-md" />
        <SkeletonBase className="w-16 h-6 rounded-xl" />
      </div>
      <SkeletonBase className="w-44 sm:w-52 h-10 rounded-xl mb-4" />

      {/* Hero Stat Well */}
      <div className="w-full rounded-2xl bg-black/20 border border-white/5 p-3 flex justify-between items-center">
        <div className="space-y-1">
          <SkeletonBase className="w-16 h-2.5 rounded-md" />
          <SkeletonBase className="w-24 h-4 rounded-md" />
        </div>
        <div className="space-y-1 flex flex-col items-end">
          <SkeletonBase className="w-16 h-2.5 rounded-md" />
          <SkeletonBase className="w-24 h-4 rounded-md" />
        </div>
      </div>
    </div>

    {/* Live Market Price Marquee Ticker */}
    <div className="w-full h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between px-4 mb-5 shadow-inner">
      <div className="flex items-center gap-2">
        <SkeletonBase className="w-4 h-4 rounded-full" />
        <SkeletonBase className="w-28 h-3 rounded-md" />
      </div>
      <SkeletonBase className="w-20 h-3 rounded-md" />
    </div>

    {/* Portfolio Breakdown Segmented Tabs */}
    <div className="flex bg-black/20 border border-white/5 p-1 rounded-full h-11 items-center gap-1 mb-4">
      <SkeletonBase className="flex-1 h-full rounded-full" />
      <SkeletonBase className="flex-1 h-full rounded-full" />
      <SkeletonBase className="flex-1 h-full rounded-full" />
    </div>

    {/* Investment Asset Cards */}
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div 
          key={i} 
          className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 rounded-[2rem] p-5 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBase className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <SkeletonBase className="w-24 h-4 rounded-md" />
                <SkeletonBase className="w-16 h-2.5 rounded-md opacity-60" />
              </div>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <SkeletonBase className="w-24 h-4 rounded-md" />
              <SkeletonBase className="w-14 h-2.5 rounded-md opacity-60" />
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
            <SkeletonBase className="w-20 h-3 rounded-md" />
            <SkeletonBase className="w-16 h-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Analytics Skeleton
 */
export const AnalyticsSkeleton = () => (
  <div className="p-4 pt-6 space-y-6 pb-24 max-w-7xl mx-auto select-none">
    <SkeletonAtmosphere />
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

    <div className="flex gap-2 overflow-x-hidden">
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonBase key={i} className="w-20 h-9 rounded-full shrink-0" />
      ))}
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="liquidglass border border-white/10 p-4 rounded-2xl h-24 flex flex-col justify-between">
          <SkeletonBase className="w-7 h-7 rounded-lg" />
          <SkeletonBase className="w-16 h-3 rounded-md" />
          <SkeletonBase className="w-20 h-4 rounded-md" />
        </div>
      ))}
    </div>

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
