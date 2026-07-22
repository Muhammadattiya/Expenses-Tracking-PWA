import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

import {
    getAccounts,
} from "../api/accounts";

import {
  getTransactions,
  deleteTransaction,
} from "../api/transactions";
import TransactionCard from "../components/cards/TransactionCard";
import EditTransactionModal from "../components/modals/EditTransactionModal";

const Dashboard = () => {
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
      alert(error.response?.data?.message || "حدث خطأ أثناء الحذف");
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // المعاملات اللي هتتعرض في القائمة تحت (بعد الفلترة بالحساب والشهر)
  const displayedTransactions = allTransactions.filter(t => {
    // 1. Account Filter
    if (selectedAccount !== 'all' && t.account?._id !== selectedAccount && t.from_account?._id !== selectedAccount && t.to_account?._id !== selectedAccount) {
      return false;
    }
    // 2. Month Filter
    const tDate = new Date(t.date);
    if (tDate.getMonth() !== selectedMonth.getMonth() || tDate.getFullYear() !== selectedMonth.getFullYear()) {
      return false;
    }
    return true;
  });

  // تجميع المعاملات باليوم
  const groupedTransactions = displayedTransactions.reduce((acc, curr) => {
    const d = new Date(curr.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {});
  
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => new Date(b) - new Date(a));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-12 pb-24 min-h-screen text-white bg-[#0a0a0c]">
      
      {/* فلتر الحسابات */}
      <div className="mb-6">
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white font-medium focus:outline-none focus:border-blue-500/50 appearance-none text-center"
        >
          <option value="all" className="bg-[#1c1c1e]">جميع الحسابات</option>
          {accounts.map(acc => (
            <option key={acc._id} value={acc._id} className="bg-[#1c1c1e]">{acc.name}</option>
          ))}
        </select>
      </div>

      {/* قسم الإحصائيات العلوية */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)] mb-8">
        
        {/* Month Selector */}
        <div className="flex justify-between items-center mb-6 bg-white/5 p-2 rounded-2xl border border-white/5">
          <button onClick={handlePrevMonth} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition">
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          <span className="text-sm font-bold text-gray-100 tracking-wider">
            {selectedMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-1 text-center">الرصيد المتاح</p>
        <h1 className="text-4xl font-bold text-center text-white mb-6 tracking-wider">
          {totals.balance.toLocaleString('ar-EG')} <span className="text-lg text-gray-400">ج.م</span>
        </h1>

        <div className="flex justify-between gap-4">
          <div className="flex-1 bg-white/5 rounded-2xl p-4 flex flex-col items-center border border-green-500/10">
            <div className="bg-green-500/20 p-2 rounded-full mb-2">
              <ArrowDown className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-xs text-gray-400 mb-1">الدخل</p>
            <p className="font-semibold text-green-400">{totals.income.toLocaleString('ar-EG')}</p>
          </div>

          <div className="flex-1 bg-white/5 rounded-2xl p-4 flex flex-col items-center border border-red-500/10">
            <div className="bg-red-500/20 p-2 rounded-full mb-2">
              <ArrowUp className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-xs text-gray-400 mb-1">المصروفات</p>
            <p className="font-semibold text-red-400">{totals.expense.toLocaleString('ar-EG')}</p>
          </div>
        </div>
      </div>

      {/* قسم المعاملات بناءً على الفلتر */}
      <div className="mb-4 flex justify-between items-end">
        <h2 className="text-xl font-bold text-gray-100">
          {selectedAccount === 'all' ? 'المعاملات' : `معاملات: ${accounts.find(a => a._id === selectedAccount)?.name}`}
        </h2>
      </div>

      <div className="space-y-6">
        {displayedTransactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8 bg-white/5 rounded-3xl border border-white/5">لا توجد معاملات في هذا الشهر</p>
        ) : (
          sortedDates.map(dateKey => {
            const dateObj = new Date(dateKey);
            return (
              <div key={dateKey}>
                <h3 className="text-gray-400 text-sm font-semibold mb-3 px-2 flex justify-between items-center border-b border-white/10 pb-2">
                  <span>
                    {dateObj.toLocaleDateString('ar-EG', { weekday: 'long' })}
                  </span>
                  <span>
                    {dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                  </span>
                </h3>
                <div className="space-y-3">
                  {groupedTransactions[dateKey].map(transaction => (
                    <TransactionCard
                      key={transaction._id}
                      transaction={transaction}
                      onClick={handleTransactionClick}
                    />
                  ))}
                </div>
              </div>
            );
          })
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
