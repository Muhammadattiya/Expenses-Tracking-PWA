import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { getIconComponent } from '../IconPicker';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomSelect = ({ options = [], value, onChange, placeholder, buttonClassName }) => {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: undefined, bottom: undefined, left: 0, width: 0 });

  const defaultPlaceholder = placeholder || t('common.select');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (containerRef.current && containerRef.current.contains(event.target)) ||
        (dropdownRef.current && dropdownRef.current.contains(event.target))
      ) {
        return;
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
      const isBottomTooClose = window.innerHeight - rect.bottom < 260;
      
      setCoords({
        left: rect.left,
        width: rect.width,
        top: isBottomTooClose ? undefined : rect.bottom + 6,
        bottom: isBottomTooClose ? window.innerHeight - rect.top + 6 : undefined
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
    <div className={`relative w-full ${isOpen ? 'z-[100]' : ''}`} ref={containerRef} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName || 
          "w-full bg-[#2A2325]/75 border border-white/10 rounded-[18px] px-3.5 py-3 text-[13px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner transition-all hover:bg-[#342B2E]/80 active:scale-[0.99]"
        }
      >
        <div className="flex items-center gap-2.5 truncate">
          {SelectedIcon && (
            <SelectedIcon 
              className={`w-4 h-4 shrink-0 ${!selectedOption?.color ? 'text-white/70' : ''}`} 
              style={selectedOption?.color ? { color: selectedOption.color } : {}} 
            />
          )}
          <span className={`truncate ${selectedOption ? 'text-white font-medium' : 'text-white/40'}`}>
            {selectedOption ? selectedOption.label : defaultPlaceholder}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-white/50 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`} 
        />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          style={{ 
            position: 'fixed',
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            width: coords.width,
            zIndex: 99999
          }}
          className={`liquidglass bg-[#1C1819]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in ${coords.top ? 'origin-top' : 'origin-bottom'}`}
        >
          <div className="max-h-60 overflow-y-auto scrollbar-hide py-1.5 p-1 space-y-0.5">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-center text-[12px] text-white/40">
                {t('common.noData')}
              </div>
            ) : (
              options.map((option) => {
                const OptionIcon = option.icon ? getIconComponent(option.icon) : null;
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between transition-all text-start ${
                      isSelected 
                        ? 'bg-[#8D6346]/25 text-[#E8C5A8] font-bold border border-[#8D6346]/40 shadow-sm' 
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {OptionIcon && (
                        <OptionIcon 
                          className="w-4 h-4 shrink-0" 
                          style={option.color ? { color: option.color } : {}} 
                        />
                      )}
                      <span className="truncate text-[13px]">{option.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#8D6346] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
