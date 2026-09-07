import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategories } from '../../api/categories';
import { getAccounts } from '../../api/accounts';
import { smartBudgetService } from '../../api/smartBudgets';
import { X, Plus, Trash2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../ui/CustomSelect';

export default function MasterBudgetModal({ isOpen, onClose, onSave, planToEdit }) {
  const { t } = useLanguage();
  
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [planCategories, setPlanCategories] = useState([]);

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
    }
  }, [isOpen, planToEdit]);

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
    if (!name.trim()) return;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1C1819]/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Inner Highlight Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20" />
        
        <div className="p-6 pb-2 border-b border-white/5 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {t('smartBudget.editMasterBudget')}
            </h2>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
          <form id="master-budget-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">{t('smartBudget.planName')}</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all placeholder-white/20"
                placeholder={t('smartBudget.planNamePlaceholder')}
                required
              />
            </div>

            {/* Account Select (Applies to all) */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                {t('budgets.account')}
                <Info size={14} className="text-white/40" />
              </label>
              <p className="text-xs text-white/40 mb-2">{t('smartBudget.accountDesc')}</p>
              <CustomSelect
                value={account}
                onChange={setAccount}
                options={[
                  { value: '', label: t('budgets.accountPlaceholder') },
                  ...accounts.map(acc => ({ value: acc._id, label: acc.name }))
                ]}
                placeholder={t('budgets.accountPlaceholder')}
                buttonClassName="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white flex justify-between items-center hover:bg-white/10 transition-colors"
              />
            </div>

            {/* Categories List */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-white/70">{t('budgets.categories')}</label>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="text-xs font-medium bg-[#8D6346]/20 text-[#8D6346] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#8D6346]/30 transition-colors"
                >
                  <Plus size={14} />
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
                      className="flex gap-2 items-start"
                    >
                      <div className="flex-1 space-y-2">
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
                        className="mt-2.5 p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
