import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export default function ErrorMessage({ message, className = '' }) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className={`bg-[#2B2321]/30 backdrop-blur-[32px] border border-red-500/30 shadow-[0_8px_32px_rgba(239,68,68,0.15)] rounded-[2rem] p-4 relative overflow-hidden ${className}`}
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 backdrop-blur-[10px] border border-red-500/20 shadow-inner flex items-center justify-center text-red-400 shrink-0">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm font-medium text-red-200/90 leading-relaxed">
            {message}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
