import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Lightbulb, 
  Bot, 
  ArrowRight 
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

const ICON_MAP = {
  Sparkles,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Lightbulb
};

export default function SavingsAdvicePanel({ advices = [], onAskNova = null }) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  if (!advices || advices.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lightbulb className="text-[#8D6346]" size={18} />
            {t('planning.plans.adviceSectionTitle') || 'Personalized Financial Guidance'}
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            {t('planning.plans.adviceSectionSubtitle') || 'Smart data-backed strategies calculated from your actual spending and savings pace'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {advices.map((advice, index) => {
          const IconComponent = ICON_MAP[advice.icon] || Sparkles;

          return (
            <motion.div
              key={advice.id || index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="relative overflow-hidden rounded-[2rem] p-5 bg-black/20 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-[32px] flex flex-col justify-between group hover:border-[#8D6346]/40 transition-all duration-300"
            >
              {/* Subtle Ambient Light on hover */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#8D6346]/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-[#8D6346]/20 transition-colors" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] flex items-center justify-center shrink-0 shadow-inner">
                    <IconComponent size={20} />
                  </div>
                  {advice.tag && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${advice.tagColor}`}>
                      {advice.tag}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white mb-1.5 leading-snug">
                  {advice.title}
                </h4>

                <p className="text-xs text-white/60 leading-relaxed">
                  {advice.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Ask Nova Strategic Deep-Dive Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          triggerHaptic('medium');
          if (onAskNova) onAskNova();
        }}
        className="relative overflow-hidden rounded-[2rem] p-5 bg-gradient-to-r from-[#2B2321]/60 via-[#8D6346]/20 to-[#141115]/60 border border-[#8D6346]/40 shadow-[0_8px_32px_rgba(141,99,70,0.15)] backdrop-blur-[40px] cursor-pointer group flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#8D6346]/30 border border-[#8D6346]/50 text-[#E8C5A8] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <Bot size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              {t('planning.plans.askNovaStrategy') || 'Ask Nova for Custom Strategy'}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8D6346]/30 text-[#E8C5A8] border border-[#8D6346]/50">
                AI ✦
              </span>
            </h4>
            <p className="text-xs text-white/50 mt-0.5">
              {isAr 
                ? 'استشر مساعدك الذكي للحصول على خطة ادخار مفصلة مخصصة وفق أهدافك' 
                : 'Get deep AI-driven goal pacing strategies tailored to your lifestyle'}
            </p>
          </div>
        </div>

        <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-[#8D6346]/30 text-white/60 group-hover:text-white flex items-center justify-center shrink-0 transition-colors border border-white/5">
          <ArrowRight size={18} className={isAr ? 'rotate-180' : ''} />
        </div>
      </motion.div>
    </div>
  );
}
