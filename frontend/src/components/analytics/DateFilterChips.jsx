import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

function DateFilterChipsComponent({ filters, setFilters, userPrefs }) {
  const { t } = useLanguage();
  const [showCustom, setShowCustom] = useState(false);
  const reduceMotion = useReducedMotion();

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
    <div className="flex flex-col xl:flex-row gap-3 w-full items-start xl:items-center min-w-0">
      <AnimatePresence mode="wait">
        {!showCustom ? (
          <motion.div 
            key="presets"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            role="group" 
            aria-label={t('analytics.fromDate')} 
            className="flex gap-2 w-full overflow-x-auto hide-scrollbar overscroll-x-contain snap-x snap-mandatory pb-1"
          >
            {['this_week', 'last_week', 'this_month', 'last_month', 'year', 'all'].map((filterKey) => {
              const isActive = checkActive(filterKey);
              const labelKey = filterKey === 'this_week' ? 'thisWeek'
                : filterKey === 'last_week' ? 'lastWeek'
                : filterKey === 'this_month' ? 'thisMonth'
                : filterKey === 'last_month' ? 'lastMonth'
                : filterKey === 'year' ? 'thisYear'
                : filterKey === 'all' ? 'allTime'
                : filterKey;

              return (
                <motion.button 
                  key={filterKey}
                  type="button"
                  aria-pressed={isActive}
                  whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  onClick={() => handleQuickFilter(filterKey)}
                  className={`relative shrink-0 snap-start px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-2xl text-[11px] font-bold ltr:tracking-wide rtl:tracking-normal whitespace-nowrap transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${
                    isActive
                      ? 'text-[#E8C5A8]' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeFilterChip"
                      className="absolute inset-0 bg-[#8D6346]/25 border border-[#8D6346]/40 rounded-2xl shadow-[0_2px_12px_rgba(141,99,70,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                      transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{t(`analytics.filters.${labelKey}`)}</span>
                </motion.button>
              );
            })}
            <motion.button 
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              onClick={() => setShowCustom(true)}
              aria-label={t('analytics.filters.custom')}
              aria-pressed={false}
              className="shrink-0 snap-start px-4 py-2.5 min-h-[44px] flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[11px] font-bold ltr:tracking-wide rtl:tracking-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 text-white/70 hover:text-white"
            >
              <Calendar size={14} />
              <span>{t('analytics.filters.custom')}</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            key="custom"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full bg-black/40 p-3 sm:p-2.5 rounded-2xl border border-white/10 shadow-inner"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 shrink-0">{t('analytics.fromDate')}:</span>
                <input 
                  type="date" 
                  className="flex-1 min-w-0 min-h-[44px] bg-white/5 rounded-xl border border-white/10 text-xs text-[var(--color-text-main)] outline-none px-2.5 py-2 font-medium focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346]/50 transition-all"
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
                  aria-label={t('analytics.fromDate')}
                />
              </div>
              <span className="hidden sm:inline text-[var(--color-text-muted)] text-xs font-bold px-0.5" aria-hidden="true">-</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 shrink-0">{t('analytics.toDate')}:</span>
                <input 
                  type="date" 
                  className="flex-1 min-w-0 min-h-[44px] bg-white/5 rounded-xl border border-white/10 text-xs text-[var(--color-text-main)] outline-none px-2.5 py-2 font-medium focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346]/50 transition-all"
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
                  aria-label={t('analytics.toDate')}
                />
              </div>
            </div>
            <motion.button 
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.92 }}
              onClick={() => setShowCustom(false)}
              aria-label={t('common.close')}
              className="p-2 ms-0 sm:ms-1 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30] hover:text-white rounded-xl transition-colors shrink-0 self-end sm:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]"
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(DateFilterChipsComponent);
