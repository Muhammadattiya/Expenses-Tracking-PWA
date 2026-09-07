import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import InitialAccountModal from './InitialAccountModal';
import InitialCategoryModal from './InitialCategoryModal';

export default function SetupInitialDataStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex-1 min-h-0 w-full flex items-center justify-center relative z-10 pt-6 px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="w-full h-full max-w-[380px] max-h-[380px] relative flex items-center justify-center"
        >
          <motion.div
            initial={{ y: 20, rotate: 20 }}
            animate={{ y: 0, rotate: 39.01 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              mass: 1
            }}
            className="relative w-full h-full flex items-center justify-center drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] z-10"
          >
            <img
              src={stepData?.image || "/images/onboarding1.png"}
              alt="Setup Illustration"
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(76,43,54,0.5)] to-transparent rounded-full backdrop-blur-3xl opacity-50 -z-10 scale-75" />
        </motion.div>
      </div>

      {/* Text Area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full flex flex-col items-center px-6 z-20 mt-6 pb-4 text-center shrink-0"
      >
        <h2 className="font-['Exo_2'] font-bold text-white text-[24px] leading-[1.5em] tracking-[-0.022em] mb-2">
          {t('onboarding.setupInitialDataTitle')}
        </h2>
        <p className="font-['Exo_2'] font-semibold text-white/90 text-[20px] leading-[1.5em] tracking-[-0.022em] max-w-[340px]">
          {t('onboarding.setupInitialDataDesc')}
        </p>
      </motion.div>

      {/* Buttons Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full flex flex-col items-center gap-[15px] shrink-0 pb-10 z-20 px-6"
      >
        {/* Add Account Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsAccountModalOpen(true)}
          className="w-full max-w-[317px] h-[62px] flex items-center justify-center rounded-[10px] bg-[rgba(76,43,54,0.3)] backdrop-blur-[20px] border border-white/5 transition-colors relative z-50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] group"
        >
          <span className="text-white font-['Exo_2'] font-semibold text-[16px] tracking-wide flex items-center gap-1 group-hover:text-white/90">
            {t('onboarding.addAccountBtn')}
          </span>
        </motion.button>

        {/* Add Category Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsCategoryModalOpen(true)}
          className="w-full max-w-[317px] h-[62px] flex items-center justify-center rounded-[10px] bg-[rgba(76,43,54,0.3)] backdrop-blur-[20px] border border-white/5 transition-colors relative z-50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] gap-2 group"
        >
          <span className="text-white font-['Exo_2'] font-semibold text-[16px] tracking-wide group-hover:text-white/90">
            {t('onboarding.addCategoryBtn')}
          </span>
          <div className="w-5 h-5 flex items-center justify-center">
            <Tag size={18} className="text-white/60 fill-current group-hover:text-white transition-colors" />
          </div>
        </motion.button>
      </motion.div>

      {/* Modals */}
      <InitialAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
      <InitialCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
}
