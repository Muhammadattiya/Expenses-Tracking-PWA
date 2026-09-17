import React from 'react';

export const AmbientBackground = ({
  variant = 'dashboard',
  canvas = null,
  className = '',
  children,
}) => {
  const canvasBg =
    canvas || (variant === 'debts' ? 'bg-[#100E11]' : 'bg-[#141115]');

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none -z-10 overflow-hidden ${canvasBg} ${className}`}
    >
      {variant === 'debts' ? (
        <>
          <div className="absolute top-[-50px] start-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full" />
          <div className="absolute top-[30%] end-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full" />
          <div className="absolute bottom-[-50px] start-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full" />
        </>
      ) : variant === 'minimal' ? (
        <div className="absolute top-[40px] start-1/2 -translate-x-1/2 w-[280px] h-[280px] bg-[#8D6346] rounded-full blur-[140px] opacity-40" />
      ) : (
        /* Default / Dashboard dual atmospheric glows */
        <>
          <div className="absolute top-[340px] end-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
          <div className="absolute top-[28px] start-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        </>
      )}
      {children}
    </div>
  );
};

export default AmbientBackground;
