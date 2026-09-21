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
          {/* Ambient Glow (Softened, deep copper, no high-brightness wash) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/25 to-transparent blur-2xl rounded-full -z-10 opacity-70" />

          {/* Central Finova Core Emblem - Deep Obsidian Glass with Copper F */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            className="size-16 sm:size-[72px] rounded-2xl bg-gradient-to-br from-[#2B2321] to-[#141115] backdrop-blur-2xl border border-[#8D6346]/50 shadow-[0_16px_36px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.15)] flex items-center justify-center z-10 p-3.5"
          >
            <svg 
              viewBox="50 50 188 188" 
              className="w-full h-full select-none pointer-events-none drop-shadow-[0_2px_10px_rgba(232,197,168,0.45)]"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Finova"
            >
              <path 
                d="M154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" 
                fill="#E8C5A8" 
              />
            </svg>
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
