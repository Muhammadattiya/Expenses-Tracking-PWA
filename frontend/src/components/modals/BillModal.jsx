import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import CustomDatePicker from '../ui/CustomDatePicker';
import ConfirmModal from './ConfirmModal';

export default function BillModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  bill,
  accounts = [],
  categories = []
}) {
  const { lang, t } = useLanguage();

  const [name, setName] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [repeat, setRepeat] = useState('never');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  const [notes, setNotes] = useState('');

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (bill) {
        setName(bill.name || '');
        setExpectedAmount(bill.expectedAmount ? String(bill.expectedAmount) : '');
        setCategory(bill.category?._id || bill.category || '');
        setAccount(bill.account?._id || bill.account || '');
        setDueDate(bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setRepeat(bill.repeat || 'never');
        setReminderEnabled(Boolean(bill.reminderEnabled));
        setReminderDaysBefore(bill.reminderDaysBefore ?? 1);
        setNotes(bill.notes || '');
      } else {
        setName('');
        setExpectedAmount('');
        setCategory(categories.length > 0 ? categories[0]._id : '');
        setAccount(accounts.length > 0 ? accounts[0]._id : '');
        setDueDate(new Date().toISOString().split('T')[0]);
        setRepeat('never');
        setReminderEnabled(false);
        setReminderDaysBefore(1);
        setNotes('');
      }
    }
  }, [isOpen, bill, accounts, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !expectedAmount) return;

    setIsSubmitting(true);
    try {
      await onSave({
        _id: bill?._id,
        name: name.trim(),
        expectedAmount: Number(expectedAmount),
        category,
        account,
        dueDate: new Date(dueDate).toISOString(),
        repeat,
        reminderEnabled,
        reminderDaysBefore: Number(reminderDaysBefore),
        notificationEnabled: true,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error saving bill:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const repeatOptions = [
    { value: 'never', label: t('recurring.never') },
    { value: 'weekly', label: t('recurring.weekly') },
    { value: 'monthly', label: t('recurring.monthly') },
    { value: 'yearly', label: t('recurring.yearly') }
  ];

  const reminderOptions = [
    { value: 0, label: t('bills.sameDay') },
    { value: 1, label: t('bills.oneDayBefore') },
    { value: 3, label: t('bills.threeDaysBefore') },
    { value: 7, label: t('bills.sevenDaysBefore') }
  ];

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 pointer-events-auto"
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

        {/* Pure Liquid Glass Modal Container - Perfectly Sized with Zero Scroll */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
          className="relative w-full max-w-[400px] liquidglass sm:rounded-[2.2rem] rounded-[2rem] p-5 flex flex-col sm:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 className="text-[16px] font-bold text-white tracking-wide">
              {bill ? t('bills.editBill') : t('bills.addBill')}
            </h3>

            <div className="flex items-center gap-1.5">
              {bill && (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="p-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-full transition-colors text-red-400 hover:text-red-300 active:scale-95 flex items-center justify-center"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-black/20 hover:bg-black/40 border border-white/10 rounded-full transition-colors text-white/70 hover:text-white active:scale-95 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 relative z-10">
            {/* Row 1: Bill Name & Expected Amount (2-Columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                  {t('bills.name')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('bills.name')}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-[13px] font-medium text-white placeholder-white/35 focus:outline-none focus:border-[#8D6346] shadow-inner transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                  {t('bills.amount')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    min="0"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 pe-11 text-[13px] font-bold text-white focus:outline-none focus:border-[#8D6346] shadow-inner transition-all"
                  />
                  <span className="absolute end-2.5 top-2 text-[11px] text-white/50 font-semibold pointer-events-none">
                    {t('nav.currency')}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Due Date & Repeat (2-Columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                  {t('bills.dueDate')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(true)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-[12px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner transition-all hover:bg-white/[0.08]"
                >
                  <span className="truncate">{dueDate || t('addTransaction.customDate')}</span>
                  <Calendar size={14} className="text-white/50 shrink-0" />
                </button>
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                  {t('bills.repeat')}
                </label>
                <CustomSelect
                  value={repeat}
                  onChange={setRepeat}
                  options={repeatOptions}
                  placeholder={t('bills.repeat')}
                />
              </div>
            </div>

            {/* Row 3: Category & Account (2-Columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                  {t('addTransaction.category')}
                </label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={categories.map((c) => ({ value: c._id, label: c.name, icon: c.icon }))}
                  placeholder={t('addTransaction.category')}
                />
              </div>

              <div className="min-w-0">
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                  {t('addTransaction.account')}
                </label>
                <CustomSelect
                  value={account}
                  onChange={setAccount}
                  options={accounts.filter((a) => !a.isArchived).map((a) => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                  placeholder={t('addTransaction.account')}
                />
              </div>
            </div>

            {/* Row 4: Reminder Card */}
            <div className="bg-black/25 border border-white/10 p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-white/85">
                  {t('bills.reminder')}
                </span>
                <button
                  type="button"
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${reminderEnabled ? 'bg-[#8D6346]' : 'bg-white/15'}`}
                >
                  <div
                    className={`absolute top-0.5 ${lang === 'ar' ? (reminderEnabled ? 'right-5' : 'right-0.5') : (reminderEnabled ? 'left-5' : 'left-0.5')} w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md`}
                  />
                </button>
              </div>

              {reminderEnabled && (
                <div className="w-[140px]">
                  <CustomSelect
                    value={reminderDaysBefore}
                    onChange={(val) => setReminderDaysBefore(Number(val))}
                    options={reminderOptions}
                  />
                </div>
              )}
            </div>

            {/* Action Button - Standardized Save Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('modals.save')}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Delete Confirm Modal */}
          {bill && (
            <ConfirmModal
              open={isDeleteConfirmOpen}
              title={t('bills.confirmDelete')}
              message={`${t('bills.confirmDelete')} "${bill.name}"`}
              confirmText={t('common.delete')}
              cancelText={t('modals.cancelBtn')}
              confirmColor="red"
              onConfirm={() => {
                setIsDeleteConfirmOpen(false);
                onDelete(bill._id);
                onClose();
              }}
              onCancel={() => setIsDeleteConfirmOpen(false)}
            />
          )}
        </motion.div>
      </div>

      {isDatePickerOpen && (
        <CustomDatePicker
          value={dueDate || new Date().toISOString().split('T')[0]}
          onChange={setDueDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
