import { useState, useRef } from 'react';
import { useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

const FOLLOW = { stiffness: 150, damping: 18, mass: 1.2 };
const SHEEN = { stiffness: 220, damping: 28 };

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function visualSlot(clientX, rect, count) {
  if (!rect || rect.width <= 0 || count < 1) return 0;
  const t = clamp((clientX - rect.left) / rect.width, 0, 0.999);
  return Math.floor(t * count);
}

function nearestVisual(clientX, rect, count) {
  if (!rect || rect.width <= 0 || count < 1) return 0;
  const slot = rect.width / count;
  let best = 0;
  let bestD = Infinity;
  for (let v = 0; v < count; v += 1) {
    const center = rect.left + v * slot + slot / 2;
    const d = Math.abs(clientX - center);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

function toItemIndex(visual, count, rtl) {
  return rtl ? count - 1 - visual : visual;
}

/**
 * Finger-following liquid highlight for a row of equal slots.
 * Does not touch `.liquidglass`. Overlay sheen + transform only.
 */
export default function useLiquidScrub({
  count,
  rtl = false,
  reduceMotion = false,
  enabled = true,
  onCommit,
}) {
  const trackRef = useRef(null);
  const railRef = useRef(null);
  const didScrub = useRef(false);
  const [held, setHeld] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  const sheenX = useMotionValue(80);
  const sheenY = useMotionValue(24);
  const sheenO = useSpring(0, SHEEN);
  const blobX = useSpring(0, FOLLOW);
  const blobW = useSpring(56, FOLLOW);
  const sheenBg = useMotionTemplate`radial-gradient(110px 80px at ${sheenX}px ${sheenY}px, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 38%, transparent 68%)`;

  const measure = () => railRef.current?.getBoundingClientRect() ?? null;

  const followFinger = (clientX) => {
    const r = measure();
    if (!r) return;
    const slot = r.width / Math.max(count, 1);
    const width = Math.max(44, slot - 10);
    blobW.set(width);
    const x = clamp(clientX - r.left - width / 2, 3, r.width - width - 3);
    blobX.set(x);
    const visual = nearestVisual(clientX, r, count);
    setHoverIndex(toItemIndex(visual, count, rtl));
  };

  const snapToNearest = (clientX) => {
    const r = measure();
    if (!r) return 0;
    const visual = nearestVisual(clientX, r, count);
    const slot = r.width / Math.max(count, 1);
    const width = Math.max(44, slot - 10);
    blobW.set(width);
    blobX.set(visual * slot + 5);
    const index = toItemIndex(visual, count, rtl);
    setHoverIndex(index);
    return index;
  };

  const pointOnTrack = (clientX, clientY) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    sheenX.set(clientX - r.left);
    sheenY.set(clientY - r.top);
  };

  const onPointerDown = (e) => {
    if (!enabled || reduceMotion) return;
    if (!e.target.closest('a[href], button')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* optional */
    }
    setHeld(true);
    pointOnTrack(e.clientX, e.clientY);
    sheenO.set(1);
    const rail = measure();
    if (rail && e.clientX >= rail.left && e.clientX <= rail.right) {
      followFinger(e.clientX);
    }
  };

  const onPointerMove = (e) => {
    if (!enabled || reduceMotion) return;
    pointOnTrack(e.clientX, e.clientY);
    sheenO.set(1);
    if (!e.buttons && !scrubbing) return;
    const rail = measure();
    if (!rail) return;
    if (e.clientX < rail.left - 24 || e.clientX > rail.right + 24) return;
    if (Math.abs(e.movementX) > 2 || scrubbing || didScrub.current) {
      didScrub.current = true;
      setScrubbing(true);
      followFinger(e.clientX);
    }
  };

  const onPointerUp = (e) => {
    if (didScrub.current) {
      const index = snapToNearest(e.clientX);
      onCommit?.(index);
      setHeld(false);
      sheenO.set(0);
      window.setTimeout(() => {
        setScrubbing(false);
        setHoverIndex(null);
        didScrub.current = false;
      }, 320);
      return;
    }
    setHeld(false);
    setScrubbing(false);
    setHoverIndex(null);
    sheenO.set(0);
    didScrub.current = false;
  };

  const onPointerLeave = () => {
    if (!held && !scrubbing) sheenO.set(0);
  };

  return {
    trackRef,
    railRef,
    held,
    scrubbing,
    hoverIndex,
    didScrub,
    sheenBg,
    sheenO,
    blobX,
    blobW,
    bindTrack: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onPointerLeave,
    },
  };
}

export { visualSlot, nearestVisual, toItemIndex };
