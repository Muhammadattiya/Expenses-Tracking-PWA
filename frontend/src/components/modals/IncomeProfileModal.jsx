import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

const IncomeProfileModal = ({
  open,
  onClose,
  initialData,
  onSubmit,
  accounts,
  categories
}) => {
  const { t, lang } = useLanguage();
  const [profileData, setProfileData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    weekDay: 0,
    monthDay: 1,
    account: '',
    category: '',
    isActive: true
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setProfileData({ ...initialData });
      } else {
        setProfileData({
          name: '',
          amount: '',
          frequency: 'monthly',
          weekDay: 0,
          monthDay: 1,
          account: accounts?.[0]?._id || '',
          category: categories?.[0]?._id || '',
          isActive: true
        });
      }
    }
  }, [open, initialData, accounts, categories]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const isEdit = !!initialData;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!profileData.name.trim() || Number(profileData.amount) <= 0) {
      return;
    }
    onSubmit(profileData);
  };

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 ${lang === 'ar' ? 'font-arabic' : 'font-english'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="income-profile-title"
        className="bg-[#2B2321]/95 backdrop-blur-[32px] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)] rounded-[2rem] w-full max-w-sm flex flex-col max-h-[85vh] overflow-hidden relative z-10"
      >
        <div className="sticky top-0 bg-[#2B2321]/95 backdrop-blur-md z-20 flex justify-between items-center p-5 px-6 border-b border-white/10">
          <h3 id="income-profile-title" className="text-xl font-bold text-white">
            {isEdit ? t('incomeProfiles.editProfile') : t('incomeProfiles.addProfile')}
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            aria-label={t('common.close')} 
            className="w-11 h-11 text-white/70 hover:text-white bg-white/5 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-4 max-h-[calc(85vh-150px)]">
            <div>
              <label htmlFor="income-profile-name" className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.profileName')}</label>
              <input
                id="income-profile-name"
                type="text"
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
              />
            </div>

            <div>
              <label htmlFor="income-profile-amount" className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.amount')}</label>
              <div className="relative">
                <input
                  id="income-profile-amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={profileData.amount}
                  onChange={(e) => setProfileData({ ...profileData, amount: e.target.value })}
                  className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
                />
                <span className="absolute top-3.5 end-4 text-white/50 font-medium pointer-events-none">{t('nav.currency')}</span>
              </div>
            </div>

            <div>
              <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.frequency')}</span>
              <CustomSelect
                buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                value={profileData.frequency}
                onChange={(v) => setProfileData({ ...profileData, frequency: v })}
                options={[
                  { value: 'monthly', label: t('incomeProfiles.monthly') },
                  { value: 'weekly', label: t('incomeProfiles.weekly') }
                ]}
              />
            </div>

            {profileData.frequency === 'weekly' ? (
              <div>
                <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.weekDay')}</span>
                <CustomSelect
                  buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                  value={profileData.weekDay}
                  onChange={(v) => setProfileData({ ...profileData, weekDay: Number(v) })}
                  options={[
                    { value: 0, label: t('incomeProfiles.days.0') },
                    { value: 1, label: t('incomeProfiles.days.1') },
                    { value: 2, label: t('incomeProfiles.days.2') },
                    { value: 3, label: t('incomeProfiles.days.3') },
                    { value: 4, label: t('incomeProfiles.days.4') },
                    { value: 5, label: t('incomeProfiles.days.5') },
                    { value: 6, label: t('incomeProfiles.days.6') }
                  ]}
                />
              </div>
            ) : (
              <div>
                <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.monthDay')}</span>
                <CustomSelect
                  buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                  value={profileData.monthDay}
                  onChange={(v) => setProfileData({ ...profileData, monthDay: Number(v) })}
                  options={[...Array(31)].map((_, i) => ({ value: i + 1, label: String(i + 1) }))}
                />
              </div>
            )}

            <div>
              <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.selectAccount')}</span>
              <CustomSelect
                buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                value={typeof profileData.account === 'object' ? profileData.account?._id : profileData.account}
                onChange={(v) => setProfileData({ ...profileData, account: v })}
                placeholder={t('addTransaction.accountPlaceholder')}
                options={accounts?.map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color })) || []}
              />
            </div>

            <div>
              <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('incomeProfiles.selectCategory')}</span>
              <CustomSelect
                buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                value={typeof profileData.category === 'object' ? profileData.category?._id : profileData.category}
                onChange={(v) => setProfileData({ ...profileData, category: v })}
                placeholder={t('addTransaction.categoryPlaceholder')}
                options={categories?.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon, color: cat.color })) || []}
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#2B2321]/95 backdrop-blur-md z-20 p-5 px-6 border-t border-white/10">
            <button 
              type="submit" 
              className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              {t('incomeProfiles.saveProfile')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default IncomeProfileModal;
