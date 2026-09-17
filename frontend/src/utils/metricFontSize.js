export function getMetricFontSize(formattedValue, { hero = false, compact = false } = {}) {
  const len = formattedValue ? String(formattedValue).length : 0;
  if (hero) {
    if (len > 14) return 'text-xl sm:text-2xl md:text-3xl lg:text-4xl';
    if (len > 11) return 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl';
    return 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl';
  }
  if (compact) {
    if (len > 14) return 'text-sm md:text-base';
    if (len > 11) return 'text-base md:text-lg';
    return 'text-lg md:text-xl';
  }
  if (len > 14) return 'text-base sm:text-lg md:text-xl';
  if (len > 11) return 'text-lg sm:text-xl md:text-2xl';
  return 'text-xl md:text-3xl';
}

export const metricFlow = 'min-w-0 break-all tabular-nums tracking-tight';
