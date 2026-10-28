import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SellInvestmentModal({ item, accounts = [], marketPrice = 0, loading, onClose, onConfirm }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const [quantity, setQuantity] = useState('');
  const [priceMode, setPriceMode] = useState('market');
  const [customPrice, setCustomPrice] = useState('');
  const [deposit, setDeposit] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');

  const unit = item?.type === 'gold' ? t('investments.gram') : item?.type === 'stock' ? t('investments.shareUnit') : (item?.symbol || item?.currency || '');
  const usableAccounts = useMemo(() => accounts.filter(a => !a.isArchived && a.type !== 'investment' && !a.isSystemAccount), [accounts]);
  useEffect(() => {
    if (!item) return;
    setQuantity(''); setPriceMode('market'); setCustomPrice(String(marketPrice || '')); setDeposit(false); setAccountId(usableAccounts[0]?._id || ''); setError('');
  }, [item, marketPrice, usableAccounts]);
  if (!item) return null;

  const numberQuantity = Number(quantity);
  const sellPrice = priceMode === 'market' ? Number(marketPrice) : Number(customPrice);
  const proceeds = Number.isFinite(numberQuantity) && Number.isFinite(sellPrice) ? numberQuantity * sellPrice : 0;
  const cost = Number.isFinite(numberQuantity) ? numberQuantity * Number(item.purchasePrice || 0) : 0;
  const pnl = proceeds - cost;
  const valid = numberQuantity > 0 && numberQuantity <= Number(item.quantity) && sellPrice > 0 && (!deposit || Boolean(accountId));
  const money = (value) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);

  const submit = (event) => {
    event.preventDefault();
    if (!valid) { setError(t('investments.sellValidation')); return; }
    onConfirm({ quantity: numberQuantity, sellPrice, ...(deposit ? { to_account: accountId } : {}) });
  };

  return createPortal(<AnimatePresence>
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={!loading ? onClose : undefined} className="absolute inset-0 bg-[#09080a]/75 backdrop-blur-md" />
      <motion.form role="dialog" aria-modal="true" aria-labelledby="sell-investment-title" initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} onSubmit={submit} className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[2.25rem] sm:rounded-[2.25rem] p-5 sm:p-7 bg-[#141115]/95 backdrop-blur-[32px] border border-white/10 shadow-[0_16px_60px_rgba(0,0,0,0.55)] flex flex-col gap-5">
        <div className="absolute -top-24 -end-20 w-64 h-64 rounded-full bg-[#8D6346] opacity-25 blur-[120px] pointer-events-none" />
        <div className="relative sm:hidden w-11 h-1 rounded-full bg-white/20 mx-auto -mt-1" />
        <header className="relative flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0"><span className="w-11 h-11 shrink-0 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner flex items-center justify-center"><ArrowUpRight size={21} /></span><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#E8C5A8]">{t('investments.sellAction')}</p><h2 id="sell-investment-title" className="font-bold text-lg text-white truncate">{item.name}</h2><p className="text-xs text-white/45 mt-0.5">{item.quantity} {unit}</p></div></div>
          <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={loading} onClick={onClose} aria-label={t('common.close')} className="w-9 h-9 shrink-0 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors"><X size={16} /></motion.button>
        </header>
        {error && <p className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">{error}</p>}
        <section className="relative space-y-2.5"><div className="flex items-center justify-between px-1"><label htmlFor="sell-quantity" className="text-xs font-bold text-white/75">{t('investments.sellQuantity')}</label><span className="text-[11px] text-white/40 tabular-nums">{t('investments.availableQuantity', { quantity: `${item.quantity} ${unit}` })}</span></div><div className="relative"><input id="sell-quantity" type="number" min="0.00000001" max={item.quantity} step="any" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full h-12 rounded-xl px-4 bg-black/20 border border-white/10 text-white font-mono outline-none focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/15 transition-all" /><span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/35">{unit}</span></div><div className="flex gap-1"><motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setQuantity((Number(item.quantity) / 2).toString())} className="px-3 py-1 text-[11px] font-semibold text-white/50 hover:text-white transition-colors">{t('investments.half')}</motion.button><span className="text-white/20 py-1">·</span><motion.button whileTap={{ scale: 0.98 }} type="button" onClick={() => setQuantity(String(item.quantity))} className="px-3 py-1 text-[11px] font-semibold text-[#E8C5A8] hover:text-white transition-colors">{t('investments.allMax')}</motion.button></div></section>
        <section className="space-y-2.5"><p className="px-1 text-xs font-bold text-white/75">{t('investments.sellPriceMode')}</p><div className="grid grid-cols-2 p-1 rounded-xl bg-black/30 border border-white/5 relative"><button type="button" onClick={() => setPriceMode('market')} className={`relative z-10 h-10 rounded-lg text-xs font-bold transition-colors ${priceMode === 'market' ? 'text-white' : 'text-white/50 hover:text-white'}`}>{priceMode === 'market' && <motion.span layoutId="sell-price-mode" className="absolute inset-0 -z-10 rounded-lg bg-[#8D6346] shadow-[0_3px_12px_rgba(141,99,70,0.3)]" />}{t('investments.marketPrice')}</button><button type="button" onClick={() => setPriceMode('custom')} className={`relative z-10 h-10 rounded-lg text-xs font-bold transition-colors ${priceMode === 'custom' ? 'text-white' : 'text-white/50 hover:text-white'}`}>{priceMode === 'custom' && <motion.span layoutId="sell-price-mode" className="absolute inset-0 -z-10 rounded-lg bg-[#8D6346] shadow-[0_3px_12px_rgba(141,99,70,0.3)]" />}{t('investments.customPrice')}</button></div>{priceMode === 'custom' ? <input type="number" min="0.01" step="any" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder={t('investments.customPricePlaceholder')} className="w-full h-12 rounded-xl px-4 bg-black/20 border border-white/10 text-white font-mono outline-none focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/15" /> : <div className="h-10 px-1 flex items-center justify-between"><span className="text-xs text-white/45">{t('investments.marketPrice')}</span><span className="text-sm text-amber-200 font-bold font-mono tabular-nums">{money(marketPrice)} <small className="text-white/35">/ {unit}</small></span></div>}</section>
        <section className="py-4 border-y border-white/10 space-y-2 text-xs"><div className="flex justify-between text-white/50"><span>{t('investments.totalProceeds')}</span><b className="text-white text-lg tabular-nums">{money(proceeds)}</b></div><div className="flex justify-between text-white/45"><span>{t('investments.costBasis')}</span><b className="text-white/70 font-mono">{money(cost)}</b></div><div className={`pt-2 flex justify-between font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}><span>{t('investments.realizedGain')}</span><span className="flex items-center gap-1.5 tabular-nums">{pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{pnl >= 0 ? '+' : ''}{money(pnl)}</span></div></section>
        <section className="space-y-3"><label className="flex items-center justify-between py-2 cursor-pointer"><span className="flex gap-2.5 items-center text-xs font-semibold text-white/75"><Wallet size={16} className={deposit ? 'text-[#E8C5A8]' : 'text-white/40'} />{t('investments.depositProceedsToggle')}</span><input type="checkbox" checked={deposit} onChange={e => setDeposit(e.target.checked)} className="w-4 h-4 accent-[#8D6346]" /></label>{deposit && <div className="relative"><select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full h-12 appearance-none rounded-xl px-4 bg-black/20 border border-white/10 text-white text-sm outline-none focus:border-[#8D6346]">{usableAccounts.map(account => <option key={account._id} value={account._id} className="bg-[#141115]">{account.name}</option>)}</select><ChevronDown size={16} className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40" /></div>}</section>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10"><motion.button whileTap={{ scale: 0.97 }} type="button" disabled={loading} onClick={onClose} className="h-12 rounded-2xl text-xs font-bold text-white/60 hover:bg-white/5 hover:text-white transition-colors">{t('common.cancel')}</motion.button><motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={!valid || loading} className="h-12 rounded-2xl bg-emerald-600 border border-emerald-400/30 shadow-[0_6px_20px_rgba(16,185,129,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:bg-emerald-500 disabled:opacity-45 text-white text-xs font-bold transition-colors">{t('investments.confirmSale')}</motion.button></div>
      </motion.form>
    </div>
  </AnimatePresence>, document.body);
}
