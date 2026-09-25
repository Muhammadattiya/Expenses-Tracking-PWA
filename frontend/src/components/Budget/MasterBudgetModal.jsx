import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategories } from '../../api/categories';
import { getAccounts } from '../../api/accounts';
import { smartBudgetService } from '../../api/smartBudgets';
import { X, Plus, Trash2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../ui/CustomSelect';

export default function MasterBudgetModal({ isOpen, onClose, onSave, planToEdit }) {
  const { t, lang } = useLanguage();
  const nameInputRef = useRef(null);
  
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [planCategories, setPlanCategories] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (planToEdit) {
        setName(planToEdit.name || 'Master Budget');
        setAccount(planToEdit.account || '');
        // Fetch the full plan to get categories
        fetchPlanDetails(planToEdit._id);
      } else {
        setName('');
        setAccount('');
        setPlanCategories([]);
      }
      setFieldErrors({});
    }
  }, [isOpen, planToEdit]);

  // Autofocus name on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const formEl = document.getElementById('master-budget-form');
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchPlanDetails = async (id) => {
    try {
      const plan = await smartBudgetService.getPlanById(id);
      setPlanCategories(plan.categories.map(c => ({
        id: Math.random().toString(), // unique UI id
        category: typeof c.category === 'object' ? c.category._id : c.category,
        amount: c.suggestedAmount.toString(),
        priority: c.priority || 'Medium'
      })));
      if (plan.account) setAccount(plan.account);
    } catch (err) {
      console.error('Failed to load plan details', err);
    }
  };

  const loadData = async () => {
    try {
      const [allCats, allAccs] = await Promise.all([getCategories(), getAccounts()]);
      setCategories(allCats.filter(c => c.type === 'expense'));
      setAccounts(allAccs);
    } catch (err) {
      console.error('Failed to load modal data', err);
    }
  };

  const handleAddCategory = () => {
    setPlanCategories([...planCategories, { id: Math.random().toString(), category: '', amount: '', priority: 'Medium' }]);
  };

  const handleRemoveCategory = (id) => {
    setPlanCategories(planCategories.filter(c => c.id !== id));
  };

  const handleCategoryChange = (id, field, value) => {
    setPlanCategories(planCategories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: t('common.fillRequired') || 'Required' });
      return;
    }

    setFieldErrors({});

    // Filter out incomplete categories
    const validCategories = planCategories
      .filter(c => c.category && c.amount)
      .map(c => ({
        category: c.category,
        suggestedAmount: Number(c.amount),
        priority: c.priority
      }));

    onSave({
      name: name.trim(),
      account: account || null,
      categories: validCategories,
      availableBudget: validCategories.reduce((sum, c) => sum + c.suggestedAmount, 0)
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="master-budget-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1C1819]/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Inner Highlight Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20 pointer-events-none" />
        
        <div className="p-6 pb-4 border-b border-white/10 flex-shrink-0 sticky top-0 bg-[#1C1819]/95 backdrop-blur-md z-20">
          <div className="flex justify-between items-center">
            <h2 id="master-budget-title" className="text-xl font-bold text-white">
              {t('smartBudget.editMasterBudget')}
            </h2>
            <button 
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="w-11 h-11 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors flex items-center justify-center shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
          <form id="master-budget-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="master-budget-name" className="block text-sm font-medium text-white/70">{t('smartBudget.planName')}</label>
              <input 
                ref={nameInputRef}
                id="master-budget-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }));
                }}
                className={`w-full bg-white/5 border rounded-2xl px-4 py-3.5 text-white focus:outline-none transition-all placeholder-white/20 ${
                  fieldErrors.name
                    ? 'border-[#FF3B30] focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30]/70'
                    : 'border-white/10 focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70'
                }`}
                placeholder={t('smartBudget.planNamePlaceholder')}
                required
              />
              {fieldErrors.name && (
                <p className="text-xs text-[#FF3B30] px-1">{fieldErrors.name}</p>
              )}
            </div>

            {/* Account Select (Applies to all) */}
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-white/70 flex items-center gap-2">
                {t('budgets.account')}
                <Info size={14} className="text-white/40" />
              </span>
              <p className="text-xs text-white/40 mb-2">{t('smartBudget.accountDesc')}</p>
              <CustomSelect
                value={account}
                onChange={setAccount}
                options={[
                  { value: '', label: t('budgets.accountPlaceholder') },
                  ...accounts.map(acc => ({
                    value: acc._id,
                    label: acc.name,
                    icon: acc.icon,
                    color: acc.color,
                    subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${acc.currency || 'EGP'}` : undefined
                  }))
                ]}
                placeholder={t('budgets.accountPlaceholder')}
                buttonClassName="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white flex justify-between items-center hover:bg-white/10 transition-colors"
              />
            </div>

            {/* Categories List */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="block text-sm font-medium text-white/70">{t('budgets.categories')}</span>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="text-xs font-semibold bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[#8D6346]/30 transition-colors"
                >
                  <Plus size={15} />
                  {t('common.add')}
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {planCategories.map((cat, index) => (
                    <motion.div 
                      key={cat.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2 items-center"
                    >
                      <div className="flex-1">
                        <CustomSelect
                          value={cat.category}
                          onChange={(val) => handleCategoryChange(cat.id, 'category', val)}
                          options={categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                          placeholder={t('budgets.selectCategory')}
                          buttonClassName="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white flex justify-between items-center text-sm"
                        />
                      </div>
                      <div className="w-1/3 relative">
                        <input 
                          type="number"
                          value={cat.amount}
                          onChange={(e) => handleCategoryChange(cat.id, 'amount', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#8D6346]/70 transition-all placeholder-white/20"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat.id)}
                        aria-label={t('common.delete')}
                        className="w-11 h-11 flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                  {planCategories.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-white/40 text-sm">{t('smartBudget.noCategories')}</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </form>
        </div>

        {/* Submit */}
        <div className="p-6 border-t border-white/5 flex-shrink-0 bg-black/20">
          <motion.button 
            type="submit"
            form="master-budget-form"
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-full font-bold text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            {t('common.saveChanges')}
          </motion.button>
        </div>

      </motion.div>
    </div>,
    document.body
  );
}
