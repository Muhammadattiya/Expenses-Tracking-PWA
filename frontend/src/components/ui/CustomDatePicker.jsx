import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

const CustomDatePicker = ({ value, onChange, onClose }) => {
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
    // Generate YYYY-MM-DD correctly taking local timezone into account.
    const d = new Date(year, month, day);
    const dStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
    
    onChange(dStr);
    onClose();
  };

  // Calendar logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weekDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const today = new Date();
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-white/10 rounded-[2rem] shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-[var(--color-text-muted)] transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-between items-center mt-2 mb-6">
          <button onClick={handlePrevMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
            <ChevronRight className="w-5 h-5 text-[var(--color-text-main)]" />
          </button>
          <span className="text-lg font-bold text-[var(--color-text-main)] tracking-wider">
            {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition">
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-main)]" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {weekDays.map(d => (
            <div key={d} className="text-xs font-bold text-[var(--color-text-muted)] mb-2">{d}</div>
          ))}
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            
            const cellDateStr = [
              year,
              String(month + 1).padStart(2, '0'),
              String(day).padStart(2, '0')
            ].join('-');

            const isSelected = value === cellDateStr;
            const isToday = todayStr === cellDateStr;

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-200 ${
                  isSelected ? 'bg-brand-blue text-white shadow-lg scale-110' :
                  isToday ? 'bg-white/10 text-[var(--color-text-main)] border border-brand-blue/50' :
                  'text-[var(--color-text-main)] hover:bg-white/10'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomDatePicker;
