import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141115] overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-80">
        <img
          src="/assets/splash-bg.svg"
          alt=""
          className="w-full max-w-[557px] object-cover scale-[1.3] md:scale-150"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.5 }}
        >
          <img src="/assets/splash-logo.svg" alt="Finova Logo" className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]" />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.4 }}
        >
          <h1 className="text-white font-['Exo_2'] font-semibold text-4xl tracking-wide">
            Finova
          </h1>
          <p className="text-white/80 font-['Exo_2'] font-medium text-base sm:text-lg">
            Redefining your money.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
