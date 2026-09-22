import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

export default function PullToRefresh({ children, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOverThreshold, setIsOverThreshold] = useState(false);
  const isOverThresholdRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  
  const containerRef = useRef(null);
  const indicatorRef = useRef(null);
  const arrowRef = useRef(null);
  
  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullProgress = useRef(0);
  
  const { t } = useLanguage();
  const location = useLocation();

  const MAX_PULL = 120;
  const THRESHOLD = 80;
  const RESTING_OFFSET = 48;
  const HIDDEN_OFFSET = -60;

  useEffect(() => {
    // Prevent default overscroll bounce on body when PWA is installed
    document.body.style.overscrollBehaviorY = 'none';
    document.documentElement.style.overscrollBehaviorY = 'none';
    return () => {
      document.body.style.overscrollBehaviorY = '';
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, []);

  const updateDOM = (pull) => {
    if (!indicatorRef.current) return;
    
    // Progressive opacity and rotation matching drag kinematics
    const opacity = Math.min(pull / (THRESHOLD * 0.65), 1);
    const rotation = (pull / THRESHOLD) * 360;
    
    // Smoothly glide from HIDDEN_OFFSET (-70px) down to RESTING_OFFSET (+16px)
    const progress = Math.min(pull / THRESHOLD, 1.25);
    const yPos = HIDDEN_OFFSET + progress * (Math.abs(HIDDEN_OFFSET) + RESTING_OFFSET);
    
    indicatorRef.current.style.transform = `translate3d(0, ${yPos}px, 0)`;
    indicatorRef.current.style.opacity = pull > 0 ? opacity : 0;
    
    if (arrowRef.current) {
      arrowRef.current.style.transform = `rotateZ(${rotation}deg) translateZ(0)`;
    }
  };

  const handleTouchStart = (e) => {
    if (isRefreshing || location.pathname !== '/') return;

    let current = e.target;
    let isAtTop = window.scrollY <= 0;

    // Traverse up to see if any scrollable parent is not at the top
    while (current && current !== document.body && current !== document.documentElement) {
      if (current.scrollTop > 0) {
        isAtTop = false;
        break;
      }
      current = current.parentNode;
    }

    if (isAtTop) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      pullProgress.current = 0;
      
      if (indicatorRef.current) {
        indicatorRef.current.style.transition = 'none';
      }
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    if (deltaY > 0 && window.scrollY <= 0) {
      if (e.cancelable) e.preventDefault();
      
      const friction = 0.7;
      const pull = Math.min(deltaY * friction, MAX_PULL);
      pullProgress.current = pull;
      
      if (pull >= THRESHOLD && !isOverThresholdRef.current) {
        isOverThresholdRef.current = true;
        setIsOverThreshold(true);
        triggerHaptic('medium');
      } else if (pull < THRESHOLD && isOverThresholdRef.current) {
        isOverThresholdRef.current = false;
        setIsOverThreshold(false);
        triggerHaptic('selection');
      }
      
      // Use requestAnimationFrame to ensure DOM updates happen exactly at the screen refresh rate
      requestAnimationFrame(() => updateDOM(pull));
    } else if (deltaY < 0) {
      isPulling.current = false;
      pullProgress.current = 0;
      requestAnimationFrame(() => updateDOM(0));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (indicatorRef.current) {
      indicatorRef.current.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.25s';
    }

    if (pullProgress.current >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('success');
      
      // Lock indicator in refreshing position
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `translate3d(0, ${RESTING_OFFSET}px, 0)`;
        indicatorRef.current.style.opacity = 1;
      }
      
      if (window.__pwa_registration) {
        try {
          await window.__pwa_registration.update();
        } catch (e) {
          console.error("PWA update check failed", e);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (onRefresh) {
        await onRefresh();
      } else {
        window.location.reload();
      }
    } else {
      // Snap back instantly
      pullProgress.current = 0;
      isOverThresholdRef.current = false;
      setIsOverThreshold(false);
      updateDOM(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator Container - Positioned below notch safe area to eliminate iOS system status bar blur */}
      <div 
        ref={indicatorRef}
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-0 right-0 z-[100] flex items-center justify-center pointer-events-none"
        style={{ 
          transform: `translate3d(0, ${HIDDEN_OFFSET}px, 0)`,
          opacity: 0,
          willChange: 'transform, opacity'
        }}
      >
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : isOverThreshold ? 1.05 : 1,
            borderColor: isOverThreshold 
              ? 'rgba(232, 197, 168, 0.75)' 
              : isRefreshing 
              ? 'rgba(141, 99, 70, 0.6)' 
              : 'rgba(141, 99, 70, 0.4)',
            backgroundColor: isOverThreshold 
              ? 'rgba(61, 40, 32, 0.95)' 
              : 'rgba(43, 35, 33, 0.9)',
            boxShadow: isOverThreshold 
              ? '0 0 25px rgba(232, 197, 168, 0.35), 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.25)' 
              : '0 4px 24px rgba(141, 99, 70, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25
          }}
          className="backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-3 border pointer-events-auto"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="w-5 h-5 text-[#E8C5A8] animate-spin shrink-0" />
              <div className="relative overflow-hidden h-5 flex items-center justify-center min-w-[105px]">
                <span className="text-sm font-semibold text-[#E8C5A8] whitespace-nowrap font-['Exo_2']">
                  {t('pwa.refreshing', 'جاري التحديث...')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                <motion.div
                  ref={arrowRef}
                  animate={{
                    scale: isOverThreshold ? 1.15 : 1,
                    color: isOverThreshold ? '#E8C5A8' : '#8D6346',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 25
                  }}
                  className="will-change-transform flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </motion.div>
              </div>

              {/* Animated Text Swap on Threshold Crossing */}
              <div className="relative overflow-hidden h-5 flex items-center justify-center min-w-[105px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={isOverThreshold ? 'release' : 'pull'}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: isOverThreshold ? 10 : -10, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: isOverThreshold ? -10 : 10, filter: 'blur(3px)' }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className={`text-sm font-semibold whitespace-nowrap font-['Exo_2'] select-none transition-colors duration-200 ${
                      isOverThreshold 
                        ? 'text-[#E8C5A8] drop-shadow-[0_0_8px_rgba(232,197,168,0.5)]' 
                        : 'text-white/80'
                    }`}
                  >
                    {isOverThreshold ? t('pwa.releaseToRefresh', 'أفلت للتحديث') : t('pwa.pullToRefresh', 'اسحب للتحديث')}
                  </motion.span>
                </AnimatePresence>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
}
