import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { updatePreferences } from '../../api/auth';

const WheelPicker = ({ options, value, onChange }) => {
  const containerRef = useRef(null);
  const ITEM_HEIGHT = 44;
  const isScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const handleScroll = (e) => {
    isScrolling.current = true;
    clearTimeout(scrollTimeout.current);
    
    const scrollTop = e.target.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    if (options[index] && options[index].value != value) {
      onChange(options[index].value);
    }

    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);
  };

  useEffect(() => {
    if (containerRef.current && !isScrolling.current) {
      const index = options.findIndex(opt => opt.value == value);
      if (index !== -1) {
        containerRef.current.scrollTo({
          top: index * ITEM_HEIGHT,
          behavior: 'smooth'
        });
      }
    }
  }, [value, options]);

  return (
    <div className="relative w-full h-[132px] overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)' }}>
      {/* Selection Highlight (Center) */}
      <div className="absolute top-1/2 left-0 right-0 h-[44px] -translate-y-1/2 bg-white/10 rounded-[10px] pointer-events-none" />
      
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory"
      >
        <div style={{ height: 44 }} />
        {options.map((opt) => {
          const isSelected = opt.value == value;
          return (
            <div 
              key={opt.value} 
              className={`h-[44px] flex items-center justify-center snap-center text-[18px] transition-all duration-200 cursor-pointer ${isSelected ? 'text-white font-bold scale-105' : 'text-white/40'}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </div>
          );
        })}
        <div style={{ height: 44 }} />
      </div>
    </div>
  );
};

const MonthlyCalendar = ({ value, onChange, isRTL }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="w-full bg-[rgba(76,43,54,0.3)] backdrop-blur-[20px] rounded-[14px] border border-white/5 p-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
      <div className="grid grid-cols-7 gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
        {days.map(day => {
          const isSelected = day == value;
          return (
            <motion.button
              key={day}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(day)}
              className={`aspect-square rounded-full flex items-center justify-center text-[14px] font-medium transition-colors ${
                isSelected 
                  ? 'bg-[#8D6346] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
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
  
  const [loading, setLoading] = useState(false);
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
      onRegisterNext(() => handleSave);
    }
  }, [period, monthDay, weekDay, onRegisterNext]);

  const selectClasses = "w-full h-[54px] bg-[rgba(76,43,54,0.3)] backdrop-blur-[20px] rounded-[10px] border border-white/5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] text-white/90 px-5 text-[16px] font-['Exo_2'] font-medium focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer";

  const weekOptions = [
    { value: 0, label: t('weekdays.sunday') },
    { value: 1, label: t('weekdays.monday') },
    { value: 2, label: t('weekdays.tuesday') },
    { value: 3, label: t('weekdays.wednesday') },
    { value: 4, label: t('weekdays.thursday') },
    { value: 5, label: t('weekdays.friday') },
    { value: 6, label: t('weekdays.saturday') },
  ];

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full flex-1 flex flex-col items-center justify-center py-6 overflow-y-auto no-scrollbar"
      >
        {/* Large Logo / Illustration Area */}
        <div className="w-full flex justify-center items-center relative shrink-0 mt-8 mb-4">
          <motion.div 
            className="w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] relative flex justify-center items-center"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <img 
              src="/images/onboarding2.png" 
              alt="Tracking Illustration" 
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            />
          </motion.div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col w-full px-6 items-center shrink-0">
          <h2 className="text-[22px] font-bold text-white text-center font-['Exo_2'] drop-shadow-sm mb-6 leading-snug max-w-[332px]">
            {t('onboarding.trackingCycleTitle')}
          </h2>

          <div className="flex flex-col w-full max-w-[340px] mx-auto items-center pb-4">
            
            <div className="w-full relative mb-4">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className={selectClasses}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="monthly" className="bg-[#2a1d15] text-white">{t('onboarding.monthly')}</option>
                <option value="weekly" className="bg-[#2a1d15] text-white">{t('onboarding.weekly')}</option>
              </select>
              <ChevronDown size={16} className={`absolute top-1/2 -translate-y-1/2 text-white/70 pointer-events-none ${isRTL ? 'left-4' : 'right-4'}`} />
            </div>

            <div className="w-full relative min-h-[150px]">
              <AnimatePresence mode="wait">
                {period === 'monthly' ? (
                  <motion.div
                    key="monthly"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full"
                  >
                    <MonthlyCalendar value={monthDay} onChange={setMonthDay} isRTL={isRTL} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="weekly"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full bg-[rgba(76,43,54,0.3)] backdrop-blur-[20px] rounded-[14px] border border-white/5 py-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]"
                  >
                    <WheelPicker options={weekOptions} value={weekDay} onChange={setWeekDay} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cycle Preview Text */}
            <div className="text-center w-full mt-6">
              <p className="text-white/80 font-bold text-[18px] font-['Exo_2'] drop-shadow-sm flex flex-wrap items-center justify-center gap-2">
                <span className="text-white/50 text-[14px] font-normal">{isRTL ? 'دورتك الحالية' : 'Your current cycle'}</span>
                <span>{getCyclePreview()}</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
