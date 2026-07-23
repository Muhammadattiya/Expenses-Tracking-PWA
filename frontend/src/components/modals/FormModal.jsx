import { useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

const FormModal = ({
  open,
  title,
  subtitle,
  icon = null,
  children,
  size = "md",
  saveText,
  cancelText,
  saveColor = "blue",
  loading = false,
  disabled = false,
  closeOnBackdrop = true,
  closeOnEsc = true,
  onSave,
  onCancel,
}) => {
  const { t } = useLanguage();

  const finalSaveText = saveText || t('modals.save', 'حفظ');
  const finalCancelText = cancelText || t('modals.cancelBtn', 'إلغاء');

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const h = (e) => {
      if (e.key === "Escape" && !loading && !disabled) onCancel?.();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, closeOnEsc, loading, disabled, onCancel]);

  if (!open) return null;

  const width =
    size === "lg" ? "max-w-3xl" : size === "sm" ? "max-w-md" : "max-w-xl";

  const color =
    saveColor === "green"
      ? "bg-green-500 hover:bg-green-600"
      : saveColor === "red"
      ? "bg-red-500 hover:bg-red-600"
      : "bg-blue-500 hover:bg-blue-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5"
      onClick={() => {
        if (closeOnBackdrop && !loading && !disabled) onCancel?.();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${width} max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-[var(--color-surface)] backdrop-blur-2xl shadow-2xl`}
      >
        <div className="border-b border-white/10 p-6">
          {icon && <div className="mb-3 text-[var(--color-text-main)]">{icon}</div>}
          <h2 className="text-2xl font-semibold text-[var(--color-text-main)]">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-sm text-[var(--color-text-main)]">{subtitle}</p>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-6">
          {children}
        </div>

        <div className="flex gap-3 border-t border-white/10 p-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || disabled}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-[var(--color-text-main)] transition hover:bg-white/10 disabled:opacity-50"
          >
            {finalCancelText}
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={loading || disabled}
            className={`flex-1 rounded-2xl py-3 text-white transition disabled:opacity-50 ${color}`}
          >
            {finalSaveText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormModal;