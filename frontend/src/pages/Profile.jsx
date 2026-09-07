import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, LogOut, Save, Send, UserRound, ChevronRight, Wallet, Tag, Repeat, ArrowLeft, ArrowRight, Settings, Pencil, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentUser, updateProfile } from '../api/auth';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getRecurringTransactions } from '../api/recurringTransactions';
import { getIncomeProfiles } from '../api/incomeProfiles';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

import AccountManagement from '../components/profile/AccountManagement';
import CategoryManagement from '../components/profile/CategoryManagement';
import IncomeAndRecurringManagement from '../components/profile/IncomeAndRecurringManagement';
import TrackingCycleManagement from '../components/profile/TrackingCycleManagement';

export default function Profile() {
  const { t, language } = useLanguage();
  const [activeView, setActiveView] = useState('main');
  
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [picture, setPicture] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Sub-views data
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [incomeProfiles, setIncomeProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [currentUser, accs, cats, recurring, profiles] = await Promise.all([
        getCurrentUser(),
        getAccounts(),
        getCategories(),
        getRecurringTransactions(),
        getIncomeProfiles()
      ]);
      setUser(currentUser);
      setName(currentUser.name);
      setPhoneNumber(currentUser.phoneNumber || '');
      setPicture(currentUser.picture || '');
      setAccounts(accs);
      setCategories(cats);
      setRecurringTransactions(recurring);
      setIncomeProfiles(profiles);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const choosePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { 
      setStatus(t('profile.imageSizeError')); 
      return; 
    }
    const reader = new FileReader();
    reader.onload = () => setPicture(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault(); 
    
    if (phoneNumber && !/^(\+\d{10,15}|0\d{9,10})$/.test(phoneNumber)) {
      setStatus(t('profile.invalidPhone'));
      return;
    }
    
    setSaving(true); 
    setStatus('');
    try { 
      const updated = await updateProfile({ name, picture, phoneNumber }); 
      setUser(updated);
      setPhoneNumber(updated.phoneNumber || '');
      setIsEditing(false);
      setStatus(t('profile.saveSuccess')); 
    } catch (error) { 
      setStatus(error.response?.data?.message || t('profile.saveError')); 
    } finally { 
      setSaving(false); 
    }
  };

  const logout = () => { 
    localStorage.removeItem('auth_token'); 
    window.location.assign('/'); 
  };

  const isRTL = language === 'ar';

  return (
    <div className="relative flex flex-col min-h-[100dvh] bg-transparent overflow-hidden -mx-5 -mt-8 -mb-32">
      {/* Ambient Copper Background exactly like Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="px-5 pt-20 pb-40 space-y-6 relative z-10 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {activeView === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex-1 flex flex-col w-full h-full space-y-8"
            >
              <header className="mb-2 px-2 flex flex-col gap-2 mt-4 relative">
                <h2 className="text-[14px] font-medium text-white/50 tracking-widest uppercase">{t('profile.manageAccount')}</h2>
                <h1 className="text-3xl font-bold font-['Exo_2'] tracking-tight text-white drop-shadow-md">{t('profile.myAccount')}</h1>
                <Link to="/settings" className="absolute top-0 right-2 w-10 h-10 flex items-center justify-center rounded-[14px] bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] text-[#8D6346] hover:bg-[#8D6346]/20 hover:text-white transition-all duration-300">
                  <Settings size={20} />
                </Link>
              </header>

              {/* Profile Card Form */}
              <form onSubmit={save} className="relative bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] flex flex-col gap-6 group">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditing(prev => {
                      if (!prev) setTimeout(() => nameInputRef.current?.focus(), 50);
                      return !prev;
                    });
                  }} 
                  className={`absolute top-6 right-6 z-20 w-8 h-8 rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-300 ${isEditing ? 'bg-[#8D6346] border-[#8D6346] text-white' : 'bg-[#8D6346]/10 border-[#8D6346]/20 text-[#8D6346] hover:bg-[#8D6346]/20 hover:text-white'}`} 
                  aria-label="Edit Profile"
                >
                  <Pencil size={14} />
                </button>
                <div className="flex justify-center relative mb-4">
                  <div className="relative inline-block">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      type="button" 
                      onClick={() => inputRef.current?.click()} 
                      className="relative h-28 w-28 overflow-hidden rounded-full border border-white/20 bg-white/5 shadow-inner group transition-all duration-300 block"
                    >
                      {picture ? (
                        <img src={picture} alt={t('profile.accountImageAlt')} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-black/20 flex items-center justify-center">
                          <UserRound className="h-12 w-12 text-white/50 transition-transform duration-700 group-hover:scale-110 drop-shadow-md" />
                        </div>
                      )}
                    </motion.button>
                    
                    <button 
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className={`absolute ${isRTL ? '-bottom-1 -left-1' : '-bottom-1 -right-1'} grid h-9 w-9 place-items-center rounded-full bg-[#8D6346] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-[3px] border-[#2B2321] text-white hover:scale-105 transition-transform z-10`}
                    >
                      <Camera size={16} className="drop-shadow-md"/>
                    </button>
                  </div>
                  <input ref={inputRef} onChange={choosePicture} type="file" accept="image/*" className="hidden" />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/50 px-2">{t('profile.nameLabel')}</label>
                    <input 
                      ref={nameInputRef}
                      required 
                      readOnly={!isEditing}
                      className={`w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3.5 text-[15px] ${isEditing ? 'text-white focus:ring-1 focus:ring-[#8D6346]/50' : 'text-white/60 cursor-default'} outline-none transition-all duration-300`}
                      value={name} 
                      onChange={(event) => setName(event.target.value)} 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/50 px-2 flex justify-between">
                      <span>{t('profile.phoneLabel')}</span>
                      <span className="text-white/30 text-[11px] uppercase tracking-wider">{t('common.optional')}</span>
                    </label>
                    <input 
                      type="tel"
                      readOnly={!isEditing}
                      className={`w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3.5 text-[15px] ${isEditing ? 'text-white focus:ring-1 focus:ring-[#8D6346]/50' : 'text-white/60 cursor-default'} outline-none transition-all duration-300 text-left dir-ltr`}
                      value={phoneNumber} 
                      onChange={(event) => setPhoneNumber(event.target.value)} 
                      placeholder={isEditing ? t('profile.phonePlaceholder') : ''}
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/50 px-2">{t('profile.emailLabel')}</label>
                    <div className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3.5 text-[15px] text-white/40 cursor-not-allowed">
                      {user?.email || '...'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    disabled={saving} 
                    type="submit"
                    className="w-full py-3 mt-2 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] font-medium text-[15px] hover:bg-[#8D6346]/30 transition-all duration-300 disabled:opacity-50"
                  >
                    {saving ? t('profile.saving') : t('profile.saveChanges')}
                  </motion.button>
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-[11px] text-white/40 overflow-hidden"
                      >
                        {t('profile.editsRemaining')}: <strong className="text-[#8D6346] ml-1">{user?.profileEditsRemaining ?? 3}</strong>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {status && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }} 
                    className="text-center text-sm font-medium text-white/70"
                  >
                    {status}
                  </motion.p>
                )}
              </form>

              {/* Action Buttons (Moved above Preferences) */}
              <div className="flex flex-col gap-3">
                <motion.a 
                  whileTap={{ scale: 0.96 }}
                  href="https://t.me/MuhammadAttiya" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full py-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[14px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={18} className="text-[#8D6346]" />
                  <span>{t('profile.contactDev')}</span>
                </motion.a>

                <motion.button 
                  whileTap={{ scale: 0.96 }}
                  onClick={logout} 
                  className="w-full py-3 rounded-[30px] bg-brand-red/10 backdrop-blur-[10px] border border-brand-red/10 shadow-inner text-brand-red font-medium text-[14px] hover:bg-brand-red/20 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  <span>{t('profile.logout')}</span>
                </motion.button>
              </div>

              {/* User Preferences Section */}
              <div className="flex flex-col gap-4">
                <h2 className="text-[17px] font-medium text-white/90 px-2 mb-2">{t('profile.userPreferences')}</h2>
                
                <div className="flex flex-col gap-4">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveView('account')}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-white/5 transition-colors rounded-[24px] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346]">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-[17px] font-semibold font-['Exo_2'] text-white">{t('profile.accountManagement')}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0">
                      <ArrowRight size={16} strokeWidth={2.5} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveView('category')}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-white/5 transition-colors rounded-[24px] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346]">
                        <Tag className="w-5 h-5" />
                      </div>
                      <span className="text-[17px] font-semibold font-['Exo_2'] text-white">{t('profile.categoryManagement')}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0">
                      <ArrowRight size={16} strokeWidth={2.5} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveView('income')}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-white/5 transition-colors rounded-[24px] group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346]">
                        <Repeat className="w-5 h-5" />
                      </div>
                      <span className="text-[17px] font-semibold font-['Exo_2'] text-white">{t('profile.incomeRecurring')}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0">
                      <ArrowRight size={16} strokeWidth={2.5} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveView('trackingCycle')}
                    className="w-full flex items-center justify-between py-3 px-2 hover:bg-white/5 transition-colors rounded-[24px] group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346]">
                        <RefreshCcw className="w-5 h-5" />
                      </div>
                      <span className="text-[17px] font-semibold font-['Exo_2'] text-white">{t('profile.trackingCycle')}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0">
                      <ArrowRight size={16} strokeWidth={2.5} className={`text-white/90 ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'account' && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex-1 flex flex-col w-full h-full"
            >
              <AccountManagement onBack={() => setActiveView('main')} />
            </motion.div>
          )}

          {activeView === 'category' && (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex-1 flex flex-col w-full h-full"
            >
              <CategoryManagement categories={categories} fetchData={fetchData} onBack={() => setActiveView('main')} />
            </motion.div>
          )}

          {activeView === 'income' && (
            <motion.div
              key="income"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex-1 flex flex-col w-full h-full"
            >
              <IncomeAndRecurringManagement 
                recurringTransactions={recurringTransactions}
                incomeProfiles={incomeProfiles}
                accounts={accounts}
                categories={categories}
                fetchData={fetchData}
                onBack={() => setActiveView('main')} 
              />
            </motion.div>
          )}

          {activeView === 'trackingCycle' && (
            <motion.div
              key="trackingCycle"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex-1 flex flex-col w-full h-full"
            >
              <TrackingCycleManagement onBack={() => setActiveView('main')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
