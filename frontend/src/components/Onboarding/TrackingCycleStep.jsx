import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { updatePreferences } from '../../api/auth';

const MonthlyCalendar = ({ value, onChange, isRTL, t }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDayHeaders = isRTL 
    ? ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="w-full bg-[#2B2321]/30 backdrop-blur-[32px] rounded-[22px] border border-white/10 p-2.5 sm:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]">
      {/* Day of week column headers */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
        {weekDayHeaders.map((head, idx) => (
          <span key={idx} className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            {head}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" dir={isRTL ? 'rtl' : 'ltr'}>
        {days.map(day => {
          const isSelected = day === value;
          return (
            <motion.button
              key={day}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onChange(day)}
              aria-label={`${day} ${t('onboarding.ofEveryMonth')}`}
              aria-pressed={isSelected}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 mx-auto rounded-full flex items-center justify-center text-[11.5px] sm:text-[12px] font-medium transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${
                isSelected 
                  ? 'bg-[#8D6346] text-white shadow-[0_3px_10px_rgba(141,99,70,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] font-bold scale-105' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {day}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default function TrackingCycleStep({ stepData, onRegisterNext, setLoadingGlobal }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [period, setPeriod] = useState('monthly');
  const [monthDay, setMonthDay] = useState(1);
  const [weekDay, setWeekDay] = useState(6); // Saturday default

  // Calculate current cycle dates for preview
  const getCyclePreview = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let end = new Date(start);

    if (period === 'weekly') {
      const prefWeekStart = Number(weekDay);
      let day = start.getDay();
      let diff = day >= prefWeekStart ? day - prefWeekStart : 7 - (prefWeekStart - day);
      start.setDate(start.getDate() - diff);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else {
      const prefMonthStart = Number(monthDay);
      const lastDayOfCurrentMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);

      if (start.getDate() >= actualMonthStartDay) {
        start.setDate(actualMonthStartDay);
        end.setMonth(start.getMonth() + 1);
      } else {
        start.setMonth(start.getMonth() - 1);
        const lastDayOfPrevMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        start.setDate(Math.min(prefMonthStart, lastDayOfPrevMonth));
      }
      const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      end.setDate(Math.min(prefMonthStart, lastDayOfEndMonth));
      end.setDate(end.getDate() - 1);
    }

    const formatDate = (d) => d.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    return `${formatDate(start)} → ${formatDate(end)}`;
  };

  const handleSave = async () => {
    try {
      const payload = {
        trackingPeriod: period,
        trackingStartDayMonthly: Number(monthDay),
        trackingStartDayWeekly: Number(weekDay)
      };
      const user = await updatePreferences(payload);
      localStorage.setItem('auth_user', JSON.stringify(user));
      return true;
    } catch (err) {
      console.error("Failed to update preferences:", err);
      return false;
    }
  };

  useEffect(() => {
    if (onRegisterNext) {
      onRegisterNext(handleSave);
    }
  }, [period, monthDay, weekDay, onRegisterNext]);

  const weekOptions = [
    { value: 6, label: t('weekdays.saturday') },
    { value: 0, label: t('weekdays.sunday') },
    { value: 1, label: t('weekdays.monday') },
    { value: 2, label: t('weekdays.tuesday') },
    { value: 3, label: t('weekdays.wednesday') },
    { value: 4, label: t('weekdays.thursday') },
    { value: 5, label: t('weekdays.friday') },
  ];

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full flex-1 flex flex-col items-center justify-between px-4 sm:px-6 py-1 min-h-0 overflow-hidden"
      >
        {/* Compact Vector Glass Emblem */}
        <div className="w-full flex justify-center items-center relative shrink-0 mb-2">
          <motion.div 
            className="size-16 sm:size-20 relative flex justify-center items-center"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-[#8D6346]/40 blur-xl rounded-full -z-10" />
            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#8D6346]/40 via-[#2B2321]/80 to-[#141115] border border-white/20 backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center text-[#E8C5A8]">
              <Calendar size={28} className="text-[#E8C5A8]" />
            </div>
          </motion.div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col w-full max-w-[340px] items-center shrink-0">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-white text-center font-['Exo_2'] mb-2 leading-snug">
            {t('onboarding.trackingCycleTitle')}
          </h2>

          {/* Segmented Period Switcher */}
          <div className="w-full max-w-[260px] p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 flex relative mb-2">
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`relative flex-1 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors z-10 font-['Exo_2'] ${
                period === 'monthly' ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {period === 'monthly' && (
                <motion.div
                  layoutId="cyclePeriodTab"
                  className="absolute inset-0 bg-[#8D6346] rounded-full shadow-[0_2px_8px_rgba(141,99,70,0.4)] -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {t('onboarding.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('weekly')}
              className={`relative flex-1 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors z-10 font-['Exo_2'] ${
                period === 'weekly' ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {period === 'weekly' && (
                <motion.div
                  layoutId="cyclePeriodTab"
                  className="absolute inset-0 bg-[#8D6346] rounded-full shadow-[0_2px_8px_rgba(141,99,70,0.4)] -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {t('onboarding.weekly')}
            </button>
          </div>

          <div className="w-full relative min-h-[145px]">
            <AnimatePresence mode="wait">
              {period === 'monthly' ? (
                <motion.div
                  key="monthly"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <MonthlyCalendar value={monthDay} onChange={setMonthDay} isRTL={isRTL} t={t} />
                </motion.div>
              ) : (
                <motion.div
                  key="weekly"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="w-full bg-[#2B2321]/30 backdrop-blur-[32px] rounded-[22px] border border-white/10 p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-2"
                >
                  <p className="text-[11px] text-white/60 text-center font-['Exo_2']">
                    {isRTL ? 'اختر يوم بدء الدورة الأسبوعية' : 'Select cycle start day'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" dir={isRTL ? 'rtl' : 'ltr'}>
                    {weekOptions.map(opt => {
                      const isSelected = opt.value === weekDay;
                      return (
                        <motion.button
                          key={opt.value}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setWeekDay(opt.value)}
                          className={`h-8.5 px-2 rounded-xl text-[11.5px] font-semibold transition-all flex items-center justify-center gap-1.5 border font-['Exo_2'] ${
                            isSelected
                              ? 'bg-[#8D6346] border-[#8D6346] text-white shadow-[0_2px_10px_rgba(141,99,70,0.4)]'
                              : 'bg-black/20 border-white/5 text-white/65 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {isSelected && <span className="size-1.5 rounded-full bg-white animate-pulse" />}
                          <span>{opt.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cycle Preview Badge */}
          <div className="text-center w-full mt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/50 text-[10.5px] font-normal font-['Exo_2']">{t('onboarding.currentCycleLabel')}</span>
              <span className="text-[#E8C5A8] text-[12.5px] font-bold tracking-tight font-['Exo_2'] tabular-nums">{getCyclePreview()}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
