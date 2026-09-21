import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { createIncomeProfile } from '../../api/incomeProfiles';
import { Loader2, Sparkles, Building2, Tag, Calendar } from 'lucide-react';

export default function IncomeProfileStep({ stepData, handleNext, setLoadingGlobal, setIsOverlayActive }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [showOverlay, setShowOverlay] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: 'المرتب الأساسي',
    amount: '',
    frequency: 'monthly',
    monthDay: 1,
    weekDay: 0,
    account: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (setIsOverlayActive) setIsOverlayActive(true);

    const timer = setTimeout(() => {
      setShowOverlay(false);
      if (setIsOverlayActive) setIsOverlayActive(false);
    }, 2400);

    // Fetch accounts and categories
    const fetchData = async () => {
      try {
        const [accs, cats] = await Promise.all([getAccounts(), getCategories()]);
        setAccounts(accs);
        const incomeCats = cats.filter(c => c.type === 'income' || c.type === 'both' || !c.type);
        setCategories(incomeCats.length > 0 ? incomeCats : cats);
        
        if (accs.length > 0) {
          setFormData(prev => ({ ...prev, account: accs[0]._id }));
        }
        if (incomeCats.length > 0) {
          setFormData(prev => ({ ...prev, category: incomeCats[0]._id }));
        } else if (cats.length > 0) {
          setFormData(prev => ({ ...prev, category: cats[0]._id }));
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();

    return () => {
      clearTimeout(timer);
      if (setIsOverlayActive) setIsOverlayActive(false);
    };
  }, [setIsOverlayActive]);

  const dismissOverlay = () => {
    setShowOverlay(false);
    if (setIsOverlayActive) setIsOverlayActive(false);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    
    setLoading(true);
    setLoadingGlobal(true);
    try {
      await createIncomeProfile({
        name: formData.name || (isRTL ? 'المرتب الأساسي' : 'Primary Salary'),
        amount: Number(formData.amount),
        frequency: formData.frequency,
        monthDay: Number(formData.monthDay),
        weekDay: Number(formData.weekDay),
        account: formData.account || (accounts[0] ? accounts[0]._id : undefined),
        category: formData.category || (categories[0] ? categories[0]._id : undefined)
      });
      handleNext();
    } catch (err) {
      console.error("Error creating income profile:", err);
      // Proceed even if network/offline fallback
      handleNext();
    } finally {
      setLoading(false);
      setLoadingGlobal(false);
    }
  };

  const quickPresets = ['5,000', '10,000', '20,000', '35,000'];
  const paydayPresets = [
    { day: 1, label: isRTL ? '1 (أول الشهر)' : '1st (Start)' },
    { day: 10, label: isRTL ? '10' : '10th' },
    { day: 25, label: isRTL ? '25' : '25th' },
    { day: 30, label: isRTL ? '30 (آخر الشهر)' : '30th (End)' },
  ];

  const weekOptions = [
    { value: 0, label: t('weekdays.sunday') },
    { value: 1, label: t('weekdays.monday') },
    { value: 2, label: t('weekdays.tuesday') },
    { value: 3, label: t('weekdays.wednesday') },
    { value: 4, label: t('weekdays.thursday') },
    { value: 5, label: t('weekdays.friday') },
    { value: 6, label: t('weekdays.saturday') },
  ];

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. Transition Full-Viewport Overlay via React Portal (Eliminates bottom 56px mismatch) */}
      {showOverlay && typeof document !== 'undefined' && createPortal(
        <motion.div
          key="overlay"
          id="income-overlay"
          role="region"
          aria-label={t('onboarding.screen3Overlay')}
          onClick={dismissOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] w-screen h-[100dvh] flex flex-col items-center justify-center bg-[#100E11]/95 backdrop-blur-[28px] cursor-pointer px-6 select-none"
        >
          {/* Ambient Glow behind logo */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/40 via-[#E8C5A8]/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />

          {/* Logo with clean 39.01deg rotation */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', bounce: 0.3 }}
            className="w-52 h-52 sm:w-56 sm:h-56 mb-8 relative flex items-center justify-center pointer-events-none"
          >
            <img 
              src="/images/onboarding1.png" 
              alt="Finova"
              width={224}
              height={224}
              className="w-full h-full object-contain drop-shadow-[0_0_45px_rgba(141,99,70,0.45)] opacity-95" 
              style={{ transform: 'rotate(39.01deg)' }} 
            />
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="text-[23px] sm:text-[26px] font-bold text-center text-white font-['Exo_2'] max-w-[320px] leading-snug drop-shadow-lg"
          >
            {t('onboarding.screen3Overlay')}
          </motion.h2>
        </motion.div>,
        document.body
      )}

      {/* 2. Premium Fintech Hero Salary Layout */}
      <motion.div
        key="form-content"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full flex-1 flex flex-col items-center justify-between px-4 sm:px-6 pt-10 pb-16 min-h-0 overflow-hidden"
      >
        {/* Top Header */}
        <div className="text-center shrink-0 mb-2">
          <h2 className="text-[22px] sm:text-[24px] font-bold text-white font-['Exo_2'] tracking-tight drop-shadow-sm">
            {t('onboarding.screen3Title')}
          </h2>
          <p className="text-[12.5px] text-white/65 font-['Exo_2'] mt-1 max-w-[310px] leading-normal">
            {t('onboarding.screen3Subtitle', 'حدد دخلك الأساسي وموعد استلامه لبدء خطتك المالية الذكية')}
          </p>
        </div>

        {/* Hero Salary Card */}
        <form 
          onSubmit={handleSave} 
          className="w-full max-w-[340px] flex flex-col shrink-0"
        >
          <div className="bg-[#2B2321]/45 backdrop-blur-[32px] border border-white/15 rounded-[2rem] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col gap-3.5">
            
            {/* Row 1: Label & Frequency Segmented Pill */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#E8C5A8] font-['Exo_2'] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#E8C5A8]" />
                {t('onboarding.heroIncomeLabel', 'دخلك الأساسي')}
              </span>

              {/* Segmented Pill Toggle */}
              <div className="flex bg-black/40 p-0.5 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, frequency: 'monthly' }))}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold font-['Exo_2'] transition-all ${
                    formData.frequency === 'monthly'
                      ? 'bg-[#8D6346] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t('onboarding.monthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, frequency: 'weekly' }))}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold font-['Exo_2'] transition-all ${
                    formData.frequency === 'weekly'
                      ? 'bg-[#8D6346] text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t('onboarding.weekly')}
                </button>
              </div>
            </div>

            {/* Row 2: Hero Large Amount Input */}
            <div className="flex items-baseline justify-center gap-1.5 py-1.5 border-b border-white/10">
              <span className="text-[17px] sm:text-[19px] font-bold text-[#E8C5A8] font-['Exo_2'] select-none">
                {isRTL ? 'ج.م' : '$'}
              </span>
              <input
                id="income-amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                step="any"
                min="0"
                autoFocus
                className="w-full max-w-[200px] text-center text-[34px] sm:text-[38px] font-black text-white bg-transparent outline-none tabular-nums tracking-tight placeholder:text-white/20 focus:ring-0"
                required
              />
            </div>

            {/* Row 3: Quick Preset Chips */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {quickPresets.map((preset) => {
                const numericVal = preset.replace(/,/g, '');
                const isSelected = formData.amount === numericVal;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, amount: numericVal }))}
                    className={`flex-1 py-1 rounded-xl text-[10.5px] font-semibold font-['Exo_2'] border transition-all ${
                      isSelected
                        ? 'bg-[#8D6346]/50 border-[#E8C5A8]/50 text-white'
                        : 'bg-black/20 border-white/10 text-white/65 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            {/* Row 4: Payday Selector */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-white/70 font-['Exo_2'] flex items-center gap-1">
                  <Calendar size={12} className="text-[#E8C5A8]" />
                  {t('onboarding.paydayLabel', 'يوم القبض')}
                </span>
                <span className="text-[10px] text-white/50 font-['Exo_2']">
                  {formData.frequency === 'monthly' ? t('onboarding.ofEveryMonth') : t('onboarding.dayOfWeek')}
                </span>
              </div>

              {formData.frequency === 'monthly' ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {paydayPresets.map(preset => (
                    <button
                      key={preset.day}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, monthDay: preset.day }))}
                      className={`py-1.5 px-1 rounded-xl text-[10.5px] font-medium font-['Exo_2'] border transition-all text-center ${
                        formData.monthDay === preset.day
                          ? 'bg-[#8D6346] border-white/30 text-white shadow-inner font-bold'
                          : 'bg-black/25 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                  <select
                    id="income-weekday-select"
                    value={formData.weekDay}
                    onChange={(e) => setFormData(p => ({ ...p, weekDay: Number(e.target.value) }))}
                    className="w-full bg-transparent text-white text-[12px] p-2 outline-none"
                  >
                    {weekOptions.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-[#2B2321] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Row 5: Deposit Account & Category (Compact Chips) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Account Selector */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10">
                <Building2 size={13} className="text-[#E8C5A8] shrink-0" />
                <select
                  aria-label={t('onboarding.whereItGoes')}
                  value={formData.account}
                  onChange={(e) => setFormData(p => ({ ...p, account: e.target.value }))}
                  className="w-full bg-transparent text-white/85 text-[11px] font-medium font-['Exo_2'] outline-none cursor-pointer truncate"
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id} className="bg-[#2B2321] text-white">
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/10">
                <Tag size={13} className="text-[#E8C5A8] shrink-0" />
                <select
                  aria-label={t('onboarding.whatKind')}
                  value={formData.category}
                  onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-transparent text-white/85 text-[11px] font-medium font-['Exo_2'] outline-none cursor-pointer truncate"
                >
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id} className="bg-[#2B2321] text-white">
                      {isRTL ? cat.nameAr || cat.name : cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Primary Action Button */}
          <div className="pt-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-[48px] flex items-center justify-center rounded-2xl bg-[#8D6346] hover:bg-[#a67a5b] border border-white/20 shadow-[0_4px_20px_rgba(141,99,70,0.4),inset_0_1px_2px_rgba(255,255,255,0.25)] transition-all text-white font-bold text-[14.5px] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
            >
              {loading ? (
                <Loader2 size={19} className="animate-spin text-white/90" />
              ) : (
                <span className="text-white font-bold text-[14.5px] font-['Exo_2'] tracking-wide">
                  {t('onboarding.save')}
                </span>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
