import { ArrowDown, ArrowUp, Wallet, Tag, ArrowRightLeft } from "lucide-react";
import { getIconComponent } from "../IconPicker";

const TransactionCard = ({ transaction, onClick }) => {
  // Left Icon (Account)
  let LeftIconToRender = Wallet;
  let leftIconName = transaction.account?.icon;
  if (transaction.type === "transfer") leftIconName = transaction.from_account?.icon;
  if (leftIconName) LeftIconToRender = getIconComponent(leftIconName, 'Wallet');

  // Right Icon (Category or Destination Account)
  let RightIconToRender = Tag;
  let rightIconName = transaction.category?.icon;
  if (transaction.type === "transfer") rightIconName = transaction.to_account?.icon;
  if (rightIconName) RightIconToRender = getIconComponent(rightIconName, transaction.type === "transfer" ? 'Wallet' : 'Tag');

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
    <div 
      onClick={() => onClick(transaction)}
      className="bg-white/5 backdrop-blur-md border border-white/5 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition"
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
          <LeftIconToRender className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-100">{transaction.title}</h3>
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

      <div className="flex items-center gap-3">
        <div className={`font-bold ${amountStyle}`}>
          {sign}{transaction.amount} ج.م
        </div>
        <div className={`p-3 rounded-xl ${
          transaction.type === 'expense' ? 'bg-red-500/10 text-red-400' :
          transaction.type === 'income' ? 'bg-green-500/10 text-green-400' :
          'bg-blue-500/10 text-blue-400'
        }`}>
          <RightIconToRender className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default TransactionCard;
