import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { getCategories, updateCategory } from '../../api/categories';
import { useLanguage } from '../../contexts/LanguageContext';

// Module-level Set to track dismissed categories for the session
const sessionDismissed = new Set();

const UNIVERSAL_INTENT_KEYS = [
  'food_and_drink', 'restaurant', 'fast_food', 'coffee', 'beverages', 'desserts', 'groceries',
  'transportation', 'fuel', 'parking',
  'bills', 'utilities', 'internet', 'phone',
  'shopping', 'clothing', 'electronics',
  'entertainment', 'cinema', 'subscriptions',
  'healthcare', 'pharmacy', 'hospital',
  'education',
  'salary', 'freelance', 'business_income', 'investment_income',
  'gifts', 'charity', 'rent', 'insurance', 'debt_payment', 'bank_fees',
  'cash_withdrawal', 'cash_deposit', 'transfer', 'savings', 'investment',
  'travel', 'personal_care', 'home', 'pets', 'children', 'family',
  'sports', 'other'
];

export default function CategoryClarificationManager() {
  const { t, lang } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const hasFetched = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        if (isMounted) {
          setCategories(data);
          hasFetched.current = true;
        }
      } catch (err) {
        console.error("Failed to load categories for clarification", err);
      }
    };

    if (!hasFetched.current) {
      fetchCategories();
    }

    return () => { isMounted = false; };
  }, []);

  const activeCategory = categories.find(c => c.intentId === null && !sessionDismissed.has(c._id));

  // If we run out of active categories, safely close the modal so it's reset if more appear
  useEffect(() => {
    if (!activeCategory && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [activeCategory, isModalOpen]);

  const handleDismiss = () => {
    if (activeCategory) {
      sessionDismissed.add(activeCategory._id);
      setCategories([...categories]);
    }
  };

  const handleSelectIntent = async (intentId) => {
    if (!activeCategory) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateCategory(activeCategory._id, { intentId });
      setCategories(categories.map(c => 
        c._id === activeCategory._id ? { ...c, intentId } : c
      ));
    } catch (err) {
      console.error(err);
      setError(t('clarification.error') || 'Could not update category intent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <>
      {/* Subtle Backdrop - Only shows when modal is open */}
      <AnimatePresence>
        {isModalOpen && activeCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsModalOpen(false)} // clicking outside minimizes back to pill
            className="fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isModalOpen && activeCategory && (
          <motion.div
            key="pill"
            layoutId="clarification-morph"
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] liquidglass cursor-pointer overflow-hidden border border-white/10 shadow-xl"
            style={{ borderRadius: 9999 }}
            onClick={() => setIsModalOpen(true)}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="flex items-center gap-2 px-3 py-2 min-w-max"
            >
              <div className="shrink-0 p-1.5 bg-white/15 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <Tag className="w-3.5 h-3.5 text-[#8D6346]" />
              </div>
              <span className="text-white/90 font-medium text-xs whitespace-nowrap pr-1">
                {t('clarification.notificationTitle') || 'Clarify a category'}
              </span>
              <ArrowIcon className="w-3.5 h-3.5 text-white/40" />
            </motion.div>
          </motion.div>
        )}

        {isModalOpen && activeCategory && (
          <motion.div
            key="modal"
            layoutId="clarification-morph"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] w-[85%] max-w-[320px] liquidglass flex flex-col border border-white/10 shadow-2xl overflow-hidden"
            style={{ borderRadius: 24, maxHeight: '60vh' }}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.15, duration: 0.2 }}
              className="flex flex-col h-full overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex flex-col items-center text-center gap-1 shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-1 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]">
                  <Tag className="w-5 h-5 text-[#8D6346]" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight leading-tight drop-shadow-sm">
                  {activeCategory.name}
                </h3>
                <p className="text-white/60 text-xs">
                  {(t('clarification.description') || "What is {name} mostly used for?").replace('{name}', activeCategory.name)}
                </p>
              </div>

              {error && (
                <div className="px-4 py-2 mx-4 mt-1 text-xs text-red-200 bg-red-500/20 rounded-lg border border-red-500/30 shrink-0">
                  {error}
                </div>
              )}

              {/* Scrollable list of intents */}
              <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0 flex flex-wrap justify-center content-start gap-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {UNIVERSAL_INTENT_KEYS.map((intentId) => {
                  const label = t(`intents.${intentId}`);
                  return (
                    <motion.button
                      key={intentId}
                      whileTap={{ scale: 0.95 }}
                      disabled={isSubmitting}
                      onClick={() => handleSelectIntent(intentId)}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 transition-all text-white/90 text-xs font-medium disabled:opacity-50 whitespace-nowrap shadow-sm active:bg-white/20"
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDismiss}
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl font-medium text-xs text-white/50 bg-white/5 border border-white/5 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin text-white/50" />
                  ) : (
                    <>
                      <X size={14} />
                      {t('clarification.skip')}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
