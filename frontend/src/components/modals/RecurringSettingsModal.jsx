import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Repeat, Calendar, Clock, Bell } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomDatePicker from '../ui/CustomDatePicker';

const RecurringSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialSettings 
}) => {
  const { lang, t } = useLanguage();
  
  const [repeatType, setRepeatType] = useState(initialSettings?.repeatType || 'never');
  const [interval, setInterval] = useState(initialSettings?.interval || 1);
  const [executionTime, setExecutionTime] = useState(initialSettings?.executionTime || '09:00');
  const [neverEnds, setNeverEnds] = useState(initialSettings?.neverEnds ?? true);
  const [endDate, setEndDate] = useState(initialSettings?.endDate || '');
  const [maxOccurrences, setMaxOccurrences] = useState(initialSettings?.maxOccurrences || '');
  const [reminderEnabled, setReminderEnabled] = useState(initialSettings?.reminderEnabled || false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(initialSettings?.reminderDaysBefore || 1);

  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      repeatType,
      interval,
      executionTime,
      neverEnds,
      endDate,
      maxOccurrences,
      reminderEnabled,
      reminderDaysBefore
    });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Soft Translucent Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Pure Liquid Glass Modal Container */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
          className="relative w-full max-w-lg liquidglass sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[85dvh] overflow-hidden sm:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] z-10"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 px-6 border-b border-white/10 sticky top-0 bg-white/5 backdrop-blur-md z-10 sm:rounded-t-[2.5rem] rounded-t-[2.5rem]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#8D6346]/25 border border-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8] shadow-inner">
                <Repeat size={18} />
              </div>
              <h2 className="text-[17px] font-bold text-white tracking-wide">
                {t('recurring.settings')}
              </h2>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 bg-black/20 hover:bg-black/40 border border-white/10 rounded-full transition-colors text-white/70 hover:text-white active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto scrollbar-hide space-y-6 relative z-10">
            <div>
              <label className="block text-[12px] font-medium text-white/75 mb-2.5 px-1 tracking-wide">
                {t('recurring.repeatType')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { value: 'never', label: t('recurring.never') },
                  { value: 'daily', label: t('recurring.daily') },
                  { value: 'weekly', label: t('recurring.weekly') },
                  { value: 'monthly', label: t('recurring.monthly') },
                  { value: 'yearly', label: t('recurring.yearly') },
                  { value: 'custom', label: t('recurring.custom') }
                ].map((option) => {
                  const isSelected = repeatType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRepeatType(option.value)}
                      className={`py-3 px-3 rounded-2xl text-[13px] font-semibold transition-all duration-200 border text-center ${
                        isSelected
                          ? 'bg-[#8D6346]/40 border-[#8D6346] text-[#E8C5A8] shadow-[0_2px_12px_rgba(141,99,70,0.35)] scale-[1.02]'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {repeatType !== 'never' && (
              <div className="animate-fade-in space-y-4">
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10 shadow-inner">
                  
                  {repeatType === 'custom' && (
                    <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.02]">
                      <label className="text-[13px] font-medium text-white/85">
                        {t('recurring.interval')}
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        value={interval} 
                        onChange={(e) => setInterval(e.target.value)} 
                        className="w-20 text-center bg-black/30 border border-white/15 rounded-xl py-2 px-3 text-[13px] font-bold text-white focus:outline-none focus:border-[#8D6346] transition-colors" 
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#E8C5A8]" />
                      <label className="text-[13px] font-medium text-white/85">
                        {t('recurring.executionTime')}
                      </label>
                    </div>
                    <input 
                      type="time" 
                      value={executionTime} 
                      onChange={(e) => setExecutionTime(e.target.value)} 
                      className="w-[120px] text-center bg-black/30 border border-white/15 rounded-xl py-2 px-3 text-[13px] font-bold text-white focus:outline-none focus:border-[#8D6346] transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.02]">
                    <label className="text-[13px] font-medium text-white/85">
                      {t('recurring.neverEnds')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setNeverEnds(!neverEnds)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${neverEnds ? 'bg-[#8D6346]' : 'bg-white/15'}`}
                    >
                      <div className={`absolute top-1 ${lang === 'ar' ? (neverEnds ? 'right-7' : 'right-1') : (neverEnds ? 'left-7' : 'left-1')} w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md`} />
                    </button>
                  </div>

                  {!neverEnds && (
                    <div className="p-4 bg-white/[0.02] shadow-inner">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-medium text-white/70 mb-1.5 px-1">
                            {t('recurring.endDate')}
                          </label>
                          <button 
                            type="button" 
                            onClick={() => setIsEndDatePickerOpen(true)} 
                            className="w-full text-start bg-black/30 border border-white/15 rounded-xl py-2.5 px-3 text-[13px] font-medium text-white focus:outline-none focus:border-[#8D6346] transition-colors flex items-center justify-between"
                          >
                            <span>{endDate || t('addTransaction.customDate')}</span>
                            <Calendar size={15} className="text-white/50" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-white/70 mb-1.5 px-1">
                            {t('recurring.maxOccurrences')}
                          </label>
                          <input 
                            type="number" 
                            min="1" 
                            value={maxOccurrences} 
                            onChange={(e) => setMaxOccurrences(e.target.value)} 
                            placeholder="مثال: 12" 
                            className="w-full bg-black/30 border border-white/15 rounded-xl py-2.5 px-3 text-[13px] font-medium text-white placeholder-white/35 focus:outline-none focus:border-[#8D6346] transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 transition-colors hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-[#E8C5A8]" />
                      <label className="text-[13px] font-medium text-white/85">
                        {t('recurring.reminderEnabled')}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReminderEnabled(!reminderEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${reminderEnabled ? 'bg-[#8D6346]' : 'bg-white/15'}`}
                    >
                      <div className={`absolute top-1 ${lang === 'ar' ? (reminderEnabled ? 'right-7' : 'right-1') : (reminderEnabled ? 'left-7' : 'left-1')} w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md`} />
                    </button>
                  </div>

                  {reminderEnabled && (
                    <div className="flex items-center justify-between p-4 bg-white/[0.02] shadow-inner">
                      <label className="text-[13px] font-medium text-white/85">
                        {t('recurring.reminderDaysBefore')}
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        value={reminderDaysBefore} 
                        onChange={(e) => setReminderDaysBefore(e.target.value)} 
                        className="w-20 text-center bg-black/30 border border-white/15 rounded-xl py-2 px-3 text-[13px] font-bold text-white focus:outline-none focus:border-[#8D6346] transition-colors" 
                      />
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* Footer Save Button - Exact Match to AddTransaction Save Button */}
          <div className="p-5 px-6 border-t border-white/10 sticky bottom-0 bg-white/5 backdrop-blur-md z-10 pb-7 sm:pb-5">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 rounded-full font-semibold text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>{t('recurring.saveSettings')}</span>
            </button>
          </div>
        </motion.div>
      </div>

      {isEndDatePickerOpen && (
        <CustomDatePicker
          value={endDate || new Date().toISOString().split('T')[0]}
          onChange={setEndDate}
          onClose={() => setIsEndDatePickerOpen(false)}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

export default RecurringSettingsModal;
