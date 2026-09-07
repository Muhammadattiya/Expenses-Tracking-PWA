import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, X, Calendar as CalendarIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomDatePicker = ({ value, onChange, onClose }) => {
  const { lang, t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day) => {
    const d = new Date(year, month, day);
    const dStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    
    onChange(dStr);
    onClose();
  };

  const handleSelectToday = () => {
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0')
    ].join('-');
    
    onChange(todayStr);
    onClose();
  };

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weekDaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDays = lang === 'ar' ? weekDaysAr : weekDaysEn;

  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');

  const monthYearLabel = currentDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm liquidglass bg-[#1C1819]/90 backdrop-blur-2xl border border-white/15 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-6 overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#8D6346]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#8D6346]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#8D6346]/20 border border-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8]">
              <CalendarIcon size={16} />
            </div>
            <span className="text-[15px] font-bold text-white tracking-wide">
              {t('common.selectDate')}
            </span>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center bg-[#2A2325]/75 border border-white/10 rounded-2xl p-2 px-3 mb-4 relative z-10 shadow-inner">
          <button 
            type="button"
            onClick={handlePrevMonth} 
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95"
            aria-label="Previous Month"
          >
            {lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <span className="text-[14px] font-bold text-white tracking-wide capitalize">
            {monthYearLabel}
          </span>

          <button 
            type="button"
            onClick={handleNextMonth} 
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-95"
            aria-label="Next Month"
          >
            {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center relative z-10">
          {weekDays.map((d, i) => (
            <div key={i} className="text-[11px] font-semibold text-white/45 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 mb-5 text-center relative z-10">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="w-9 h-9" />;
            
            const cellDateStr = [
              year,
              String(month + 1).padStart(2, '0'),
              String(day).padStart(2, '0')
            ].join('-');

            const isSelected = value === cellDateStr;
            const isCurrentToday = todayStr === cellDateStr;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day)}
                className={`w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-[13px] font-semibold transition-all duration-200 active:scale-90 ${
                  isSelected 
                    ? 'bg-[#8D6346] text-white shadow-[0_3px_12px_rgba(141,99,70,0.45)] scale-105 font-bold border border-white/20' 
                    : isCurrentToday 
                    ? 'bg-white/10 text-white border border-[#8D6346]/80 font-bold' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Footer Quick Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 relative z-10">
          <button
            type="button"
            onClick={handleSelectToday}
            className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-[12px] font-semibold transition-all active:scale-95 text-center"
          >
            {t('common.today')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-xl bg-[#8D6346] hover:bg-[#9E7151] text-white text-[12px] font-semibold shadow-[0_2px_8px_rgba(141,99,70,0.3)] transition-all active:scale-95 text-center"
          >
            {t('common.cancel')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default CustomDatePicker;
