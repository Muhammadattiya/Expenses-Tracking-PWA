import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, RotateCcw, Trash2, Coins, LineChart, Banknote } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from '../ui/Button';

export default function DeleteInvestmentModal({
  isOpen,
  item,
  onClose,
  onConfirm,
  loading = false
}) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !item) return null;

  const getItemIcon = () => {
    if (item.type === 'gold') return <Coins size={16} className="text-amber-400" />;
    if (item.type === 'stock') return <LineChart size={16} className="text-blue-400" />;
    return <Banknote size={16} className="text-emerald-400" />;
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        dir={isRTL ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-investment-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10"
          onClick={() => {
            if (!loading) onClose();
          }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-[#141115]/95 backdrop-blur-[32px] rounded-[2.5rem] p-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col gap-5 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Subtle Amber/Copper Hairline Accent */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#8D6346]/60 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shadow-inner shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 id="delete-investment-title" className="font-['Exo_2'] font-bold text-lg text-white tracking-tight">
                  {t('investments.deleteTitle')}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getItemIcon()}
                  <span className="text-xs font-semibold text-white/70 truncate max-w-[200px]">
                    {item.name}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Subtitle instructions */}
          <p className="text-xs leading-relaxed text-white/70">
            {t('investments.deleteModalSubtitle')}
          </p>

          {/* Two Interactive Decision Cards */}
          <div className="flex flex-col gap-3">
            {/* Option 1: Refund & Restore Balance */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !loading && onConfirm(true)}
              className="p-4 rounded-2xl bg-[#2B2321]/40 hover:bg-[#2B2321]/70 border border-[#8D6346]/40 hover:border-[#8D6346]/80 transition-all cursor-pointer shadow-inner flex flex-col gap-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                    <RotateCcw size={14} />
                  </div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {t('investments.deleteOptionRefundTitle')}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  {isRTL ? 'موصى به' : 'Recommended'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-white/60">
                {t('investments.deleteOptionRefundDesc')}
              </p>
              <div className="pt-1 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  loading={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(true);
                  }}
                  className="!py-1.5 !px-4 text-xs font-bold bg-[#8D6346] hover:bg-[#8D6346]/80 text-white"
                >
                  {t('investments.deleteConfirmRefundBtn')}
                </Button>
              </div>
            </motion.div>

            {/* Option 2: Delete Only (Keep Transaction History) */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !loading && onConfirm(false)}
              className="p-4 rounded-2xl bg-black/25 hover:bg-black/40 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer shadow-inner flex flex-col gap-2 group"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0">
                  <Trash2 size={14} />
                </div>
                <span className="text-xs font-bold text-white/90 group-hover:text-red-300 transition-colors">
                  {t('investments.deleteOptionKeepTitle')}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-white/50">
                {t('investments.deleteOptionKeepDesc')}
              </p>
              <div className="pt-1 flex justify-end">
                <Button
                  variant="danger"
                  size="sm"
                  loading={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(false);
                  }}
                  className="!py-1.5 !px-4 text-xs font-bold"
                >
                  {t('investments.deleteConfirmKeepBtn')}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Cancel */}
          <div className="pt-1 border-t border-white/5 flex justify-center">
            <Button
              variant="ghost"
              size="pill"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-semibold text-white/60 hover:text-white"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
