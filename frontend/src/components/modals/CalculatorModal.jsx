import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CalculatorModal({ isOpen, onClose, onSave, initialValue }) {
  const { t, lang } = useLanguage();
  const [expression, setExpression] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExpression(initialValue ? String(initialValue) : '');
      setError(false);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleInput = (val) => {
    if (error) setError(false);
    
    // Prevent multiple decimals in the same number
    if (val === '.') {
      const parts = expression.split(/[+\-*/]/);
      const currentPart = parts[parts.length - 1];
      if (currentPart.includes('.')) return;
    }
    
    // Prevent starting with an operator or multiple operators in a row
    if (['+', '-', '*', '/'].includes(val)) {
      if (expression.length === 0 && val !== '-') return;
      const lastChar = expression.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        setExpression(expression.slice(0, -1) + val);
        return;
      }
    }
    
    setExpression(prev => prev + val);
  };

  const handleClear = () => {
    setExpression('');
    setError(false);
  };

  const handleDelete = () => {
    if (error) {
      setExpression('');
      setError(false);
    } else {
      setExpression(prev => prev.slice(0, -1));
    }
  };

  const calculateResult = () => {
    if (!expression) return;
    try {
      // Safe evaluation
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expression}`)();
      if (!isFinite(result) || isNaN(result)) {
        throw new Error('Invalid calculation');
      }
      
      const formattedResult = Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(4)).toString();
      return formattedResult;
    } catch (err) {
      setError(true);
      return null;
    }
  };

  const handleEquals = () => {
    const res = calculateResult();
    if (res !== null) setExpression(res);
  };

  const handleDone = () => {
    const res = calculateResult();
    if (res !== null) {
      onSave(res);
    } else if (!expression) {
      onSave('');
    }
  };

  const btnClass = "bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-bold py-4 rounded-2xl transition-colors shadow-inner flex items-center justify-center";
  const opBtnClass = "bg-brand-blue/20 hover:bg-brand-blue/30 active:bg-brand-blue/40 text-brand-blue text-2xl font-bold py-4 rounded-2xl transition-colors shadow-inner flex items-center justify-center";

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          className="relative w-full max-w-sm bg-black/60 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] overflow-hidden"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white/70 font-bold tracking-wide">{t('calculator.title', 'Calculator')}</h3>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Display */}
          <div className="bg-black/40 rounded-3xl p-4 mb-6 shadow-inner border border-white/5 flex flex-col items-end min-h-[100px] justify-end overflow-hidden">
            <div className={`text-4xl md:text-5xl font-black tabular-nums tracking-tight text-right w-full break-all ${error ? 'text-brand-red' : 'text-white'}`}>
              {error ? t('calculator.error', 'Error') : expression || '0'}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-3">
            {/* Row 1 */}
            <button onClick={handleClear} className="bg-brand-red/20 hover:bg-brand-red/30 active:bg-brand-red/40 text-brand-red text-lg font-bold py-4 rounded-2xl transition-colors shadow-inner col-span-2">
              {t('calculator.clear', 'Clear')}
            </button>
            <button onClick={handleDelete} className="bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 py-4 rounded-2xl transition-colors shadow-inner flex items-center justify-center">
              <Delete size={24} />
            </button>
            <button onClick={() => handleInput('/')} className={opBtnClass}>÷</button>
            
            {/* Row 2 */}
            <button onClick={() => handleInput('7')} className={btnClass}>7</button>
            <button onClick={() => handleInput('8')} className={btnClass}>8</button>
            <button onClick={() => handleInput('9')} className={btnClass}>9</button>
            <button onClick={() => handleInput('*')} className={opBtnClass}>×</button>

            {/* Row 3 */}
            <button onClick={() => handleInput('4')} className={btnClass}>4</button>
            <button onClick={() => handleInput('5')} className={btnClass}>5</button>
            <button onClick={() => handleInput('6')} className={btnClass}>6</button>
            <button onClick={() => handleInput('-')} className={opBtnClass}>-</button>

            {/* Row 4 */}
            <button onClick={() => handleInput('1')} className={btnClass}>1</button>
            <button onClick={() => handleInput('2')} className={btnClass}>2</button>
            <button onClick={() => handleInput('3')} className={btnClass}>3</button>
            <button onClick={() => handleInput('+')} className={opBtnClass}>+</button>

            {/* Row 5 */}
            <button onClick={() => handleInput('0')} className={`${btnClass} col-span-2`}>0</button>
            <button onClick={() => handleInput('.')} className={btnClass}>.</button>
            <button onClick={handleEquals} className="bg-brand-green/20 hover:bg-brand-green/30 active:bg-brand-green/40 text-brand-green text-2xl font-bold py-4 rounded-2xl transition-colors shadow-inner">=</button>
          </div>

          <button 
            onClick={handleDone}
            className="w-full mt-4 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-lg py-4 rounded-2xl shadow-lg transition-colors active:scale-95"
          >
            {t('calculator.done', 'Enter')}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
