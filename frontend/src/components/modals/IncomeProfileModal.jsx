import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

const IncomeProfileModal = ({
  isOpen,
  onClose,
  isEdit,
  profileData,
  setProfileData,
  onSubmit,
  accounts,
  categories
}) => {
  const { t, lang } = useLanguage();
  if (!isOpen) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${lang === 'ar' ? 'font-arabic text-right' : 'font-english text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-[#1a1a24] rounded-3xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl border border-white/10">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {isEdit ? t('incomeProfiles.editProfile', 'Edit Profile') : t('incomeProfiles.addProfile', 'Add Profile')}
            </h2>
            <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(profileData); }} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.profileName', 'Income Source Name')}</label>
              <input
                type="text"
                required
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue/50"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.amount', 'Amount')}</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={profileData.amount}
                onChange={(e) => setProfileData({ ...profileData, amount: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue/50"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.frequency', 'Frequency')}</label>
              <CustomSelect
                value={profileData.frequency}
                onChange={(v) => setProfileData({ ...profileData, frequency: v })}
                options={[
                  { value: 'monthly', label: t('incomeProfiles.monthly', 'Monthly') },
                  { value: 'weekly', label: t('incomeProfiles.weekly', 'Weekly') }
                ]}
              />
            </div>

            {profileData.frequency === 'weekly' ? (
              <div>
                <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.weekDay', 'Day of Week')}</label>
                <CustomSelect
                  value={profileData.weekDay}
                  onChange={(v) => setProfileData({ ...profileData, weekDay: Number(v) })}
                  options={[
                    { value: 0, label: t('incomeProfiles.days.0', 'Sunday') },
                    { value: 1, label: t('incomeProfiles.days.1', 'Monday') },
                    { value: 2, label: t('incomeProfiles.days.2', 'Tuesday') },
                    { value: 3, label: t('incomeProfiles.days.3', 'Wednesday') },
                    { value: 4, label: t('incomeProfiles.days.4', 'Thursday') },
                    { value: 5, label: t('incomeProfiles.days.5', 'Friday') },
                    { value: 6, label: t('incomeProfiles.days.6', 'Saturday') }
                  ]}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.monthDay', 'Day of Month')}</label>
                <CustomSelect
                  value={profileData.monthDay}
                  onChange={(v) => setProfileData({ ...profileData, monthDay: Number(v) })}
                  options={[...Array(31)].map((_, i) => ({ value: i + 1, label: String(i + 1) }))}
                />
              </div>
            )}

            <div>
              <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.selectAccount', 'Destination Account')}</label>
              <CustomSelect
                value={typeof profileData.account === 'object' ? profileData.account?._id : profileData.account}
                onChange={(v) => setProfileData({ ...profileData, account: v })}
                placeholder={t('addTransaction.accountPlaceholder', 'Select Account...')}
                options={accounts.map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">{t('incomeProfiles.selectCategory', 'Category')}</label>
              <CustomSelect
                value={typeof profileData.category === 'object' ? profileData.category?._id : profileData.category}
                onChange={(v) => setProfileData({ ...profileData, category: v })}
                placeholder={t('addTransaction.categoryPlaceholder', 'Select Category...')}
                options={categories?.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon, color: cat.color })) || []}
              />
            </div>

            <button type="submit" className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2">
              {t('incomeProfiles.saveProfile', 'Save Profile')}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IncomeProfileModal;
