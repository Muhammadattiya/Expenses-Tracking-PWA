import { useEffect, useRef, useState } from 'react';
import { Camera, LogOut, Send, UserRound, Wallet, Tag, Repeat, ArrowRight, Settings, Pencil, RefreshCcw, ExternalLink, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
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
import ConfirmModal from '../components/modals/ConfirmModal';
import { handleLogout } from '../utils/logout';
import { triggerHaptic } from '../utils/haptics';

export default function Profile() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeView, setActiveView] = useState(searchParams.get('view') || 'main');

  useEffect(() => {
    const view = searchParams.get('view');
    if (view && ['accounts', 'categories', 'income', 'cycle'].includes(view)) {
      setActiveView(view);
    }
  }, [searchParams]);
  
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
  const [fetchError, setFetchError] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const [currentUser, accs, cats, recurring, profiles] = await Promise.all([
        getCurrentUser(),
        getAccounts().catch(err => { console.warn("Failed accounts:", err); return []; }),
        getCategories().catch(err => { console.warn("Failed categories:", err); return []; }),
        getRecurringTransactions().catch(err => { console.warn("Failed recurring:", err); return []; }),
        getIncomeProfiles().catch(err => { console.warn("Failed profiles:", err); return []; })
      ]);
      setUser(currentUser);
      setName(currentUser.name || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setPicture(currentUser.picture || '');
      setAccounts(accs);
      setCategories(cats);
      setRecurringTransactions(recurring);
      setIncomeProfiles(profiles);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const compressImage = (file, maxWidth = 320, maxHeight = 320, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Failed to load image'));

      reader.readAsDataURL(file);
    });
  };

  const choosePicture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerHaptic('warning');
      setStatus(t('profile.imageSizeError'));
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      triggerHaptic('warning');
      setStatus(t('profile.imageSizeError'));
      event.target.value = '';
      return;
    }

    setCompressing(true);
    triggerHaptic('light');
    setStatus(t('profile.compressingImage'));
    try {
      const compressed = await compressImage(file, 320, 320, 0.8);
      setPicture(compressed);
      setIsEditing(true);
      setStatus('');
      triggerHaptic('selection');
    } catch (err) {
      console.error("Image compression error:", err);
      triggerHaptic('warning');
      setStatus(t('profile.imageProcessError'));
    } finally {
      setCompressing(false);
      event.target.value = '';
    }
  };

  const save = async (event) => {
    event.preventDefault(); 
    
    if (saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      triggerHaptic('warning');
      setStatus(t('profile.nameRequired'));
      return;
    }
    if (trimmedName.length < 2) {
      triggerHaptic('warning');
      setStatus(t('profile.nameTooShort'));
      return;
    }
    if (trimmedName.length > 60) {
      triggerHaptic('warning');
      setStatus(t('profile.nameTooLong'));
      return;
    }

    const cleanPhone = phoneNumber ? phoneNumber.replace(/[\s-]/g, '') : '';
    if (cleanPhone && !/^(\+\d{10,15}|0\d{9,10})$/.test(cleanPhone)) {
      triggerHaptic('warning');
      setStatus(t('profile.invalidPhone'));
      return;
    }
    
    setSaving(true); 
    setStatus('');
    try { 
      const updated = await updateProfile({ 
        name: trimmedName, 
        picture, 
        phoneNumber: cleanPhone || null 
      }); 
      setUser(updated);
      setName(updated.name);
      setPhoneNumber(updated.phoneNumber || '');
      setPicture(updated.picture || '');
      setIsEditing(false);
      setStatus(t('profile.saveSuccess')); 
      triggerHaptic('success');
    } catch (error) { 
      triggerHaptic('warning');
      setStatus(error.response?.data?.message || t('profile.saveError')); 
    } finally { 
      setSaving(false); 
    }
  };

  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const cancelEditing = () => {
    triggerHaptic('light');
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phoneNumber || '');
      setPicture(user.picture || '');
    }
    setStatus('');
    setIsEditing(false);
  };

  // Keyboard Escape dismissal
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelEditing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, user]);

  // Auto-dismiss save success status
  useEffect(() => {
    if (status && status === t('profile.saveSuccess')) {
      const timer = setTimeout(() => setStatus(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [status, t]);

  const logout = async () => { 
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      triggerHaptic('medium');
      await handleLogout();
    } catch (err) {
      triggerHaptic('warning');
      setStatus(err.message || t('profile.logoutError'));
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const isRTL = language === 'ar';
  const isSuccessStatus = status === t('profile.saveSuccess');
  const isCompressingStatus = compressing || status === t('profile.compressingImage');
  const isErrorStatus = Boolean(status && !isSuccessStatus && !isCompressingStatus);

  return (
    <div className="relative flex flex-col min-h-[100dvh] bg-transparent overflow-hidden -mx-5 -mt-8 -mb-32">
      {/* Ambient Copper Background exactly like Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="px-5 pt-20 pb-52 space-y-6 relative z-10 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {activeView === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="flex-1 flex flex-col w-full h-full space-y-7"
            >
              <header className="mb-2 px-2 flex items-center justify-between mt-2">
                <h1 className="text-3xl font-bold font-['Exo_2'] tracking-tight text-white drop-shadow-md truncate">{name || t('profile.myAccount')}</h1>
                <Link to="/settings" aria-label={t('settings.title') || 'Settings'} className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[14px] bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] text-[#8D6346] hover:bg-[#8D6346]/20 hover:text-white transition-all duration-300 shrink-0 ms-3">
                  <Settings size={20} />
                </Link>
              </header>

              {/* Error recovery banner if initial data fetch failed */}
              {fetchError && (
                <div className="p-4 rounded-2xl bg-brand-red/10 border border-brand-red/20 text-brand-red flex items-center justify-between text-sm shadow-inner">
                  <span>{t('common.loadError')}</span>
                  <button 
                    type="button"
                    onClick={fetchData} 
                    className="px-3.5 py-1.5 rounded-xl bg-brand-red/20 hover:bg-brand-red/30 font-medium text-xs transition-colors"
                  >
                    {t('common.refresh')}
                  </button>
                </div>
              )}

              {/* Profile Card Form */}
              <form onSubmit={save} className="relative bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] flex flex-col gap-5 group">
                <button 
                  type="button" 
                  onClick={() => {
                    triggerHaptic('selection');
                    setIsEditing(prev => {
                      if (!prev) setTimeout(() => nameInputRef.current?.focus(), 50);
                      else cancelEditing();
                      return !prev;
                    });
                  }} 
                  className={`absolute top-6 end-6 z-20 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-300 ${isEditing ? 'bg-[#8D6346] border-[#8D6346] text-white' : 'bg-[#8D6346]/10 border-[#8D6346]/20 text-[#8D6346] hover:bg-[#8D6346]/20 hover:text-white'}`} 
                  aria-label={t('profile.editProfile')}
                >
                  <Pencil size={16} />
                </button>
                <div className="flex justify-center relative mb-2">
                  <div className="relative inline-block">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      type="button" 
                      onClick={() => {
                        triggerHaptic('light');
                        inputRef.current?.click();
                      }} 
                      aria-label={t('profile.changeAvatar')}
                      disabled={compressing}
                      className="relative h-28 w-28 overflow-hidden rounded-full border border-white/20 bg-white/5 shadow-inner group transition-all duration-300 block"
                    >
                      {compressing ? (
                        <div className="w-full h-full bg-black/40 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-[#E8C5A8] animate-spin" />
                        </div>
                      ) : picture ? (
                        <img src={picture} alt={t('profile.accountImageAlt')} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-black/20 flex items-center justify-center">
                          <UserRound className="h-12 w-12 text-white/50 transition-transform duration-700 group-hover:scale-110 drop-shadow-md" />
                        </div>
                      )}
                    </motion.button>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        inputRef.current?.click();
                      }}
                      aria-label={t('profile.changeAvatar')}
                      disabled={compressing}
                      className="absolute -bottom-1 -end-1 grid h-11 w-11 min-w-[44px] min-h-[44px] place-items-center rounded-full bg-[#8D6346] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-[3px] border-[#2B2321] text-white hover:scale-105 transition-transform z-10 disabled:opacity-50"
                    >
                      <Camera size={18} className="drop-shadow-md"/>
                    </button>
                  </div>
                  <input ref={inputRef} onChange={choosePicture} type="file" accept="image/*" className="hidden" />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-name" className="text-sm font-medium text-white/70 px-2">{t('profile.nameLabel')}</label>
                    <input 
                      id="profile-name"
                      ref={nameInputRef}
                      required 
                      maxLength={60}
                      readOnly={!isEditing}
                      placeholder={isEditing ? t('profile.namePlaceholder') : ''}
                      className={`w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3.5 text-base caret-[#8D6346] selection:bg-[#8D6346]/35 selection:text-white ${isEditing ? 'text-white focus:ring-2 focus:ring-[#8D6346]/30 bg-black/40 border-[#8D6346]/50' : 'text-white/60 cursor-default'} outline-none transition-all duration-300`}
                      value={name} 
                      onChange={(event) => setName(event.target.value)} 
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-phone" className="text-sm font-medium text-white/70 px-2 flex justify-between">
                      <span>{t('profile.phoneLabel')}</span>
                      <span className="text-white/40 text-[11px] uppercase tracking-wider">{t('common.optional')}</span>
                    </label>
                    <input 
                      id="profile-phone"
                      type="tel"
                      maxLength={20}
                      readOnly={!isEditing}
                      className={`w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3.5 text-base caret-[#8D6346] selection:bg-[#8D6346]/35 selection:text-white ${isEditing ? 'text-white focus:ring-2 focus:ring-[#8D6346]/30 bg-black/40 border-[#8D6346]/50' : 'text-white/60 cursor-default'} outline-none transition-all duration-300 text-start dir-ltr`}
                      value={phoneNumber} 
                      onChange={(event) => setPhoneNumber(event.target.value)} 
                      placeholder={isEditing ? t('profile.phonePlaceholder') : ''}
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-2">
                      <label className="text-sm font-medium text-white/70 flex items-center gap-1.5">
                        <span>{t('profile.emailLabel')}</span>
                        <Lock size={12} className="text-white/40" />
                      </label>
                      <span className="text-white/40 text-[11px]">{t('profile.emailLockedHint')}</span>
                    </div>
                    <div 
                      aria-readonly="true"
                      role="textbox"
                      className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3.5 text-base text-white/60 cursor-not-allowed truncate select-all"
                    >
                      {user?.email || '...'}
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex flex-col gap-2.5 pt-1">
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <motion.button 
                        whileTap={{ scale: 0.96 }}
                        type="button"
                        onClick={cancelEditing}
                        disabled={saving}
                        className="flex-1 py-3 rounded-[30px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium text-[14px] transition-all min-h-[44px]"
                      >
                        {t('profile.cancelEdit')}
                      </motion.button>
                      <motion.button 
                        whileTap={{ scale: 0.96 }}
                        disabled={saving} 
                        type="submit"
                        className="flex-1 py-3 rounded-[30px] bg-[#8D6346] hover:bg-[#8D6346]/90 border border-[#8D6346]/40 text-white shadow-[0_4px_16px_rgba(141,99,70,0.3)] font-semibold text-[14px] transition-all disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white/90 shrink-0" />
                            <span>{t('profile.saving')}</span>
                          </>
                        ) : (
                          <span>{t('profile.saveChanges')}</span>
                        )}
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button 
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setIsEditing(true);
                        setTimeout(() => nameInputRef.current?.focus(), 50);
                      }}
                      className="w-full py-3 rounded-[30px] bg-[#8D6346]/15 hover:bg-[#8D6346]/25 border border-[#8D6346]/30 text-[#E8C5A8] hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] font-medium text-[14px] transition-all flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <Pencil size={15} />
                      <span>{t('profile.editProfile')}</span>
                    </motion.button>
                  )}

                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-center text-[11px] text-white/60 overflow-hidden flex flex-col items-center gap-0.5"
                      >
                        <div>
                          <span>{t('profile.editsRemaining')}</span> <strong className="text-[#E8C5A8] font-bold ms-1 tabular-nums">{user?.profileEditsRemaining ?? 3}</strong>
                        </div>
                        <span className="text-[10px] text-white/40">{t('profile.editsResetHint')}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <AnimatePresence>
                  {status && (
                    <motion.div 
                      role="status"
                      aria-live="polite"
                      initial={{ opacity: 0, y: 6, scale: 0.96 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                      className={`mt-2 px-4 py-2.5 rounded-[20px] backdrop-blur-md flex items-center justify-center gap-2.5 text-xs font-medium border shadow-inner ${
                        isSuccessStatus
                          ? 'bg-[#34C759]/15 border-[#34C759]/30 text-[#34C759]'
                          : isCompressingStatus
                          ? 'bg-[#8D6346]/20 border-[#8D6346]/35 text-[#E8C5A8]'
                          : 'bg-brand-red/15 border-brand-red/30 text-brand-red'
                      }`}
                    >
                      {isSuccessStatus && <CheckCircle2 size={15} className="shrink-0" />}
                      {isCompressingStatus && <Loader2 size={15} className="animate-spin shrink-0 text-[#E8C5A8]" />}
                      {isErrorStatus && <AlertCircle size={15} className="shrink-0" />}
                      <span className="truncate">{status}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* User Preferences Section (Financial Hub - Placed Directly Below Profile) */}
              <div className="flex flex-col gap-3">
                <h2 className="text-[14px] font-semibold text-white/70 px-2 uppercase tracking-wider">{t('profile.userPreferences')}</h2>
                
                <div className="bg-[#2B2321]/20 backdrop-blur-[24px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-[2rem] p-2 flex flex-col divide-y divide-white/5 overflow-hidden">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveView('account');
                    }}
                    className="w-full min-h-[56px] flex items-center justify-between py-3.5 px-3.5 hover:bg-white/5 transition-all duration-300 rounded-[20px] group text-start"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346] group-hover:text-[#E8C5A8] group-hover:bg-[#8D6346]/20 group-hover:border-[#8D6346]/30 transition-all duration-300 shrink-0">
                        <Wallet className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-semibold font-['Exo_2'] text-white group-hover:text-[#E8C5A8] transition-colors duration-300 truncate">{t('profile.accountManagement')}</span>
                        <span className="text-[12px] text-white/40 truncate">{t('profile.accountManagementDesc')}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0 ms-2 group-hover:border-[#8D6346]/40 group-hover:bg-[#8D6346]/20 transition-all duration-300">
                      <ArrowRight size={14} strokeWidth={2.5} className={`text-white/90 group-hover:text-white transition-all duration-300 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveView('category');
                    }}
                    className="w-full min-h-[56px] flex items-center justify-between py-3.5 px-3.5 hover:bg-white/5 transition-all duration-300 rounded-[20px] group text-start"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346] group-hover:text-[#E8C5A8] group-hover:bg-[#8D6346]/20 group-hover:border-[#8D6346]/30 transition-all duration-300 shrink-0">
                        <Tag className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-semibold font-['Exo_2'] text-white group-hover:text-[#E8C5A8] transition-colors duration-300 truncate">{t('profile.categoryManagement')}</span>
                        <span className="text-[12px] text-white/40 truncate">{t('profile.categoryManagementDesc')}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0 ms-2 group-hover:border-[#8D6346]/40 group-hover:bg-[#8D6346]/20 transition-all duration-300">
                      <ArrowRight size={14} strokeWidth={2.5} className={`text-white/90 group-hover:text-white transition-all duration-300 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveView('income');
                    }}
                    className="w-full min-h-[56px] flex items-center justify-between py-3.5 px-3.5 hover:bg-white/5 transition-all duration-300 rounded-[20px] group text-start"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346] group-hover:text-[#E8C5A8] group-hover:bg-[#8D6346]/20 group-hover:border-[#8D6346]/30 transition-all duration-300 shrink-0">
                        <Repeat className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-semibold font-['Exo_2'] text-white group-hover:text-[#E8C5A8] transition-colors duration-300 truncate">{t('profile.incomeRecurring')}</span>
                        <span className="text-[12px] text-white/40 truncate">{t('profile.incomeRecurringDesc')}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0 ms-2 group-hover:border-[#8D6346]/40 group-hover:bg-[#8D6346]/20 transition-all duration-300">
                      <ArrowRight size={14} strokeWidth={2.5} className={`text-white/90 group-hover:text-white transition-all duration-300 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveView('trackingCycle');
                    }}
                    className="w-full min-h-[56px] flex items-center justify-between py-3.5 px-3.5 hover:bg-white/5 transition-all duration-300 rounded-[20px] group text-start"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346] group-hover:text-[#E8C5A8] group-hover:bg-[#8D6346]/20 group-hover:border-[#8D6346]/30 transition-all duration-300 shrink-0">
                        <RefreshCcw className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-semibold font-['Exo_2'] text-white group-hover:text-[#E8C5A8] transition-colors duration-300 truncate">{t('profile.trackingCycle')}</span>
                        <span className="text-[12px] text-white/40 truncate">{t('profile.trackingCycleDesc')}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0 ms-2 group-hover:border-[#8D6346]/40 group-hover:bg-[#8D6346]/20 transition-all duration-300">
                      <ArrowRight size={14} strokeWidth={2.5} className={`text-white/90 group-hover:text-white transition-all duration-300 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Support & Account Section (Moved to Footer) */}
              <div className="flex flex-col gap-3 pt-2">
                <h2 className="text-[13px] font-medium text-white/40 tracking-wider px-2 uppercase">{t('profile.supportAndAccount')}</h2>
                <div className="flex flex-col gap-2.5">
                  <motion.a 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => triggerHaptic('light')}
                    href="https://t.me/MuhammadAttiya" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full min-h-[48px] py-3.5 px-5 rounded-[24px] bg-[#8D6346]/15 hover:bg-[#8D6346]/25 backdrop-blur-[10px] border border-[#8D6346]/25 text-white shadow-inner font-medium text-[14px] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[10px] bg-[#8D6346]/20 flex items-center justify-center text-[#8D6346] group-hover:text-[#E8C5A8] transition-colors">
                        <Send size={16} />
                      </div>
                      <span>{t('profile.contactDev')}</span>
                    </div>
                    <ExternalLink size={15} className="text-white/40 group-hover:text-white/70 transition-colors" />
                  </motion.a>

                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      triggerHaptic('warning');
                      setShowLogoutModal(true);
                    }} 
                    disabled={loggingOut}
                    className="w-full min-h-[48px] py-3.5 px-5 rounded-[24px] bg-brand-red/10 hover:bg-brand-red/20 backdrop-blur-[10px] border border-brand-red/15 text-brand-red font-medium text-[14px] transition-all flex items-center justify-between disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[10px] bg-brand-red/15 flex items-center justify-center text-brand-red">
                        <LogOut size={16} className={loggingOut ? "animate-spin" : ""} />
                      </div>
                      <span>{t('profile.logout')}</span>
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
              <AccountManagement onBack={() => { triggerHaptic('light'); setActiveView('main'); }} />
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
              <CategoryManagement categories={categories} fetchData={fetchData} onBack={() => { triggerHaptic('light'); setActiveView('main'); }} />
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
                onBack={() => { triggerHaptic('light'); setActiveView('main'); }} 
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
              <TrackingCycleManagement onBack={() => { triggerHaptic('light'); setActiveView('main'); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmModal
        open={showLogoutModal}
        title={t('profile.logoutConfirmTitle')}
        message={t('profile.logoutConfirmMessage')}
        confirmText={t('profile.logoutConfirmAction')}
        cancelText={t('profile.logoutCancelAction')}
        confirmColor="red"
        loading={loggingOut}
        onConfirm={logout}
        onCancel={() => {
          if (!loggingOut) setShowLogoutModal(false);
        }}
      />
    </div>
  );
}
