import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListSkeleton } from '../components/ui/Skeletons';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getBills, createBill, updateBill, deleteBill, ignoreBill } from '../api/bills';
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
    navigate('/add', {
      state: {
        billId: bill._id,
        defaultAmount: bill.expectedAmount,
        defaultName: bill.name,
        defaultCategory: bill.category?._id || bill.category,
        defaultAccount: bill.account?._id || bill.account
      }
    });
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
    return (
      <div className="space-y-6">
        <ListSkeleton count={4} />
      </div>
    );
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
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm"
              title={t('bills.addBill')}
            >
              <Plus size={16} />
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
      </div>
    </div>
  );
}
