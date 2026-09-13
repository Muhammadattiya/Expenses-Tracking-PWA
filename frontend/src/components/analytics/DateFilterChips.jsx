import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Calendar, X } from 'lucide-react';

export const getFilterBounds = (type, userPrefs = {}) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDate = now.getUTCDate();

  if (type === 'all') return { from: '', to: '' };

  if (type === 'today') {
    const start = new Date(Date.UTC(currentYear, currentMonth, currentDate, 0, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999));
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (type === 'yesterday') {
    const start = new Date(Date.UTC(currentYear, currentMonth, currentDate - 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, currentMonth, currentDate - 1, 23, 59, 59, 999));
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (type === 'year') {
    const start = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999));
    return { from: start.toISOString(), to: end.toISOString() };
  }

  if (type === 'this_week' || type === 'last_week') {
    const prefWeekStart = userPrefs?.trackingStartDayWeekly !== undefined ? userPrefs.trackingStartDayWeekly : 6;
    const getWeekBounds = (dateObj) => {
      let day = dateObj.getUTCDay();
      let diff = (day - prefWeekStart + 7) % 7;
      let start = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate() - diff, 0, 0, 0, 0));
      let end = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate() - diff + 6, 23, 59, 59, 999));
      return { start, end };
    };

    if (type === 'this_week') {
      const bounds = getWeekBounds(now);
      const todayEnd = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999));
      return { from: bounds.start.toISOString(), to: todayEnd.toISOString() };
    } else if (type === 'last_week') {
      const lastWeek = new Date(Date.UTC(currentYear, currentMonth, currentDate - 7));
      const bounds = getWeekBounds(lastWeek);
      return { from: bounds.start.toISOString(), to: bounds.end.toISOString() };
    }
  } 
  
  if (type === 'this_month' || type === 'last_month') {
    if (type === 'this_month') {
      const start = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999));
      return { from: start.toISOString(), to: end.toISOString() };
    } else if (type === 'last_month') {
      const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
      return { from: start.toISOString(), to: end.toISOString() };
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
    if (showCustom || filters.filterType === 'custom') return false;
    if (filters.filterType === type) return true;
    const bounds = getFilterBounds(type, userPrefs);
    if (type === 'all') return !filters.from && !filters.to;
    
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
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.today')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('yesterday')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('yesterday')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.yesterday')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('this_week')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('this_week')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.thisWeek')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('last_week')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('last_week')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.lastWeek')}
          </button>
          
          <button 
            type="button"
            onClick={() => handleQuickFilter('this_month')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('this_month')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.thisMonth')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('last_month')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('last_month')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.lastMonth')}
          </button>

          <button 
            type="button"
            onClick={() => handleQuickFilter('year')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('year')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.thisYear')}
          </button>
          <button 
            type="button"
            onClick={() => handleQuickFilter('all')}
            className={`flex-1 xl:flex-none px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              checkActive('all')
                ? 'bg-[#8D6346]/20 text-[#8D6346] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#8D6346]/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--color-text-main)]'
            }`}
          >
            {t('analytics.filters.allTime')}
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
                const [y, m, d] = val.split('-').map(Number);
                const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
                setFilters({ ...filters, from: date.toISOString(), filterType: 'custom' });
              } else {
                setFilters({ ...filters, from: '', filterType: 'custom' });
              }
            }}
            title={t('analytics.fromDate')}
          />
          <span className="text-[var(--color-text-muted)] text-xs font-bold px-1">-</span>
          <input 
            type="date" 
            className="flex-1 min-w-[120px] bg-white/5 rounded-xl border border-white/10 text-xs text-[var(--color-text-main)] outline-none px-3 py-2 font-medium"
            value={filters.to ? filters.to.split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                const [y, m, d] = val.split('-').map(Number);
                const date = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
                setFilters({ ...filters, to: date.toISOString(), filterType: 'custom' });
              } else {
                setFilters({ ...filters, to: '', filterType: 'custom' });
              }
            }}
            title={t('analytics.toDate')}
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
