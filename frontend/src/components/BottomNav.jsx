import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import AgentModal from './agent/AgentModal';
import QuickAddModal from './modals/QuickAddModal';
import { triggerHaptic } from '../utils/haptics';

const dockControlClass =
  'relative w-12 h-12 rounded-full flex items-center justify-center text-white group shrink-0 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)]';

function GlassDisc() {
  return (
    <div className="absolute inset-0 rounded-full liquidglass group-active:bg-white/10 transition-colors pointer-events-none" />
  );
}

export default function BottomNav() {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [fabOpen, setFabOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const navRef = useRef(null);
  const novaBtnRef = useRef(null);
  const micBtnRef = useRef(null);
  const agentPushedRef = useRef(false);
  const quickAddPushedRef = useRef(false);

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 480, damping: 34, mass: 0.85 };
  const press = reduceMotion ? undefined : { scale: 0.9 };
  const iconSpring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 520, damping: 32 };

  useEffect(() => {
    setFabOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setFabOpen(false);
      }
    };
    if (fabOpen) {
      document.addEventListener('pointerdown', handlePointerOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside);
    };
  }, [fabOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (fabOpen) {
        setFabOpen(false);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fabOpen]);

  useEffect(() => {
    if (!agentOpen) {
      agentPushedRef.current = false;
      return undefined;
    }
    if (!agentPushedRef.current) {
      window.history.pushState({ finovaNova: true }, '');
      agentPushedRef.current = true;
    }
    const onPopState = () => {
      agentPushedRef.current = false;
      setAgentOpen(false);
      novaBtnRef.current?.focus();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [agentOpen]);

  useEffect(() => {
    if (!quickAddOpen) {
      quickAddPushedRef.current = false;
      return undefined;
    }
    if (!quickAddPushedRef.current) {
      window.history.pushState({ finovaQuickAdd: true }, '');
      quickAddPushedRef.current = true;
    }
    const onPopState = () => {
      quickAddPushedRef.current = false;
      setQuickAddOpen(false);
      micBtnRef.current?.focus();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [quickAddOpen]);

  const closeAgent = () => {
    if (agentPushedRef.current) {
      window.history.back();
      return;
    }
    setAgentOpen(false);
    novaBtnRef.current?.focus();
  };

  const closeQuickAdd = () => {
    if (quickAddPushedRef.current) {
      window.history.back();
      return;
    }
    setQuickAddOpen(false);
    micBtnRef.current?.focus();
  };

  const openAgent = () => {
    triggerHaptic('selection');
    setFabOpen(false);
    setAgentOpen(true);
  };

  const openQuickAdd = () => {
    triggerHaptic('selection');
    setFabOpen(false);
    setQuickAddOpen(true);
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { path: '/analytics', icon: ChartNoAxesCombined, label: t('nav.analytics') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  const fabItems = [
    { path: '/bills', icon: Receipt, label: t('nav.bills') },
    { path: '/budgets', icon: Target, label: t('nav.budgets') },
    { path: '/investments', icon: TrendingUp, label: t('nav.investments') },
    { path: '/receivables', icon: Users, label: t('nav.receivables') },
    { path: '/add', icon: Plus, label: t('nav.add') }
  ];

  const liquidGlassClass = 'liquidglass';
  const overlayOpen = agentOpen || quickAddOpen;

  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-[90] flex justify-center pb-[max(2rem,env(safe-area-inset-bottom))]"
      ref={navRef}
    >
      <nav
        aria-label={t('nav.bar')}
        className="relative flex items-center w-[min(360px,calc(100%-24px))] h-12 gap-2"
      >
        {!overlayOpen && (
        <AnimatePresence initial={false}>
          {fabOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion || overlayOpen ? 0 : fabOpen ? 0.2 : 0.15 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
                onClick={() => setFabOpen(false)}
              />
              <div className="absolute bottom-[calc(100%+12px)] start-0 flex flex-col items-start gap-3 z-50">
                {fabItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    style={{ originX: lang === 'ar' ? 1 : 0, originY: 1 }}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion || overlayOpen ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
                    transition={
                      reduceMotion || overlayOpen
                        ? { duration: 0 }
                        : {
                            type: 'spring',
                            stiffness: 520,
                            damping: 34,
                            mass: 0.7,
                            delay: index * 0.038,
                          }
                    }
                  >
                    <NavLink
                      to={item.path}
                      className={`group inline-flex items-center gap-4 p-3 rounded-[20px] hover:bg-white/10 active:bg-black/40 transition-colors duration-200 bg-[#1C1819]/90 backdrop-blur-xl border border-white/15 shadow-lg focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)] ${reduceMotion ? '' : 'active:scale-95'}`}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/10 group-active:bg-black/60 shadow-inner shrink-0 transition-colors">
                        {React.createElement(item.icon, { className: 'w-5 h-5 text-[#8D6346]' })}
                      </div>
                      <span className="text-white font-medium text-sm whitespace-nowrap pe-4">{item.label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </AnimatePresence>
        )}

        <button 
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setFabOpen(!fabOpen);
          }}
          aria-label={fabOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={fabOpen}
          className={dockControlClass}
        >
          <GlassDisc />
          <motion.span
            className="relative z-10 inline-flex"
            animate={{ rotate: fabOpen ? 45 : 0 }}
            whileTap={press}
            transition={iconSpring}
          >
            <Plus size={24} strokeWidth={2.5} />
          </motion.span>
        </button>

        <div 
          className={`relative h-12 flex-1 min-w-0 rounded-[24px] flex justify-between items-center px-1.5 ${liquidGlassClass}`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              aria-label={item.label}
              onClick={() => triggerHaptic('selection')}
              className="relative min-w-11 h-12 flex-1 flex items-center justify-center rounded-full z-10 group focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)]"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="pillIndicator"
                      className="absolute inset-1 rounded-full z-0"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.0) 100%)',
                        boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                      transition={spring}
                    />
                  )}
                  <motion.span
                    className="relative z-20 inline-flex"
                    animate={{ scale: isActive && !reduceMotion ? 1.12 : 1 }}
                    whileTap={press}
                    transition={iconSpring}
                  >
                    {React.createElement(item.icon, {
                      size: 20,
                      strokeWidth: isActive ? 2.5 : 2,
                      className: `transition-colors duration-200 ${isActive ? 'text-[#8D6346] drop-shadow-md' : 'text-white/60 group-hover:text-white'}`,
                      'aria-hidden': true
                    })}
                  </motion.span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <button 
          type="button"
          ref={novaBtnRef}
          onClick={openAgent}
          aria-label={t('nav.nova')}
          aria-haspopup="dialog"
          aria-expanded={agentOpen}
          className={dockControlClass}
        >
          <GlassDisc />
          <motion.span
            className="relative z-10 inline-flex"
            animate={{ scale: agentOpen && !reduceMotion ? 1.08 : 1 }}
            whileTap={press}
            transition={iconSpring}
          >
            <Sparkles
              size={20}
              strokeWidth={2.5}
              aria-hidden="true"
              className={`transition-colors duration-200 ${agentOpen ? 'text-[#8D6346]' : 'text-white'}`}
            />
          </motion.span>
        </button>

        <button 
          type="button"
          ref={micBtnRef}
          onClick={openQuickAdd}
          aria-label={t('nav.quickAdd')}
          aria-haspopup="dialog"
          aria-expanded={quickAddOpen}
          className={dockControlClass}
        >
          <GlassDisc />
          <motion.span
            className="relative z-10 inline-flex"
            animate={{ scale: quickAddOpen && !reduceMotion ? 1.08 : 1 }}
            whileTap={press}
            transition={iconSpring}
          >
            <Mic
              size={20}
              strokeWidth={2.5}
              aria-hidden="true"
              className={`transition-colors duration-200 ${quickAddOpen ? 'text-[#8D6346]' : 'text-white'}`}
            />
          </motion.span>
        </button>
      </nav>

      <AgentModal isOpen={agentOpen} onClose={closeAgent} />
      <QuickAddModal isOpen={quickAddOpen} onClose={closeQuickAdd} />
    </div>
  );
}
