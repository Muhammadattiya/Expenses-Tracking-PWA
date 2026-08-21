import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Send, Loader2, Trash2, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { parseQuickAddText, confirmQuickAddTransactions } from '../../api/quickAdd';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
};

export default function QuickAddModal({ isOpen, onClose, onSuccess }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  
  const { isListening, transcript, interimTranscript, setTranscript, startListening, stopListening, isSupported } = useSpeechRecognition('ar-EG');
  
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
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-md bg-black/40 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] p-6 max-h-[90vh] overflow-y-auto hide-scrollbar flex flex-col gap-6"
          onClick={e => e.stopPropagation()}
        >
           <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('quickAdd.title')}</h2>
             <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
               <X className="w-5 h-5 text-[var(--color-text-muted)]"/>
             </button>
           </div>
           
           {candidates.length === 0 ? (
             <div className="flex flex-col gap-4">
                <div className="relative">
                  <textarea 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={t('quickAdd.placeholder')}
                    className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-[var(--color-text-main)] text-lg min-h-[140px] focus:outline-none focus:border-brand-blue/50 resize-none transition-colors"
                  />
                  {isSupported && (
                    <button 
                      onClick={isListening ? stopListening : startListening}
                      className={`absolute bottom-3 ${lang === 'ar' ? 'left-3' : 'right-3'} p-3 rounded-2xl transition-all duration-300 ${isListening ? 'bg-brand-red shadow-[0_0_20px_rgba(255,59,48,0.4)] text-[var(--color-text-main)] animate-pulse' : 'bg-white/10 hover:bg-white/20 text-[var(--color-text-main)] shadow-lg'}`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={handleParse} 
                  disabled={isProcessing || !textInput.trim()}
                  className="w-full bg-brand-blue hover:bg-blue-600 text-[var(--color-text-main)] font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-blue/30"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {t('quickAdd.analyze')}
                </button>
             </div>
           ) : (
             <div className="flex flex-col gap-4">
               <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest px-1">
                 {t('quickAdd.detectedTransactions')}
               </h3>
               
               <div className="flex flex-col gap-4">
                 {candidates.map(cand => (
                   <div key={cand.id} className="bg-black/20 border border-white/5 rounded-[1.5rem] p-4 flex flex-col gap-3 relative shadow-inner">
                      <button 
                        onClick={() => removeCandidate(cand.id)} 
                        className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} text-brand-red/80 hover:text-brand-red transition-colors`}
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      
                      <div className="flex gap-2 items-end">
                         <input 
                           type="number" 
                           value={cand.amount} 
                           onChange={e => updateCandidate(cand.id, 'amount', e.target.value)}
                           className="bg-transparent border-b border-white/20 text-3xl font-bold text-[var(--color-text-main)] w-28 focus:outline-none focus:border-brand-blue transition-colors text-center"
                         />
                         <span className="text-[var(--color-text-muted)] font-medium mb-1">{t('nav.currency')}</span>
                      </div>
                      
                      <input 
                        type="date"
                        value={cand.date}
                        onChange={e => updateCandidate(cand.id, 'date', e.target.value)}
                        className="bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-[var(--color-text-main)] text-sm focus:outline-none focus:border-white/20 transition-colors w-full mt-2"
                      />
                      
                      <input 
                        type="text" 
                        value={cand.description} 
                        onChange={e => updateCandidate(cand.id, 'description', e.target.value)}
                        placeholder={t('quickAdd.descPlaceholder')}
                        className="bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-[var(--color-text-main)] text-sm focus:outline-none focus:border-white/20 transition-colors"
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
                           <div className="flex-shrink-0 text-[var(--color-text-muted)] opacity-50 px-1">
                             {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
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
                         <p className="text-[10px] text-yellow-400/90 font-bold flex items-center gap-1.5 mt-1">
                           <AlertCircle className="w-3.5 h-3.5"/> {t('quickAdd.needCategory')}
                         </p>
                      )}
                   </div>
                 ))}
               </div>
               
               <div className="flex gap-3 mt-4">
                 <button 
                    onClick={() => setCandidates([])} 
                    className="flex-1 py-3.5 rounded-2xl border border-white/10 text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-main)] transition-colors font-bold text-sm"
                 >
                    {t('common.cancel')}
                 </button>
                 <button 
                    onClick={handleConfirm}
                    disabled={isProcessing || candidates.length === 0}
                    className="flex-[2] bg-brand-green hover:bg-green-600 text-[var(--color-text-main)] font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-green/30"
                 >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {t('quickAdd.confirmAll')}
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
