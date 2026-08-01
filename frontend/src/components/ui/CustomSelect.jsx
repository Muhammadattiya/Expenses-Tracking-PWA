import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { getIconComponent } from '../IconPicker';

const CustomSelect = ({ options, value, onChange, placeholder = 'اختر...', buttonClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: undefined, bottom: undefined, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (containerRef.current && containerRef.current.contains(event.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target))
      ) {
        return; // clicked inside
      }
      setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updatePosition = () => {
    if (containerRef.current && isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      const isBottomTooClose = window.innerHeight - rect.bottom < 250;
      
      setCoords({
        left: rect.left,
        width: rect.width,
        top: isBottomTooClose ? undefined : rect.bottom + 8,
        bottom: isBottomTooClose ? window.innerHeight - rect.top + 8 : undefined
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const SelectedIcon = selectedOption?.icon ? getIconComponent(selectedOption.icon) : null;

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || "field font-semibold shadow-lg backdrop-blur-md flex items-center justify-between hover:bg-[var(--color-surface-hover)]"}
      >
        <div className="flex items-center gap-2 truncate">
          {SelectedIcon && <SelectedIcon className={`w-5 h-5 ${!selectedOption?.color ? 'text-[var(--color-text-muted)]' : ''}`} style={selectedOption?.color ? { color: selectedOption.color } : {}} />}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{ 
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            zIndex: 99999
          }}
          className={`bg-[var(--color-surface-active)] border border-[var(--color-border)] rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-fade-in ${coords.top ? 'origin-top' : 'origin-bottom'}`}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
