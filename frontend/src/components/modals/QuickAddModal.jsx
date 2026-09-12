import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Send, Loader2, Trash2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { parseQuickAddText, confirmQuickAddTransactions } from '../../api/quickAdd';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.2 } }
};

export default function QuickAddModal({ isOpen, onClose, onSuccess }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  
  const { isListening, transcript, interimTranscript, setTranscript, startListening, stopListening, isSupported } = useSpeechRecognition(lang === 'ar' ? 'ar-EG' : 'en-US');
  
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [defaultAccount, setDefaultAccount] = useState(null);
  
  useEffect(() => {
    if (isOpen) {
      setTextInput('');
      setCandidates([]);
      setTranscript('');
      
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
    } else {
       stopListening();
    }
  }, [isOpen]);
  
  useEffect(() => {
     if (isListening) {
        setTextInput(transcript + interimTranscript);
     }
  }, [transcript, interimTranscript, isListening]);
  
  const handleParse = async () => {
    if (!textInput.trim()) return;
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
  
  if (!isOpen) return null;
  
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
          onClick={onClose}
        />
        
        {/* Modal Container */}
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md liquidglass rounded-[2.5rem] p-6 border border-white/15 shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto hide-scrollbar flex flex-col gap-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Hairline Light Reflection */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/35 flex items-center justify-center text-[#E8C5A8] shadow-inner">
                <Mic size={16} />
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {t('quickAdd.title')}
              </h2>
            </div>

            <button 
              type="button"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              <X size={15} />
            </button>
          </div>
          
          {candidates.length === 0 ? (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t('quickAdd.placeholder')}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white text-[15px] min-h-[140px] focus:outline-none focus:border-[#8D6346]/60 placeholder:text-white/30 resize-none transition-all shadow-inner leading-relaxed"
                />
                {isSupported && (
                  <button 
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`absolute bottom-3 ${lang === 'ar' ? 'left-3' : 'right-3'} p-3 rounded-2xl transition-all duration-300 ${
                      isListening 
                        ? 'bg-red-500/30 border border-red-500/50 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse' 
                        : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white shadow-lg active:scale-95'
                    }`}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
              </div>
              
              <button 
                type="button"
                onClick={handleParse} 
                disabled={isProcessing || !textInput.trim()}
                className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex justify-center items-center gap-2 backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                <span>{t('quickAdd.analyze')}</span>
              </button>
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
                      className={`absolute top-3.5 ${lang === 'ar' ? 'left-3.5' : 'right-3.5'} text-red-400/80 hover:text-red-300 transition-colors p-1`}
                    >
                      <Trash2 size={15} />
                    </button>
                    
                    <div className="flex gap-2 items-end justify-center pt-1">
                      <input 
                        type="number" 
                        value={cand.amount} 
                        onChange={e => updateCandidate(cand.id, 'amount', e.target.value)}
                        className="bg-transparent border-b border-white/20 text-3xl font-black text-white w-32 focus:outline-none focus:border-[#8D6346] transition-colors text-center tabular-nums"
                      />
                      <span className="text-white/60 font-medium text-sm mb-1.5">{t('nav.currency')}</span>
                    </div>
                    
                    <input 
                      type="date"
                      value={cand.date}
                      onChange={e => updateCandidate(cand.id, 'date', e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8D6346]/50 transition-colors w-full"
                    />
                    
                    <input 
                      type="text" 
                      value={cand.description} 
                      onChange={e => updateCandidate(cand.id, 'description', e.target.value)}
                      placeholder={t('quickAdd.descPlaceholder')}
                      className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-[#8D6346]/50 placeholder:text-white/30 transition-colors"
                    />
                    
                    {cand.type === 'transfer' ? (
                      <div className="flex gap-2 z-10 items-center">
                        <div className="flex-1">
                          <CustomSelect
                            value={cand.sourceAccountId}
                            onChange={val => updateCandidate(cand.id, 'sourceAccountId', val)}
                            options={accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                            placeholder={lang === 'ar' ? 'من حساب' : 'From Account'}
                          />
                        </div>
                        <div className="flex-shrink-0 text-white/50 px-1">
                          {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                        </div>
                        <div className="flex-1">
                          <CustomSelect
                            value={cand.destinationAccountId}
                            onChange={val => updateCandidate(cand.id, 'destinationAccountId', val)}
                            options={accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                            placeholder={lang === 'ar' ? 'إلى حساب' : 'To Account'}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 z-10">
                        <div className="flex-1">
                          <CustomSelect
                            value={cand.categoryId}
                            onChange={val => updateCandidate(cand.id, 'categoryId', val)}
                            options={categories[cand.type]?.map(c => ({ value: c._id, label: c.name, icon: c.icon })) || []}
                            placeholder={t('quickAdd.selectCategory')}
                          />
                        </div>
                        <div className="flex-1">
                          <CustomSelect
                            value={cand.accountId}
                            onChange={val => updateCandidate(cand.id, 'accountId', val)}
                            options={accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
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
              
              <div className="flex gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setCandidates([])} 
                  className="flex-1 py-3 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98]"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing || candidates.length === 0}
                  className="flex-[2] py-3 px-5 rounded-full font-semibold text-[13.5px] text-[#34C759] hover:text-green-300 transition-all active:scale-[0.98] bg-[#34C759]/20 border border-[#34C759]/40 hover:bg-[#34C759]/30 shadow-[0_4px_20px_rgba(52,199,89,0.2),inset_0_1px_1px_rgba(255,255,255,0.18)] flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{t('quickAdd.confirmAll')}</span>
                </button>
              </div>
            </div>
          )}
          
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
