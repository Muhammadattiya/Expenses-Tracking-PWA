import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileSpreadsheet, FileCode, X, Loader2 } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const ExportModal = ({
  open,
  onClose,
  onExportCsv,
  onExportJson,
  loading = false,
}) => {
  const { t, lang } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        dir={lang === "ar" ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.exportModalTitle")}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-md -z-10"
          onClick={() => {
            if (!loading) onClose?.();
          }}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md liquidglass rounded-[2.5rem] p-6 border border-white/15 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Hairline Light */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/35 flex items-center justify-center text-[#E8C5A8] shadow-inner shrink-0">
                <Download size={24} className="text-[#8D6346]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                  {t("settings.exportModalTitle")}
                </h3>
                <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                  {t("settings.exportModalDesc")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose?.()}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-40"
              aria-label={t("settings.cancelBtn")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Formats Selection */}
          <div className="space-y-3 pt-1">
            {/* CSV Option */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              onClick={onExportCsv}
              className="w-full text-start p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#8D6346]/50 hover:bg-[#8D6346]/10 transition-all flex items-start gap-3.5 group shadow-sm disabled:opacity-50"
            >
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5 shadow-inner">
                <FileSpreadsheet size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white group-hover:text-[#E8C5A8] transition-colors">
                    {t("settings.exportCsvTitle")}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    CSV
                  </span>
                </div>
                <p className="text-xs text-white/55 mt-1 leading-relaxed">
                  {t("settings.exportCsvDesc")}
                </p>
              </div>
            </motion.button>

            {/* JSON Option */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              onClick={onExportJson}
              className="w-full text-start p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#8D6346]/50 hover:bg-[#8D6346]/10 transition-all flex items-start gap-3.5 group shadow-sm disabled:opacity-50"
            >
              <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5 shadow-inner">
                <FileCode size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white group-hover:text-[#E8C5A8] transition-colors">
                    {t("settings.exportJsonTitle")}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    JSON
                  </span>
                </div>
                <p className="text-xs text-white/55 mt-1 leading-relaxed">
                  {t("settings.exportJsonDesc")}
                </p>
              </div>
            </motion.button>
          </div>

          {/* Footer / Spinner */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-[#E8C5A8]">
              <Loader2 size={18} className="animate-spin text-[#8D6346]" />
              <span>{t("settings.exporting")}</span>
            </div>
          ) : (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-colors"
              >
                {t("settings.cancelBtn")}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ExportModal;
