import { Pencil, Trash2, Wallet } from "lucide-react";

const AccountCard = ({
  account,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:bg-[var(--color-surface-hover)] transition-all duration-300">

      <div className="flex items-center gap-3">

        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-blue-400" />
        </div>

        <div>
          <h3 className="font-semibold text-white">
            {account.name}
          </h3>

          <p className="text-sm text-[var(--color-text-muted)]">
            {Number(account.balance).toLocaleString("ar-EG")} ج.م
          </p>
        </div>

      </div>

      <div className="flex items-center gap-2">

        <button
          onClick={() => onEdit(account)}
          className="w-9 h-9 rounded-full bg-white/5 border border-[var(--color-border)] hover:bg-brand-blue/20 transition-colors flex items-center justify-center active:scale-95"
        >
          <Pencil className="w-4 h-4 text-brand-blue" />
        </button>

        <button
          onClick={() => onDelete(account)}
          className="w-9 h-9 rounded-full bg-white/5 border border-[var(--color-border)] hover:bg-brand-red/20 transition-colors flex items-center justify-center active:scale-95"
        >
          <Trash2 className="w-4 h-4 text-brand-red" />
        </button>

      </div>

    </div>
  );
};

export default AccountCard;