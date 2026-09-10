import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function PullToRefresh({ children, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOverThreshold, setIsOverThreshold] = useState(false);
  
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
    
    // Calculate opacity and rotation
    const opacity = Math.min(pull / THRESHOLD, 1);
    const rotation = (pull / THRESHOLD) * 360;
    
    // Use translate3d to force GPU hardware acceleration for maximum smoothness
    const yPos = Math.min(pull - MAX_PULL, 0);
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
      
      // Increased friction from 0.4 to 0.7 to make the pull feel FASTER and more responsive
      const friction = 0.7;
      const pull = Math.min(deltaY * friction, MAX_PULL);
      pullProgress.current = pull;
      
      if (pull >= THRESHOLD && !isOverThreshold) {
        setIsOverThreshold(true);
      } else if (pull < THRESHOLD && isOverThreshold) {
        setIsOverThreshold(false);
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
      
      // Lock indicator in refreshing position (visible, centered in the MAX_PULL height)
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `translate3d(0, 0px, 0)`;
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
      {/* Pull Indicator Container - Fixed height with flex-center ensures it drops below the notch */}
      <div 
        ref={indicatorRef}
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center pointer-events-none"
        style={{ 
          height: `${MAX_PULL}px`, 
          transform: `translate3d(0, -${MAX_PULL}px, 0)`,
          opacity: 0,
          willChange: 'transform, opacity'
        }}
      >
        <div className="bg-[#2B2321]/90 backdrop-blur-md border border-[#8D6346]/40 shadow-[0_4px_24px_rgba(141,99,70,0.3)] rounded-full px-5 py-2.5 flex items-center gap-3">
          {isRefreshing ? (
            <>
              <Loader2 className="w-5 h-5 text-[#8D6346] animate-spin" />
              <span className="text-[#8D6346] font-semibold text-sm">{t('pwa.refreshing')}</span>
            </>
          ) : (
            <>
              <div
                ref={arrowRef}
                className="text-[#8D6346] will-change-transform"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>
              <span className="text-[#8D6346] font-semibold text-sm transition-colors duration-200">
                {isOverThreshold ? t('pwa.releaseToRefresh') : t('pwa.pullToRefresh')}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
}
