import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Send, Sparkle } from 'lucide-react';
import { chatWithAgent } from '../../api/agent';
import { useLanguage } from '../../contexts/LanguageContext';
import useFocusTrap from '../../hooks/useFocusTrap';

export default function AgentModal({ isOpen, onClose }) {
  const { lang, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: t('agent.welcomeMessage') }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = 'nova-agent-title';
  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: t('agent.welcomeMessage') }];
      }
      return prev;
    });
  }, [lang, t]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [messages, isOpen, isLoading, reduceMotion]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const id = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const historyForBackend = newMessages.slice(-8).slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const response = await chatWithAgent(userMessage, historyForBackend);

      if (response.data?.success) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: response.data.data.content },
        ]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Agent chat error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          isError: true,
          content: t('agent.errorMessage'),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const liveStatus = isLoading ? t('agent.thinking') : (lastAssistant?.content || '');

  return createPortal(
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/55"
          onClick={onClose}
        />
        
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0, y: '100%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: '100%', scale: 0.95 }}
          transition={{ type: 'spring', bounce: 0, duration: reduceMotion ? 0 : 0.4 }}
          className="relative w-full h-[85vh] sm:h-[600px] max-w-md bg-[#141115] border border-[#8D6346]/25 sm:shadow-[0_24px_48px_rgba(0,0,0,0.55)] rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden selection:bg-[#8D6346]/40"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#1C1819] z-10">
            <div className="flex items-center gap-3 min-w-0">
              <Sparkle
                size={20}
                strokeWidth={2.25}
                className="text-[#E8C5A8] shrink-0"
                fill="rgba(232,197,168,0.35)"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h3 id={titleId} className="text-white font-bold tracking-wide truncate">
                  {t('agent.title')}
                </h3>
                <p className="text-white/70 text-xs truncate">
                  {t('agent.subtitle')}
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              onClick={onClose}
              aria-label={t('agent.close')}
              className="min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </motion.button>
          </div>

          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveStatus}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 bg-[#141115]">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-3.5 py-2.5 text-[15px] leading-6 ${
                  msg.role === 'user' 
                    ? 'bg-[#8D6346] text-white rounded-[20px] rounded-se-sm' 
                    : msg.isError 
                      ? 'bg-[#3A1C1C] text-[#F5C2C2] rounded-[20px] rounded-ss-sm'
                      : 'bg-[#2B2321] text-white rounded-[20px] rounded-ss-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <p className="text-sm text-white/70 px-1">{t('agent.thinking')}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/10 bg-[#1C1819]">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('agent.placeholder')}
                aria-label={t('agent.placeholder')}
                className="w-full bg-[#0E0C0D] border border-white/12 rounded-full px-5 py-3.5 pe-14 text-[15px] text-white placeholder-white/45 caret-[#E8C5A8] focus:outline-none focus:border-[#8D6346]/70 transition-colors"
                disabled={isLoading}
              />
              <motion.button
                type="submit"
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                disabled={!input.trim() || isLoading}
                aria-label={t('agent.send')}
                className="absolute end-1.5 top-1/2 -translate-y-1/2 min-w-11 min-h-11 w-11 h-11 flex items-center justify-center rounded-full bg-[#8D6346] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#9A6E50] transition-colors"
              >
                <Send size={18} className={lang === 'ar' ? 'rotate-180' : ''} />
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
