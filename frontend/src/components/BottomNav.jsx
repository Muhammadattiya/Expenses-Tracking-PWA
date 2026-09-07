import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ChartNoAxesCombined, 
  TrendingUp, 
  User, 
  Plus, 
  Mic,
  Receipt,
  Target,
  Sparkles,
  Users
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import AgentModal from './agent/AgentModal';
import QuickAddModal from './modals/QuickAddModal';

export default function BottomNav() {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    setFabOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setFabOpen(false);
      }
    };
    if (fabOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fabOpen]);

  const navItems = [
    { path: '/', icon: LayoutDashboard },
    { path: '/analytics', icon: ChartNoAxesCombined },
    { path: '/ai', icon: Sparkles },
    { path: '/profile', icon: User },
  ];

  const fabItems = [
    { path: '/bills', icon: Receipt, label: t('nav.bills'), color: 'bg-brand-blue' },
    { path: '/budgets', icon: Target, label: t('nav.budgets'), color: 'bg-emerald-600' },
    { path: '/investments', icon: TrendingUp, label: t('nav.investments'), color: 'bg-purple-600' },
    { path: '/receivables', icon: Users, label: t('nav.receivables'), color: 'bg-[#8D6346]' },
    { path: '/add', icon: Plus, label: t('nav.add'), color: 'bg-[#8D6346]' }
  ];

  // Apple-style ultra-premium liquid glass (from AGENTS.md specs)
  const liquidGlassClass = "liquidglass";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] flex justify-center pb-8" ref={navRef}>
      
      <style>{`
        .liquidglass {
          background: hsl(0 0% 0% / 0.1);
          -webkit-backdrop-filter: url(#glass-filter-_r_b_) saturate(1.2);
          backdrop-filter: url(#glass-filter-_r_b_) saturate(1.2);
          box-shadow: inset 0 0 2px 1px lab(100% 0 0 / .35), inset 0 0 10px 4px lab(100% 0 0 / .15), inset 0 4px 16px lab(5.32203% 1.61424 -5.88284 / .0509804), inset 0 8px 24px lab(5.32203% 1.61424 -5.88284 / .0509804), inset 0 6px 56px lab(5.32203% 1.61424 -5.88284 / .0509804);
        }
      `}</style>
      <svg className="pointer-events-none opacity-0 -z-10 w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glass-filter-_r_b_" colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
            <feDisplacementMap in="SourceGraphic" in2="map" id="redchannel" result="dispRed" scale="-20" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
            <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red"></feColorMatrix>
            <feDisplacementMap in="SourceGraphic" in2="map" id="greenchannel" result="dispGreen" scale="-24" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
            <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green"></feColorMatrix>
            <feDisplacementMap in="SourceGraphic" in2="map" id="bluechannel" result="dispBlue" scale="-28" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
            <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue"></feColorMatrix>
            <feBlend in="red" in2="green" mode="screen" result="rg"></feBlend>
            <feBlend in="rg" in2="blue" mode="screen" result="output"></feBlend>
            <feGaussianBlur in="output" stdDeviation="3"></feGaussianBlur>
          </filter>
        </defs>
      </svg>

      {/* Main Container EXACTLY matching Figma specs: 328x48, but using Flexbox for perfect RTL support */}
      <div 
        className="relative flex items-center justify-between w-[328px] h-[48px] mx-auto"
      >
        {/* Expanded FAB Menu */}
        <AnimatePresence>
          {fabOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
                onClick={() => setFabOpen(false)}
              />
              <div className="absolute bottom-[60px] -start-2 flex flex-col items-start gap-4 min-w-[200px] z-50">
                {fabItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, y: 20, scale: 0.8, originX: lang === 'ar' ? 1 : 0 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ delay: index * 0.05, type: 'spring', bounce: 0.4 }}
                    className="w-full"
                  >
                    <NavLink
                      to={item.path}
                      className={`group flex items-center gap-4 p-3 rounded-[20px] hover:bg-white/10 active:bg-black/40 active:scale-95 transition-all duration-200 ${liquidGlassClass} w-auto inline-flex`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/10 group-active:bg-black/60 shadow-inner shrink-0 transition-colors`}>
                        {React.createElement(item.icon, { className: "w-5 h-5 text-[#8D6346]" })}
                      </div>
                      <span className="text-white font-medium text-sm whitespace-nowrap pe-4">{item.label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </AnimatePresence>

        
        {/* Plus Button */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setFabOpen(!fabOpen)}
          className={`relative w-[48px] h-[48px] rounded-full flex items-center justify-center z-50 text-white ${liquidGlassClass} transition-colors hover:bg-white/10 shrink-0`}
        >
          <motion.div animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ type: 'spring', bounce: 0.3 }} className="relative z-10">
            <Plus size={24} strokeWidth={2.5} />
          </motion.div>
        </motion.button>

        {/* Central Pill Nav */}
        <div 
          className={`relative h-[48px] flex-1 mx-3 max-w-[227px] rounded-[24px] flex justify-between items-center px-4 ${liquidGlassClass}`}
        >
          {/* Buttons mapped over navItems, using Framer Motion layoutId for flawless RTL sliding animation */}
          {navItems.map((item, index) => {
            const isActive = item.path === '/ai' ? agentOpen : location.pathname === item.path;
            return (
              <button
                key={index}
                onClick={() => item.path === '/ai' ? setAgentOpen(true) : navigate(item.path)}
                className="relative w-10 h-10 flex items-center justify-center rounded-full z-10 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="pillIndicator"
                    className="absolute inset-0 rounded-full z-0"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.0) 100%)',
                      backdropFilter: 'blur(12px) saturate(140%) brightness(1.15)',
                      WebkitBackdropFilter: 'blur(12px) saturate(140%) brightness(1.15)',
                      boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25, mass: 1 }}
                  />
                )}
                {React.createElement(item.icon, {
                  size: 20,
                  strokeWidth: isActive ? 2.5 : 2,
                  className: `relative z-20 transition-all duration-300 ${isActive ? 'scale-125 text-[#8D6346] drop-shadow-md' : 'scale-100 text-white/60 group-hover:text-white'}`
                })}
              </button>
            );
          })}
        </div>

        {/* Mic Button - Quick Add Modal */}
        <button 
          onClick={() => setQuickAddOpen(true)}
          className={`relative w-[48px] h-[48px] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform ${liquidGlassClass} hover:bg-white/10 shrink-0`}
        >
          <Mic size={20} strokeWidth={2.5} className="relative z-10" />
        </button>

      </div>

      <AgentModal isOpen={agentOpen} onClose={() => setAgentOpen(false)} />
      <QuickAddModal isOpen={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  );
}
