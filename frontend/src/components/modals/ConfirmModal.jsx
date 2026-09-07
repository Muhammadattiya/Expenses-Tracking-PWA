import React, { useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle } from "lucide-react";

const ConfirmModal = ({
  open,
  title,
  message,
  icon = null,
  confirmText,
  cancelText,
  confirmColor = "red",
  loading = false,
  disabled = false,
  size = "sm",
  closeOnBackdrop = true,
  closeOnEsc = true,
  onConfirm,
  onCancel,
}) => {
  const { t, lang } = useLanguage();
  
  const finalConfirmText = confirmText || t('modals.confirm');
  const finalCancelText = cancelText || t('modals.cancelBtn');

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading && !disabled) onCancel?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEsc, loading, disabled, onCancel]);

  if (!open) return null;

  const modalWidth =
    size === "lg" ? "max-w-2xl" : size === "md" ? "max-w-lg" : "max-w-sm";

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
          onClick={() => {
            if (closeOnBackdrop && !loading && !disabled) onCancel?.();
          }}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`w-full ${modalWidth} liquidglass rounded-[2.5rem] p-6 border border-white/15 relative overflow-hidden shadow-[0_16px_45px_rgba(0,0,0,0.6)]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Hairline Light */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Icon */}
          <div className="mb-4 flex justify-center">
            {icon ? (
              icon
            ) : confirmColor === "red" ? (
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 shadow-inner">
                <AlertTriangle size={28} />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/35 flex items-center justify-center text-[#E8C5A8] shadow-inner">
                <AlertCircle size={28} />
              </div>
            )}
          </div>

          <h2 className="mb-2 text-xl font-bold text-white text-center tracking-wide">
            {title}
          </h2>

          <div className="text-sm leading-relaxed text-white/70 text-center mb-6">
            {message}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading || disabled}
              className="flex-1 py-3 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {finalCancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || disabled}
              className={`flex-1 py-3 px-5 rounded-full font-semibold text-[13.5px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                confirmColor === "red"
                  ? "bg-red-500/25 border border-red-500/40 hover:bg-red-500/35 text-red-100 shadow-[0_4px_20px_rgba(239,68,68,0.25),inset_0_1px_1px_rgba(255,255,255,0.18)]"
                  : "bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)]"
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                finalConfirmText
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmModal;