/**
 * Reusable, safe haptic feedback utility for Finova PWA.
 * Provides subtle tactile responses for selection, switches, and transaction confirmations.
 */
export const triggerHaptic = (type = 'light') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'selection':
        navigator.vibrate(8);
        break;
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'success':
        navigator.vibrate([15, 40, 25]);
        break;
      case 'warning':
        navigator.vibrate([25, 50, 25]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch (e) {
    // Ignore environments where Vibration API is blocked or unsupported
  }
};
