import { motion } from 'framer-motion';

/** Floating selection gel. Overlay only — never applied to `.liquidglass`. */
export default function LiquidBlob({ x, width }) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute z-0 rounded-full pointer-events-none"
      style={{
        top: 3,
        bottom: 7,
        x,
        width,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0.02) 100%)',
        boxShadow:
          '0 10px 18px rgba(0,0,0,0.38), inset 0 3px 6px rgba(255,255,255,0.5), inset 0 -3px 8px rgba(0,0,0,0.22)',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    />
  );
}
