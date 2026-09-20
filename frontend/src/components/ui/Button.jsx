import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-[#8D6346]/30 text-white hover:bg-[#8D6346]/45 active:bg-[#8D6346]/25 border border-[#8D6346]/50 hover:border-[#8D6346]/70 shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] backdrop-blur-md',
  secondary:
    'bg-white/10 text-white hover:bg-white/15 active:bg-white/5 border border-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.2)]',
  glass:
    'bg-white/5 text-white/90 hover:bg-white/10 active:bg-white/5 border border-white/10 hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.1)]',
  subtle:
    'bg-[#8D6346]/10 text-[#E8C5A8] border border-[#8D6346]/25 hover:bg-[#8D6346]/20 hover:text-white shadow-inner',
  danger:
    'bg-red-500/25 text-red-100 hover:bg-red-500/35 active:bg-red-500/20 border border-red-500/40 shadow-[0_4px_20px_rgba(239,68,68,0.25),inset_0_1px_1px_rgba(255,255,255,0.18)]',
  ghost:
    'bg-transparent text-white/70 hover:text-white hover:bg-white/5 border border-transparent',
};

const SIZES = {
  sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-full min-h-[32px]',
  md: 'px-5 py-2.5 text-sm font-semibold rounded-full min-h-[42px]',
  lg: 'px-6 py-3.5 text-base font-bold rounded-full min-h-[48px]',
  pill: 'px-6 py-3 text-sm font-bold rounded-full min-h-[44px]',
  square: 'p-2.5 rounded-2xl min-h-[42px] min-w-[42px] flex items-center justify-center',
};

export const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'pill',
      loading = false,
      disabled = false,
      icon = null,
      endIcon = null,
      fullWidth = false,
      type = 'button',
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const tapScale = isDisabled ? 1 : size === 'lg' ? 0.98 : 0.95;

    return (
      <motion.button
        ref={ref}
        type={type}
        whileTap={{ scale: tapScale }}
        disabled={isDisabled}
        aria-busy={loading}
        onClick={onClick}
        className={`
          relative inline-flex items-center justify-center gap-2 select-none
          transition-colors duration-200 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${VARIANTS[variant] || VARIANTS.primary}
          ${SIZES[size] || SIZES.pill}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            {children && <span>{children}</span>}
            {endIcon && <span className="shrink-0 flex items-center">{endIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
