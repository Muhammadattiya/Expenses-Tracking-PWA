import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  Repeat,
  Wallet,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Bell,
  X,
  Loader2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ConfirmModal from '../modals/ConfirmModal';
import IncomeProfileModal from '../modals/IncomeProfileModal';
import EditRecurringTransactionModal from '../modals/EditRecurringTransactionModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { deleteRecurringTransaction, toggleRecurringActive } from '../../api/recurringTransactions';
import { createIncomeProfile, updateIncomeProfile, deleteIncomeProfile } from '../../api/incomeProfiles';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function IncomeAndRecurringManagement({ 
  recurringTransactions, 
  incomeProfiles, 
  accounts, 
  categories, 
  fetchData,
  onBack 
}) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('income'); // 'income' | 'recurring'

  // Income Profiles State
  const [addIncomeProfileModalOpen, setAddIncomeProfileModalOpen] = useState(false);
  const [editIncomeProfileModalOpen, setEditIncomeProfileModalOpen] = useState(false);
  const [editingIncomeProfile, setEditingIncomeProfile] = useState(null);

  // Recurring State
  const [editingRecurring, setEditingRecurring] = useState(null);

  // Shared Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'recurring' | 'incomeProfile'
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Income Profile Handlers
  const handleAddIncomeProfile = async (data) => {
    try {
      if (!data.name || !data.amount || !data.account) {
        showToast(t('common.error'), 'error');
        return;
      }
      await createIncomeProfile({
        name: data.name,
        amount: Number(data.amount),
        frequency: data.frequency,
        weekDay: Number(data.weekDay),
        monthDay: Number(data.monthDay),
        account: data.account,
        category: data.category,
        isActive: data.isActive
      });
      setAddIncomeProfileModalOpen(false);
      fetchData();
      showToast(t('common.success'), 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    }
  };

  const handleUpdateIncomeProfile = async (data) => {
    try {
      if (!data.name || !data.amount || !data.account) {
        showToast(t('common.error'), 'error');
        return;
      }
      await updateIncomeProfile(data._id, {
        name: data.name,
        amount: Number(data.amount),
        frequency: data.frequency,
        weekDay: Number(data.weekDay),
        monthDay: Number(data.monthDay),
        account: data.account,
        category: data.category,
        isActive: data.isActive
      });
      setEditIncomeProfileModalOpen(false);
      setEditingIncomeProfile(null);
      fetchData();
      showToast(t('common.success'), 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    }
  };

  const handleDeleteIncomeProfile = (profile) => {
    setSelectedItem(profile);
    setDeleteType('incomeProfile');
    setDeleteModalOpen(true);
  };

  // Recurring Handlers
  const handleToggleRecurring = async (id) => {
    try {
      await toggleRecurringActive(id);
      fetchData();
    } catch (e) {
      showToast(t('settings.updateError'), 'error');
    }
  };

  const handleDeleteRecurring = (recurring) => {
    setSelectedItem(recurring);
    setDeleteType('recurring');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteType === "recurring") {
        await deleteRecurringTransaction(selectedItem._id);
      } else if (deleteType === "incomeProfile") {
        await deleteIncomeProfile(selectedItem._id);
      }
      await fetchData();
      setDeleteModalOpen(false);
      setSelectedItem(null);
      setDeleteType(null);
      showToast(t('settings.deleteSuccess'), 'success');
    } catch (error) {
      console.error("❌ خطأ في مسح العنصر:", error);
      showToast(t('settings.deleteError'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors"
        >
          <ArrowLeft size={20} className={`text-white/90 ${lang === 'ar' ? 'rotate-180' : ''}`} />
        </motion.button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Banknote className="w-6 h-6 text-[#8D6346]" />
          {t('profile.incomeProfile')}
        </h2>
      </div>

      <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative mb-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${activeTab === 'income' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          {activeTab === 'income' && <motion.div layoutId="incRecTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
          <Banknote size={18} className={activeTab === 'income' ? 'text-[#8D6346]' : 'opacity-50'} />
          {t('incomeProfiles.title')}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('recurring')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${activeTab === 'recurring' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          {activeTab === 'recurring' && <motion.div layoutId="incRecTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
          <Repeat size={18} className={activeTab === 'recurring' ? 'text-[#8D6346]' : 'opacity-50'} />
          {t('settings.recurringTransactions')}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'income' && (
          <motion.div
            key="income"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {incomeProfiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/40 space-y-5">
                <div className="w-24 h-24 bg-[#2B2321]/30 backdrop-blur-[32px] rounded-[2rem] flex items-center justify-center mb-2 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10">
                  <Banknote size={40} className="text-white/20" />
                </div>
                <p className="text-xl font-bold text-white/60 text-center">{t('incomeProfiles.noProfiles')}</p>
              </div>
            ) : (
              incomeProfiles.map(profile => (
                <div key={profile._id} className="relative z-10 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] overflow-hidden group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white/90 mb-1 flex items-center gap-2">
                        {profile.name}
                        {!profile.isActive && (
                          <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md text-white/50 border border-white/10">
                            {t('incomeProfiles.inactive')}
                          </span>
                        )}
                      </h3>
                      <div className="text-2xl font-black text-[#8D6346] tracking-tight drop-shadow-sm">
                        {Number(profile.amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('nav.currency')}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1 mt-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setEditingIncomeProfile({
                              ...profile,
                              account: profile.account?._id || profile.account,
                              category: profile.category?._id || profile.category
                            });
                            setEditIncomeProfileModalOpen(true);
                          }}
                          className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10"
                        >
                          <Pencil size={16} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteIncomeProfile(profile)}
                          className="p-2 text-red-400/60 hover:text-red-400 transition-colors bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                    <div className="flex items-center gap-2 text-white/60 bg-black/20 backdrop-blur-[10px] p-2.5 rounded-[12px] border border-white/5 shadow-inner">
                      <Repeat size={14} className="text-[#8D6346]" />
                      <span className="font-bold">{profile.frequency === 'weekly' ? t('incomeProfiles.weekly') : t('incomeProfiles.monthly')}</span>
                    </div>
                    {profile.account && (
                      <div className="flex items-center gap-2 text-white/60 bg-black/20 backdrop-blur-[10px] p-2.5 rounded-[12px] border border-white/5 shadow-inner">
                        <Wallet size={14} className="text-[#8D6346]" />
                        <span className="font-bold truncate">{profile.account.name || 'Account'}</span>
                      </div>
                    )}
                    {profile.category && (
                      <div className="col-span-2 flex items-center gap-2 text-white/60 bg-black/20 backdrop-blur-[10px] p-2.5 rounded-[12px] border border-white/5 shadow-inner">
                        <Tag size={14} className="text-[#8D6346]" />
                        <span className="font-bold truncate">{profile.category.name || 'Category'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setAddIncomeProfileModalOpen(true)}
              className="w-full py-4 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-[#8D6346] font-bold shadow-inner hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> {t('incomeProfiles.addNew')}
            </motion.button>
          </motion.div>
        )}

        {activeTab === 'recurring' && (
          <motion.div
            key="recurring"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {recurringTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-white/40 space-y-5 flex-1">
                <div className="w-24 h-24 bg-[#2B2321]/30 backdrop-blur-[32px] rounded-[2rem] flex items-center justify-center mb-2 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10">
                  <Repeat size={40} className="text-white/20" />
                </div>
                <p className="text-xl font-bold text-white/60 text-center">{t('recurring.noRecurring')}</p>
              </div>
            ) : (
              recurringTransactions.map((rt) => (
                <div key={rt._id} className="relative z-10 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] overflow-hidden group">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white/90 mb-1 flex items-center gap-2">
                        {rt.title || t('recurring.untitled')}
                        {rt.reminderEnabled && <Bell size={14} className="text-yellow-400 drop-shadow" />}
                      </h3>
                      <div className="text-2xl font-black text-[#8D6346] tracking-tight drop-shadow-sm">
                        {new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(rt.amount)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleToggleRecurring(rt._id)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner border border-white/10 ${rt.isActive ? 'bg-[#8D6346]' : 'bg-black/40'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${rt.isActive ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`} />
                      </button>
                      <div className="flex gap-1 mt-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setEditingRecurring(rt)}
                          className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10"
                        >
                          <Pencil size={16} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteRecurring(rt)}
                          className="p-2 text-red-400/60 hover:text-red-400 transition-colors bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                    <div className="flex items-center gap-2 text-white/60 bg-black/20 backdrop-blur-[10px] p-2.5 rounded-[12px] border border-white/5 shadow-inner">
                      <Repeat size={14} className="text-[#8D6346]" />
                      <span className="font-bold">{t(`recurring.${rt.repeatType}`, rt.repeatType)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 bg-black/20 backdrop-blur-[10px] p-2.5 rounded-[12px] border border-white/5 shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      <span dir="ltr" className="font-bold">{new Date(rt.nextExecutionDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} {rt.executionTime && `- ${rt.executionTime}`}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/add', { state: { openRecurring: true } })}
              className="w-full py-4 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-[#8D6346] font-bold shadow-inner hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> {t('recurring.addBtn')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <IncomeProfileModal
        open={addIncomeProfileModalOpen}
        onClose={() => setAddIncomeProfileModalOpen(false)}
        onSubmit={handleAddIncomeProfile}
        accounts={accounts}
        categories={categories}
      />

      <IncomeProfileModal
        open={editIncomeProfileModalOpen}
        onClose={() => {
          setEditIncomeProfileModalOpen(false);
          setEditingIncomeProfile(null);
        }}
        onSubmit={handleUpdateIncomeProfile}
        initialData={editingIncomeProfile}
        accounts={accounts}
        categories={categories}
      />

      <EditRecurringTransactionModal
        isOpen={!!editingRecurring}
        onClose={() => setEditingRecurring(null)}
        recurringTx={editingRecurring}
        onSuccess={() => {
          setEditingRecurring(null);
          fetchData();
        }}
        accounts={accounts}
        categories={categories}
      />

      <ConfirmModal
        open={deleteModalOpen}
        title={deleteType === 'recurring' ? t('settings.deleteRecurringTitle') : t('incomeProfiles.deleteTitle')}
        message={deleteType === 'recurring' ? t('settings.deleteRecurringConfirm') : t('incomeProfiles.deleteConfirm')}
        confirmText={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.deleteBtn')}
        cancelText={t('settings.cancelBtn')}
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (isDeleting) return;
          setDeleteModalOpen(false);
          setSelectedItem(null);
        }}
      />
    </motion.section>
  );
}
