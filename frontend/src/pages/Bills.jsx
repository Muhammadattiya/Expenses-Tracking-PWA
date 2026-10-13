import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Calendar, Link2, PlusCircle, CheckCircle2, ArrowLeft, Search, Loader2, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BillsSkeleton } from '../components/ui/Skeletons';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getBills, createBill, updateBill, deleteBill, ignoreBill, payBill } from '../api/bills';
import { getTransactions } from '../api/transactions';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import BillCard from '../components/bills/BillCard';
import BillModal from '../components/modals/BillModal';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function Bills() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billToDelete, setBillToDelete] = useState(null);

  // Settle & Link Existing Transaction State
  const [payOptionsBill, setPayOptionsBill] = useState(null);
  const [isLinkingExisting, setIsLinkingExisting] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [isSettling, setIsSettling] = useState(false);
  const [txSearch, setTxSearch] = useState('');

  const money = (value) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(value || 0);

  const load = async () => {
    try {
      const [billsData, accountsData, categoriesData] = await Promise.all([
        getBills(),
        getAccounts(),
        getCategories()
      ]);
      setItems(billsData || []);
      setAccounts(accountsData || []);
      setCategories((categoriesData || []).filter((c) => c.type === 'expense'));
    } catch (err) {
      console.error('Error loading bills:', err);
      showToast(t('common.loadError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveBill = async (billData) => {
    try {
      if (billData._id) {
        await updateBill(billData._id, billData);
        showToast(t('bills.updatedSuccess'), 'success');
      } else {
        await createBill(billData);
        showToast(t('bills.createdSuccess'), 'success');
      }
      await load();
    } catch (err) {
      console.error('Error saving bill:', err);
      showToast(err.response?.data?.message || t('common.saveError'), 'error');
      throw err;
    }
  };

  const handleDeleteBill = async (id) => {
    try {
      await deleteBill(id);
      showToast(t('bills.deletedSuccess'), 'success');
      await load();
    } catch (err) {
      console.error('Error deleting bill:', err);
      showToast(err.response?.data?.message || t('common.deleteError'), 'error');
    }
  };

  const handlePayBill = (bill) => {
    setPayOptionsBill(bill);
    setIsLinkingExisting(false);
    setSelectedTxId(null);
    setTxSearch('');
  };

  const handleSettleWithoutExpense = async (bill) => {
    try {
      setIsSettling(true);
      await payBill(bill._id);
      showToast(t('bills.billSettledOnly'), 'success');
      setPayOptionsBill(null);
      await load();
    } catch (err) {
      console.error('Error marking bill paid:', err);
      showToast(err.response?.data?.message || t('common.saveError'), 'error');
    } finally {
      setIsSettling(false);
    }
  };

  const handleOpenLinkExisting = async () => {
    setIsLinkingExisting(true);
    setLoadingTx(true);
    try {
      const txs = await getTransactions({ limit: 50 });
      const expenseTxs = (Array.isArray(txs) ? txs : (txs?.transactions || [])).filter(t => t.type === 'expense');
      setRecentTransactions(expenseTxs);
    } catch (err) {
      console.error('Error fetching transactions for bill linking:', err);
      showToast(t('common.loadError'), 'error');
    } finally {
      setLoadingTx(false);
    }
  };

  const handleConfirmLinkSettle = async () => {
    if (!payOptionsBill || !selectedTxId) return;
    try {
      setIsSettling(true);
      await payBill(payOptionsBill._id, selectedTxId);
      showToast(t('bills.billSettledWithExisting'), 'success');
      setPayOptionsBill(null);
      await load();
    } catch (err) {
      console.error('Error settling bill with transaction:', err);
      showToast(err.response?.data?.message || t('common.saveError'), 'error');
    } finally {
      setIsSettling(false);
    }
  };

  const handleIgnoreBill = async (bill) => {
    try {
      await ignoreBill(bill._id);
      showToast(t('bills.ignoredSuccess'), 'success');
      await load();
    } catch (err) {
      console.error('Error ignoring bill:', err);
      showToast(err.response?.data?.message || t('common.saveError'), 'error');
    }
  };

  const openCreateModal = () => {
    setSelectedBill(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bill) => {
    setSelectedBill(bill);
    setIsModalOpen(true);
  };

  // Metrics Calculations
  const totalBills = items.length;
  const totalAmount = items.reduce((sum, item) => sum + (item.expectedAmount || 0), 0);
  const activeItems = items.filter((i) => i.status !== 'paid');
  const closestBill =
    activeItems.length > 0
      ? [...activeItems].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]
      : null;

  const closestFormattedDate = closestBill
    ? new Date(closestBill.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')
    : null;

  if (isLoading) {
    return <BillsSkeleton />;
  }

  return (
    <div className="animate-fade-in w-full relative min-h-screen pb-32 overflow-x-hidden">
      {/* Figma Background Effects - Exactly matching Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Header - Centered */}
        <header className="flex justify-center items-center pt-1">
          <h1 className="text-2xl font-bold text-white tracking-wide drop-shadow-sm">
            {t('bills.title')}
          </h1>
        </header>

      {/* 2-Section Authentic Bill Ticket Hero Card */}
      {items.length > 0 && (
        <div className="relative bg-[#221A1C] border border-[#8D6346]/35 rounded-[2.5rem] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
          {/* Top Subtle Hairline Light Reflection */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#8D6346]/50 to-transparent pointer-events-none" />

          {/* Section 1: Total Value & Bills Count */}
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[12px] font-medium text-white/60 block mb-1">
                {t('bills.totalValue')}
              </span>
              <div className="text-[28px] sm:text-[32px] font-black text-white tabular-nums tracking-tight drop-shadow-sm">
                {money(totalAmount)}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12px] font-semibold text-white/80 tabular-nums shadow-inner">
              <Receipt size={14} className="text-[#E8C5A8] shrink-0" />
              <span>{totalBills} {t('bills.noOfBills')}</span>
            </div>
          </div>

          {/* Perforated Divider with Circular Notches */}
          <div className="relative my-4">
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#141115] border border-r-[#8D6346]/35 border-t-transparent border-b-transparent border-l-transparent" />
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#141115] border border-l-[#8D6346]/35 border-t-transparent border-b-transparent border-r-transparent" />
            <div className="border-t-2 border-dashed border-white/15 w-full" />
          </div>

          {/* Section 2: Closest Due Bill */}
          {closestBill ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#FF9500] shadow-[0_0_8px_rgba(255,149,0,0.7)] animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9500]">
                    {t('bills.closestBill')}
                  </span>
                </div>
                <div className="text-[16px] font-bold text-white truncate drop-shadow-sm">
                  {closestBill.name}
                </div>
              </div>

              <div className="text-end shrink-0">
                <div className="flex items-center justify-end gap-1.5 text-[11.5px] text-white/70 font-medium tabular-nums mb-1">
                  <Calendar size={12} className="text-[#E8C5A8] shrink-0" />
                  <span>{closestFormattedDate}</span>
                </div>
                <div className="text-[17px] font-black text-[#E8C5A8] tabular-nums tracking-tight">
                  {money(closestBill.expectedAmount)}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-1 text-center text-[12px] text-white/50 font-medium">
              {t('bills.noUpcoming')}
            </div>
          )}
        </div>
      )}

      {/* Bills Content / Empty State */}
      {items.length === 0 ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 my-auto">
          <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E8C5A8] shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-5">
            <Receipt size={36} className="text-[#E8C5A8]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 tracking-wide">
            {t('bills.noBills')}
          </h3>
          <p className="text-[13.5px] text-white/50 mb-8 max-w-xs leading-relaxed">
            {t('bills.emptyDesc')}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="py-3.5 px-8 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <Plus size={16} />
            <span>{t('bills.addBill')}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Section Title & Add Action (Only shown when bills exist) */}
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[18px] font-bold text-white tracking-wide">
              {t('bills.billsInfo')}
            </h2>
            <button
              type="button"
              onClick={openCreateModal}
              aria-label={t('bills.addBill')}
              className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm"
              title={t('bills.addBill')}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Bills List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((bill) => (
                <motion.div
                  key={bill._id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <BillCard
                    bill={bill}
                    onEdit={openEditModal}
                    onDelete={(b) => setBillToDelete(b)}
                    onPay={handlePayBill}
                    onIgnore={handleIgnoreBill}
                    t={t}
                    lang={lang}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Bill Create/Edit Modal */}
      {isModalOpen && (
        <BillModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveBill}
          onDelete={handleDeleteBill}
          bill={selectedBill}
          accounts={accounts}
          categories={categories}
        />
      )}

      {/* Confirm Delete Modal */}
      {billToDelete && (
        <ConfirmModal
          open={Boolean(billToDelete)}
          title={t('bills.confirmDelete')}
          message={`${t('bills.confirmDelete')} "${billToDelete.name}"`}
          confirmText={t('common.delete')}
          cancelText={t('modals.cancelBtn')}
          confirmColor="red"
          onConfirm={() => {
            const id = billToDelete._id;
            setBillToDelete(null);
            handleDeleteBill(id);
          }}
          onCancel={() => setBillToDelete(null)}
        />
      )}
      {/* Settle Bill Options Modal */}
      {payOptionsBill && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#1c1817] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                {isLinkingExisting && (
                  <button 
                    onClick={() => setIsLinkingExisting(false)}
                    className="p-1 rounded-lg text-white/50 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={18} className={lang === 'ar' ? 'rotate-180' : ''} />
                  </button>
                )}
                <h3 className="text-lg font-bold text-white">
                  {isLinkingExisting ? t('bills.linkExistingTransaction') : t('bills.payBillOptions')}
                </h3>
              </div>
              <button 
                onClick={() => setPayOptionsBill(null)}
                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Bill Summary Pill */}
            <div className="bg-[#2B2321]/60 border border-[#8D6346]/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-white font-bold text-sm block">{payOptionsBill.name}</span>
                <span className="text-[11px] text-white/50">
                  {new Date(payOptionsBill.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                </span>
              </div>
              <span className="text-base font-black text-white tabular-nums">
                {money(payOptionsBill.expectedAmount)}
              </span>
            </div>

            {!isLinkingExisting ? (
              /* Three Choices */
              <div className="space-y-3">
                {/* Option 1: Link Existing Transaction */}
                <button
                  type="button"
                  onClick={handleOpenLinkExisting}
                  className="w-full text-left rtl:text-right p-4 rounded-2xl bg-white/5 hover:bg-[#8D6346]/20 border border-white/10 hover:border-[#8D6346]/50 transition-all flex items-start gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/30 flex items-center justify-center text-[#8D6346] shrink-0 mt-0.5 shadow-inner">
                    <Link2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white group-hover:text-[#E8C5A8] transition-colors">
                      {t('bills.linkExistingTransaction')}
                    </div>
                    <div className="text-xs text-white/50 leading-relaxed mt-0.5">
                      {t('bills.linkExistingDesc')}
                    </div>
                  </div>
                </button>

                {/* Option 2: Record New Expense */}
                <button
                  type="button"
                  onClick={() => {
                    const bill = payOptionsBill;
                    setPayOptionsBill(null);
                    navigate('/add', {
                      state: {
                        billId: bill._id,
                        defaultAmount: bill.expectedAmount,
                        defaultName: bill.name,
                        defaultCategory: bill.category?._id || bill.category,
                        defaultAccount: bill.account?._id || bill.account
                      }
                    });
                  }}
                  className="w-full text-left rtl:text-right p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0 mt-0.5 shadow-inner">
                    <PlusCircle size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">
                      {t('bills.recordNewExpense')}
                    </div>
                    <div className="text-xs text-white/50 leading-relaxed mt-0.5">
                      {t('bills.payNow')}
                    </div>
                  </div>
                </button>

                {/* Option 3: Mark Paid Only (No Expense) */}
                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() => handleSettleWithoutExpense(payOptionsBill)}
                  className="w-full text-left rtl:text-right p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-start gap-3.5 group shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 shadow-inner">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white">
                      {t('bills.markPaidOnly')}
                    </div>
                    <div className="text-xs text-white/50 leading-relaxed mt-0.5">
                      {t('bills.markPaid')}
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              /* Link Existing Transaction List */
              <div className="space-y-3">
                {/* Search */}
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <Search size={15} className="text-white/40" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder={t('common.search') || 'Search transactions...'}
                    className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-white/40"
                  />
                  {txSearch && (
                    <button onClick={() => setTxSearch('')} className="text-white/40 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Transactions Scroll List */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {loadingTx ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Loader2 className="w-6 h-6 text-[#8D6346] animate-spin" />
                      <span className="text-xs text-white/50">{t('common.loading')}</span>
                    </div>
                  ) : (() => {
                    const filteredTxs = recentTransactions.filter(t => 
                      !txSearch.trim() ||
                      (t.title || '').toLowerCase().includes(txSearch.trim().toLowerCase()) ||
                      String(t.amount).includes(txSearch.trim())
                    );

                    if (filteredTxs.length === 0) {
                      return (
                        <div className="text-center py-8 px-4 text-xs text-white/40 border border-white/5 rounded-2xl">
                          {t('bills.noRecentTransactionsFound')}
                        </div>
                      );
                    }

                    return filteredTxs.map(tx => {
                      const isSelected = selectedTxId === tx._id;
                      return (
                        <button
                          key={tx._id}
                          type="button"
                          onClick={() => setSelectedTxId(tx._id)}
                          className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'bg-[#8D6346]/25 border-[#8D6346] shadow-inner text-white' 
                              : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate text-white">{tx.title}</div>
                            <div className="text-[10px] text-white/40 flex items-center gap-1.5 mt-0.5">
                              <span>{new Date(tx.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
                              {tx.account?.name && <span>• {tx.account.name}</span>}
                            </div>
                          </div>
                          <div className="text-right rtl:text-left shrink-0">
                            <span className="text-xs font-black tabular-nums text-white block">
                              {money(tx.amount)}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-[#E8C5A8] font-bold">✓</span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Settle Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkingExisting(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 text-xs font-semibold transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTxId || isSettling}
                    onClick={handleConfirmLinkSettle}
                    className="flex-1 py-2.5 rounded-xl bg-[#8D6346] hover:bg-[#8D6346]/90 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    {isSettling && <Loader2 size={14} className="animate-spin" />}
                    <span>{t('bills.markPaid')}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}
