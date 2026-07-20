import { useState, useEffect, useRef } from 'react';
import { Plus, Wallet, Tag, Loader2, Download, Upload } from 'lucide-react';

const Settings = () => {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');

  const fetchData = async () => {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        fetch('http://localhost:5000/api/accounts'),
        fetch('http://localhost:5000/api/categories')
      ]);
      setAccounts(await accountsRes.json());
      setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('❌ خطأ في جلب البيانات:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      const res = await fetch('http://localhost:5000/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAccountName, type: newAccountType })
      });
      if (res.ok) {
        setNewAccountName('');
        fetchData();
      }
    } catch (error) {
      console.error('❌ خطأ في إضافة الحساب:', error);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, type: newCategoryType })
      });
      if (res.ok) {
        setNewCategoryName('');
        fetchData();
      }
    } catch (error) {
      console.error('❌ خطأ في إضافة الفئة:', error);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/transactions');
      const data = await res.json();
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('❌ خطأ في تصدير البيانات:', error);
      alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  // دالة الاستيراد بعد ربطها بالباك إند
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // إرسال البيانات للباك إند
        const res = await fetch('http://localhost:5000/api/transactions/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importedData)
        });

        if (res.ok) {
          const result = await res.json();
          alert(`تم الاستيراد بنجاح: تم إضافة ${result.insertedCount} معاملة.`);
          // إعادة جلب البيانات لتحديث واجهة المستخدم
          fetchData();
        } else {
          alert('حدث خطأ أثناء الرفع للسيرفر.');
        }
      } catch (error) {
        console.error('❌ خطأ في قراءة أو رفع الملف:', error);
        alert('تأكد من أن الملف بصيغة JSON صحيحة.');
      } finally {
        // تفريغ حقل الملف عشان تقدر ترفع نفس الملف تاني لو حبيت
        e.target.value = null; 
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-12 pb-24 min-h-screen text-white bg-[#0a0a0c] space-y-6">
      <h2 className="text-2xl font-bold text-center tracking-wide text-gray-100">
        الإعدادات
      </h2>

      {/* قسم إدارة الحسابات - تم تعديل التصميم للموبايل */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
          <Wallet className="w-5 h-5" /> إدارة الحسابات
        </h3>
        
        <form onSubmit={handleAddAccount} className="flex flex-col gap-3 mb-5">
          <input
            type="text"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="اسم الحساب (مثال: كاش، بنك مصر)"
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex gap-3">
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="cash" className="bg-[#1c1c1e]">كاش</option>
              <option value="bank" className="bg-[#1c1c1e]">بنك</option>
              <option value="wallet" className="bg-[#1c1c1e]">محفظة</option>
            </select>
            <button type="submit" className="bg-blue-500 w-14 flex items-center justify-center rounded-xl text-white hover:bg-blue-600 transition-colors">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {accounts.map(acc => (
            <div key={acc._id} className="bg-black/40 border border-white/10 px-4 py-2 rounded-xl text-sm text-gray-300 flex items-center gap-2">
              <span>{acc.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* قسم إدارة الفئات - تم تعديل التصميم للموبايل */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">
          <Tag className="w-5 h-5" /> إدارة الفئات
        </h3>
        
        <form onSubmit={handleAddCategory} className="flex flex-col gap-3 mb-5">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="اسم الفئة (مثال: طعام، فواتير)"
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-green-500/50"
          />
          <div className="flex gap-3">
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              <option value="expense" className="bg-[#1c1c1e]">مصروف</option>
              <option value="income" className="bg-[#1c1c1e]">دخل</option>
            </select>
            <button type="submit" className="bg-green-500 w-14 flex items-center justify-center rounded-xl text-white hover:bg-green-600 transition-colors">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat._id} className={`border px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${cat.type === 'expense' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-green-500/10 border-green-500/20 text-green-300'}`}>
              <span>{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* قسم الاستيراد والتصدير */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">إدارة البيانات</h3>
        
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-4 rounded-2xl hover:bg-blue-500/30 transition-colors active:scale-95">
            <Download className="w-6 h-6" /> 
            <span className="text-sm">تصدير</span>
          </button>

          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportFile} className="hidden" />
          
          <button onClick={handleImportClick} className="flex-1 flex flex-col items-center justify-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 py-4 rounded-2xl hover:bg-purple-500/30 transition-colors active:scale-95">
            <Upload className="w-6 h-6" /> 
            <span className="text-sm">استيراد</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;