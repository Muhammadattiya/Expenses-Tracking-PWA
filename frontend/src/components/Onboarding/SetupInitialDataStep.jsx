import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Sparkles, Building2, Wallet, ShoppingCart, Coffee } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import InitialAccountModal from './InitialAccountModal';
import InitialCategoryModal from './InitialCategoryModal';

export default function SetupInitialDataStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-12 pb-16 px-4 sm:px-6 relative z-10 items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Starter Accounts & Categories Canvas */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center relative z-10 pt-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-full max-w-[320px] aspect-[4/3] relative flex items-center justify-center"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/35 via-[#E8C5A8]/15 to-transparent blur-3xl rounded-full -z-10" />

          {/* Central Finova Core Emblem */}
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            className="size-16 rounded-2xl bg-gradient-to-br from-[#8D6346]/80 to-[#2B2321] backdrop-blur-2xl border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] flex items-center justify-center z-10"
          >
            <Sparkles className="size-8 text-[#E8C5A8]" />
          </motion.div>

          {/* Orbiting Starter Chips */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
            className="absolute top-2 left-2 px-3 py-1.5 rounded-xl bg-[#2B2321]/70 backdrop-blur-xl border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center gap-2"
          >
            <div className="size-6 rounded-lg bg-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8]">
              <Building2 size={13} />
            </div>
            <span className="text-white/90 text-[11.5px] font-semibold font-['Exo_2']">
              {isRTL ? 'حساب بنكي' : 'Bank Account'}
            </span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 0.4 }}
            className="absolute top-2 right-2 px-3 py-1.5 rounded-xl bg-[#2B2321]/70 backdrop-blur-xl border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center gap-2"
          >
            <div className="size-6 rounded-lg bg-[#34C759]/30 flex items-center justify-center text-[#34C759]">
              <Wallet size={13} />
            </div>
            <span className="text-white/90 text-[11.5px] font-semibold font-['Exo_2']">
              {isRTL ? 'محفظة كاش' : 'Cash Wallet'}
            </span>
          </motion.div>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.2 }}
            className="absolute bottom-2 left-2 px-3 py-1.5 rounded-xl bg-[#2B2321]/70 backdrop-blur-xl border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center gap-2"
          >
            <div className="size-6 rounded-lg bg-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
              <ShoppingCart size={13} />
            </div>
            <span className="text-white/90 text-[11.5px] font-semibold font-['Exo_2']">
              {isRTL ? 'سوبر ماركت' : 'Groceries'}
            </span>
          </motion.div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut", delay: 0.6 }}
            className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-[#2B2321]/70 backdrop-blur-xl border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center gap-2"
          >
            <div className="size-6 rounded-lg bg-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8]">
              <Coffee size={13} />
            </div>
            <span className="text-white/90 text-[11.5px] font-semibold font-['Exo_2']">
              {isRTL ? 'مطاعم ومقاهي' : 'Dining'}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Pure Floating Typography */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full max-w-[340px] px-3 py-2 z-20 text-start shrink-0 my-2"
      >
        <h2 className="font-['Exo_2'] font-bold text-white text-[21px] sm:text-[23px] leading-tight tracking-tight mb-1.5 drop-shadow-md">
          {t('onboarding.setupInitialDataTitle')}
        </h2>
        <p className="font-['Exo_2'] font-normal text-white/85 text-[14px] sm:text-[14.5px] leading-relaxed drop-shadow-sm">
          {t('onboarding.setupInitialDataDesc')}
        </p>
      </motion.div>

      {/* Buttons Area */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-full flex items-center gap-2.5 shrink-0 z-20 max-w-[340px] mx-auto"
      >
        {/* Add Account Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsAccountModalOpen(true)}
          className="flex-1 h-[48px] flex items-center justify-center rounded-2xl bg-[#2B2321]/40 backdrop-blur-[32px] border border-white/15 hover:border-[#8D6346]/50 hover:bg-[#8D6346]/25 transition-all relative z-50 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] group touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
        >
          <span className="text-white font-['Exo_2'] font-semibold text-[13.5px] tracking-wide flex items-center gap-1.5">
            <Plus size={16} className="text-[#E8C5A8]" />
            {t('onboarding.addAccountBtn')}
          </span>
        </motion.button>

        {/* Add Category Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex-1 h-[48px] flex items-center justify-center rounded-2xl bg-[#2B2321]/40 backdrop-blur-[32px] border border-white/15 hover:border-[#8D6346]/50 hover:bg-[#8D6346]/25 transition-all relative z-50 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] group touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
        >
          <span className="text-white font-['Exo_2'] font-semibold text-[13.5px] tracking-wide flex items-center gap-1.5">
            <Tag size={15} className="text-[#E8C5A8]" />
            {t('onboarding.addCategoryBtn')}
          </span>
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
