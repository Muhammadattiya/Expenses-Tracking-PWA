import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import AgentModal from './AgentModal';

export default function AgentButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { lang } = useLanguage();

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-44 ${lang === 'ar' ? 'left-4' : 'right-4'} z-40 w-14 h-14 rounded-full bg-brand-blue/20 backdrop-blur-xl border border-brand-blue/40 shadow-[0_4px_24px_rgba(var(--brand-blue-rgb),0.4),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center text-white`}
        style={{
          // Use inline styles to ensure it floats above other elements but doesn't overlap BottomNav center
        }}
      >
        <Sparkles size={24} className="text-brand-blue" />
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-brand-blue/20 blur-xl animate-pulse -z-10" />
      </motion.button>
      
      <AgentModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
