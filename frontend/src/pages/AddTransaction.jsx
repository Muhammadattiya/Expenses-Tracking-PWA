import { useState, useEffect } from "react";
import { ArrowDown, ArrowUp, Repeat, CheckCircle2, Loader2 } from "lucide-react";

import { getAccounts } from "../api/accounts";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";

const AddTransaction = () => {
  // الحالات (States) الأساسية
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  
  // حالات القوائم الديناميكية
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [isLoading, setIsLoading] = useState(true);

  // حالات الاختيارات
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');

  // جلب البيانات من الباك إند أول ما الصفحة تفتح
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          getAccounts(),
          getCategories(),
        ]);

        setAccounts(accountsData);

        // فصل الفئات لدخل ومصروف بناءً على اللي راجع من الداتا بيز
        const groupedCategories = { expense: [], income: [] };
        categoriesData.forEach(cat => {
          if (cat.type === 'expense') groupedCategories.expense.push(cat);
          if (cat.type === 'income') groupedCategories.income.push(cat);
        });
        setCategories(groupedCategories);

        // تعيين قيم افتراضية للحقول لو في حسابات موجودة
        if (accountsData.length > 0) {
          setAccount(accountsData[0].name);
          setFromAccount(accountsData[0].name);
          setToAccount(accountsData.length > 1 ? accountsData[1].name : accountsData[0].name);
        }
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      type,
      amount: Number(amount),
      title,
      date: new Date().toISOString(),
    };

    if (type === 'transfer') {
      payload.from_account = fromAccount;
      payload.to_account = toAccount;
    } else {
      payload.account = account;
      payload.category = category;
    }

    try {
      await createTransaction(payload);

      setAmount('');
      setTitle('');
      setCategory('');
      alert('تم تسجيل المعاملة بنجاح!');
    } catch (error) {
      console.error('❌ خطأ في حفظ المعاملة:', error);
      alert('حدث خطأ أثناء حفظ المعاملة.');
    }
  };

  // شاشة تحميل بسيطة لو البيانات لسه بتيجي من السيرفر
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-12 pb-24 min-h-screen text-white bg-[#0a0a0c]">
      <h2 className="text-2xl font-bold mb-6 text-center tracking-wide text-gray-100">
        إضافة معاملة
      </h2>

      {/* Segmented Control */}
      <div className="flex bg-black/40 p-1 rounded-2xl mb-8 border border-white/5 shadow-inner">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
            type === 'expense' ? 'bg-red-500/20 text-red-400 shadow-md border border-red-500/20' : 'text-gray-400'
          }`}
        >
          <ArrowUp className="h-4 w-4" /> مصروف
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
            type === 'income' ? 'bg-green-500/20 text-green-400 shadow-md border border-green-500/20' : 'text-gray-400'
          }`}
        >
          <ArrowDown className="h-4 w-4" /> دخل
        </button>
        <button
          type="button"
          onClick={() => setType('transfer')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
            type === 'transfer' ? 'bg-blue-500/20 text-blue-400 shadow-md border border-blue-500/20' : 'text-gray-400'
          }`}
        >
          <Repeat className="h-4 w-4" /> تحويل
        </button>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-5 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        
        <div>
          <label className="block text-xs text-gray-400 mb-1 ml-1">المبلغ</label>
          <div className="relative">
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white text-lg focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <span className="absolute left-4 top-3.5 text-gray-500 font-medium">ج.م</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1 ml-1">الوصف</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: غداء، تحويل لكاش..."
            className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {type === 'transfer' ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-blue-400/80 mb-1 ml-1">من حساب</label>
              <select
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
              >
                {accounts.map(acc => (
                  <option key={`from-${acc._id}`} value={acc.name} className="bg-[#1c1c1e]">{acc.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs text-green-400/80 mb-1 ml-1">إلى حساب</label>
              <select
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
              >
                {accounts.map(acc => (
                  <option key={`to-${acc._id}`} value={acc.name} className="bg-[#1c1c1e]">{acc.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1">الحساب</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
              >
                {accounts.map(acc => (
                  <option key={acc._id} value={acc.name} className="bg-[#1c1c1e]">{acc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1">الفئة (Category)</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
              >
                <option value="" disabled className="bg-[#1c1c1e]">اختر الفئة...</option>
                {categories[type].map(cat => (
                  <option key={cat._id} value={cat.name} className="bg-[#1c1c1e]">{cat.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          className={`w-full flex items-center justify-center gap-2 py-4 mt-6 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all duration-300 ${
            type === 'expense' ? 'bg-red-500 hover:bg-red-600 text-white' :
            type === 'income' ? 'bg-green-500 hover:bg-green-600 text-white' :
            'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
          تأكيد وحفظ
        </button>
      </form>
    </div>
  );
};

export default AddTransaction;