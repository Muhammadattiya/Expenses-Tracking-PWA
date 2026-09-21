import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { completeOnboarding } from '../api/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
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
    image: "/images/finova_logo.png",
    titleKey: "onboarding.screen1Title",
    descKey: "onboarding.screen1Desc",
    defaultTitle: "Your money",
    defaultDesc: ", finally working for you. Finova tracks your spending, understands your habits, and turns your financial data into clear, personalized insights. Predict what's next, explore what-if scenarios, and make every financial decision with confidence.",
    imageRotate: 0,
    textFormat: "inline",
    floatingAnimation: true
  },
  {
    id: 2,
    image: "/images/onboarding1.png",
    titleKey: "onboarding.screen2Title",
    descKey: "onboarding.screen2Desc",
    defaultTitle: "Make It to Payday.",
    defaultDesc: "AI analyzes your cash flow to predict how long your money will last. Know when you're on track, spot financial pressure early, and stay ahead until payday.",
    imageRotate: 39.01,
    textFormat: "block"
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
    defaultDesc: "No manual entry. Just speak your expenses and Finova's AI will parse merchants, categories, and amounts instantly.",
    textFormat: "inline"
  },
  {
    id: 6,
    image: "/images/onboarding1.png",
    type: 'setup_initial_data'
  },
  {
    id: 7,
    type: 'nova_agent_mockup',
    titleKey: "onboarding.screen4TitleMain",
    descKey: "onboarding.screen4DescMain",
    defaultTitle: "Meet Nova.",
    defaultDesc: "Your personal AI financial advisor. Nova analyzes your spending patterns, warns you before you overspend, and gives you tailored advice.",
    textFormat: "inline"
  },
  {
    id: 8,
    type: 'smart_budget_mockup',
    titleKey: "onboarding.screen5TitleMain",
    descKey: "onboarding.screen5DescMain",
    defaultTitle: "Your Spending Has a Pattern.",
    defaultDesc: "Finova's AI finds it, learns from it, and turns it into smarter budgets you can actually stick to. All Based on your spending ✦",
    textFormat: "inline"
  },
  {
    id: 9,
    type: 'effortless_tracking_mockup',
    titleKey: "onboarding.screenEffortlessTitleMain",
    descKey: "onboarding.screenEffortlessDescMain",
    defaultTitle: "Effortless Tracking.",
    defaultDesc: "No manual entry needed. With Back-Tap Shortcuts and Bank SMS Auto-Logging, Finova records every transaction instantly. You can configure them anytime from (Profile → Settings).",
    textFormat: "inline"
  },
  {
    id: 10,
    type: 'push_notifications',
    titleKey: "onboarding.screen6TitleMain",
    descKey: "onboarding.screen6DescMain",
    defaultTitle: "Know Before It Matters.",
    defaultDesc: "Enable push notifications for timely updates on your spending, budgets, bills, and AI-powered insights",
    textFormat: "inline"
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
      // Race backend call with 3.5s timeout to never hang on cold start or network latency
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

  // Normal document flow layout — same approach as Layout.jsx, AuthLayout.jsx,
  // and every other page in the app. No fixed positioning, no portals.
  return (
    <main className="relative w-full min-h-screen bg-[#100E11] overflow-hidden select-none flex flex-col hide-scrollbar">

      {/* Background Glowing Ambient Spheres Contained */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10relative w-full min-h-screen overflow-hidden select-none flex flex-col hide-scrollbar">
        <div className="relative w-full min-h-screen bg-[#8D6346] opacity-15 blur-[120px] rounded-full" />
        <div className="relative w-full min-h-screen bg-[#8D6346] opacity-20 blur-[140px] rounded-full" />
        <div className="relative w-full min-h-screen bg-[#8D6346] opacity-15 blur-[150px] rounded-full" />
      </div>

      {/* Top Bar with Skip/Next Arrow */}
      {!isOverlayActive && (
        <header className="relative top-0 left-0 right-0 pt-[max(1.5rem,env(safe-area-inset-top))] px-6 z-30 flex justify-between items-center shrink-0">
          {currentStep > 0 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              aria-label={t('common.previous', 'Previous step')}
              className="w-12 h-12 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
            >
              <ArrowLeft size={20} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
            </motion.button>
          ) : (
            <div className="w-12 h-12" />
          )}

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
            className={`h-12 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors z-50 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${currentStep === onboardingSteps.length - 1
              ? 'px-6 bg-[#8D6346] hover:bg-[#a67a5b] border-white/20'
              : stepData.type === 'income_profile'
                ? 'px-4 w-auto min-w-[54px]'
                : 'w-12'
              }`}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin text-white/90" />
            ) : currentStep === onboardingSteps.length - 1 ? (
              <span className="text-white font-bold text-[14px] font-['Exo_2']">{t('onboarding.finish')}</span>
            ) : stepData.type === 'income_profile' ? (
              <span className="text-white/90 text-[14px] font-medium font-['Exo_2']">{t('onboarding.skip')}</span>
            ) : (
              <ArrowRight size={20} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
            )}
          </motion.button>
        </header>
      )}

      {/* Step Content — flex-1 fills remaining space naturally */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          transition={{ duration: 0.35, type: 'spring', bounce: 0 }}
          className="flex-1 flex flex-col w-full min-h-0 overflow-hidden"
        >
          <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden relative z-20">
            {stepData.type === 'income_profile' ? (
              <IncomeProfileStep stepData={stepData} handleNext={handleNext} setLoadingGlobal={setLoading} setIsOverlayActive={setIsOverlayActive} onRegisterNext={setNextAction} />
            ) : stepData.type === 'tracking_cycle' ? (
              <TrackingCycleStep stepData={stepData} onRegisterNext={setNextAction} setLoadingGlobal={setLoading} />
            ) : stepData.type === 'setup_initial_data' ? (
              <SetupInitialDataStep stepData={stepData} handleNext={handleNext} />
            ) : stepData.type === 'nova_agent_mockup' ? (
              <NovaAgentMockupStep stepData={stepData} />
            ) : stepData.type === 'smart_budget_mockup' ? (
              <SmartBudgetMockupStep stepData={stepData} />
            ) : stepData.type === 'effortless_tracking_mockup' ? (
              <EffortlessTrackingStep stepData={stepData} />
            ) : stepData.type === 'push_notifications' ? (
              <PushNotificationsStep stepData={stepData} onRegisterNext={setNextAction} setLoadingGlobal={setLoading} />
            ) : stepData.type === 'voice_mockup' ? (
              <VoiceMockupStep stepData={stepData} />
            ) : currentStep === 1 ? (
              /* Step 2: Make It to Payday */
              <div className="flex-1 min-h-0 flex flex-col items-center justify-between pb-4 px-6 z-10 w-full max-w-md mx-auto">
                <div className="flex-1 min-h-0 flex items-center justify-center relative w-full pt-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="w-full max-w-[280px] aspect-square relative flex items-center justify-center"
                  >
                    <div className="absolute inset-4 bg-gradient-to-tr from-[#8D6346]/40 via-[#E8C5A8]/15 to-transparent blur-[50px] rounded-full -z-10" />
                    <motion.img
                      src={stepData.image}
                      alt="Payday Prediction"
                      width={240}
                      height={240}
                      style={{ transform: 'rotate(39.01deg)' }}
                      className="max-w-full max-h-full object-contain"
                      animate={stepData.floatingAnimation && !shouldReduceMotion ? { y: [0, -8, 0] } : {}}
                      transition={stepData.floatingAnimation && !shouldReduceMotion ? { repeat: Infinity, duration: 4, ease: "easeInOut" } : {}}
                    />

                    {/* Integrated Cash Flow Prediction Card - Completely Upright and Sharp */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="absolute -bottom-2 inset-x-0 bg-[#1F1918]/90 backdrop-blur-2xl border border-white/20 rounded-2xl p-3 shadow-[0_12px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.25)] flex items-center justify-between z-20"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-[#8D6346]/50 flex items-center justify-center text-[#E8C5A8] shadow-inner border border-white/10">
                          <span className="text-sm font-bold">✦</span>
                        </div>
                        <div className="flex flex-col text-start">
                          <span className="text-[10px] text-white/60 font-medium font-['Exo_2']">{isRTL ? 'توقع التدفق النقدي' : 'Cash Flow Prediction'}</span>
                          <span className="text-[13.5px] font-bold text-white font-['Exo_2'] tabular-nums tracking-tight">{isRTL ? 'الراتب بعد 14 يوم' : 'Payday in 14 days'}</span>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-[#34C759]/20 border border-[#34C759]/40 text-[#34C759] text-[10.5px] font-bold flex items-center gap-1.5 shadow-sm">
                        <span className="size-1.5 rounded-full bg-[#34C759] animate-pulse" />
                        <span>{isRTL ? 'آمن ومستقر' : 'On Track'}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Pure Floating Typography - No Enclosing Container */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="w-full max-w-[340px] px-1 text-start shrink-0 mt-2 bg-transparent"
                >
                  <h2 className="font-['Exo_2'] font-bold text-white text-[22px] sm:text-[24px] leading-tight tracking-tight mb-2">
                    {t(stepData.titleKey, stepData.defaultTitle)}
                  </h2>
                  <p className="font-['Exo_2'] font-normal text-white/85 text-[14px] sm:text-[15px] leading-relaxed">
                    {t(stepData.descKey, stepData.defaultDesc)}
                  </p>
                </motion.div>
              </div>
            ) : (
              /* Step 1: Welcome */
              <div className="flex-1 min-h-0 flex flex-col items-center justify-between pb-4 px-6 z-10 w-full max-w-md mx-auto">
                <div className="flex-1 min-h-0 flex items-center justify-center relative w-full pt-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                    className="w-full max-w-[280px] aspect-square relative flex items-center justify-center"
                  >
                    <div className="absolute inset-4 bg-gradient-to-tr from-[#8D6346]/45 via-[#E8C5A8]/20 to-transparent blur-[60px] rounded-full -z-10" />
                    <motion.img
                      src={stepData.image}
                      alt="Finova"
                      width={240}
                      height={240}
                      className="max-w-full max-h-full object-contain"
                      animate={stepData.floatingAnimation && !shouldReduceMotion ? { y: [0, -8, 0] } : {}}
                      transition={stepData.floatingAnimation && !shouldReduceMotion ? { repeat: Infinity, duration: 4, ease: "easeInOut" } : {}}
                    />
                  </motion.div>
                </div>

                {/* Pure Floating Typography - No Enclosing Container */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="w-full max-w-[340px] px-1 text-start shrink-0 mt-2 bg-transparent"
                >
                  <h2 className="font-['Exo_2'] font-bold text-white text-[22px] sm:text-[24px] leading-tight tracking-tight mb-2">
                    {t(stepData.titleKey, stepData.defaultTitle)}
                  </h2>
                  <p className="font-['Exo_2'] font-normal text-white/85 text-[14px] sm:text-[15px] leading-relaxed">
                    {t(stepData.descKey, stepData.defaultDesc)}
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Pagination Indicator — normal flex child at the bottom */}
      {!isOverlayActive && (
        <nav
          aria-label="Progress"
          className="shrink-0 w-full flex justify-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 z-20"
        >
          <div
            role="group"
            aria-label={t('onboarding.stepProgress', { current: currentStep + 1, total: onboardingSteps.length }, `Step ${currentStep + 1} of ${onboardingSteps.length}`)}
            className="flex items-center justify-center w-full max-w-[340px] gap-[6px]"
          >
            {[...Array(onboardingSteps.length)].map((_, idx) => (
              idx === currentStep ? (
                <motion.div
                  key={`active-${idx}`}
                  layoutId="activeDot"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex-shrink-0 flex items-center justify-center h-[32px] px-6 rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)]"
                >
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="font-['Exo_2'] text-[15px] font-medium text-white/90"
                  >
                    {idx + 1}
                  </motion.span>
                </motion.div>
              ) : (
                <motion.div
                  key={`dot-${idx}`}
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="h-[8px] flex-1 max-w-[32px] min-w-[8px] rounded-[30px] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner"
                />
              )
            ))}
          </div>
        </nav>
      )}
    </main>
  );
}
