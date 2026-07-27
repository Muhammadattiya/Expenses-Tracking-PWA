import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { getIconComponent } from '../IconPicker';

const CustomSelect = ({ options, value, onChange, placeholder = 'اختر...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const SelectedIcon = selectedOption?.icon ? getIconComponent(selectedOption.icon) : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="field font-semibold shadow-lg backdrop-blur-md flex items-center justify-between hover:bg-[var(--color-surface-hover)]"
      >
        <div className="flex items-center gap-2 truncate">
          {SelectedIcon && <SelectedIcon className={`w-5 h-5 ${!selectedOption?.color ? 'text-[var(--color-text-muted)]' : ''}`} style={selectedOption?.color ? { color: selectedOption.color } : {}} />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[var(--color-surface-active)] border border-[var(--color-border)] rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-fade-in origin-top">
          <div className="max-h-60 overflow-y-auto scrollbar-hide py-2">
            {options.map((option) => {
              const OptionIcon = option.icon ? getIconComponent(option.icon) : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right px-4 py-3 flex items-center justify-between transition-colors ${
                    value === option.value 
                      ? 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue font-bold' 
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {OptionIcon && <OptionIcon className="w-5 h-5" style={option.color ? { color: option.color } : {}} />}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {value === option.value && <Check className="w-4 h-4 text-brand-blue" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
