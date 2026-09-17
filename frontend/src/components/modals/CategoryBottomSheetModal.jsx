import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Tag } from 'lucide-react';
import { getIconComponent } from '../IconPicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function CategoryBottomSheetModal({
  isOpen,
  onClose,
  categories = [],
  selectedId,
  onSelect,
  type = 'expense'
}) {
  const { t, lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Autofocus search on desktop pointer devices without triggering mobile keyboard jump
  useEffect(() => {
    if (isOpen && window.matchMedia?.('(pointer: fine)').matches) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
          onClick={onClose}
        />

        {/* Liquid Glass Bottom Sheet */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full max-w-lg bg-[#1C1819]/95 backdrop-blur-[32px] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-[0_-8px_32px_rgba(0,0,0,0.5),0_8px_32px_rgba(0,0,0,0.5)] max-h-[85vh] flex flex-col"
        >
          {/* Top Drag Handle (Mobile only) */}
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

          {/* Modal Header */}
          <div className="flex items-center justify-between w-full mb-4 pb-2 border-b border-white/10">
            <div>
              <h3 id="category-modal-title" className="text-white font-bold text-lg tracking-wide">
                {t('addTransaction.category')}
              </h3>
              <p className="text-white/50 text-xs mt-0.5">
                {type === 'expense' ? t('addTransaction.expense') : t('addTransaction.income')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label={t('common.cancel')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar (if more than 6 categories) */}
          {categories.length > 6 && (
            <div className="relative w-full mb-4 shrink-0">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('addTransaction.searchCategories')}
                className="w-full h-10 ps-10 pe-4 bg-black/25 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#8D6346] transition-colors"
              />
            </div>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3 overflow-y-auto max-h-[55vh] py-1 pe-1 custom-scrollbar">
            {filteredCategories.length === 0 ? (
              <div className="col-span-full py-8 text-center text-white/40 text-sm">
                {t('common.noData')}
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const IconComponent = getIconComponent(cat.icon, 'Tag');
                const isSelected = selectedId === cat._id;
                const catColor = cat.color || '#8D6346';

                return (
                  <motion.button
                    key={cat._id}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelect(cat._id);
                      onClose();
                    }}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 group ${
                      isSelected
                        ? 'bg-[#8D6346]/25 border-[#8D6346] shadow-[0_0_14px_rgba(141,99,70,0.35)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/15'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 end-1.5 w-4 h-4 rounded-full bg-[#8D6346] text-white flex items-center justify-center shadow-sm">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105"
                      style={{ 
                        backgroundColor: isSelected ? `${catColor}33` : 'rgba(255,255,255,0.08)',
                        color: isSelected ? catColor : 'rgba(255,255,255,0.8)'
                      }}
                    >
                      <IconComponent size={22} />
                    </div>
                    <span 
                      className={`text-xs font-medium text-center truncate w-full px-0.5 ${
                        isSelected ? 'text-white font-semibold' : 'text-white/70 group-hover:text-white'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
