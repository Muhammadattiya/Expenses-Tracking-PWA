import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] w-full min-h-screen flex items-center justify-center bg-[#141115] overflow-hidden overscroll-none touch-none select-none p-6"
    >
      {/* Figma Background Effects - Exactly matching Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      {/* Content Wrapper */}
      <motion.div
        initial={{ scale: 0.92, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.7, type: "spring", bounce: 0.35 }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative mb-4"
        >
          <div className="absolute inset-0 bg-[#8D6346]/30 rounded-full blur-xl scale-110" />
          <img 
            src="/assets/splash-logo.svg" 
            alt="Finova Logo" 
            className="w-[110px] h-[110px] relative z-10 drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]" 
          />
        </motion.div>

        {/* Brand Name & Tagline */}
        <div className="flex flex-col items-center gap-1.5 mb-6">
          <h1 className="text-white font-['Exo_2'] font-bold text-3xl tracking-wide">
            Finova
          </h1>
          <p className="text-[#E8C5A8]/80 text-[13px] font-medium tracking-wide">
            Redefining your money.
          </p>
        </div>

        {/* Luxury Loading Animation (Fluid Glass Dots / Bar) */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2.5 h-2.5 rounded-full bg-[#8D6346] shadow-[0_0_8px_rgba(141,99,70,0.6)]"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
                backgroundColor: ['#8D6346', '#E8C5A8', '#8D6346']
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
