import { ArrowDown, ArrowUp, Wallet, Tag, ArrowRightLeft } from "lucide-react";
import { getIconComponent } from "../IconPicker";
import { useLanguage } from "../../contexts/LanguageContext";

const TransactionCard = ({ transaction, onClick }) => {
  const { t, lang } = useLanguage();
  const accountObj = transaction.account && typeof transaction.account === 'object' ? transaction.account : null;
  const categoryObj = transaction.category && typeof transaction.category === 'object' ? transaction.category : null;
  const fromAccountObj = transaction.from_account && typeof transaction.from_account === 'object' ? transaction.from_account : null;
  const toAccountObj = transaction.to_account && typeof transaction.to_account === 'object' ? transaction.to_account : null;

  // Left Icon (Account)
  let LeftIconToRender = Wallet;
  let leftIconName = accountObj?.icon;
  let leftColor = accountObj?.color || '#3b82f6';
  if (transaction.type === "transfer") {
    leftIconName = fromAccountObj?.icon;
    leftColor = fromAccountObj?.color || '#3b82f6';
  }
  if (leftIconName) LeftIconToRender = getIconComponent(leftIconName, 'Wallet');

  // Right Icon (Category or Destination Account or Investment)
  let RightIconToRender = Tag;
  let rightIconName = categoryObj?.icon;
  let rightColor = transaction.type === "expense" ? '#f87171' : (transaction.type === "income" ? '#4ade80' : '#60a5fa');
  if (transaction.type === "transfer") {
    if (transaction.investment) {
      rightIconName = "TrendingUp";
      rightColor = "#eab308"; // yellow/gold for investments
    } else {
      rightIconName = toAccountObj?.icon;
      rightColor = toAccountObj?.color || '#3b82f6';
    }
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
  const categoryName = categoryObj
    ? (lang === 'ar' ? (categoryObj.nameAr || categoryObj.name || categoryObj.nameEn) : (categoryObj.nameEn || categoryObj.name || categoryObj.nameAr))
    : (typeof transaction.category === 'string' && transaction.category ? transaction.categoryName : null);
  const accountName = accountObj?.name || (typeof transaction.account === 'string' && transaction.account ? transaction.accountName : null);
  const fromAccountName = fromAccountObj?.name || (typeof transaction.from_account === 'string' && transaction.from_account ? transaction.fromAccountName : null);
  const toAccountName = toAccountObj?.name || (typeof transaction.to_account === 'string' && transaction.to_account ? transaction.toAccountName : null);

  let displayTitle = transaction.title || (transaction.type === "transfer" ? t('addTransaction.transfer') : categoryName || t('transactions.uncategorized'));
  
  if (transaction.type === 'settlement' && transaction.title) {
    if (transaction.title.startsWith("تسوية (مدفوع): ")) {
      displayTitle = `${t('transactions.settlementPaid')}: ${transaction.title.replace("تسوية (مدفوع): ", "")}`;
    } else if (transaction.title.startsWith("تسوية (مستلم): ")) {
      displayTitle = `${t('transactions.settlementReceived')}: ${transaction.title.replace("تسوية (مستلم): ", "")}`;
    }
  }

  return (
    <div 
      onClick={() => onClick(transaction)}
      className="relative overflow-hidden p-4 rounded-[28px] flex items-center justify-between cursor-pointer active:scale-95 transition-all duration-400 mb-3 group"
      style={{
        background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <div className="flex items-center gap-4 z-10">
        {/* Icons Box (Nested Design) */}
        <div className="relative">
          {/* Main Icon (Category or Destination) */}
          <div className="w-[50px] h-[50px] bg-black/20 rounded-[18px] flex items-center justify-center border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] group-hover:bg-white/5 transition-colors duration-300">
            <RightIconToRender className="w-6 h-6 drop-shadow-md" style={{ color: rightColor }} />
          </div>
          
          {/* Secondary/Source Icon Badge (Account or Origin) */}
          <div 
            className="absolute -bottom-1.5 -right-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center shadow-lg border border-white/10"
            style={{ 
              background: 'linear-gradient(135deg, rgba(30,30,30,0.95), rgba(15,15,15,0.95))',
              backdropFilter: 'blur(8px)'
            }}
          >
            <LeftIconToRender className="w-3 h-3 drop-shadow-sm" style={{ color: leftColor }} />
          </div>
        </div>
        
        {/* Transaction Details */}
        <div className="flex flex-col justify-center">
          <h3 className="font-semibold text-white/90 text-[15px] leading-tight tracking-wide">
            {displayTitle}
          </h3>
          <p className="text-[12px] text-white/50 mt-1 flex items-center gap-1.5 font-medium">
            {transaction.type === "transfer" ? (
              <span className="flex items-center gap-1">
                <span>{fromAccountName || t('transactions.deletedAccount')}</span>
                <span className="opacity-50">⟶</span>
                <span>
                  {transaction.investment ? t('investments.title') : (toAccountName || t('transactions.deletedAccount'))}
                </span>
              </span>
            ) : (
              <>
                <span>{categoryName || t('transactions.uncategorized')}</span>
                <span className="w-1 h-1 rounded-full bg-white/20 inline-block"></span>
                <span>{accountName || t('transactions.noAccount')}</span>
              </>
            )}
            {(!transaction.category && !categoryName && ['income', 'expense'].includes(transaction.type)) && (
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm">
                {t('transactions.needsReview')}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Amount with Subtle Glow */}
      <div className="flex flex-col items-end justify-center z-10">
        <span 
          className="font-bold text-[16px] tracking-tight whitespace-nowrap tabular-nums"
          style={{
            color: transaction.type === "expense" ? '#ff6b6b' : transaction.type === "income" ? '#34d399' : '#60a5fa',
            textShadow: transaction.type === "expense" ? '0px 2px 12px rgba(255, 107, 107, 0.4)' : transaction.type === "income" ? '0px 2px 12px rgba(52, 211, 153, 0.4)' : '0px 2px 12px rgba(96, 165, 250, 0.4)'
          }}
        >
          {sign}{transaction.amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-[11px] opacity-70 font-medium">{t('nav.currency')}</span>
        </span>
      </div>
    </div>
  );
};

export default TransactionCard;