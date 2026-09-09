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
      className="fixed inset-0 top-0 bottom-0 left-0 right-0 z-[100] w-full min-h-screen flex items-center justify-center bg-[#141115] overflow-hidden overscroll-none touch-none select-none p-6"
    >
      {/* Ambient Theme Background Glows */}
      <div className="absolute inset-0 top-0 bottom-0 left-0 right-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.12, 1], opacity: [0.65, 0.85, 0.65] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -left-10 w-72 h-72 bg-[#8D6346] rounded-full filter blur-[140px]" 
        />
        <motion.div 
          animate={{ scale: [1.12, 1, 1.12], opacity: [0.65, 0.85, 0.65] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-16 -right-16 w-80 h-80 bg-[#8D6346] rounded-full filter blur-[150px]" 
        />
        <motion.div 
          animate={{ opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[120%] h-64 bg-[#8D6346] rounded-full filter blur-[140px]" 
        />
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
