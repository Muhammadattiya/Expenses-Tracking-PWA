import React, { useId } from 'react';
import { motion } from 'framer-motion';

export const SegmentedControl = ({
  options = [],
  value,
  onChange,
  layoutId,
  variant = 'glass',
  size = 'md',
  fullWidth = true,
  className = '',
}) => {
  const generatedId = useId();
  const activeLayoutId = layoutId || `seg_pill_${generatedId}`;

  const indicatorStyles = {
    glass:
      'bg-[#8D6346]/25 border border-[#8D6346]/40 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)]',
    solid:
      'bg-[#8D6346] shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]',
    subtle:
      'bg-white/15 border border-white/10 shadow-[0_2px_6px_rgba(0,0,0,0.15)]',
  };

  const sizeStyles = {
    sm: 'p-1 rounded-[20px] text-xs',
    md: 'p-1.5 rounded-[26px] text-sm',
    lg: 'p-2 rounded-[30px] text-base',
  };

  const buttonPaddings = {
    sm: 'py-1.5 px-3 rounded-[16px]',
    md: 'py-2 px-4 rounded-[20px]',
    lg: 'py-2.5 px-5 rounded-[24px]',
  };

  return (
    <div
      role="tablist"
      className={`
        relative flex items-center bg-black/25 backdrop-blur-[12px]
        border border-white/5 shadow-inner select-none
        ${sizeStyles[size] || sizeStyles.md}
        ${fullWidth ? 'w-full' : 'inline-flex'}
        ${className}
      `}
    >
      {options.map((opt) => {
        const optionId = typeof opt === 'object' ? opt.id : opt;
        const optionLabel = typeof opt === 'object' ? opt.label : opt;
        const optionIcon = typeof opt === 'object' ? opt.icon : null;
        const optionBadge = typeof opt === 'object' ? opt.badge : null;
        const isSelected = value === optionId;

        return (
          <motion.button
            key={optionId}
            type="button"
            role="tab"
            aria-selected={isSelected}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange?.(optionId)}
            className={`
              relative flex-1 flex items-center justify-center gap-2 font-bold
              transition-colors duration-200 cursor-pointer z-10
              ${buttonPaddings[size] || buttonPaddings.md}
              ${isSelected ? 'text-white' : 'text-white/50 hover:text-white/80'}
            `}
          >
            {isSelected && (
              <motion.div
                layoutId={activeLayoutId}
                className={`
                  absolute inset-0 rounded-[20px] -z-10
                  ${indicatorStyles[variant] || indicatorStyles.glass}
                `}
                transition={{
                  type: 'spring',
                  bounce: 0.18,
                  duration: 0.5,
                }}
              />
            )}

            {optionIcon && (
              <span className={`shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
                {optionIcon}
              </span>
            )}

            <span className="truncate">{optionLabel}</span>

            {optionBadge !== undefined && optionBadge !== null && (
              <span
                className={`
                  text-[10px] px-1.5 py-0.2 rounded-full font-bold
                  ${isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}
                `}
              >
                {optionBadge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
