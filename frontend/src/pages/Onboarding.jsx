import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { completeOnboarding } from '../api/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { AmbientBackground } from '../components/ui';
import IncomeProfileStep from '../components/Onboarding/IncomeProfileStep';
import TrackingCycleStep from '../components/Onboarding/TrackingCycleStep';
import VoiceMockupStep from '../components/Onboarding/VoiceMockupStep';
import SetupInitialDataStep from '../components/Onboarding/SetupInitialDataStep';
import NovaAgentMockupStep from '../components/Onboarding/NovaAgentMockupStep';
import SmartBudgetMockupStep from '../components/Onboarding/SmartBudgetMockupStep';
import EffortlessTrackingStep from '../components/Onboarding/EffortlessTrackingStep';
import PushNotificationsStep from '../components/Onboarding/PushNotificationsStep';

const onboardingSteps = [
  {
    id: 1,
    titleKey: "onboarding.screen1Title",
    descKey: "onboarding.screen1Desc",
    defaultTitle: "Your money",
    defaultDesc: ", finally working for you. Finova tracks your spending, understands your habits, and turns your financial data into clear, personalized insights. Predict what's next, explore what-if scenarios, and make every financial decision with confidence."
  },
  {
    id: 2,
    titleKey: "onboarding.screen2Title",
    descKey: "onboarding.screen2Desc",
    defaultTitle: "Make It to Payday.",
    defaultDesc: "AI analyzes your cash flow to predict how long your money will last. Know when you're on track, spot financial pressure early, and stay ahead until payday."
  },
  {
    id: 3,
    type: 'income_profile'
  },
  {
    id: 4,
    type: 'tracking_cycle'
  },
  {
    id: 5,
    type: 'voice_mockup',
    titleKey: "onboarding.screen3TitleMain",
    descKey: "onboarding.screen3DescMain",
    defaultTitle: "Just Talk. Finova Listens.",
    defaultDesc: "No manual entry. Just speak your expenses and Finova's AI will parse merchants, categories, and amounts instantly."
  },
  {
    id: 6,
    type: 'setup_initial_data'
  },
  {
    id: 7,
    type: 'nova_agent_mockup',
    titleKey: "onboarding.screen4TitleMain",
    descKey: "onboarding.screen4DescMain",
    defaultTitle: "Meet Nova.",
    defaultDesc: "Your personal AI financial advisor. Nova analyzes your spending patterns, warns you before you overspend, and gives you tailored advice."
  },
  {
    id: 8,
    type: 'smart_budget_mockup',
    titleKey: "onboarding.screen5TitleMain",
    descKey: "onboarding.screen5DescMain",
    defaultTitle: "Your Spending Has a Pattern.",
    defaultDesc: "Finova's AI finds it, learns from it, and turns it into smarter budgets you can actually stick to. All Based on your spending ✦"
  },
  {
    id: 9,
    type: 'effortless_tracking_mockup',
    titleKey: "onboarding.screenEffortlessTitleMain",
    descKey: "onboarding.screenEffortlessDescMain",
    defaultTitle: "Effortless Tracking.",
    defaultDesc: "No manual entry needed. With Back-Tap Shortcuts and Bank SMS Auto-Logging, Finova records every transaction instantly. You can configure them anytime from (Profile → Settings)."
  },
  {
    id: 10,
    type: 'push_notifications',
    titleKey: "onboarding.screen6TitleMain",
    descKey: "onboarding.screen6DescMain",
    defaultTitle: "Know Before It Matters.",
    defaultDesc: "Enable push notifications for timely updates on your spending, budgets, bills, and AI-powered insights"
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [nextAction, setNextAction] = useState(null);

  const handleNext = async () => {
    if (nextAction) {
      setLoading(true);
      try {
        let actionResult = typeof nextAction === 'function' ? nextAction() : nextAction;
        if (typeof actionResult === 'function') {
          actionResult = actionResult();
        }
        const success = await actionResult;
        if (success === false) {
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Next action failed:', error);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setNextAction(null);

    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const updatedUser = await Promise.race([
        completeOnboarding(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
      ]);
      if (updatedUser) {
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      } else {
        const cached = JSON.parse(localStorage.getItem('auth_user') || '{}');
        cached.hasCompletedOnboarding = true;
        localStorage.setItem('auth_user', JSON.stringify(cached));
      }
      window.location.assign('/');
    } catch (error) {
      console.error('Failed to complete onboarding on server, applying local fallback:', error);
      try {
        const cached = JSON.parse(localStorage.getItem('auth_user') || '{}');
        cached.hasCompletedOnboarding = true;
        localStorage.setItem('auth_user', JSON.stringify(cached));
      } catch (e) {
        console.warn('Failed to update cached auth_user:', e);
      }
      window.location.assign('/');
    } finally {
      setLoading(false);
    }
  };

  const isRTL = language === 'ar';
  const stepData = onboardingSteps[currentStep];

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative w-full min-h-[100dvh] min-h-[-webkit-fill-available] flex flex-col justify-between select-none overflow-x-hidden text-white"
    >
      {/* Universal Ambient Copper Background (Exact theme from Dashboard.jsx) */}
      <AmbientBackground variant="dashboard" />

      {/* Top Header Bar with Navigation Controls */}
      {!isOverlayActive && (
        <header className="relative w-full max-w-md mx-auto pt-[max(1rem,env(safe-area-inset-top))] px-5 pb-2 z-30 flex justify-between items-center shrink-0">
          {currentStep > 0 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              aria-label={t('common.previous', 'Previous step')}
              className="size-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/15 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
            >
              <ArrowLeft size={19} className={isRTL ? 'rotate-180' : ''} />
            </motion.button>
          ) : (
            <div className="size-11" />
          )}

          {/* Current Step Counter Badge */}
          <div className="px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/80 font-['Exo_2'] tracking-wide">
            {currentStep + 1} / {onboardingSteps.length}
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={loading}
            aria-label={
              currentStep === onboardingSteps.length - 1
                ? t('onboarding.finish')
                : stepData.type === 'income_profile'
                  ? t('onboarding.skip')
                  : t('common.next', 'Next step')
            }
            className={`h-11 flex items-center justify-center rounded-full transition-all z-50 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${
              currentStep === onboardingSteps.length - 1
                ? 'px-5 bg-gradient-to-r from-[#8D6346] to-[#A47553] hover:brightness-110 text-white font-bold border border-white/20'
                : stepData.type === 'income_profile'
                  ? 'px-4 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/15 text-white/90 text-[13px] font-medium'
                  : 'size-11 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/15 text-white/90'
            }`}
          >
            {loading ? (
              <Loader2 size={19} className="animate-spin text-white" />
            ) : currentStep === onboardingSteps.length - 1 ? (
              <span className="text-white font-bold text-[13.5px] font-['Exo_2']">{t('onboarding.finish')}</span>
            ) : stepData.type === 'income_profile' ? (
              <span className="text-white/90 text-[13.5px] font-medium font-['Exo_2']">{t('onboarding.skip')}</span>
            ) : (
              <ArrowRight size={19} className={isRTL ? 'rotate-180' : ''} />
            )}
          </motion.button>
        </header>
      )}

      {/* Main Step Canvas — Natural Full-Height Flow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          transition={{ duration: 0.35, type: 'spring', bounce: 0 }}
          className="flex-1 flex flex-col w-full min-h-0 overflow-y-auto overflow-x-hidden justify-center items-center my-auto px-4 py-2"
        >
          {stepData.type === 'income_profile' ? (
            <IncomeProfileStep
              stepData={stepData}
              handleNext={handleNext}
              setLoadingGlobal={setLoading}
              setIsOverlayActive={setIsOverlayActive}
              onRegisterNext={setNextAction}
            />
          ) : stepData.type === 'tracking_cycle' ? (
            <TrackingCycleStep
              stepData={stepData}
              onRegisterNext={setNextAction}
              setLoadingGlobal={setLoading}
            />
          ) : stepData.type === 'setup_initial_data' ? (
            <SetupInitialDataStep
              stepData={stepData}
              handleNext={handleNext}
            />
          ) : stepData.type === 'nova_agent_mockup' ? (
            <NovaAgentMockupStep stepData={stepData} />
          ) : stepData.type === 'smart_budget_mockup' ? (
            <SmartBudgetMockupStep stepData={stepData} />
          ) : stepData.type === 'effortless_tracking_mockup' ? (
            <EffortlessTrackingStep stepData={stepData} />
          ) : stepData.type === 'push_notifications' ? (
            <PushNotificationsStep
              stepData={stepData}
              onRegisterNext={setNextAction}
              setLoadingGlobal={setLoading}
            />
          ) : stepData.type === 'voice_mockup' ? (
            <VoiceMockupStep stepData={stepData} />
          ) : currentStep === 1 ? (
            /* Step 2: Make It to Payday — Live AI Forecast Hero Card */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 px-2 z-10 w-full max-w-md mx-auto">
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-full max-w-[340px] sm:max-w-[380px] rounded-[30px] p-6 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-[#2B2321]/60 via-[#1F1918]/80 to-[#141115]/90 backdrop-blur-[32px] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.25)]"
              >
                {/* Ambient Copper Core Glow */}
                <div className="absolute top-0 end-0 size-36 bg-[#8D6346]/40 blur-[36px] rounded-full pointer-events-none" />

                {/* Header: AI Badge & Health Status */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-xl bg-[#8D6346]/50 border border-white/20 flex items-center justify-center text-[#E8C5A8] shadow-sm">
                      <span className="text-xs font-bold">✦</span>
                    </div>
                    <span className="text-xs font-bold text-white font-['Exo_2']">
                      {isRTL ? 'توقع التدفق النقدي الذكي' : 'AI Cash Flow Forecast'}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 text-[#34C759] text-[10.5px] font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="size-1.5 rounded-full bg-[#34C759] animate-pulse" />
                    <span>{isRTL ? 'آمن ومستقر' : 'On Track'}</span>
                  </div>
                </div>

                {/* Main Metric: Days to Payday */}
                <div className="relative z-10 flex flex-col text-start py-1">
                  <span className="text-[11px] text-white/50 font-medium font-['Exo_2']">
                    {isRTL ? 'المدة المتبقية حتى الراتب' : 'Time Remaining Until Payday'}
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white font-['Exo_2'] tabular-nums tracking-tight">
                      14
                    </span>
                    <span className="text-sm font-semibold text-[#E8C5A8] font-['Exo_2']">
                      {isRTL ? 'يوم' : 'Days'}
                    </span>
                  </div>
                </div>

                {/* Trajectory Progress Bar */}
                <div className="relative z-10 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10.5px] text-white/60 font-['Exo_2']">
                    <span>{isRTL ? 'المصروف الفعلي: ٤٥٪' : 'Spent: 45%'}</span>
                    <span>{isRTL ? 'الأمان المالي: مرتفع' : 'Buffer: High'}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 border border-white/10 overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#8D6346] via-[#E8C5A8] to-[#34C759]"
                    />
                  </div>
                </div>

                {/* Micro Stats Row */}
                <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div className="flex flex-col p-2 rounded-xl bg-black/20 border border-white/5 text-start">
                    <span className="text-[9px] text-white/50 font-medium uppercase font-['Exo_2']">
                      {isRTL ? 'الإنفاق اليومي الآمن' : 'Safe Daily Spend'}
                    </span>
                    <span className="text-[13px] font-bold text-white font-['Exo_2'] tabular-nums">
                      $ 85 / {isRTL ? 'يوم' : 'day'}
                    </span>
                  </div>
                  <div className="flex flex-col p-2 rounded-xl bg-black/20 border border-white/5 text-start">
                    <span className="text-[9px] text-white/50 font-medium uppercase font-['Exo_2']">
                      {isRTL ? 'الفائض المتوقع' : 'Projected Surplus'}
                    </span>
                    <span className="text-[13px] font-bold text-[#34C759] font-['Exo_2'] tabular-nums">
                      +$ 420.00
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Typography Section */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-full max-w-[340px] px-1 text-start mt-6"
              >
                <h2 className="font-['Exo_2'] font-bold text-white text-[22px] sm:text-[24px] leading-tight tracking-tight mb-2">
                  {t(stepData.titleKey, stepData.defaultTitle)}
                </h2>
                <p className="font-['Exo_2'] font-normal text-white/80 text-[14px] sm:text-[15px] leading-relaxed">
                  {t(stepData.descKey, stepData.defaultDesc)}
                </p>
              </motion.div>
            </div>
          ) : (
            /* Step 1: Welcome — Finova Signature Obsidian Card */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2 px-2 z-10 w-full max-w-md mx-auto">
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-full max-w-[340px] sm:max-w-[380px] h-[210px] sm:h-[230px] rounded-[30px] p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#2B2321]/60 via-[#1F1918]/80 to-[#141115]/90 backdrop-blur-[32px] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.25)]"
              >
                {/* Ambient Copper Core Glow */}
                <div className="absolute -top-16 -end-16 size-40 bg-[#8D6346]/40 blur-[40px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-16 -start-16 size-40 bg-[#8D6346]/30 blur-[40px] rounded-full pointer-events-none" />

                {/* Card Top Row: Brand & Contactless Icon */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-gradient-to-br from-[#8D6346] to-[#2B2321] border border-white/20 flex items-center justify-center p-1.5 shadow-md">
                      <svg viewBox="50 50 188 188" className="w-full h-full" fill="none">
                        <path d="M154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" fill="#E8C5A8" />
                      </svg>
                    </div>
                    <span className="font-bold text-white tracking-wider text-sm font-['Exo_2']">FINOVA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#E8C5A8]/80">PREMIUM</span>
                    <svg className="size-5 text-white/40 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                </div>

                {/* Center Row: Metallic EMV Chip + Balance */}
                <div className="relative z-10 flex items-center justify-between my-auto">
                  {/* Golden Metallic EMV Chip */}
                  <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-[#E8C5A8] via-[#8D6346] to-[#3D2E2B] p-0.5 shadow-inner border border-white/20 flex flex-col justify-between py-1 px-1.5 opacity-90">
                    <div className="w-full h-0.5 bg-black/30 rounded-full" />
                    <div className="w-2/3 h-0.5 bg-black/30 rounded-full" />
                    <div className="w-full h-0.5 bg-black/30 rounded-full" />
                  </div>

                  <div className="flex flex-col text-end">
                    <span className="text-[10px] uppercase font-medium text-white/50 tracking-wider font-['Exo_2']">
                      {isRTL ? 'إجمالي الرصيد' : 'Total Balance'}
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-white font-['Exo_2'] tabular-nums tracking-tight">
                      $ 24,850.00
                    </span>
                  </div>
                </div>

                {/* Card Bottom Row: Member Name & Active Status */}
                <div className="flex items-center justify-between relative z-10 pt-2 border-t border-white/10">
                  <div className="flex flex-col text-start">
                    <span className="text-[9.5px] font-bold text-white/70 font-['Exo_2'] tracking-wider uppercase">
                      {isRTL ? 'عضو فينوڤا' : 'FINOVA MEMBER'}
                    </span>
                    <span className="text-[11px] font-mono text-white/50 tracking-widest">
                      •••• 4829
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 text-[#34C759] text-[10px] font-bold">
                    <span className="size-1.5 rounded-full bg-[#34C759] animate-pulse" />
                    <span>{isRTL ? 'نشط' : 'Active'}</span>
                  </div>
                </div>
              </motion.div>

              {/* Typography Section */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-full max-w-[340px] px-1 text-start mt-6"
              >
                <h2 className="font-['Exo_2'] font-bold text-white text-[22px] sm:text-[24px] leading-tight tracking-tight mb-2">
                  {t(stepData.titleKey, stepData.defaultTitle)}
                </h2>
                <p className="font-['Exo_2'] font-normal text-white/80 text-[14px] sm:text-[15px] leading-relaxed">
                  {t(stepData.descKey, stepData.defaultDesc)}
                </p>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Pagination & Safe Area Spacing */}
      {!isOverlayActive && (
        <nav
          aria-label="Progress"
          className="shrink-0 w-full flex justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 z-20"
        >
          <div
            role="group"
            aria-label={t(
              'onboarding.stepProgress',
              { current: currentStep + 1, total: onboardingSteps.length },
              `Step ${currentStep + 1} of ${onboardingSteps.length}`
            )}
            className="flex items-center justify-center w-full max-w-[340px] gap-2"
          >
            {[...Array(onboardingSteps.length)].map((_, idx) => (
              idx === currentStep ? (
                <motion.div
                  key={`active-${idx}`}
                  layoutId="activeDot"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex-shrink-0 flex items-center justify-center h-[26px] px-3.5 rounded-full bg-gradient-to-r from-[#8D6346] to-[#A47553] border border-white/20 shadow-[0_4px_16px_rgba(141,99,70,0.5)]"
                >
                  <span className="font-['Exo_2'] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                </motion.div>
              ) : (
                <div
                  key={`dot-${idx}`}
                  className="h-1.5 flex-1 max-w-[24px] min-w-[6px] rounded-full bg-white/20 backdrop-blur-md"
                />
              )
            ))}
          </div>
        </nav>
      )}
    </main>
  );
}
