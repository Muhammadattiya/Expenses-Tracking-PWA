import React, { forwardRef, useId } from 'react';

export const TextInput = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon = null,
      endAdornment = null,
      id,
      className = '',
      inputClassName = '',
      type = 'text',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={`w-full flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-white/70 tracking-wide select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div className="absolute start-3.5 text-white/40 pointer-events-none flex items-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={`
              w-full bg-white/5 border rounded-2xl px-4 py-3 text-sm text-white
              placeholder:text-white/40 transition-all duration-200 outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'ps-10' : ''}
              ${endAdornment ? 'pe-10' : ''}
              ${
                error
                  ? 'border-red-500/60 focus:border-red-500 focus:shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                  : 'border-white/10 focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] hover:border-white/20'
              }
              ${inputClassName}
            `}
            {...props}
          />

          {endAdornment && (
            <div className="absolute end-3.5 text-white/50 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs text-red-400 mt-0.5 tracking-wide">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-white/50 mt-0.5 tracking-wide">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
export default TextInput;
