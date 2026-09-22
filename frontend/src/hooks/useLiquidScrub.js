import { useState, useRef, useEffect } from 'react';
import { useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { triggerHaptic } from '../utils/haptics';

const FOLLOW = { stiffness: 280, damping: 22, mass: 0.9 };
const SHEEN = { stiffness: 300, damping: 26 };
const RAIL_PADDING = 6; // Accounts for px-1.5 (6px) rail padding

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function visualSlot(clientX, rect, count) {
  if (!rect || rect.width <= 0 || count < 1) return 0;
  const innerWidth = Math.max(rect.width - RAIL_PADDING * 2, 1);
  const t = clamp((clientX - rect.left - RAIL_PADDING) / innerWidth, 0, 0.999);
  return Math.floor(t * count);
}

function nearestVisual(clientX, rect, count) {
  if (!rect || rect.width <= 0 || count < 1) return 0;
  const innerWidth = Math.max(rect.width - RAIL_PADDING * 2, 1);
  const slot = innerWidth / count;
  let best = 0;
  let bestD = Infinity;
  for (let v = 0; v < count; v += 1) {
    const center = rect.left + RAIL_PADDING + v * slot + slot / 2;
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
  const startPos = useRef({ x: 0, y: 0 });
  const capturedPointerId = useRef(null);
  const cachedTrackRect = useRef(null);
  const cachedRailRect = useRef(null);
  const settleTimer = useRef(null);

  const isPointerDown = useRef(false);
  const [held, setHeld] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  const sheenX = useMotionValue(80);
  const sheenY = useMotionValue(24);
  const sheenO = useSpring(0, SHEEN);
  const blobX = useSpring(0, FOLLOW);
  const blobW = useSpring(64, FOLLOW);
  const sheenBg = useMotionTemplate`radial-gradient(110px 80px at ${sheenX}px ${sheenY}px, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 38%, transparent 68%)`;

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  const measure = () => railRef.current?.getBoundingClientRect() ?? null;

  const followFinger = (clientX) => {
    const r = cachedRailRect.current || measure();
    if (!r) return;
    const innerWidth = Math.max(r.width - RAIL_PADDING * 2, 1);
    const slot = innerWidth / Math.max(count, 1);
    const width = Math.max(56, slot + 8);
    blobW.set(width);
    const x = clamp(clientX - r.left - width / 2, -4, r.width - width + 4);
    blobX.set(x);
    const visual = nearestVisual(clientX, r, count);
    const nextIndex = toItemIndex(visual, count, rtl);
    setHoverIndex((prev) => {
      if (prev !== nextIndex) {
        triggerHaptic('selection');
        return nextIndex;
      }
      return prev;
    });
  };

  const snapToNearest = (clientX) => {
    const r = cachedRailRect.current || measure();
    if (!r) return 0;
    const innerWidth = Math.max(r.width - RAIL_PADDING * 2, 1);
    const slot = innerWidth / Math.max(count, 1);
    const visual = nearestVisual(clientX, r, count);
    const width = Math.max(56, slot + 8);
    blobW.set(width);
    const targetX = RAIL_PADDING + visual * slot + (slot - width) / 2;
    blobX.set(targetX);
    const index = toItemIndex(visual, count, rtl);
    setHoverIndex(index);
    return index;
  };

  const pointOnTrack = (clientX, clientY) => {
    const r = cachedTrackRect.current || trackRef.current?.getBoundingClientRect();
    if (!r) return;
    sheenX.set(clientX - r.left);
    sheenY.set(clientY - r.top);
  };

  const onPointerDown = (e) => {
    if (!enabled || reduceMotion) return;

    // Isolate scrubbing strictly to the navigation rail (ignore FAB and Add buttons)
    const rail = railRef.current;
    if (!rail || !rail.contains(e.target)) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      capturedPointerId.current = e.pointerId;
    } catch {
      /* optional */
    }

    // Cache rects for the gesture lifecycle to eliminate 360 forced reflows/sec
    cachedTrackRect.current = trackRef.current?.getBoundingClientRect() ?? null;
    cachedRailRect.current = rail.getBoundingClientRect();
    startPos.current = { x: e.clientX, y: e.clientY };

    isPointerDown.current = true;
    setHeld(true);
    pointOnTrack(e.clientX, e.clientY);
    sheenO.set(1);

    if (e.clientX >= cachedRailRect.current.left && e.clientX <= cachedRailRect.current.right) {
      followFinger(e.clientX);
    }
  };

  const onPointerMove = (e) => {
    if (!enabled || reduceMotion) return;
    pointOnTrack(e.clientX, e.clientY);
    sheenO.set(1);

    if (!isPointerDown.current && !e.buttons && !scrubbing) return;
    const rail = cachedRailRect.current || measure();
    if (!rail) return;

    if (e.clientX < rail.left - 24 || e.clientX > rail.right + 24) return;

    // Displacement-based drag threshold (resilient to 120Hz frames and tap jitter)
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 6 || scrubbing || didScrub.current) {
      didScrub.current = true;
      if (!scrubbing) setScrubbing(true);
      followFinger(e.clientX);
    }
  };

  const cleanupPointerCapture = (currentTarget) => {
    if (capturedPointerId.current !== null) {
      try {
        currentTarget?.releasePointerCapture(capturedPointerId.current);
      } catch {
        /* optional */
      }
      capturedPointerId.current = null;
    }
  };

  const onPointerUp = (e) => {
    cleanupPointerCapture(e.currentTarget);
    isPointerDown.current = false;
    if (didScrub.current) {
      const index = snapToNearest(e.clientX);
      onCommit?.(index);
      setHeld(false);
      sheenO.set(0);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        setScrubbing(false);
        setHoverIndex(null);
        didScrub.current = false;
        cachedRailRect.current = null;
        cachedTrackRect.current = null;
      }, 320);
      return;
    }
    setHeld(false);
    setScrubbing(false);
    setHoverIndex(null);
    sheenO.set(0);
    didScrub.current = false;
    cachedRailRect.current = null;
    cachedTrackRect.current = null;
  };

  const onPointerCancel = (e) => {
    cleanupPointerCapture(e?.currentTarget);
    isPointerDown.current = false;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    setHeld(false);
    setScrubbing(false);
    setHoverIndex(null);
    sheenO.set(0);
    didScrub.current = false;
    cachedRailRect.current = null;
    cachedTrackRect.current = null;
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
      onPointerCancel,
      onPointerLeave,
    },
  };
}

export { visualSlot, nearestVisual, toItemIndex };
