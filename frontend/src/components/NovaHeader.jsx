import { useState, useEffect, useRef } from 'react';
import { Sparkle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import AgentModal from './agent/AgentModal';
import { triggerHaptic } from '../utils/haptics';

export default function NovaHeader({ side = 'start', onOpenChange }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const pushedRef = useRef(false);
  const press = reduceMotion ? undefined : { scale: 0.92 };

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      pushedRef.current = false;
      return undefined;
    }
    if (!pushedRef.current) {
      window.history.pushState({ finovaNova: true }, '');
      pushedRef.current = true;
    }
    const onPopState = () => {
      pushedRef.current = false;
      setOpen(false);
      btnRef.current?.focus();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.documentElement.dataset.dockOverlay = '1';
    } else {
      delete document.documentElement.dataset.dockOverlay;
    }
    return undefined;
  }, [open]);

  const close = () => {
    if (pushedRef.current) {
      window.history.back();
      return;
    }
    setOpen(false);
    btnRef.current?.focus();
  };

  const sideClass = side === 'end' ? 'end-3' : 'start-3';

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={() => {
          triggerHaptic('selection');
          setOpen(true);
        }}
        aria-label={t('nav.nova')}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`fixed z-[80] top-[max(0.75rem,env(safe-area-inset-top))] ${sideClass} w-11 h-11 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.55)]`}
      >
        <div className="absolute inset-0 rounded-full liquidglass pointer-events-none" />
        <motion.span
          className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#8D6346]/25 border border-[#E8C5A8]/35"
          whileTap={press}
        >
          <Sparkle
            size={16}
            strokeWidth={2.25}
            aria-hidden="true"
            className="text-[#E8C5A8]"
            fill="rgba(232,197,168,0.35)"
          />
        </motion.span>
      </button>
      <AgentModal isOpen={open} onClose={close} />
    </>
  );
}
