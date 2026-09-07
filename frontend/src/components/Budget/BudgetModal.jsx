import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategories } from '../../api/categories';
import { getAccounts } from '../../api/accounts';
import { budgetService } from '../../services/budgetService';
import { X, Loader2, Sparkles, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../ui/CustomSelect';

export default function BudgetModal({ isOpen, onClose, onSave, budgetToEdit, defaultPeriod = 'monthly' }) {
  const { t } = useLanguage();
  
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [account, setAccount] = useState('');
  const [carryOver, setCarryOver] = useState(false);
  const [isRecurring, setIsRecurring] = useState(true);
  
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState('');
  const [recommendedData, setRecommendedData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (budgetToEdit) {
        setCategory(typeof budgetToEdit.category === 'object' ? budgetToEdit.category._id : budgetToEdit.category);
        setAmount(budgetToEdit.amount.toString());
        setPeriod(budgetToEdit.period);
        setAccount(budgetToEdit.account || '');
        setCarryOver(budgetToEdit.carryOver || false);
        setIsRecurring(budgetToEdit.isRecurring !== undefined ? budgetToEdit.isRecurring : true);
      } else {
        setCategory('');
        setAmount('');
        setPeriod(defaultPeriod);
        setAccount('');
        setCarryOver(false);
        setIsRecurring(true);
      }
      setRecommendError('');
      setRecommendedData(null);
    }
  }, [isOpen, budgetToEdit]);

  const loadData = async () => {
    try {
      const [allCats, allAccs] = await Promise.all([getCategories(), getAccounts()]);
      setCategories(allCats.filter(c => c.type === 'expense'));
      setAccounts(allAccs);
    } catch (err) {
      console.error('Failed to load modal data', err);
    }
  };

  const fetchRecommendation = async (cat, per) => {
    if (!cat) return;
    
    setIsRecommending(true);
    setRecommendError('');
    
    try {
      const data = await budgetService.getRecommendation(cat, per);
      if (data && data.amount > 0) {
        setRecommendedData(data);
        // Auto-fill amount if it's a new budget and amount is empty
        if (!budgetToEdit && !amount) {
          setAmount(data.amount.toString());
        }
      } else {
        setRecommendedData(null);
      }
    } catch (err) {
      console.error('Recommendation API error:', err);
    } finally {
      setIsRecommending(false);
    }
  };

  useEffect(() => {
    if (category) {
      fetchRecommendation(category, period);
    } else {
      setRecommendedData(null);
    }
  }, [category, period]);


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category || !amount) return;

    onSave({
      category,
      amount: Number(amount),
      period,
      account: account || null,
      carryOver,
      isRecurring
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
        className="bg-[#1C1819]/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] w-full max-w-md shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative z-10 overflow-y-auto max-h-[90vh] scrollbar-hide"
      >
        {/* Inner Highlight Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20" />
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {budgetToEdit ? t('budgets.editBudget') : t('budgets.addBudget')}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">{t('budgets.category')}</label>
              <CustomSelect
                value={category}
                onChange={setCategory}
                options={categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                placeholder={t('budgets.selectCategory')}
              />
            </div>

            {/* Account Select (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                {t('budgets.account')}
                <Info size={14} className="text-white/40" />
              </label>
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

            {/* Period Select */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">{t('budgets.period')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPeriod('weekly')}
                  className={`py-3 rounded-2xl border transition-all ${
                    period === 'weekly' 
                    ? 'bg-[#8D6346]/20 border-[#8D6346]/50 text-[#8D6346] font-medium shadow-[inset_0_0_20px_rgba(141,99,70,0.1)]' 
                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'
                  }`}
                >
                  {t('budgets.weekly')}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={`py-3 rounded-2xl border transition-all ${
                    period === 'monthly' 
                    ? 'bg-[#8D6346]/20 border-[#8D6346]/50 text-[#8D6346] font-medium shadow-[inset_0_0_20px_rgba(141,99,70,0.1)]' 
                    : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'
                  }`}
                >
                  {t('budgets.monthly')}
                </button>
              </div>
            </div>

            {/* Carry Over Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div>
                <p className="text-sm font-medium text-white">{t('budgets.carryOver')}</p>
                <p className="text-xs text-white/50 mt-1 pr-4">{t('budgets.carryOverDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={carryOver}
                  onChange={(e) => setCarryOver(e.target.checked)}
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8D6346]"></div>
              </label>
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div>
                <p className="text-sm font-medium text-white">{t('budgets.recurring') || 'Recurring Budget'}</p>
                <p className="text-xs text-white/50 mt-1 pr-4">{t('budgets.recurringDesc') || 'Automatically repeats when period ends'}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8D6346]"></div>
              </label>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/70">{t('budgets.amount')}</label>
              <div className="relative">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-bold text-2xl focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all placeholder-white/20"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-white/40">{t('nav.currency')}</span>
                </div>
              </div>
            </div>

            {/* Recommendation UI */}
            <AnimatePresence>
              {isRecommending ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-center py-4 text-[#8D6346]"
                >
                  <Loader2 size={24} className="animate-spin" />
                </motion.div>
              ) : recommendedData ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  onClick={() => setAmount(recommendedData.amount.toString())}
                  className="bg-gradient-to-br from-[#8D6346]/20 to-[#141115]/20 border border-[#8D6346]/30 rounded-2xl p-4 overflow-hidden relative cursor-pointer hover:border-[#8D6346]/50 transition-all group mt-4"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={48} className="animate-pulse text-[#8D6346]" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-[#8D6346] font-semibold flex items-center gap-2 mb-1">
                      <Sparkles size={16} className="text-[#8D6346]" />
                      {t('budgets.recommendationTitle')}
                    </h4>
                    <p className="text-white/70 text-xs mb-3">{t('budgets.recommendationDesc')}</p>
                    
                    {recommendedData.basedOn && (
                      <div className="bg-black/20 rounded-lg p-2.5 mb-3 border border-white/5 inline-block">
                        <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-1">
                          {t('budgets.confidenceLabel')}
                        </p>
                        <p className="text-xs font-medium text-[#E8C5A8]">
                          {t('budgets.confidenceStats')
                            .replace('{{months}}', recommendedData.basedOn.months)
                            .replace('{{transactions}}', recommendedData.basedOn.transactions)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-white">
                        {recommendedData.amount.toLocaleString()} <span className="text-sm font-normal text-white/50">{t('nav.currency')}</span>
                      </div>
                      {Number(amount) !== recommendedData.amount && (
                        <div className="text-xs bg-[#8D6346]/20 text-[#8D6346] px-3 py-1.5 rounded-lg font-medium">
                          {t('budgets.save') || 'Apply'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            
            {recommendError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400 text-center mt-1">
                {recommendError}
              </motion.p>
            )}

            {/* Submit */}
            <div className="pt-4">
              <motion.button 
                type="submit"
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-full font-bold text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
              >
                {t('budgets.save')}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
