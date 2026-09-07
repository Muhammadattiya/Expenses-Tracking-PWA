import React from 'react';
import { Pencil, Trash2, CheckCircle2, Calendar, Wallet, Repeat, Bell, Receipt } from 'lucide-react';
import { getIconComponent } from '../IconPicker';

export default function BillCard({ bill, onEdit, onDelete, onPay, onIgnore, t, lang }) {
  const money = (value) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(value || 0);

  const formattedDate = new Date(bill.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB');
  const isPaid = bill.status === 'paid';
  const CatIcon = bill.category?.icon ? getIconComponent(bill.category.icon, 'Receipt') : Receipt;

  return (
    <div className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/5 relative overflow-hidden transition-all duration-300 group flex flex-col h-full justify-between">
      
      {/* Top Invoice / Bill Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
            style={{ 
              backgroundColor: bill.category?.color ? `${bill.category.color}1A` : 'rgba(255,255,255,0.05)',
              borderColor: bill.category?.color ? `${bill.category.color}33` : 'rgba(255,255,255,0.1)',
              borderWidth: '1px',
              color: bill.category?.color || '#E8C5A8'
            }}
          >
            <CatIcon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold text-white tracking-wide truncate drop-shadow-sm">
              {bill.name}
            </h3>
            <span className="text-[12px] font-medium text-white/50 truncate block">
              {bill.account?.name || '-'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(bill)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title={t('bills.editBill')}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(bill)}
            className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title={t('common.delete')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Bill Amount Display */}
      <div className="my-2.5 px-1 flex justify-between items-baseline">
        <span className="text-[12px] font-medium text-white/60">
          {t('bills.amount')}
        </span>
        <span className="text-[22px] font-black text-white tabular-nums tracking-tight">
          {money(bill.expectedAmount)}
        </span>
      </div>

      {/* Perforated Invoice Ticket Divider with Side Cutout Notches */}
      <div className="relative my-3">
        <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#141115] border border-r-white/10 border-t-transparent border-b-transparent border-l-transparent" />
        <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#141115] border border-l-white/10 border-t-transparent border-b-transparent border-r-transparent" />
        <div className="border-t border-dashed border-white/15 w-full" />
      </div>

      {/* Invoice Metadata Row */}
      <div className="flex items-center justify-between text-[12px] font-medium text-white/70 mb-4 px-1">
        {/* Due Date with Calendar Icon */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar size={13} className="text-[#E8C5A8] shrink-0" />
          <span className="truncate tabular-nums">{formattedDate}</span>
        </div>

        {/* Repeat Frequency with Repeat Icon */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Repeat size={13} className="text-[#E8C5A8] shrink-0" />
          <span className="truncate">
            {bill.repeat && bill.repeat !== 'never'
              ? t(`recurring.${bill.repeat}`, bill.repeat)
              : t('recurring.never')}
          </span>
        </div>

        {/* Reminder Duration with Bell Icon */}
        {bill.reminderEnabled && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Bell size={13} className="text-[#E8C5A8] shrink-0" />
            <span className="truncate tabular-nums">
              {bill.reminderDaysBefore === 0
                ? t('bills.sameDay')
                : `${bill.reminderDaysBefore}${t('bills.daysShortSuffix')}`}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!isPaid ? (
        <div className="flex gap-2 w-full mt-2 rtl:flex-row-reverse">
          <button
            type="button"
            onClick={() => onPay(bill)}
            className="flex-1 py-3 rounded-full font-semibold text-[13.5px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <span>{t('bills.payNow')}</span>
          </button>
          <button
            type="button"
            onClick={() => onIgnore && onIgnore(bill)}
            className="flex-1 py-3 rounded-full font-semibold text-[13.5px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <span>{t('bills.ignoreThis')}</span>
          </button>
        </div>
      ) : (
        <div className="w-full py-2.5 rounded-full font-semibold text-[13px] text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/25 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={15} />
          <span>{t('bills.status.paid')}</span>
        </div>
      )}
    </div>
  );
}
