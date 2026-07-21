import { useEffect } from "react";

const ConfirmModal = ({
  open,
  title,
  message,
  icon = null,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  confirmColor = "red",
  loading = false,
  disabled = false,
  size = "sm",
  closeOnBackdrop = true,
  closeOnEsc = true,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading && !disabled) onCancel?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEsc, loading, disabled, onCancel]);

  if (!open) return null;

  const buttonColor =
    confirmColor === "red"
      ? "bg-red-500 hover:bg-red-600"
      : confirmColor === "green"
      ? "bg-green-500 hover:bg-green-600"
      : "bg-blue-500 hover:bg-blue-600";

  const modalWidth =
    size === "lg" ? "max-w-2xl" : size === "md" ? "max-w-lg" : "max-w-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-5"
      onClick={() => {
        if (closeOnBackdrop && !loading && !disabled) onCancel?.();
      }}
    >
      <div
        className={`w-full ${modalWidth} rounded-3xl border border-white/10 bg-white/10 backdrop-blur-2xl p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {icon && <div className="mb-4 flex justify-center text-white">{icon}</div>}

        <h2 className="mb-2 text-xl font-semibold text-white">{title}</h2>

        <div className="text-sm leading-6 text-gray-300">{message}</div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || disabled}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-white transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || disabled}
            className={`flex-1 rounded-2xl py-3 text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;