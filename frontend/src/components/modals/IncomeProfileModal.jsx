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

  if (!open) return null;
  const isEdit = !!initialData;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${lang === 'ar' ? 'font-arabic' : 'font-english'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col max-h-[80vh] overflow-y-auto scrollbar-hide relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {isEdit ? t('incomeProfiles.editProfile') : t('incomeProfiles.addProfile')}
          </h3>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition-colors hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(profileData); }} className="flex flex-col gap-4">
          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.profileName')}</label>
            <input
              type="text"
              required
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
            />
          </div>

          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.amount')}</label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={profileData.amount}
                onChange={(e) => setProfileData({ ...profileData, amount: e.target.value })}
                className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
              />
              <span className={`absolute top-3 text-white/50 font-medium ${lang === 'ar' ? 'left-4' : 'right-4'}`}>{t('nav.currency')}</span>
            </div>
          </div>

          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.frequency')}</label>
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
              <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.weekDay')}</label>
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
              <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.monthDay')}</label>
              <CustomSelect
                buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                value={profileData.monthDay}
                onChange={(v) => setProfileData({ ...profileData, monthDay: Number(v) })}
                options={[...Array(31)].map((_, i) => ({ value: i + 1, label: String(i + 1) }))}
              />
            </div>
          )}

          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.selectAccount')}</label>
            <CustomSelect
              buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
              value={typeof profileData.account === 'object' ? profileData.account?._id : profileData.account}
              onChange={(v) => setProfileData({ ...profileData, account: v })}
              placeholder={t('addTransaction.accountPlaceholder')}
              options={accounts?.map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color })) || []}
            />
          </div>

          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('incomeProfiles.selectCategory')}</label>
            <CustomSelect
              buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
              value={typeof profileData.category === 'object' ? profileData.category?._id : profileData.category}
              onChange={(v) => setProfileData({ ...profileData, category: v })}
              placeholder={t('addTransaction.categoryPlaceholder')}
              options={categories?.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon, color: cat.color })) || []}
            />
          </div>

          <button type="submit" className="w-full py-3.5 mt-2 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[14px] hover:bg-[#8D6346]/30 transition-colors">
            {t('incomeProfiles.saveProfile')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default IncomeProfileModal;
