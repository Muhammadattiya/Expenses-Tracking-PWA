import { ArrowDown, ArrowUp, Wallet, Tag, ArrowRightLeft } from "lucide-react";
import { getIconComponent } from "../IconPicker";
import { useLanguage } from "../../contexts/LanguageContext";

const TransactionCard = ({ transaction, onClick }) => {
  const { t } = useLanguage();
  // Left Icon (Account)
  let LeftIconToRender = Wallet;
  let leftIconName = transaction.account?.icon;
  let leftColor = transaction.account?.color || '#3b82f6';
  if (transaction.type === "transfer") {
    leftIconName = transaction.from_account?.icon;
    leftColor = transaction.from_account?.color || '#3b82f6';
  }
  if (leftIconName) LeftIconToRender = getIconComponent(leftIconName, 'Wallet');

  // Right Icon (Category or Destination Account)
  let RightIconToRender = Tag;
  let rightIconName = transaction.category?.icon;
  let rightColor = transaction.type === "expense" ? '#f87171' : (transaction.type === "income" ? '#4ade80' : '#60a5fa');
  if (transaction.type === "transfer") {
    rightIconName = transaction.to_account?.icon;
    rightColor = transaction.to_account?.color || '#3b82f6';
  }
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
  let displayTitle = transaction.title || (transaction.type === "transfer" ? t('addTransaction.transfer', 'تحويل') : transaction.category?.name || t('transactions.uncategorized', 'بدون تصنيف'));
  
  if (transaction.type === 'settlement' && transaction.title) {
    if (transaction.title.startsWith("تسوية (مدفوع): ")) {
      displayTitle = `${t('transactions.settlementPaid', 'Settlement (Paid)')}: ${transaction.title.replace("تسوية (مدفوع): ", "")}`;
    } else if (transaction.title.startsWith("تسوية (مستلم): ")) {
      displayTitle = `${t('transactions.settlementReceived', 'Settlement (Received)')}: ${transaction.title.replace("تسوية (مستلم): ", "")}`;
    }
  }

  return (
    <div 
      onClick={() => onClick(transaction)}
      className="bg-[var(--color-surface)] backdrop-blur-md border border-[var(--color-border)] p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-[var(--color-surface-hover)] active:scale-95 transition-all duration-300 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${leftColor}33`, color: leftColor }}>
          <LeftIconToRender className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--color-text-main)]">
            {displayTitle}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5">
            {transaction.type === "transfer" ? (
              <span className="flex items-center gap-1">
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{transaction.from_account?.name || t('transactions.deletedAccount', 'حساب محذوف')}</span>
                <span>⟶</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px]">{transaction.to_account?.name || t('transactions.deletedAccount', 'حساب محذوف')}</span>
              </span>
            ) : (
              <>
                <span>{transaction.category?.name || t('transactions.uncategorized', 'بدون تصنيف')}</span>
                <span className="w-1 h-1 rounded-full bg-gray-500 inline-block"></span>
                <span className="text-[var(--color-text-muted)]">{transaction.account?.name || t('transactions.noAccount', 'بدون حساب')}</span>
              </>
            )}
            {transaction.status === 'needs_manual_review' && (
              <span className="mr-2 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold">
                {t('transactions.needsReview', 'تحتاج مراجعة')}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`font-bold ${amountStyle}`}>
          {sign}{transaction.amount} {t('nav.currency', 'EGP')}
        </div>
        <div style={transaction.type === 'transfer' ? { backgroundColor: `${rightColor}33`, color: rightColor } : {}} className={`p-3 rounded-xl ${
          transaction.type === 'expense' ? 'bg-brand-red/10 text-brand-red' :
          transaction.type === 'income' ? 'bg-brand-green/10 text-brand-green' :
          ''
        }`}>
          <RightIconToRender className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default TransactionCard;
