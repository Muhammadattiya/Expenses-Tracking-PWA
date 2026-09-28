import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, MicOff, X, Send, Loader2, Trash2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Sparkles, PenLine } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { parseQuickAddText, confirmQuickAddTransactions } from '../../api/quickAdd';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import useFocusTrap from '../../hooks/useFocusTrap';

export default function QuickAddModal({ isOpen, onClose, onSuccess }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const reduceMotion = useReducedMotion();

  const activeModalVariants = reduceMotion ? {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.1 } }
  } : {
    hidden: { opacity: 0, scale: 0.96, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } },
    exit: { opacity: 0, scale: 0.96, y: 20, transition: { duration: 0.2 } }
  };
  
  const preferredVoiceLang = localStorage.getItem('finova-voice-lang') || (lang === 'en' ? 'en-US' : 'ar-EG');
  const { 
    isListening, 
    transcript, 
    interimTranscript, 
    setTranscript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported, 
    error: speechError,
    voiceLang,
    setVoiceLang
  } = useSpeechRecognition(preferredVoiceLang);
  
  const handleToggleVoiceLang = (targetLang) => {
    if (voiceLang === targetLang) return;
    setVoiceLang(targetLang);
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(voiceLang);
    }
  };
  
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [defaultAccount, setDefaultAccount] = useState(null);
  const dialogRef = useRef(null);
  const textAreaRef = useRef(null);
  const titleId = 'quick-add-title';
  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (candidates.length > 0) {
          handleConfirm();
        } else if (textInput.trim()) {
          handleParse();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, candidates, textInput]);

  // Error toast handling
  useEffect(() => {
    if (!isOpen || !speechError) return;
    if (speechError === 'not-allowed') {
      showToast(t('quickAdd.micPermissionDenied'), 'error');
    } else if (speechError === 'network') {
      showToast(t('quickAdd.speechNetworkError'), 'error');
    } else {
      showToast(t('quickAdd.speechError'), 'warning');
    }
  }, [speechError, isOpen, showToast, t]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setTextInput('');
      setCandidates([]);
      resetTranscript?.();
      
      Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
         setAccounts(accs.filter(a => !a.isArchived));
         const def = accs.find(a => a.isDefault) || accs[0];
         if (def) setDefaultAccount(def._id);
         
         const grouped = { expense: [], income: [] };
         cats.forEach(c => {
           if (c.type === 'expense') grouped.expense.push(c);
           if (c.type === 'income') grouped.income.push(c);
         });
         setCategories(grouped);
      });

      // Auto-focus input for immediate manual or voice typing
      const id = window.requestAnimationFrame(() => {
        textAreaRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    } else {
       stopListening();
       resetTranscript?.();
    }
  }, [isOpen]);
  
  // Stream speech recognition into text input
  useEffect(() => {
    const combined = (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
    if (combined) {
      setTextInput(combined);
    }
  }, [transcript, interimTranscript]);
  
  const handleParse = async () => {
    if (!textInput.trim()) return;
    stopListening();
    setIsProcessing(true);
    try {
      const parsed = await parseQuickAddText(textInput);
      if (!parsed || parsed.length === 0) {
          showToast(t('quickAdd.noTransactions'), 'info');
          setIsProcessing(false);
          return;
      }
      
      const mapped = parsed.map((p, idx) => ({
         id: idx,
         ...p,
         accountId: p.accountId || defaultAccount,
         categoryId: p.categoryId || '',
         date: p.date ? new Date(p.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
      setCandidates(mapped);
    } catch(err) {
      showToast(err.response?.data?.message || t('quickAdd.parseError'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirm = async () => {
    if (isProcessing) return;
    const invalid = candidates.find(c => {
       if (!c.amount) return true;
       if (c.type === 'transfer') {
          return !c.sourceAccountId || !c.destinationAccountId;
       }
       return !c.categoryId || !c.accountId;
    });
    if (invalid) {
       showToast(t('quickAdd.missingFields'), 'warning');
       return;
    }
    
    setIsProcessing(true);
    try {
      await confirmQuickAddTransactions(candidates);
      showToast(t('quickAdd.success'), 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch(err) {
      showToast(err.response?.data?.message || t('quickAdd.confirmError'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const updateCandidate = (id, field, value) => {
     setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const removeCandidate = (id) => {
     setCandidates(prev => prev.filter(c => c.id !== id));
  };
  
  return createPortal(
    <AnimatePresence>
      {isOpen && (
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" 
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={reduceMotion ? { duration: 0.1 } : undefined}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm -z-10"
          onClick={onClose}
        />
        
        {/* Modal Container: Ergonomic Bottom Sheet on Mobile, Centered Dialog on Desktop/Tablet */}
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          variants={activeModalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full sm:max-w-md liquidglass rounded-t-[2.25rem] sm:rounded-[2.5rem] p-5 sm:p-6 border border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto hide-scrollbar flex flex-col gap-4"
          onClick={e => e.stopPropagation()}
        >
          {/* Mobile Sheet Pull Handle Indicator */}
          <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 mb-1 sm:hidden shrink-0" />

          {/* Top Hairline Light Reflection (Desktop/Tablet) */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none hidden sm:block" />

          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/35 flex items-center justify-center text-[#E8C5A8] shadow-inner">
                <Mic size={16} />
              </div>
              <h2 id={titleId} className="text-lg font-bold text-white tracking-wide">
                {t('quickAdd.title')}
              </h2>
            </div>

            <button 
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] shrink-0 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm touch-manipulation"
            >
              <X size={16} />
            </button>
          </div>
          
          {candidates.length === 0 ? (
            <div className="flex flex-col gap-3.5">
              {/* Prominent Pre-Speech Language Selector */}
              {isSupported && (
                <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 bg-black/35 border border-white/10 rounded-2xl p-2.5 px-3.5 shadow-inner">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Sparkles size={13} className="text-[#E8C5A8]" />
                    <span className="text-xs text-[#E8C5A8] font-semibold">
                      {t('quickAdd.voiceLang')}
                    </span>
                  </div>

                  <div className="flex items-center bg-black/50 border border-white/10 rounded-xl p-0.5 shadow-inner gap-1 w-full xs:w-auto" dir="ltr">
                    <button
                      type="button"
                      onClick={() => handleToggleVoiceLang('ar-EG')}
                      className={`flex-1 xs:flex-initial px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation flex items-center justify-center ${
                        voiceLang === 'ar-EG'
                          ? 'bg-[#8D6346] text-white shadow-[0_1px_6px_rgba(141,99,70,0.5)]'
                          : 'text-white/60 hover:text-white'
                      }`}
                      aria-label={t('quickAdd.langEgyptian')}
                    >
                      🇪🇬 {t('quickAdd.langEgyptian')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVoiceLang('ar-SA')}
                      className={`flex-1 xs:flex-initial px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation flex items-center justify-center ${
                        voiceLang === 'ar-SA'
                          ? 'bg-[#8D6346] text-white shadow-[0_1px_6px_rgba(141,99,70,0.5)]'
                          : 'text-white/60 hover:text-white'
                      }`}
                      aria-label={t('quickAdd.langStandardArabic')}
                    >
                      🇸🇦 {t('quickAdd.langStandardArabic')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleVoiceLang('en-US')}
                      className={`flex-1 xs:flex-initial px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all duration-200 touch-manipulation flex items-center justify-center ${
                        voiceLang === 'en-US'
                          ? 'bg-[#8D6346] text-white shadow-[0_1px_6px_rgba(141,99,70,0.5)]'
                          : 'text-white/60 hover:text-white'
                      }`}
                      aria-label={t('quickAdd.langEnglish')}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>
              )}

              {/* Textarea with In-Box Controls */}
              <div className="relative">
                <textarea 
                  ref={textAreaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t('quickAdd.placeholder')}
                  aria-label={t('quickAdd.placeholder')}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 pe-14 pb-14 text-white text-[15px] min-h-[135px] sm:min-h-[140px] focus:outline-none focus:border-[#8D6346]/60 placeholder:text-white/45 resize-none transition-all shadow-inner leading-relaxed"
                />

                {/* Clear Text button */}
                {textInput.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTextInput('');
                      resetTranscript?.();
                    }}
                    aria-label={t('quickAdd.clearText')}
                    className="absolute top-3 end-3 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm touch-manipulation"
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Tactile Mic Button */}
                {isSupported && (
                  <button 
                    type="button"
                    onClick={handleToggleListening}
                    aria-label={isListening ? t('quickAdd.stopListening') : t('quickAdd.listen')}
                    aria-pressed={isListening}
                    className={`absolute bottom-3 end-3 p-3 rounded-2xl transition-all duration-300 touch-manipulation ${
                      isListening 
                        ? 'bg-red-500/30 border border-red-500/60 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse scale-105' 
                        : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white shadow-lg active:scale-95 hover:border-[#8D6346]/50'
                    }`}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
              </div>

              {/* Voice Status Indicator & Fast Action Button */}
              {isSupported && (
                <div 
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    isListening ? 'bg-red-500/15 border border-red-500/25' : 'bg-white/[0.03] border border-white/5'
                  }`}
                  aria-live="polite"
                >
                  {isListening ? (
                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className="flex items-center gap-2 text-red-300 font-semibold touch-manipulation"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                      <span>{t('quickAdd.listening')}</span>
                      <span className="text-[11px] opacity-75 font-normal">({t('quickAdd.tapToStop')})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className="flex items-center gap-1.5 text-[#E8C5A8] hover:text-white font-medium transition-colors touch-manipulation"
                    >
                      <Mic size={13} className="text-[#E8C5A8]" />
                      <span>{t('quickAdd.tapToSpeak')}</span>
                    </button>
                  )}

                  <span className="text-[11px] text-white/65 font-medium">
                    {voiceLang === 'ar-EG'
                      ? `🇪🇬 ${t('quickAdd.langEgyptian')}`
                      : voiceLang === 'ar-SA'
                      ? `🇸🇦 ${t('quickAdd.langStandardArabic')}`
                      : `🇬🇧 ${t('quickAdd.langEnglish')}`}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col gap-2 mt-1">
                <button 
                  type="button"
                  onClick={handleParse} 
                  disabled={isProcessing || !textInput.trim()}
                  className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex justify-center items-center gap-2 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                  <span>{t('quickAdd.analyze')}</span>
                  <span className="hidden sm:inline text-[11px] text-white/50 ms-1 font-normal">(Ctrl+↵)</span>
                </button>
                <Link
                  to="/add"
                  onClick={onClose}
                  className="w-full py-3 rounded-full font-semibold text-[13.5px] text-white/80 border border-white/10 bg-black/20 hover:bg-white/10 flex justify-center items-center gap-2 transition-colors active:scale-[0.98] touch-manipulation"
                >
                  <PenLine size={15} aria-hidden="true" />
                  <span>{t('quickAdd.manualEntry')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-[#E8C5A8] uppercase tracking-wider px-1">
                {t('quickAdd.detectedTransactions')}
              </h3>
              
              <div className="flex flex-col gap-3">
                {candidates.map(cand => (
                  <div key={cand.id} className="bg-black/30 border border-white/10 rounded-[1.8rem] p-4 flex flex-col gap-3 relative shadow-inner">
                    <button 
                      type="button"
                      onClick={() => removeCandidate(cand.id)}
                      aria-label={t('common.delete')}
                      className="absolute top-3.5 end-3.5 text-red-400/80 hover:text-red-300 transition-colors p-1 min-w-11 min-h-11 flex items-center justify-center touch-manipulation"
                    >
                      <Trash2 size={15} />
                    </button>
                    
                    <div className="flex gap-2 items-end justify-center pt-1">
                      <input 
                        type="number" 
                        value={cand.amount} 
                        onChange={e => updateCandidate(cand.id, 'amount', e.target.value)}
                        aria-label={t('addTransaction.amount') || 'Amount'}
                        className="bg-transparent border-b border-white/20 text-3xl font-black text-white w-32 focus:outline-none focus:border-[#8D6346] transition-colors text-center tabular-nums"
                      />
                      <span className="text-white/70 font-medium text-sm mb-1.5">{t('nav.currency')}</span>
                    </div>
                    
                    <input 
                      type="date"
                      value={cand.date}
                      onChange={e => updateCandidate(cand.id, 'date', e.target.value)}
                      aria-label={t('quickAdd.date') || 'Date'}
                      className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8D6346]/50 transition-colors w-full"
                    />
                    
                    <input 
                      type="text" 
                      value={cand.description} 
                      onChange={e => updateCandidate(cand.id, 'description', e.target.value)}
                      placeholder={t('quickAdd.descPlaceholder')}
                      aria-label={t('quickAdd.descPlaceholder') || 'Description'}
                      className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8D6346]/50 placeholder:text-white/45 transition-colors"
                    />
                    
                    {cand.type === 'transfer' ? (
                      <div className="flex flex-col sm:flex-row gap-2 z-10 sm:items-center">
                        <div className="flex-1 min-w-0">
                          <CustomSelect
                            value={cand.sourceAccountId}
                            onChange={val => updateCandidate(cand.id, 'sourceAccountId', val)}
                            options={accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                            placeholder={t('addTransaction.fromAccount')}
                          />
                        </div>
                        <div className="flex-shrink-0 text-white/50 self-center rotate-90 sm:rotate-0 px-1 py-0.5">
                          {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CustomSelect
                            value={cand.destinationAccountId}
                            onChange={val => updateCandidate(cand.id, 'destinationAccountId', val)}
                            options={accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                            placeholder={t('addTransaction.toAccount')}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 z-10">
                        <div className="w-full min-w-0">
                          <CustomSelect
                            value={cand.categoryId}
                            onChange={val => updateCandidate(cand.id, 'categoryId', val)}
                            options={categories[cand.type]?.map(c => ({ value: c._id, label: c.name, icon: c.icon })) || []}
                            placeholder={t('quickAdd.selectCategory')}
                          />
                        </div>
                        <div className="w-full min-w-0">
                          <CustomSelect
                            value={cand.accountId}
                            onChange={val => updateCandidate(cand.id, 'accountId', val)}
                            options={accounts.map(a => ({
                              value: a._id,
                              label: a.name,
                              icon: a.icon,
                              color: a.color,
                              subtitle: a.balance !== undefined ? `${a.balance.toLocaleString()} ${t('nav.currency') || 'EGP'}` : undefined
                            }))}
                          />
                        </div>
                      </div>
                    )}
                    
                    {!cand.categoryId && cand.type !== 'transfer' && (
                      <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5 mt-0.5 px-1">
                        <AlertCircle size={13} /> {t('quickAdd.needCategory')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Sticky Confirmation Bar with Safe Area Bottom Padding */}
              <div className="sticky bottom-0 bg-[#141115]/95 backdrop-blur-md pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] mt-2 z-20 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setCandidates([])} 
                  className="flex-1 py-3 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98] touch-manipulation"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing || candidates.length === 0}
                  className="flex-[2] py-3 px-5 rounded-full font-semibold text-[13.5px] text-[#34C759] hover:text-green-300 transition-all active:scale-[0.98] bg-[#34C759]/20 border border-[#34C759]/40 hover:bg-[#34C759]/30 shadow-[0_4px_20px_rgba(52,199,89,0.2),inset_0_1px_1px_rgba(255,255,255,0.18)] flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{t('quickAdd.confirmAll')}</span>
                </button>
              </div>
            </div>
          )}
          
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
