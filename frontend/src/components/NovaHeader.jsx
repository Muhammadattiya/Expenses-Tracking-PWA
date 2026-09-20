import { useState, useEffect, useRef } from 'react';
import AgentModal from './agent/AgentModal';
import { triggerHaptic } from '../utils/haptics';

export default function NovaHeader({ onOpenChange }) {
  const [open, setOpen] = useState(false);
  const pushedRef = useRef(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    const handleOpen = () => {
      triggerHaptic('selection');
      setOpen(true);
    };
    window.addEventListener('open-nova-agent', handleOpen);
    return () => window.removeEventListener('open-nova-agent', handleOpen);
  }, []);

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
  };

  return (
    <AgentModal isOpen={open} onClose={close} />
  );
}
