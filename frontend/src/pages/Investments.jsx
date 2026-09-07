import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, 
  LineChart, 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Activity, 
  Layers, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { createInvestment, deleteInvestment, getGoldPrice, getInvestments, updateInvestment } from '../api/investments';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import LiveGoldIngotCard from '../components/investments/LiveGoldIngotCard';
import GoldCard from '../components/investments/GoldCard';
import StockCard from '../components/investments/StockCard';
import CurrencyCard from '../components/investments/CurrencyCard';
import GoldInvestmentModal from '../components/investments/GoldInvestmentModal';
import StockInvestmentModal from '../components/investments/StockInvestmentModal';
import CurrencyInvestmentModal from '../components/investments/CurrencyInvestmentModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { InvestmentsSkeleton } from '../components/ui/Skeletons';
import ErrorMessage from '../components/ui/ErrorMessage';

export default function Investments() {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const { showToast } = useNotification();

  const [investments, setInvestments] = useState([]);
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Tab Filter: 'all', 'gold', 'stock', 'currency'
  const [activeTab, setActiveTab] = useState('all');

  // Modal controls
  const [modalType, setModalType] = useState(null); // 'gold', 'stock', 'currency' or null
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const money = (value) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', { 
    style: 'currency', 
    currency: 'EGP', 
    maximumFractionDigits: 2 
  }).format(value || 0);

  const goldUnitPrice = (goldData, karat) => {
    const k = Number(karat || 24);
    if (k === 18) return goldData?.perGram18 || (goldData?.perGram24 ? goldData.perGram24 * (18 / 24) : 0);
    if (k === 21) return goldData?.perGram21 || (goldData?.perGram24 ? goldData.perGram24 * (21 / 24) : 0);
    return goldData?.perGram24 || 0;
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    const cachedGold = localStorage.getItem('cachedGoldPrice');
    if (cachedGold) {
      try { setGold(JSON.parse(cachedGold)); } catch (e) {}
    }

    const [itemsResult, priceResult] = await Promise.allSettled([getInvestments(), getGoldPrice()]);
    
    if (itemsResult.status === 'fulfilled') {
      setInvestments(itemsResult.value || []);
    } else {
      setError(itemsResult.reason.response?.data?.message || t('investments.loadError'));
    }
    
    if (priceResult.status === 'fulfilled') {
      setGold(priceResult.value);
      localStorage.setItem('cachedGoldPrice', JSON.stringify(priceResult.value));
    } else if (!cachedGold) {
      setError(priceResult.reason.response?.data?.message || t('investments.goldPriceError'));
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  const getEffectiveItemValue = (item) => {
    if (item.type === 'gold') {
      const liveRate = goldUnitPrice(gold, item.karat);
      return (liveRate || item.currentPrice || item.purchasePrice) * item.quantity;
    }
    if (item.type === 'currency') {
      const code = item.symbol || item.currency || 'USD';
      const liveRate = (code === 'USD' && gold?.usdToEgp && !item.currentPrice) ? gold.usdToEgp : (item.currentPrice || item.purchasePrice);
      return liveRate * item.quantity;
    }
    // Stock
    const unitPrice = item.currentPrice || item.purchasePrice;
    return unitPrice * item.quantity;
  };

  const getEffectiveItemCost = (item) => {
    return item.quantity * item.purchasePrice;
  };

  // Calculations across portfolio
  const portfolioSummary = useMemo(() => {
    let totalCurrent = 0;
    let totalCost = 0;
    let goldTotal = 0;
    let stockTotal = 0;
    let currencyTotal = 0;

    investments.forEach(item => {
      const val = getEffectiveItemValue(item);
      const cost = getEffectiveItemCost(item);
      totalCurrent += val;
      totalCost += cost;

      if (item.type === 'gold') goldTotal += val;
      else if (item.type === 'stock') stockTotal += val;
      else if (item.type === 'currency') currencyTotal += val;
    });

    const netProfit = totalCurrent - totalCost;
    const isProfit = netProfit >= 0;
    const profitPercent = totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : 0;

    return {
      totalCurrent,
      totalCost,
      netProfit,
      isProfit,
      profitPercent,
      goldTotal,
      stockTotal,
      currencyTotal,
      goldPercent: totalCurrent > 0 ? (goldTotal / totalCurrent) * 100 : 0,
      stockPercent: totalCurrent > 0 ? (stockTotal / totalCurrent) * 100 : 0,
      currencyPercent: totalCurrent > 0 ? (currencyTotal / totalCurrent) * 100 : 0,
    };
  }, [investments, gold]);

  // Filtered investments list
  const filteredInvestments = useMemo(() => {
    if (activeTab === 'all') return investments;
    return investments.filter(item => item.type === activeTab);
  }, [investments, activeTab]);

  const handleOpenAddModal = (type) => {
    setEditingItem(null);
    setModalType(type);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setModalType(item.type || 'gold');
  };

  const handleSaveInvestment = async (formData) => {
    try {
      if (editingItem) {
        await updateInvestment(editingItem._id, formData);
        showToast(t('common.saveSuccess'), 'success');
      } else {
        await createInvestment(formData);
        showToast(t('common.addSuccess'), 'success');
      }
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || t('investments.saveError'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    const previous = [...investments];
    setInvestments(investments.filter(item => item._id !== id));
    try {
      await deleteInvestment(id);
      showToast(t('common.deleteSuccess'), 'success');
    } catch (err) {
      setInvestments(previous);
      showToast(t('investments.deleteError'), 'error');
    }
  };

  if (loading && !investments.length) {
    return <InvestmentsSkeleton />;
  }

  return (
    <div className="relative text-white pb-28 pt-1 max-w-md mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Ambient Copper Background exactly like Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      {/* Top Header */}
      <header className="flex flex-col gap-3.5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={13} className="text-[#8D6346]" />
              <span className="font-['Exo_2'] font-bold uppercase text-[11px] tracking-wide text-white/90">
                {t('investments.title')}
              </span>
            </div>
            <h1 className="font-['Exo_2'] font-bold text-[22px] tracking-tight drop-shadow-sm text-white">
              {t('investments.title')}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            aria-label={t('common.refresh')}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-[#8D6346]' : ''} />
          </button>
        </div>

        {/* Sleek Action Buttons (Fits perfectly on all screens without truncation) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Add Gold Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handleOpenAddModal('gold')}
            className="py-2.5 px-2 rounded-full font-bold text-xs bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Coins size={13} className="shrink-0" />
            <span className="truncate">{t('investments.addGoldBtn')}</span>
          </motion.button>

          {/* Add Stock Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handleOpenAddModal('stock')}
            className="py-2.5 px-2 rounded-full font-bold text-xs bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <LineChart size={13} className="shrink-0" />
            <span className="truncate">{t('investments.addStockBtn')}</span>
          </motion.button>

          {/* Add Currency Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => handleOpenAddModal('currency')}
            className="py-2.5 px-2 rounded-full font-bold text-xs bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Banknote size={13} className="shrink-0" />
            <span className="truncate">{t('investments.addCurrencyBtn')}</span>
          </motion.button>
        </div>
      </header>

      {error && <ErrorMessage message={error} className="mb-5" />}

      {/* Premium Luxury Portfolio Hero Card - Primary Glass */}
      <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-5 relative overflow-hidden mb-5">
        <div className="relative z-10 flex flex-col gap-3.5">
          {/* Top Row: Label + Return Badge */}
          <div className="flex items-center justify-between">
            <span className="font-['Exo_2'] font-bold uppercase text-[11px] tracking-wide text-white/90">
              {t('investments.totalCurrentValue')}
            </span>

            {/* Total Return Badge */}
            <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 shrink-0 ${
              portfolioSummary.isProfit
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                : 'bg-red-500/15 border-red-500/35 text-red-300'
            }`}>
              {portfolioSummary.isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="text-xs font-black tabular-nums">
                {portfolioSummary.isProfit ? `+${portfolioSummary.profitPercent}%` : `${portfolioSummary.profitPercent}%`}
              </span>
            </div>
          </div>

          {/* Main Portfolio Wealth Metric */}
          <div>
            <h2 className="font-['Exo_2'] font-bold text-[32px] sm:text-4xl tracking-tight drop-shadow-sm text-white tabular-nums leading-tight">
              {money(portfolioSummary.totalCurrent)}
            </h2>
            <p className="font-['Exo_2'] font-medium text-[15px] leading-[1.5em] tracking-[-0.01em] text-white/70 mt-1 flex items-center gap-1">
              <span>{t('investments.netReturn')}</span>
              <span className={`font-bold tabular-nums ${portfolioSummary.isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolioSummary.isProfit ? `+${money(portfolioSummary.netProfit)}` : money(portfolioSummary.netProfit)}
              </span>
            </p>
          </div>

          {/* Asset Allocation: Clean Horizontal Ratio Bar & Uncrowded Rows */}
          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-['Exo_2'] font-bold uppercase text-[11px] tracking-wide text-white/90">
                {t('investments.holdingsBreakdown')}
              </span>
            </div>

            {/* Multi-Segment Ratio Bar - Recessed Glass */}
            <div className="w-full h-2 rounded-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner flex p-0.5 overflow-hidden">
              {portfolioSummary.totalCurrent > 0 ? (
                <>
                  <div 
                    style={{ width: `${Math.max(portfolioSummary.goldPercent, portfolioSummary.goldTotal > 0 ? 3 : 0)}%` }} 
                    className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                  />
                  <div 
                    style={{ width: `${Math.max(portfolioSummary.stockPercent, portfolioSummary.stockTotal > 0 ? 3 : 0)}%` }} 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  />
                  <div 
                    style={{ width: `${Math.max(portfolioSummary.currencyPercent, portfolioSummary.currencyTotal > 0 ? 3 : 0)}%` }} 
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                  />
                </>
              ) : (
                <div className="w-full h-full bg-white/10 rounded-full" />
              )}
            </div>

            {/* Full-Width Asset Allocation Rows (Guaranteed Zero Overflow) */}
            <div className="flex flex-col gap-1.5 pt-1">
              {/* Gold Row */}
              <div className="flex items-center justify-between py-1 px-2 rounded-xl bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white/90">{t('investments.gold')}</span>
                  <span className="text-[10px] font-bold text-amber-300/90 bg-amber-500/15 px-1.5 py-0.2 rounded-md font-mono">
                    {portfolioSummary.totalCurrent > 0 ? `${Math.round(portfolioSummary.goldPercent)}%` : '0%'}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-200 tabular-nums font-mono">
                  {money(portfolioSummary.goldTotal)}
                </span>
              </div>

              {/* Stock Row */}
              <div className="flex items-center justify-between py-1 px-2 rounded-xl bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-xs font-bold text-white/90">{t('investments.stock')}</span>
                  <span className="text-[10px] font-bold text-blue-300/90 bg-blue-500/15 px-1.5 py-0.2 rounded-md font-mono">
                    {portfolioSummary.totalCurrent > 0 ? `${Math.round(portfolioSummary.stockPercent)}%` : '0%'}
                  </span>
                </div>
                <span className="text-xs font-black text-blue-200 tabular-nums font-mono">
                  {money(portfolioSummary.stockTotal)}
                </span>
              </div>

              {/* Currency Row */}
              <div className="flex items-center justify-between py-1 px-2 rounded-xl bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white/90">{t('investments.foreignCash')}</span>
                  <span className="text-[10px] font-bold text-emerald-300/90 bg-emerald-500/15 px-1.5 py-0.2 rounded-md font-mono">
                    {portfolioSummary.totalCurrent > 0 ? `${Math.round(portfolioSummary.currencyPercent)}%` : '0%'}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-200 tabular-nums font-mono">
                  {money(portfolioSummary.currencyTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Realistic Gold Bullion Ingot Live Rates Card (NOT liquidglass) */}
      <LiveGoldIngotCard gold={gold} />

      {/* Asset Filter Tabs */}
      <div className="flex items-center justify-center mb-4">
        <div className="grid grid-cols-4 w-full p-1.5 liquidglass rounded-[24px] relative z-10">
          {[
            { key: 'all', label: t('investments.all'), icon: Layers },
            { key: 'gold', label: t('investments.gold'), icon: Coins },
            { key: 'stock', label: t('investments.stock'), icon: LineChart },
            { key: 'currency', label: t('investments.cashLabel'), icon: Banknote },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 z-10 ${
                  isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeInvTab"
                    className="absolute inset-0 bg-white/15 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Investments Grid (Clean Minimalist Cards, NO bloated icons) */}
      <section className="flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filteredInvestments.map(item => {
            if (item.type === 'gold') {
              const liveRate = goldUnitPrice(gold, item.karat);
              return (
                <GoldCard
                  key={item._id}
                  item={item}
                  liveGoldRate={liveRate}
                  onEdit={handleOpenEditModal}
                  onDelete={(id) => setDeleteId(id)}
                />
              );
            }
            if (item.type === 'stock') {
              return (
                <StockCard
                  key={item._id}
                  item={item}
                  onEdit={handleOpenEditModal}
                  onDelete={(id) => setDeleteId(id)}
                />
              );
            }
            // Currency
            return (
              <CurrencyCard
                key={item._id}
                item={item}
                liveUsdRate={gold?.usdToEgp}
                onEdit={handleOpenEditModal}
                onDelete={(id) => setDeleteId(id)}
              />
            );
          })}
        </AnimatePresence>

        {filteredInvestments.length === 0 && !loading && (
          <div className="py-10 px-6 flex flex-col items-center justify-center text-center bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem]">
            <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner flex items-center justify-center text-white/70 mb-3">
              <Coins size={22} />
            </div>
            <h3 className="font-['Exo_2'] font-bold text-[22px] tracking-tight drop-shadow-sm text-white mb-1">
              {investments.length === 0 
                ? t('investments.noInvestments')
                : t('investments.noFilteredInvestments')}
            </h3>
            <p className="font-['Exo_2'] font-medium text-[15px] leading-[1.5em] tracking-[-0.01em] text-white/70 max-w-xs mb-4">
              {t('investments.emptyDescription')}
            </p>

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleOpenAddModal('gold')}
              className="py-2.5 px-5 rounded-[2rem] font-bold text-xs bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner hover:bg-[#8D6346]/30 transition-colors text-white flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>{t('investments.addGold')}</span>
            </motion.button>
          </div>
        )}
      </section>

      {/* Specialized Modals */}
      <GoldInvestmentModal
        isOpen={modalType === 'gold'}
        onClose={() => { setModalType(null); setEditingItem(null); }}
        onSave={handleSaveInvestment}
        initialData={editingItem}
        liveGoldRates={gold}
      />

      <StockInvestmentModal
        isOpen={modalType === 'stock'}
        onClose={() => { setModalType(null); setEditingItem(null); }}
        onSave={handleSaveInvestment}
        initialData={editingItem}
      />

      <CurrencyInvestmentModal
        isOpen={modalType === 'currency'}
        onClose={() => { setModalType(null); setEditingItem(null); }}
        onSave={handleSaveInvestment}
        initialData={editingItem}
        liveUsdRate={gold?.usdToEgp}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteId}
        title={t('investments.deleteTitle')}
        message={t('investments.deleteConfirm')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
