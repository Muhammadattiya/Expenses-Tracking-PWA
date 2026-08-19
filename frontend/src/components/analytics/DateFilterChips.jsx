import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calendar, X } from 'lucide-react';

export const getFilterBounds = (type, userPrefs = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (type === 'all') return { from: '', to: '' };

  if (type === 'today') {
    const start = new Date(today);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (type === 'yesterday') {
    const start = new Date(today);
    start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (type === 'year') {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (type === 'this_week' || type === 'last_week') {
    const prefWeekStart = userPrefs?.budgetStartDayWeekly !== undefined ? userPrefs.budgetStartDayWeekly : 6;
    const getWeekBounds = (dateObj) => {
      let day = dateObj.getDay();
      let diff = day >= prefWeekStart ? day - prefWeekStart : 7 - (prefWeekStart - day);
      let start = new Date(dateObj);
      start.setDate(start.getDate() - diff);
      let end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    if (type === 'this_week') {
      const bounds = getWeekBounds(today);
      return { from: bounds.start.toISOString(), to: bounds.end.toISOString() };
    } else if (type === 'last_week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const bounds = getWeekBounds(lastWeek);
      return { from: bounds.start.toISOString(), to: bounds.end.toISOString() };
    }
  } 
  
  if (type === 'this_month' || type === 'last_month') {
    const prefMonthStart = userPrefs?.budgetStartDayMonthly || 1;
    const getMonthBounds = (dateObj) => {
      let start = new Date(dateObj);
      const lastDayOfCurrentMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);

      if (start.getDate() < actualMonthStartDay) {
        const lastDayOfPrevMonth = new Date(start.getFullYear(), start.getMonth(), 0).getDate();
        start = new Date(start.getFullYear(), start.getMonth() - 1, Math.min(prefMonthStart, lastDayOfPrevMonth));
      } else {
        start = new Date(start.getFullYear(), start.getMonth(), actualMonthStartDay);
      }

      let end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    if (type === 'this_month') {
      const bounds = getMonthBounds(today);
      return { from: bounds.start.toISOString(), to: bounds.end.toISOString() };
    } else if (type === 'last_month') {
      const currentBounds = getMonthBounds(today);
      const prevDate = new Date(currentBounds.start);
      prevDate.setDate(prevDate.getDate() - 5);
      const bounds = getMonthBounds(prevDate);
      return { from: bounds.start.toISOString(), to: bounds.end.toISOString() };
    }
  }
};

export default function DateFilterChips({ filters, setFilters, userPrefs }) {
  const { t, lang } = useLanguage();
  const [showCustom, setShowCustom] = useState(false);


  const handleQuickFilter = (type) => {
    const bounds = getFilterBounds(type, userPrefs);
    if (bounds) {
      setFilters({ ...filters, from: bounds.from, to: bounds.to, filterType: type, initialized: true });
    }
  };

  const checkActive = (type) => {
    if (showCustom) return false;
    const bounds = getFilterBounds(type, userPrefs);
    if (type === 'all') return !filters.from && !filters.to;
    
    // We only need to check if the dates fall in the same boundaries roughly, or exact match
    return filters.from === bounds.from && filters.to === bounds.to;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-3 w-full items-start xl:items-center">
      
      {!showCustom && (
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <button 
            type="button"
            onClick={() => handleQuickFilter('today')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('today')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.today', 'Today')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('yesterday')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('yesterday')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.yesterday', 'Yesterday')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('this_week')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('this_week')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.thisWeek', 'This Week')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('last_week')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('last_week')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.lastWeek', 'Last Week')}
          </button>
          
          <button 
            type="button"
            onClick={() => handleQuickFilter('this_month')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('this_month')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.thisMonth', 'This Month')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('last_month')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('last_month')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.lastMonth', 'Last Month')}
          </button>

          <button 
            type="button"
            onClick={() => handleQuickFilter('year')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('year')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.thisYear', 'This Year')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('all')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('all')
                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.allTime', 'All Time')}
          </button>
          <button 
            type="button"
            onClick={() => setShowCustom(true)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold transition-all duration-300 hover:-translate-y-0.5 text-[var(--color-text-muted)]"
          >
            <Calendar size={16} />
          </button>
        </div>
      )}

      {showCustom && (
        <div className="flex flex-wrap items-center gap-2 w-full bg-black/40 p-2 rounded-2xl border border-white/10 shadow-inner">
          <input 
            type="date" 
            className="flex-1 min-w-[120px] bg-white/5 rounded-xl border border-white/10 text-xs text-[var(--color-text-main)] outline-none px-3 py-2 font-medium"
            value={filters.from ? filters.from.split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const date = new Date(val);
                date.setHours(0,0,0,0);
                setFilters({ ...filters, from: date.toISOString(), filterType: 'custom' });
              } else {
                setFilters({ ...filters, from: '', filterType: 'custom' });
              }
            }}
            title={t('analytics.fromDate', 'From Date')}
          />
          <span className="text-[var(--color-text-muted)] text-xs font-bold px-1">-</span>
          <input 
            type="date" 
            className="flex-1 min-w-[120px] bg-white/5 rounded-xl border border-white/10 text-xs text-[var(--color-text-main)] outline-none px-3 py-2 font-medium"
            value={filters.to ? filters.to.split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const date = new Date(val);
                date.setHours(23,59,59,999);
                setFilters({ ...filters, to: date.toISOString(), filterType: 'custom' });
              } else {
                setFilters({ ...filters, to: '', filterType: 'custom' });
              }
            }}
            title={t('analytics.toDate', 'To Date')}
          />
          <button 
            onClick={() => setShowCustom(false)}
            className="p-2 ml-1 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-xl transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  );
}
