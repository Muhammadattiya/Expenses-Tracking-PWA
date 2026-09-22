import { motion, useVelocity, useTransform, useSpring } from 'framer-motion';

/** 
 * Apple-inspired expanding liquid scrubber gel.
 * Inflates beyond navbar height (58px) with dynamic velocity droplet deformation,
 * ambient copper halo, and specular glass refractions.
 */
export default function LiquidBlob({ x, width }) {
  const xVelocity = useVelocity(x);

  // Dynamic droplet stretching along drag axis with volume preservation
  const rawScaleX = useTransform(xVelocity, [-1800, 0, 1800], [1.16, 1, 1.16]);
  const rawScaleY = useTransform(xVelocity, [-1800, 0, 1800], [0.88, 1, 0.88]);

  const scaleX = useSpring(rawScaleX, { stiffness: 380, damping: 26 });
  const scaleY = useSpring(rawScaleY, { stiffness: 380, damping: 26 });

  return (
    <motion.div
      aria-hidden="true"
      initial={{ scale: 0.88, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.88, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 480, damping: 28, mass: 0.8 }}
      className="absolute z-10 rounded-full pointer-events-none"
      style={{
        left: 0,
        top: -5,
        bottom: -5,
        x,
        width,
        scaleX,
        scaleY,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 100%)',
        boxShadow:
          '0 16px 36px rgba(0,0,0,0.55), 0 0 24px rgba(141,99,70,0.38), inset 0 3px 6px rgba(255,255,255,0.65), inset 0 -3px 8px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.28)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    />
  );
}
