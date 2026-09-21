import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { createIncomeProfile } from '../../api/incomeProfiles';
import { Loader2, Calendar } from 'lucide-react';

export default function IncomeProfileStep({ stepData, handleNext, setLoadingGlobal, setIsOverlayActive, onRegisterNext }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const shouldReduceMotion = useReducedMotion();

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

  const handleSave = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      return true;
    }
    
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
      return true;
    } catch (err) {
      console.error("Error creating income profile:", err);
      return true;
    } finally {
      setLoading(false);
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    if (onRegisterNext) {
      onRegisterNext(() => handleSave);
    }
    return () => {
      if (onRegisterNext) onRegisterNext(null);
    };
  }, [formData, onRegisterNext]);

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

  // Motion Variants for Staggered Entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 350, damping: 26 }
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* 1. Transition Full-Viewport Overlay via React Portal */}
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

      {/* 2. Holographic Finova Salary Card Experience */}
      <motion.div
        key="card-experience"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full flex-1 flex flex-col items-center justify-between px-4 sm:px-6 pt-14 sm:pt-16 pb-2 min-h-0 overflow-hidden select-none max-w-md mx-auto"
      >
        {/* Floating Top Header - Clear deliberate spacing below header bar */}
        <motion.div variants={itemVariants} className="text-center shrink-0 mb-1 px-3">
          <h2 className="text-[20px] sm:text-[22px] font-bold text-white font-['Exo_2'] tracking-tight drop-shadow-md">
            {t('onboarding.screen3Title', 'المرتب الأساسي')}
          </h2>
          <p className="text-[12px] sm:text-[13px] text-white/60 font-['Exo_2'] mt-0.5 max-w-[300px] mx-auto leading-relaxed drop-shadow-sm">
            {t('onboarding.screen3Subtitle', 'حدد دخلك الأساسي وموعد استلامه لبدء خطتك المالية الذكية')}
          </p>
        </motion.div>

        {/* The Holographic Finova Salary Card with 3D Float & Shimmer */}
        <motion.div
          dir="ltr"
          variants={itemVariants}
          style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          animate={shouldReduceMotion ? { y: 0 } : {
            y: [0, -4, 0],
            rotateX: [0, 1.2, 0],
            rotateY: [0, -1, 0]
          }}
          transition={shouldReduceMotion ? { duration: 0.3 } : {
            y: { repeat: Infinity, duration: 4.5, ease: "easeInOut" },
            rotateX: { repeat: Infinity, duration: 4.5, ease: "easeInOut" },
            rotateY: { repeat: Infinity, duration: 5.5, ease: "easeInOut" }
          }}
          className="w-full max-w-[295px] sm:max-w-[325px] aspect-[1.8/1] sm:aspect-[1.7/1] rounded-[22px] relative p-3 sm:p-3.5 flex flex-col justify-between select-none overflow-hidden shrink-0 shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.22)] border border-[#8D6346]/45 bg-gradient-to-br from-[#2B2321]/95 via-[#191413]/95 to-[#100E11]/95 my-0.5 sm:my-1"
        >
          {/* Ambient Card Glow Spheres */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#8D6346]/25 blur-2xl rounded-full pointer-events-none -z-0" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#E8C5A8]/10 blur-2xl rounded-full pointer-events-none -z-0" />
          
          {/* Authoured Diagonal Metallic Shimmer Reflection Sweep */}
          {!shouldReduceMotion && (
            <motion.div
              className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none -skew-x-12"
              animate={{ x: ['-100%', '150%'] }}
              transition={{ repeat: Infinity, repeatDelay: 3.5, duration: 1.8, ease: "easeInOut" }}
            />
          )}

          {/* Card Top Row: Brand & NFC Contactless */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="size-5.5 rounded-lg bg-[#8D6346]/40 flex items-center justify-center p-1 border border-white/10 shadow-sm">
                <svg viewBox="50 50 188 188" className="w-full h-full select-none" fill="none">
                  <path 
                    d="M154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" 
                    fill="#E8C5A8" 
                  />
                </svg>
              </div>
              <span className="text-[10.5px] font-bold tracking-wider text-[#E8C5A8] font-['Exo_2'] uppercase">
                FINOVA SALARY
              </span>
            </div>

            {/* Contactless / NFC Waves */}
            <div className="flex items-center gap-1 opacity-60">
              <svg className="w-3.5 h-3.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-2.5" />
                <path d="M5.5 17.5A6.5 6.5 0 0 0 12 11a6.5 6.5 0 0 0-6.5-6.5" />
                <path d="M2.5 20.5a10.5 10.5 0 0 0 10.5-10.5A10.5 10.5 0 0 0 2.5 0" />
              </svg>
            </div>
          </div>

          {/* Card Middle: EMV Chip & Hero Dynamic Balance */}
          <div className="flex items-center justify-between relative z-10 py-0.5">
            {/* Metallic Brushed Gold/Copper EMV Chip */}
            <div className="w-7.5 h-6 rounded-md bg-gradient-to-br from-[#E2B78D] via-[#A67A5B] to-[#593922] p-0.5 shadow-inner border border-[#F3DFC9]/40 relative overflow-hidden flex items-center justify-center">
              <div className="w-full h-full border border-black/30 rounded-sm grid grid-cols-2 grid-rows-2 opacity-50" />
            </div>

            {/* Dynamic Card Balance Display with Value Punch Animation */}
            <div className="flex flex-col items-end text-end">
              <span className="text-[7.5px] text-white/50 font-bold uppercase tracking-widest font-['Exo_2']">
                {isRTL ? 'الراتب المعتمد' : 'SALARY BALANCE'}
              </span>
              <div className="flex items-baseline gap-1">
                <motion.span 
                  key={formData.amount || '0'}
                  initial={{ scale: 0.88, opacity: 0.7, y: -2 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className="text-[21px] sm:text-[24px] font-black text-white font-['Exo_2'] tabular-nums tracking-tight drop-shadow-[0_2px_12px_rgba(232,197,168,0.35)]"
                >
                  {formData.amount && Number(formData.amount) > 0 
                    ? Number(formData.amount).toLocaleString(isRTL ? 'ar-EG' : 'en-US') 
                    : '0.00'}
                </motion.span>
                <span className="text-[11px] font-bold text-[#E8C5A8] font-['Exo_2']">
                  {isRTL ? 'ج.م' : '$'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Bottom Row: Holder & Live Payday Stamp with Fluid Morph */}
          <div className="flex items-center justify-between border-t border-white/10 pt-1 relative z-10">
            <div className="flex flex-col">
              <span className="text-[7px] uppercase tracking-wider text-white/40 font-['Exo_2']">
                {isRTL ? 'الحساب' : 'ACCOUNT'}
              </span>
              <span className="text-[9.5px] font-semibold text-white/80 font-['Exo_2']">
                {isRTL ? 'المرتب الأساسي' : 'Primary Salary'}
              </span>
            </div>

            {/* Live Payday Stamp Badge with Smooth Transition */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={`${formData.frequency}-${formData.monthDay}-${formData.weekDay}`}
                initial={{ scale: 0.85, opacity: 0, y: 2 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -2 }}
                transition={{ duration: 0.2, type: 'spring', stiffness: 450, damping: 28 }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-[#8D6346]/40 shadow-sm"
              >
                <span className="size-1.5 rounded-full bg-[#34C759] animate-pulse" />
                <span className="text-[8.5px] font-bold text-[#E8C5A8] font-['Exo_2']">
                  {formData.frequency === 'monthly'
                    ? (isRTL ? `يوم ${formData.monthDay} شهرياً` : `Day ${formData.monthDay} Monthly`)
                    : (isRTL ? 'أسبوعياً' : 'Weekly')}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Generous Tactile Control Deck - Prominent, Easy-to-Tap Buttons */}
        <motion.div variants={itemVariants} className="w-full max-w-[310px] sm:max-w-[340px] flex flex-col items-center gap-2.5 sm:gap-3 shrink-0 my-auto py-1">
          {/* Row 1: Direct Numeric Input & Sliding Frequency Toggle (48px Height) */}
          <div className="w-full flex items-center gap-2">
            <div className="flex-1 flex items-center justify-between h-12 px-3.5 rounded-2xl bg-white/5 border border-white/15 focus-within:border-[#8D6346] focus-within:shadow-[0_0_16px_rgba(141,99,70,0.35)] transition-all">
              <input
                id="income-amount"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                placeholder={isRTL ? "أدخل الراتب..." : "Enter salary..."}
                step="any"
                min="0"
                className="w-full text-start text-[18px] sm:text-[19px] font-black text-white bg-transparent outline-none tabular-nums placeholder:text-white/30 focus:ring-0 font-['Exo_2']"
              />
              <span className="text-[14px] font-bold text-[#E8C5A8] font-['Exo_2'] select-none shrink-0 ms-1.5">
                {isRTL ? 'ج.م' : '$'}
              </span>
            </div>

            {/* Sliding Segmented Frequency Pill (48px Height) */}
            <div className="inline-flex bg-black/40 backdrop-blur-xl p-1 rounded-2xl border border-white/15 shrink-0 h-12 items-center relative shadow-sm">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, frequency: 'monthly' }))}
                className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-[12.5px] font-bold font-['Exo_2'] transition-colors z-10 touch-manipulation ${
                  formData.frequency === 'monthly'
                    ? 'text-white'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {formData.frequency === 'monthly' && (
                  <motion.div
                    layoutId="incomeFrequencyPill"
                    className="absolute inset-0 bg-[#8D6346] rounded-xl shadow-[0_2px_8px_rgba(141,99,70,0.5)] -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                {t('onboarding.monthly')}
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, frequency: 'weekly' }))}
                className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-[12.5px] font-bold font-['Exo_2'] transition-colors z-10 touch-manipulation ${
                  formData.frequency === 'weekly'
                    ? 'text-white'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {formData.frequency === 'weekly' && (
                  <motion.div
                    layoutId="incomeFrequencyPill"
                    className="absolute inset-0 bg-[#8D6346] rounded-xl shadow-[0_2px_8px_rgba(141,99,70,0.5)] -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                {t('onboarding.weekly')}
              </button>
            </div>
          </div>

          {/* Row 2: Quick Amount Presets (Generous 40px-44px Height & 13px+ Typography) */}
          <div className="grid grid-cols-4 gap-2 w-full">
            {quickPresets.map((preset) => {
              const numericVal = preset.replace(/,/g, '');
              const isSelected = formData.amount === numericVal;
              return (
                <motion.button
                  key={preset}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setFormData(p => ({ ...p, amount: numericVal }))}
                  className={`h-10 sm:h-11 rounded-xl text-[12.5px] sm:text-[13px] font-extrabold font-['Exo_2'] transition-all flex items-center justify-center border relative overflow-hidden touch-manipulation ${
                    isSelected
                      ? 'bg-[#8D6346] border-[#E8C5A8]/70 text-white shadow-[0_4px_14px_rgba(141,99,70,0.5)] scale-[1.02]'
                      : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10 hover:text-white shadow-sm'
                  }`}
                >
                  {preset}
                </motion.button>
              );
            })}
          </div>

          {/* Row 3: Payday Selector Strip (Generous 40px-44px Height Chips) */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar size={13} className="text-[#E8C5A8]" />
              <span className="text-[12px] sm:text-[12.5px] font-bold text-white/80 font-['Exo_2']">
                {t('onboarding.paydayLabel', 'موعد استلام الراتب')}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {formData.frequency === 'monthly' ? (
                <motion.div 
                  key="monthly-payday-chips"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-4 gap-2 w-full"
                >
                  {paydayPresets.map(preset => (
                    <motion.button
                      key={preset.day}
                      type="button"
                      whileTap={{ scale: 0.93 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setFormData(p => ({ ...p, monthDay: preset.day }))}
                      className={`h-10 sm:h-11 px-1 rounded-xl text-[11.5px] sm:text-[12px] font-bold font-['Exo_2'] border transition-all flex items-center justify-center text-center touch-manipulation ${
                        formData.monthDay === preset.day
                          ? 'bg-[#8D6346] border-white/30 text-white shadow-[0_4px_14px_rgba(141,99,70,0.45)] scale-[1.02]'
                          : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10 hover:text-white shadow-sm'
                      }`}
                    >
                      {preset.label}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="weekly-payday-select"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="flex bg-black/40 border border-white/15 rounded-2xl overflow-hidden w-full h-10 sm:h-11 px-3.5 items-center shadow-sm"
                >
                  <select
                    id="income-weekday-select"
                    value={formData.weekDay}
                    onChange={(e) => setFormData(p => ({ ...p, weekDay: Number(e.target.value) }))}
                    className="w-full bg-transparent text-white text-[13px] font-bold py-1 outline-none cursor-pointer text-center font-['Exo_2']"
                  >
                    {weekOptions.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-[#2B2321] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Row 4: Primary Action Button (Generous 48px-52px Hero Size) */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            type="button"
            onClick={async () => {
              await handleSave();
              handleNext();
            }}
            disabled={loading}
            className="w-full h-12 sm:h-12.5 flex items-center justify-center rounded-2xl bg-[#8D6346] hover:bg-[#9E7151] border border-white/20 shadow-[0_8px_24px_rgba(141,99,70,0.5),inset_0_1px_2px_rgba(255,255,255,0.25)] transition-all text-white font-bold text-[14.5px] sm:text-[15px] cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] mt-1"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin text-white/90" />
            ) : (
              <AnimatePresence mode="wait">
                <motion.span 
                  key={Boolean(formData.amount && Number(formData.amount) > 0)}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="text-white font-bold text-[14.5px] sm:text-[15px] font-['Exo_2'] tracking-wide"
                >
                  {formData.amount && Number(formData.amount) > 0 
                    ? (isRTL ? 'حفظ ومتابعة' : 'Save & Continue') 
                    : (isRTL ? 'متابعة بدون حفظ' : 'Continue without saving')}
                </motion.span>
              </AnimatePresence>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
