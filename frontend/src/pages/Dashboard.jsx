import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";

import {
    getAccounts,
} from "../api/accounts";

import {
  getTransactions,
  deleteTransaction,
} from "../api/transactions";
import ConfirmModal from "../components/modals/ConfirmModal";
import TransactionCard from "../components/cards/TransactionCard";

const Dashboard = () => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
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

    fetchData();
  }, []);

  useEffect(() => {
    // فلترة المعاملات بناءً على الحساب المختار
    const filtered = allTransactions.filter(t => {
      if (selectedAccount === 'all') return true;
      return t.account?._id === selectedAccount || t.from_account?._id === selectedAccount || t.to_account?._id === selectedAccount;
    });

    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
      } else if (t.type === 'transfer') {
        // لو مختار حساب بعينه، التحويل هيأثر على الرصيد بالزيادة أو النقصان
        if (selectedAccount !== 'all') {
          if (t.to_account?._id === selectedAccount) totalIncome += t.amount;
          if (t.from_account?._id === selectedAccount) totalExpense += t.amount;
        }
      }
    });

    setTotals({
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense
    });
  }, [allTransactions, selectedAccount]);

const handleDeleteTransaction = (transaction) => {
  setSelectedTransaction(transaction);
  setDeleteModalOpen(true);
};

const handleEditTransaction = () => {};

const confirmDeleteTransaction = async () => {
  try {
    await deleteTransaction(selectedTransaction._id);
    setAllTransactions(prev=>prev.filter(t=>t._id!==selectedTransaction._id));
    setDeleteModalOpen(false);
    setSelectedTransaction(null);
  } catch(error){
    alert(error.response?.data?.message || "حدث خطأ أثناء الحذف");
  }
};

  // المعاملات اللي هتتعرض في القائمة تحت (بعد الفلترة)
  const displayedTransactions = allTransactions.filter(t => {
    if (selectedAccount === 'all') return true;
    return t.account?._id === selectedAccount || t.from_account?._id === selectedAccount || t.to_account?._id === selectedAccount;
  });

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
          {selectedAccount === 'all' ? 'جميع المعاملات' : `معاملات: ${selectedAccount}`}
        </h2>
      </div>

      <div className="space-y-3">
        {displayedTransactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8 bg-white/5 rounded-3xl border border-white/5">لا توجد معاملات</p>
        ) : (
          displayedTransactions.map((transaction) => (
            <TransactionCard
  key={transaction._id}
  transaction={transaction}
  onEdit={handleEditTransaction}
  onDelete={handleDeleteTransaction}
/>
          ))
        )}
      </div>
      <ConfirmModal
        open={deleteModalOpen}
        title="حذف المعاملة"
        message={selectedTransaction ? `هل تريد حذف "${selectedTransaction.title}"؟` : ""}
        confirmText="حذف"
        cancelText="إلغاء"
        confirmColor="red"
        onConfirm={confirmDeleteTransaction}
        onCancel={() => {setDeleteModalOpen(false);setSelectedTransaction(null);}}
      />
    </div>
  );
};

export default Dashboard;
