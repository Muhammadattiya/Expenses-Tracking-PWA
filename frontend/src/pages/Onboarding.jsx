import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    defaultDesc: "Finova’s AI finds it, learns from it, and turns it into smarter budgets you can actually stick to. All Based on your spending ✦",
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
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [nextAction, setNextAction] = useState(null);

  const handleNext = async () => {
    if (nextAction) {
      setLoading(true);
      try {
        const success = await nextAction();
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
      const updatedUser = await completeOnboarding();
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      // Reload or navigate to trigger AuthGate re-eval
      window.location.assign('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setLoading(false);
    }
  };

  const isRTL = language === 'ar';
  const stepData = onboardingSteps[currentStep];

  return (
    <div className="relative flex flex-col min-h-[100dvh] bg-[#100E11] overflow-hidden">
      {/* Background Glowing Ellipses */}
      <div className="absolute top-[-50px] left-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Bar with Skip/Next Arrow */}
      {!isOverlayActive && (
        <div className="absolute top-12 left-6 right-6 z-20 flex justify-between items-center">
          {currentStep > 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="w-12 h-12 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors"
            >
              <ArrowLeft size={20} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
            </motion.button>
          ) : (
            <div /> // Placeholder for flex alignment
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={loading}
            className={`h-12 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors z-50 relative ${currentStep === onboardingSteps.length - 1 ? 'px-6 bg-[#8D6346] hover:bg-[#a67a5b] border-white/20' : 'w-12'}`}
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
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
          className="flex-1 flex flex-col w-full h-full absolute inset-0"
        >
          <div className="flex-1 flex flex-col w-full h-full absolute inset-0">
            {stepData.type === 'income_profile' ? (
              <IncomeProfileStep stepData={stepData} handleNext={handleNext} setLoadingGlobal={setLoading} setIsOverlayActive={setIsOverlayActive} />
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
            ) : (
              <>
                {/* Main Illustration */}
                <div className="flex-1 min-h-0 flex items-center justify-center relative z-10 pt-10 px-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 80, rotate: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0, rotate: stepData.imageRotate }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    className="w-full h-full max-w-[380px] max-h-[380px] relative flex items-center justify-center"
                  >
                    <motion.img
                      src={stepData.image}
                      alt="Onboarding"
                      className="max-w-full max-h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                      animate={stepData.floatingAnimation ? { y: [0, -10, 0] } : {}}
                      transition={stepData.floatingAnimation ? { repeat: Infinity, duration: 4, ease: "easeInOut" } : {}}
                    />
                  </motion.div>
                </div>

                {/* Text Area */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-full flex flex-col items-start px-6 z-20"
                >
                  <p dir="ltr" className={`font-['Exo_2'] font-medium tracking-[-0.022em] text-white/90 text-left ${stepData.textFormat === 'block' ? 'text-[32px] leading-[1.1em]' : 'text-[17px] leading-[1.6em]'}`}>
                    <span className="font-bold text-white drop-shadow-sm text-[20px] mr-1">{t(stepData.titleKey, stepData.defaultTitle)}</span>
                    {stepData.textFormat === 'inline' ? (
                      <>{t(stepData.descKey, stepData.defaultDesc)}</>
                    ) : (
                      <span className="block mt-4 font-normal text-[17px] leading-[1.4em] text-white/80">
                        {t(stepData.descKey, stepData.defaultDesc)}
                      </span>
                    )}
                  </p>
                </motion.div>
              </>
            )}

            {/* Spacer to preserve layout where the pagination indicator used to be */}
            <div className="w-full h-[56px] mt-auto shrink-0 pointer-events-none" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Pagination Indicator (Persistent) */}
      {!isOverlayActive && (
        <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center px-6 pb-6 z-20 pointer-events-none">
          <div className="flex items-center justify-center w-full max-w-[340px] gap-[6px]">
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
                    className="font-['Exo_2'] text-[16px] font-medium text-white/90"
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
        </div>
      )}
    </div>
  );
}
