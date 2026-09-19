import { useEffect } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el) {
  return !el.hasAttribute('disabled') && el.getClientRects().length > 0;
}

function portaledOwned(root) {
  const extras = [];
  root.querySelectorAll('[aria-controls]').forEach((controller) => {
    const id = controller.getAttribute('aria-controls');
    if (!id) return;
    const owned = document.getElementById(id);
    if (!owned || root.contains(owned)) return;
    extras.push(owned, ...owned.querySelectorAll(FOCUSABLE));
  });
  return extras;
}

function visibleFocusable(root) {
  return [...root.querySelectorAll(FOCUSABLE), ...portaledOwned(root)].filter(isVisible);
}

function isInsideTrap(root, el) {
  if (!el || !root) return false;
  if (root.contains(el)) return true;
  return portaledOwned(root).some((node) => node === el || node.contains(el));
}

export default function useFocusTrap(active, containerRef) {
  useEffect(() => {
    if (!active) return undefined;
    const root = containerRef.current;
    if (!root) return undefined;

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const list = visibleFocusable(root);
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const outside = !isInsideTrap(root, document.activeElement);
      if (e.shiftKey && (document.activeElement === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, containerRef]);
}
