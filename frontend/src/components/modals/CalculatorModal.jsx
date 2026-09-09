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
      const evaluateExpression = (expr) => {
        const tokens = expr.match(/(\d+\.?\d*)|([\+\-\*\/])/g);
        if (!tokens) return NaN;
        
        if (tokens[0] === '-') {
          tokens.unshift('0');
        }

        let i = 0;
        while (i < tokens.length) {
          if (tokens[i] === '*' || tokens[i] === '/') {
            const a = parseFloat(tokens[i - 1]);
            const b = parseFloat(tokens[i + 1]);
            if (isNaN(a) || isNaN(b)) return NaN;
            const res = tokens[i] === '*' ? a * b : a / b;
            tokens.splice(i - 1, 3, res.toString());
            i -= 1;
          } else {
            i++;
          }
        }

        i = 0;
        while (i < tokens.length) {
          if (tokens[i] === '+' || tokens[i] === '-') {
            const a = parseFloat(tokens[i - 1]);
            const b = parseFloat(tokens[i + 1]);
            if (isNaN(a) || isNaN(b)) return NaN;
            const res = tokens[i] === '+' ? a + b : a - b;
            tokens.splice(i - 1, 3, res.toString());
            i -= 1;
          } else {
            i++;
          }
        }

        return parseFloat(tokens[0]);
      };

      const result = evaluateExpression(expression);
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
      onClose();
    } else if (!expression) {
      onSave('');
      onClose();
    }
  };

  const btnClass = "bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-white text-xl font-bold py-3.5 rounded-2xl transition-all shadow-inner flex items-center justify-center active:scale-95";
  const opBtnClass = "bg-[#8D6346]/20 hover:bg-[#8D6346]/35 active:bg-[#8D6346]/50 border border-[#8D6346]/30 text-[#E8C5A8] text-xl font-bold py-3.5 rounded-2xl transition-all shadow-inner flex items-center justify-center active:scale-95";

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-auto"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
          className="relative w-full max-w-sm liquidglass sm:rounded-[2.5rem] rounded-[2rem] sm:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-[16px] tracking-wide">{t('calculator.title')}</h3>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 bg-black/20 hover:bg-black/40 border border-white/10 rounded-full transition-colors text-white/70 hover:text-white active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Display */}
          <div className="bg-black/30 rounded-2xl p-4 mb-4 shadow-inner border border-white/10 flex flex-col items-end min-h-[85px] justify-end overflow-hidden">
            <div className={`text-3xl md:text-4xl font-black tabular-nums tracking-tight text-right w-full break-all ${error ? 'text-red-400' : 'text-white'}`}>
              {error ? t('calculator.error') : expression || '0'}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* Row 1 */}
            <button 
              type="button"
              onClick={handleClear} 
              className="bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/35 border border-red-500/30 text-red-400 text-sm font-bold py-3.5 rounded-2xl transition-all shadow-inner col-span-2 active:scale-95"
            >
              {t('calculator.clear')}
            </button>
            <button 
              type="button"
              onClick={handleDelete} 
              className="bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-white/80 py-3.5 rounded-2xl transition-all shadow-inner flex items-center justify-center active:scale-95"
            >
              <Delete size={20} />
            </button>
            <button type="button" onClick={() => handleInput('/')} className={opBtnClass}>÷</button>
            
            {/* Row 2 */}
            <button type="button" onClick={() => handleInput('7')} className={btnClass}>7</button>
            <button type="button" onClick={() => handleInput('8')} className={btnClass}>8</button>
            <button type="button" onClick={() => handleInput('9')} className={btnClass}>9</button>
            <button type="button" onClick={() => handleInput('*')} className={opBtnClass}>×</button>

            {/* Row 3 */}
            <button type="button" onClick={() => handleInput('4')} className={btnClass}>4</button>
            <button type="button" onClick={() => handleInput('5')} className={btnClass}>5</button>
            <button type="button" onClick={() => handleInput('6')} className={btnClass}>6</button>
            <button type="button" onClick={() => handleInput('-')} className={opBtnClass}>-</button>

            {/* Row 4 */}
            <button type="button" onClick={() => handleInput('1')} className={btnClass}>1</button>
            <button type="button" onClick={() => handleInput('2')} className={btnClass}>2</button>
            <button type="button" onClick={() => handleInput('3')} className={btnClass}>3</button>
            <button type="button" onClick={() => handleInput('+')} className={opBtnClass}>+</button>

            {/* Row 5 */}
            <button type="button" onClick={() => handleInput('0')} className={`${btnClass} col-span-2`}>0</button>
            <button type="button" onClick={() => handleInput('.')} className={btnClass}>.</button>
            <button 
              type="button"
              onClick={handleEquals} 
              className="bg-[#34C759]/20 hover:bg-[#34C759]/35 active:bg-[#34C759]/50 border border-[#34C759]/40 text-[#34C759] text-xl font-bold py-3.5 rounded-2xl transition-all shadow-inner flex items-center justify-center active:scale-95"
            >
              =
            </button>
          </div>

          {/* Standardized Action Button */}
          <div className="pt-3">
            <button 
              type="button"
              onClick={handleDone}
              className="w-full py-3.5 rounded-full font-semibold text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              {t('calculator.done')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
