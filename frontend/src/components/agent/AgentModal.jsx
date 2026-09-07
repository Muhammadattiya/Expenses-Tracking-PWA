import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { chatWithAgent } from '../../api/agent';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AgentModal({ isOpen, onClose }) {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('agent.welcomeMessage')
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Slice to keep only the last 8 messages (matching backend MAX_HISTORY_MESSAGES limit)
      const historyForBackend = newMessages.slice(-8).slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithAgent(userMessage, historyForBackend);
      
      if (response.data?.success) {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: response.data.data.content }
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
          content: t('agent.errorMessage')
        }
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, y: '100%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: '100%', scale: 0.95 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative w-full h-[85vh] sm:h-[600px] max-w-md liquidglass border border-white/5 sm:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5 backdrop-blur-md z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center relative overflow-hidden shadow-inner">
                <Sparkles className="w-5 h-5 text-[#8D6346] relative z-10" />
                <div className="absolute inset-0 bg-[#8D6346]/5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-wide">
                  {t('agent.title')}
                </h3>
                <p className="text-white/50 text-xs">
                  {t('agent.subtitle')}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 text-white/70 hover:text-white transition-colors"
            >
              <X size={20} />
            </motion.button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-inner ${msg.role === 'user' ? 'bg-[#8D6346] border-none' : 'bg-black/40 border border-white/10'}`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-[#8D6346]" />}
                </div>
                <div className={`max-w-[75%] p-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#8D6346] text-white rounded-[20px] rounded-tr-sm' 
                    : msg.isError 
                      ? 'bg-red-500/10 text-red-200 border border-red-500/20 rounded-[20px] rounded-tl-sm'
                      : 'bg-white/10 text-white border border-white/5 backdrop-blur-md rounded-[20px] rounded-tl-sm'
                }`}>
                  {msg.isError && <AlertCircle size={16} className="inline-block mr-2 mb-0.5" />}
                  {msg.content}
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 flex-row"
              >
                <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                  <Bot size={16} className="text-[#8D6346] animate-pulse" />
                </div>
                <div className="max-w-[75%] p-3 rounded-[20px] bg-white/5 border border-white/5 backdrop-blur-md rounded-tl-sm flex items-center gap-2 text-white/70">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">{t('agent.thinking')}</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/20 border-t border-white/10 backdrop-blur-md">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('agent.placeholder')}
                className="w-full bg-black/40 border border-white/10 rounded-full px-5 py-3.5 pr-14 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors shadow-inner"
                disabled={isLoading}
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.9 }}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/25 transition-colors border border-white/10 shadow-sm"
                style={{ left: lang === 'ar' ? '0.5rem' : 'auto', right: lang === 'ar' ? 'auto' : '0.5rem' }}
              >
                <Send size={18} className={lang === 'ar' ? 'rotate-180' : ''} />
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
