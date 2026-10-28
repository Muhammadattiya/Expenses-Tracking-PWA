import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  ArrowUpRight,
  Coins,
  LineChart,
  Banknote,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

export default function SellInvestmentModal({
  item,
  accounts = [],
  marketPrice = 0,
  loading = false,
  onClose,
  onConfirm
}) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const quantityInputRef = useRef(null);

  const [quantity, setQuantity] = useState('');
  const [priceMode, setPriceMode] = useState('market');
  const [customPrice, setCustomPrice] = useState('');
  const [deposit, setDeposit] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');

  const unit =
    item?.type === 'gold'
      ? t('investments.gram')
      : item?.type === 'stock'
      ? t('investments.shareUnit')
      : item?.symbol || item?.currency || '';

  const usableAccounts = useMemo(
    () => accounts.filter(a => !a.isArchived && a.type !== 'investment' && !a.isSystemAccount),
    [accounts]
  );

  const itemStyle = useMemo(() => {
    if (item?.type === 'gold') {
      return {
        icon: Coins,
        iconBg: 'bg-amber-500/20',
        iconBorder: 'border-amber-500/35',
        iconColor: 'text-amber-300',
        borderColor: 'border-amber-500/25',
        hairline: 'via-amber-400/40'
      };
    }
    if (item?.type === 'stock') {
      return {
        icon: LineChart,
        iconBg: 'bg-blue-500/20',
        iconBorder: 'border-blue-500/35',
        iconColor: 'text-blue-400',
        borderColor: 'border-blue-500/25',
        hairline: 'via-blue-400/40'
      };
    }
    return {
      icon: Banknote,
      iconBg: 'bg-emerald-500/20',
      iconBorder: 'border-emerald-500/35',
      iconColor: 'text-emerald-300',
      borderColor: 'border-emerald-500/25',
      hairline: 'via-emerald-400/40'
    };
  }, [item?.type]);

  const IconComponent = itemStyle.icon;

  useEffect(() => {
    if (!item) return;
    setQuantity('');
    setPriceMode('market');
    setCustomPrice(String(marketPrice || ''));
    setDeposit(false);
    setAccountId(usableAccounts[0]?._id || '');
    setError('');
  }, [item, marketPrice, usableAccounts]);

  // Autofocus input
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        quantityInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [item]);

  const numberQuantity = Number(quantity);
  const sellPrice = priceMode === 'market' ? Number(marketPrice) : Number(customPrice);
  const proceeds =
    Number.isFinite(numberQuantity) && Number.isFinite(sellPrice) ? numberQuantity * sellPrice : 0;
  const cost = Number.isFinite(numberQuantity) ? numberQuantity * Number(item?.purchasePrice || 0) : 0;
  const pnl = proceeds - cost;
  const valid =
    numberQuantity > 0 &&
    numberQuantity <= Number(item?.quantity || 0) &&
    sellPrice > 0 &&
    (!deposit || Boolean(accountId));

  // Keyboard accessibility
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading && valid) {
        e.preventDefault();
        const formEl = document.getElementById('sell-form');
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, loading, onClose, valid]);

  const money = (value) =>
    new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2
    }).format(value || 0);

  const submit = (event) => {
    event.preventDefault();
    if (!valid) {
      setError(t('investments.sellValidation'));
      return;
    }
    onConfirm({
      quantity: numberQuantity,
      sellPrice,
      ...(deposit && accountId ? { to_account: accountId } : {})
    });
  };

  return createPortal(
    <AnimatePresence>
      {item && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
            onClick={() => {
              if (!loading) onClose();
            }}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sell-investment-title"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-md bg-[#141115]/95 backdrop-blur-xl rounded-[2.5rem] border ${itemStyle.borderColor} shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Hairline Light */}
            <div
              className={`absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent ${itemStyle.hairline} to-transparent pointer-events-none`}
            />

            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#141115]/90 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl ${itemStyle.iconBg} ${itemStyle.iconBorder} flex items-center justify-center ${itemStyle.iconColor} shadow-inner shrink-0`}
                >
                  <IconComponent size={20} />
                </div>
                <div className="min-w-0">
                  <h2
                    id="sell-investment-title"
                    className="text-lg font-bold text-white tracking-wide truncate"
                  >
                    {item.name}
                  </h2>
                  <p className="text-[11px] text-white/50 font-medium truncate">
                    {t('investments.sellAction')} · {item.quantity} {unit}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                aria-label={t('common.close')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
              {error && (
                <div className="p-3 mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <form id="sell-form" onSubmit={submit} className="flex flex-col gap-4">
                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <label htmlFor="sell-quantity" className="text-xs font-semibold text-white/70">
                      {t('investments.sellQuantity')}
                    </label>
                    <span className="text-[11px] text-white/40 tabular-nums">
                      {t('investments.availableQuantity', {
                        quantity: `${item.quantity} ${unit}`
                      })}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      ref={quantityInputRef}
                      id="sell-quantity"
                      type="number"
                      min="0.00000001"
                      max={item.quantity}
                      step="any"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="0.00"
                      className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#8D6346]/60 placeholder:text-white/30 transition-all shadow-inner font-mono tabular-nums pe-16"
                    />
                    <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/40 pointer-events-none">
                      {unit}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((Number(item.quantity) / 2).toString())}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/70 hover:text-white transition-all active:scale-95"
                    >
                      {t('investments.half')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(String(item.quantity))}
                      className="px-3 py-1.5 rounded-xl bg-[#8D6346]/20 hover:bg-[#8D6346]/30 border border-[#8D6346]/40 text-xs font-semibold text-[#E8C5A8] hover:text-white transition-all active:scale-95"
                    >
                      {t('investments.allMax')}
                    </button>
                  </div>
                </div>

                {/* Price Mode */}
                <div>
                  <span className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.sellPriceMode')}
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/40 border border-white/10 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setPriceMode('market')}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        priceMode === 'market'
                          ? 'bg-[#8D6346]/35 border border-[#8D6346]/50 text-white shadow-[0_2px_10px_rgba(141,99,70,0.25)]'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {t('investments.marketPrice')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceMode('custom')}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        priceMode === 'custom'
                          ? 'bg-[#8D6346]/35 border border-[#8D6346]/50 text-white shadow-[0_2px_10px_rgba(141,99,70,0.25)]'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {t('investments.customPrice')}
                    </button>
                  </div>

                  {priceMode === 'custom' ? (
                    <div className="relative">
                      <input
                        id="sell-custom-price"
                        type="number"
                        min="0.01"
                        step="any"
                        value={customPrice}
                        onChange={(e) => {
                          setCustomPrice(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder={t('investments.customPricePlaceholder')}
                        className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#8D6346]/60 placeholder:text-white/30 transition-all shadow-inner font-mono tabular-nums"
                      />
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white/50">{t('investments.marketPrice')}</span>
                      <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">
                        {money(marketPrice)}{' '}
                        <small className="text-white/40 text-[11px] font-normal">/ {unit}</small>
                      </span>
                    </div>
                  )}
                </div>

                {/* Financial Preview Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">{t('investments.totalProceeds')}</span>
                    <span className="text-base font-bold text-white tabular-nums">
                      {money(proceeds)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/40">{t('investments.costBasis')}</span>
                    <span className="text-white/70 font-mono text-xs tabular-nums">
                      {money(cost)}
                    </span>
                  </div>
                  <div
                    className={`pt-2.5 border-t border-white/10 flex justify-between items-center text-xs font-bold ${
                      pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    <span>{t('investments.realizedGain')}</span>
                    <span className="flex items-center gap-1.5 tabular-nums text-sm font-mono">
                      {pnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      {pnl >= 0 ? '+' : ''}
                      {money(pnl)}
                    </span>
                  </div>
                </div>

                {/* Deposit Proceeds Toggle Card */}
                <div className="space-y-3">
                  <label
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                      deposit
                        ? 'bg-[#8D6346]/15 border-[#8D6346]/45 shadow-[0_4px_16px_rgba(141,99,70,0.15)]'
                        : 'bg-black/30 border-white/10 hover:bg-black/40 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          deposit
                            ? 'bg-[#8D6346]/30 text-[#E8C5A8] border border-[#8D6346]/50 shadow-inner'
                            : 'bg-white/5 text-white/40 border border-white/10'
                        }`}
                      >
                        <Wallet size={18} />
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-semibold block transition-colors ${
                            deposit ? 'text-white' : 'text-white/80'
                          }`}
                        >
                          {t('investments.depositProceedsToggle')}
                        </span>
                        <span className="text-[11px] text-white/40 block mt-0.5 truncate">
                          {t('investments.depositProceedsDesc')}
                        </span>
                      </div>
                    </div>

                    {/* Modern Ambient Toggle Switch */}
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={deposit}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setDeposit(isChecked);
                          if (isChecked && !accountId && usableAccounts.length > 0) {
                            setAccountId(usableAccounts[0]._id);
                          }
                        }}
                      />
                      <div className="w-12 h-7 bg-white/10 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all duration-300 peer-checked:bg-[#8D6346] peer-checked:border-[#8D6346]/80 peer-checked:shadow-[0_2px_12px_rgba(141,99,70,0.4)]" />
                    </div>
                  </label>

                  {/* Destination Account Selection with AnimatePresence */}
                  <AnimatePresence>
                    {deposit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1.5"
                      >
                        <span className="text-xs font-semibold text-white/70 block px-1">
                          {t('transactions.toAccount')}
                        </span>
                        <CustomSelect
                          value={accountId}
                          onChange={(val) => setAccountId(val)}
                          options={usableAccounts.map((a) => ({
                            value: a._id,
                            label: a.name,
                            icon: a.icon,
                            color: a.color,
                            subtitle:
                              a.balance !== undefined
                                ? `${a.balance.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${
                                    a.currency || 'EGP'
                                  }`
                                : undefined
                          }))}
                          placeholder={t('transactions.toAccountPlaceholder')}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 z-20 p-6 border-t border-white/5 bg-[#141115]/90 backdrop-blur-md flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98]"
              >
                {t('common.cancel')}
              </button>

              <button
                type="submit"
                form="sell-form"
                disabled={!valid || loading}
                className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                <span>{t('investments.confirmSale')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
