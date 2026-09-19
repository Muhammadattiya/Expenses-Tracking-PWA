import { useState, useRef, useEffect, useLayoutEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { getIconComponent } from '../IconPicker';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomSelect = ({ options = [], value, onChange, placeholder, buttonClassName, 'aria-label': ariaLabel }) => {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);
  const [coords, setCoords] = useState({ top: undefined, bottom: undefined, left: 0, width: 0 });
  const listId = useId();
  const buttonId = useId();

  const defaultPlaceholder = placeholder || t('common.select');
  const selectedIndex = options.findIndex((opt) => opt.value === value);

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

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
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

  useEffect(() => {
    if (!isOpen) return;
    const node = optionRefs.current[activeIndex];
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const SelectedIcon = selectedOption?.icon ? getIconComponent(selectedOption.icon) : null;
  const activeDescendant = isOpen && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined;

  const openList = () => {
    setIsOpen(true);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const selectIndex = (index) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openList();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min((i < 0 ? -1 : i) + 1, Math.max(options.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max((i < 0 ? options.length : i) - 1, 0));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0) selectIndex(activeIndex);
    }
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : ''}`} ref={containerRef} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <button
        type="button"
        id={buttonId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeDescendant}
        aria-label={ariaLabel || defaultPlaceholder}
        onClick={() => (isOpen ? setIsOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className={
          buttonClassName ||
          "w-full min-h-[44px] bg-[#2A2325]/75 border border-white/10 rounded-[18px] px-3.5 py-3 text-[13px] font-medium text-white flex items-center justify-between outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 focus:border-[#8D6346] shadow-inner transition-all hover:bg-[#342B2E]/80 active:scale-[0.99]"
        }
      >
        <div className="flex items-center gap-2.5 truncate">
          {SelectedIcon && (
            <SelectedIcon
              className={`w-4 h-4 shrink-0 ${!selectedOption?.color ? 'text-white/70' : ''}`}
              style={selectedOption?.color ? { color: selectedOption.color } : {}}
            />
          )}
          <span className={`truncate ${selectedOption ? 'text-white font-medium' : 'text-white/70'}`}>
            {selectedOption ? selectedOption.label : defaultPlaceholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`}
          aria-hidden="true"
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
          className={`liquidglass bg-[#1C1819]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in motion-reduce:animate-none ${coords.top ? 'origin-top' : 'origin-bottom'}`}
        >
          <div
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            className="max-h-60 overflow-y-auto scrollbar-hide py-1.5 p-1 space-y-0.5"
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-center text-[12px] text-white/70">
                {t('common.noData')}
              </div>
            ) : (
              options.map((option, index) => {
                const OptionIcon = option.icon ? getIconComponent(option.icon) : null;
                const isSelected = value === option.value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value === '' ? `empty-${index}` : option.value}
                    id={`${listId}-opt-${index}`}
                    ref={(el) => { optionRefs.current[index] = el; }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectIndex(index)}
                    className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl flex items-center justify-between transition-all text-start outline-none ${
                      isSelected
                        ? 'bg-[#8D6346]/25 text-[#E8C5A8] font-bold border border-[#8D6346]/40 shadow-sm'
                        : isActive
                          ? 'text-white bg-white/10'
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
                    {isSelected && <Check className="w-4 h-4 text-[#8D6346] shrink-0" aria-hidden="true" />}
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
