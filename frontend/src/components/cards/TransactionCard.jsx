import {
  ArrowDown,
  ArrowUp,
  Wallet,
  Pencil,
  Trash2,
} from "lucide-react";

const TransactionCard = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  const icon =
    transaction.type === "expense" ? (
      <ArrowUp className="w-5 h-5" />
    ) : transaction.type === "income" ? (
      <ArrowDown className="w-5 h-5" />
    ) : (
      <Wallet className="w-5 h-5" />
    );

  const iconStyle =
    transaction.type === "expense"
      ? "bg-red-500/10 text-red-400"
      : transaction.type === "income"
      ? "bg-green-500/10 text-green-400"
      : "bg-blue-500/10 text-blue-400";

  const amountStyle =
    transaction.type === "expense"
      ? "text-red-400"
      : transaction.type === "income"
      ? "text-green-400"
      : "text-blue-400";

  const sign =
    transaction.type === "expense"
      ? "-"
      : transaction.type === "income"
      ? "+"
      : "";

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center justify-between">

      <div className="flex items-center gap-3">

        <div className={`p-3 rounded-xl ${iconStyle}`}>
          {icon}
        </div>

        <div>
          <h3 className="font-semibold text-gray-100">
            {transaction.title}
          </h3>

          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            {transaction.type === "transfer" ? (
              <span className="flex items-center gap-1">
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{transaction.from_account?.name || 'حساب محذوف'}</span>
                <span>⟶</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{transaction.to_account?.name || 'حساب محذوف'}</span>
              </span>
            ) : (
              <>
                <span>{transaction.category?.name || 'بدون فئة'}</span>
                <span className="w-1 h-1 rounded-full bg-gray-500 inline-block"></span>
                <span className="text-gray-500">{transaction.account?.name || 'حساب محذوف'}</span>
              </>
            )}
          </p>
        </div>

      </div>

      <div className="flex items-center gap-2">

        <div className={`font-bold ${amountStyle}`}>
          {sign}
          {transaction.amount} ج.م
        </div>

        <button
          onClick={() => onEdit(transaction)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-blue-500/20 transition flex items-center justify-center"
        >
          <Pencil className="w-4 h-4 text-blue-400" />
        </button>

        <button
          onClick={() => onDelete(transaction)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-red-500/20 transition flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>

      </div>

    </div>
  );
};

export default TransactionCard;
