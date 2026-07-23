import { useState, useEffect, useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, ChevronLeft } from "lucide-react";
import { GroupedVirtuoso } from 'react-virtuoso';
import { DashboardSummarySkeleton, ListSkeleton } from "../components/ui/Skeletons";

import {
    getAccounts,
} from "../api/accounts";

import {
  getTransactions,
  deleteTransaction,
} from "../api/transactions";
import TransactionCard from "../components/cards/TransactionCard";
import EditTransactionModal from "../components/modals/EditTransactionModal";
import CustomSelect from "../components/ui/CustomSelect";
import { useNotification } from "../contexts/NotificationContext";
import ConfirmModal from '../components/modals/ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const { t, lang } = useLanguage();
  const [allTransactions, setAllTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  
  const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { showToast } = useNotification();

  const fetchData = async () => {
    try {
      const [transactionsData, accountsData] = await Promise.all([
        getTransactions(),
        getAccounts(),
      ]);

      setAllTransactions(transactionsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // فلترة المعاملات بناءً على الحساب المختار (لكي نحسب الرصيد الإجمالي)
    const filtered = allTransactions.filter(t => {
      if (selectedAccount === 'all') return true;
      return t.account?._id === selectedAccount || t.from_account?._id === selectedAccount || t.to_account?._id === selectedAccount;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    let totalSettlements = 0;
    let totalAdjustments = 0;

    if (selectedAccount === 'all') {
      totalAdjustments = accounts.reduce((sum, acc) => sum + (acc.balance_adjustment || 0), 0);
    } else {
      const acc = accounts.find(a => a._id === selectedAccount);
      totalAdjustments = acc?.balance_adjustment || 0;
    }

    const currentMonth = selectedMonth.getMonth();
    const currentYear = selectedMonth.getFullYear();

    filtered.forEach(t => {
      const tDate = new Date(t.date);
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;

      if (t.type === 'income') {
        totalIncome += t.amount;
        if (isCurrentMonth) currentMonthIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
        if (isCurrentMonth) currentMonthExpense += t.amount;
      } else if (t.type === 'transfer') {
        if (selectedAccount !== 'all') {
          if (t.to_account?._id === selectedAccount) {
            totalIncome += t.amount;
            if (isCurrentMonth) currentMonthIncome += t.amount;
          }
          if (t.from_account?._id === selectedAccount) {
            totalExpense += t.amount;
            if (isCurrentMonth) currentMonthExpense += t.amount;
          }
        }
      } else if (t.type === 'settlement') {
        totalSettlements += t.amount;
      }
    });

    setTotals({
      income: currentMonthIncome,
      expense: currentMonthExpense,
      balance: totalIncome - totalExpense + totalSettlements + totalAdjustments
    });
  }, [allTransactions, selectedAccount, selectedMonth, accounts]);

  const displayedTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (selectedAccount !== 'all' && t.account?._id !== selectedAccount && t.from_account?._id !== selectedAccount && t.to_account?._id !== selectedAccount) {
        return false;
      }
      const tDate = new Date(t.date);
      if (tDate.getMonth() !== selectedMonth.getMonth() || tDate.getFullYear() !== selectedMonth.getFullYear()) {
        return false;
      }
      return true;
    });
  }, [allTransactions, selectedAccount, selectedMonth]);

  const { groupedTransactions, sortedDates, groupCounts } = useMemo(() => {
    const grouped = displayedTransactions.reduce((acc, curr) => {
      const d = new Date(curr.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {});
    
    const sorted = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    const counts = sorted.map(date => grouped[date].length);
    
    return { groupedTransactions: grouped, sortedDates: sorted, groupCounts: counts };
  }, [displayedTransactions]);

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedTransaction(null);
    fetchData(); // Reload data
  };

  const confirmDeleteTransaction = async (transaction) => {
    try {
      await deleteTransaction(transaction._id);
      setAllTransactions(prev=>prev.filter(t=>t._id!==transaction._id));
      setEditModalOpen(false);
      setSelectedTransaction(null);
    } catch(error){
      showToast(error.response?.data?.message || t('common.deleteError', 'حدث خطأ أثناء الحذف'), 'error');
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in p-4 space-y-6">
        <DashboardSummarySkeleton />
        <ListSkeleton count={10} />
      </div>
    );
  }
  return (
    <div className="animate-fade-in">
      
      {/* فلتر الحسابات */}
      <div className="mb-8 relative z-50">
        <CustomSelect
          value={selectedAccount}
          onChange={setSelectedAccount}
          options={[
            { value: 'all', label: t('common.allAccounts', 'جميع الحسابات') },
            ...accounts.map(acc => ({ value: acc._id, label: acc.name }))
          ]}
        />
      </div>

      {/* قسم الإحصائيات العلوية */}
      <div className="relative overflow-hidden glass-panel p-7 rounded-[2rem] shadow-2xl mb-8">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/20 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="relative z-10">
          {/* Month Selector */}
          <div className="flex justify-between items-center mb-8">
            <button onClick={handlePrevMonth} className="p-2.5 bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-colors backdrop-blur-md">
              <ChevronRight className={`w-5 h-5 text-[var(--color-text-muted)] ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-sm font-bold text-[var(--color-text-main)] tracking-wider">
              {selectedMonth.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="p-2.5 bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-colors backdrop-blur-md">
              <ChevronLeft className={`w-5 h-5 text-[var(--color-text-muted)] ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <p className="text-[var(--color-text-muted)] text-sm mb-2 text-center font-medium">{t('nav.totalBalance', 'إجمالي الرصيد')}</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-center text-[var(--color-text-main)] mb-8 tracking-tight">
            {totals.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-xl sm:text-2xl text-[var(--color-text-muted)] font-medium tracking-normal">{t('nav.currency', 'ج.م')}</span>
          </h1>

          <div className="flex justify-between gap-4">
            <div className="flex-1 bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col items-center border border-[var(--color-border)] backdrop-blur-md">
              <div className="bg-brand-green/20 p-2 rounded-xl mb-2">
                <ArrowDown className="w-5 h-5 text-brand-green" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1 font-medium">{t('nav.income', 'الدخل')}</p>
              <p className="font-bold text-[var(--color-text-main)] text-sm">{totals.income.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
            </div>

            <div className="flex-1 bg-[var(--color-surface)] rounded-2xl p-4 flex flex-col items-center border border-[var(--color-border)] backdrop-blur-md">
              <div className="bg-brand-red/20 p-2 rounded-xl mb-2">
                <ArrowUp className="w-5 h-5 text-brand-red" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1 font-medium">{t('nav.expense', 'المصروفات')}</p>
              <p className="font-bold text-[var(--color-text-main)] text-sm">{totals.expense.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* قسم المعاملات بناءً على الفلتر */}
      <div className="mb-4 flex justify-between items-end">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          {selectedAccount === 'all' ? t('dashboard.transactions', 'المعاملات') : `${t('dashboard.transactionsFor', 'معاملات:')} ${accounts.find(a => a._id === selectedAccount)?.name}`}
        </h2>
      </div>

      <div className="h-[600px] w-full">
        {displayedTransactions.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-12 glass-panel rounded-[2rem] font-medium flex flex-col items-center gap-3">
            <p>{t('dashboard.noTransactions', 'لا توجد معاملات في هذا الشهر')}</p>
          </div>
        ) : (
          <GroupedVirtuoso
            groupCounts={groupCounts}
            className="w-full h-full hide-scrollbar"
            groupContent={(index) => {
              const dateKey = sortedDates[index];
              const dateObj = new Date(dateKey);
              return (
                <div className="bg-[var(--color-bg-main)]/90 backdrop-blur-md py-2 z-10 sticky top-0">
                  <h3 className="text-[var(--color-text-muted)] text-sm font-semibold px-2 flex justify-between items-center border-b border-[var(--color-border)] pb-2">
                    <span>{dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' })}</span>
                    <span>{dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                  </h3>
                </div>
              );
            }}
            itemContent={(index, groupIndex) => {
              const dateKey = sortedDates[groupIndex];
              const transactionsForGroup = groupedTransactions[dateKey];
              // Calculate the item's index within its group to find it
              let offset = 0;
              for(let i=0; i<groupIndex; i++) offset += groupCounts[i];
              const itemIndexInGroup = index - offset;
              const transaction = transactionsForGroup[itemIndexInGroup];
              
              if (!transaction) return null;
              
              return (
                <div className="pb-3">
                  <TransactionCard
                    transaction={transaction}
                    onClick={handleTransactionClick}
                  />
                </div>
              );
            }}
          />
        )}
      </div>

      <EditTransactionModal
        open={editModalOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTransaction(null);
        }}
        onDelete={confirmDeleteTransaction}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Dashboard;
