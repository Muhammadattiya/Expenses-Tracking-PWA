import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ChartNoAxesCombined, 
  TrendingUp, 
  User, 
  Plus,
  MoreHorizontal,
  Receipt,
  Target,
  Users
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence, useReducedMotion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

const dockControlClass =
  'relative w-12 h-12 rounded-full flex items-center justify-center text-white group shrink-0 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)]';

function GlassDisc() {
  return (
    <div className="absolute inset-0 rounded-full liquidglass group-active:bg-white/10 transition-colors pointer-events-none" />
  );
}

const OVERFLOW_PATHS = ['/bills', '/budgets', '/investments', '/receivables'];

function pathInFamily(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function BottomNav() {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [fabOpen, setFabOpen] = useState(false);
  const [held, setHeld] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const navRef = useRef(null);
  const trackRef = useRef(null);
  const pillRef = useRef(null);
  const didScrub = useRef(false);
  const sheenX = useMotionValue(80);
  const sheenY = useMotionValue(24);
  const sheenO = useSpring(0, { stiffness: 260, damping: 32 });
  const blobX = useSpring(0, { stiffness: 420, damping: 36, mass: 0.7 });
  const blobW = useSpring(56, { stiffness: 420, damping: 36, mass: 0.7 });
  const sheenBg = useMotionTemplate`radial-gradient(110px 80px at ${sheenX}px ${sheenY}px, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 38%, transparent 68%)`;

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
    if (fabOpen) {
      document.documentElement.dataset.dockOverlay = '1';
    } else {
      delete document.documentElement.dataset.dockOverlay;
    }
    return () => {
      delete document.documentElement.dataset.dockOverlay;
    };
  }, [fabOpen]);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { path: '/analytics', icon: ChartNoAxesCombined, label: t('nav.analytics') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  const fabItems = [
    { path: '/bills', icon: Receipt, label: t('nav.bills') },
    { path: '/budgets', icon: Target, label: t('nav.budgets') },
    { path: '/investments', icon: TrendingUp, label: t('nav.investments') },
    { path: '/receivables', icon: Users, label: t('nav.receivables') }
  ];

  const liquidGlassClass = 'liquidglass';
  const overflowActive = OVERFLOW_PATHS.some((p) => pathInFamily(location.pathname, p));
  const plusMarked = overflowActive && !fabOpen;

  const pointOnNav = (clientX, clientY) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    sheenX.set(clientX - r.left);
    sheenY.set(clientY - r.top);
  };

  const tabFromClientX = (clientX) => {
    const r = pillRef.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return 0;
    const t = Math.max(0, Math.min(0.999, (clientX - r.left) / r.width));
    const visual = Math.floor(t * navItems.length);
    return lang === 'ar' ? navItems.length - 1 - visual : visual;
  };

  const placeBlob = (clientX) => {
    const r = pillRef.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return;
    const slot = r.width / navItems.length;
    const visual = Math.max(0, Math.min(navItems.length - 1, Math.floor(((clientX - r.left) / r.width) * navItems.length)));
    blobW.set(Math.max(44, slot - 8));
    blobX.set(visual * slot + 4);
  };

  const onNavPointerMove = (e) => {
    if (reduceMotion || fabOpen) return;
    pointOnNav(e.clientX, e.clientY);
    sheenO.set(1);
    if (e.buttons || scrubbing) {
      const pill = pillRef.current?.getBoundingClientRect();
      if (pill && e.clientX >= pill.left && e.clientX <= pill.right) {
        didScrub.current = true;
        setScrubbing(true);
        placeBlob(e.clientX);
      }
    }
  };

  const onNavPointerDown = (e) => {
    if (reduceMotion || fabOpen) return;
    if (e.target.closest('a[href], button')) {
      setHeld(true);
      pointOnNav(e.clientX, e.clientY);
      sheenO.set(1);
    }
  };

  const onNavPointerUp = (e) => {
    if (scrubbing && didScrub.current && pillRef.current) {
      const i = tabFromClientX(e.clientX);
      const item = navItems[i];
      if (item && location.pathname !== item.path) {
        triggerHaptic('selection');
        navigate(item.path);
      }
    }
    setHeld(false);
    setScrubbing(false);
    sheenO.set(0);
    window.setTimeout(() => {
      didScrub.current = false;
    }, 80);
  };

  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-[90] flex justify-center pb-[max(2rem,env(safe-area-inset-bottom))]"
      ref={navRef}
    >
      <motion.nav
        ref={trackRef}
        aria-label={t('nav.bar')}
        dir="ltr"
        className="relative flex items-center w-[min(22.5rem,calc(100%-24px))] h-12 gap-2 touch-none"
        style={{ transformOrigin: '50% 100%' }}
        animate={
          reduceMotion || fabOpen
            ? { y: 0, scale: 1 }
            : { y: held ? -12 : 0, scale: held ? 1.045 : 1 }
        }
        transition={spring}
        onPointerDown={(e) => {
          if (fabOpen) return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* capture is optional */
          }
          onNavPointerDown(e);
        }}
        onPointerMove={onNavPointerMove}
        onPointerUp={onNavPointerUp}
        onPointerCancel={onNavPointerUp}
        onPointerLeave={() => {
          if (!held && !scrubbing) sheenO.set(0);
        }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px] z-30 mix-blend-screen"
          style={{ background: sheenBg, opacity: sheenO }}
        />
        <AnimatePresence initial={false}>
          {fabOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : fabOpen ? 0.2 : 0.15 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
                onClick={() => setFabOpen(false)}
              />
              <div className="absolute bottom-[calc(100%+12px)] start-0 flex flex-col items-start gap-3 z-50">
                {fabItems.map((item, index) => (
                  <motion.div
                    key={item.path}
                    style={{ originX: 0, originY: 1 }}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.96 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.12 }
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
                      className={`group inline-flex items-center gap-4 p-3 rounded-[20px] hover:bg-white/10 active:bg-black/40 transition-colors duration-200 bg-[#1C1819]/90 backdrop-blur-xl border shadow-lg focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)] ${reduceMotion ? '' : 'active:scale-95'} ${pathInFamily(location.pathname, item.path) ? 'border-[#8D6346]/50' : 'border-white/15'}`}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/10 group-active:bg-black/60 shadow-inner shrink-0 transition-colors">
                        {React.createElement(item.icon, { className: 'w-5 h-5 text-[#8D6346]' })}
                      </div>
                      <span className="text-white font-medium text-sm whitespace-nowrap pe-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{item.label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </AnimatePresence>

        <button 
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setFabOpen(!fabOpen);
          }}
          aria-label={fabOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={fabOpen}
          aria-current={plusMarked ? 'true' : undefined}
          className={dockControlClass}
        >
          <GlassDisc />
          <motion.span
            className="relative z-10 inline-flex"
            animate={{ rotate: fabOpen ? 45 : 0, scale: plusMarked && !reduceMotion ? 1.08 : 1 }}
            whileTap={press}
            transition={iconSpring}
          >
            {fabOpen
              ? <Plus size={24} strokeWidth={2.5} className="text-white" />
              : <MoreHorizontal size={24} strokeWidth={2.5} className={plusMarked ? 'text-[#8D6346]' : 'text-white'} />}
          </motion.span>
        </button>

        <div 
          ref={pillRef}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          className={`relative h-12 flex-1 min-w-0 rounded-[24px] flex justify-between items-center px-1.5 overflow-hidden ${liquidGlassClass}`}
        >
          {scrubbing && (
            <motion.div
              aria-hidden="true"
              className="absolute top-1 bottom-1 z-0 rounded-full pointer-events-none"
              style={{
                x: blobX,
                width: blobW,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 100%)',
                boxShadow: 'inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -2px 6px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.28)',
                border: '1px solid rgba(255,255,255,0.14)'
              }}
            />
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              aria-label={item.label}
              onClick={(e) => {
                if (didScrub.current) {
                  e.preventDefault();
                  return;
                }
                triggerHaptic('selection');
              }}
              className="relative min-w-11 h-12 flex-1 flex items-center justify-center rounded-full z-10 group focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)]"
            >
              {({ isActive }) => (
                <>
                  {isActive && !scrubbing && (
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
          onClick={() => {
            triggerHaptic('selection');
            navigate('/add');
          }}
          aria-label={t('nav.add')}
          className={dockControlClass}
        >
          <GlassDisc />
          <motion.span className="relative z-10 inline-flex" whileTap={press} transition={iconSpring}>
            <Plus size={22} strokeWidth={2.5} aria-hidden="true" className="text-white" />
          </motion.span>
        </button>
      </motion.nav>
    </div>
  );
}
