import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import CustomDatePicker from '../ui/CustomDatePicker';

const RecurringSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSave,
  initialSettings 
}) => {
  const { t } = useLanguage();
  
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
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
        <div className="bg-[var(--color-bg-main)] w-full max-w-lg sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-white/10 flex flex-col max-h-[85dvh] animate-slide-up">
          <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-main)] z-10 sm:rounded-t-[2rem] rounded-t-[2rem]">
            <h2 className="text-xl font-bold text-[var(--color-text-main)]">
              {t('recurring.settings', 'إعدادات التكرار')}
            </h2>
            <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto hide-scrollbar space-y-6">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('recurring.repeatType', 'نوع التكرار')}</label>
              <CustomSelect
                value={repeatType}
                onChange={setRepeatType}
                options={[
                  { value: 'never', label: t('recurring.never', 'بدون تكرار') },
                  { value: 'daily', label: t('recurring.daily', 'يومياً') },
                  { value: 'weekly', label: t('recurring.weekly', 'أسبوعياً') },
                  { value: 'monthly', label: t('recurring.monthly', 'شهرياً') },
                  { value: 'yearly', label: t('recurring.yearly', 'سنوياً') },
                  { value: 'custom', label: t('recurring.custom', 'مخصص') }
                ]}
              />
            </div>

            {repeatType !== 'never' && (
              <div className="space-y-6 animate-fade-in">
                {repeatType === 'custom' && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2">{t('recurring.interval', 'تكرار كل (أيام)')}</label>
                    <input type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)} className="field" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('recurring.executionTime', 'وقت التنفيذ')}</label>
                  <input 
                    type="time" 
                    value={executionTime} 
                    onChange={(e) => setExecutionTime(e.target.value)} 
                    className="field w-full text-left"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <label className="text-sm font-bold text-[var(--color-text-main)]">{t('recurring.neverEnds', 'تتكرر دائماً')}</label>
                  <button
                    type="button"
                    onClick={() => setNeverEnds(!neverEnds)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${neverEnds ? 'bg-brand-blue' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${neverEnds ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {!neverEnds && (
                  <div className="flex gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2">{t('recurring.endDate', 'تاريخ الانتهاء')}</label>
                      <button type="button" onClick={() => setIsEndDatePickerOpen(true)} className="field text-right block w-full bg-black/40">
                        {endDate || t('addTransaction.customDate', 'اختر التاريخ')}
                      </button>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2">{t('recurring.maxOccurrences', 'عدد المرات (اختياري)')}</label>
                      <input type="number" min="1" value={maxOccurrences} onChange={(e) => setMaxOccurrences(e.target.value)} placeholder="مثال: 12" className="field bg-black/40" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <label className="text-sm font-bold text-[var(--color-text-main)]">{t('recurring.reminderEnabled', 'تفعيل التذكير')}</label>
                  <button
                    type="button"
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${reminderEnabled ? 'bg-brand-blue' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${reminderEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {reminderEnabled && (
                  <div className="animate-fade-in p-4 rounded-xl bg-black/20 border border-white/5">
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('recurring.reminderDaysBefore', 'التذكير قبل (أيام)')}</label>
                    <input type="number" min="0" value={reminderDaysBefore} onChange={(e) => setReminderDaysBefore(e.target.value)} className="field bg-black/40" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-[var(--color-border)] sticky bottom-0 bg-[var(--color-bg-main)] z-10 pb-8 sm:pb-6">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-blue hover:bg-blue-600 text-white font-bold text-lg shadow-xl transition-all duration-300 active:scale-95"
            >
              <CheckCircle2 className="h-6 w-6" />
              {t('recurring.saveSettings', 'حفظ الإعدادات')}
            </button>
          </div>
        </div>
      </div>

      {isEndDatePickerOpen && (
        <CustomDatePicker
          value={endDate || new Date().toISOString().split('T')[0]}
          onChange={setEndDate}
          onClose={() => setIsEndDatePickerOpen(false)}
        />
      )}
    </>,
    document.body
  );
};

export default RecurringSettingsModal;
