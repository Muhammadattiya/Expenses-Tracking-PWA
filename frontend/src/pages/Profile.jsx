import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, LogOut, Save, Send, UserRound } from 'lucide-react';
import { getCurrentUser, updateProfile } from '../api/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

export default function Profile() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [picture, setPicture] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { 
    getCurrentUser().then((currentUser) => { 
      setUser(currentUser); 
      setName(currentUser.name); 
      setPicture(currentUser.picture || ''); 
    }); 
  }, []);

  const choosePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { 
      setStatus(t('profile.imageSizeError', 'اختر صورة بحجم أقل من 3MB.')); 
      return; 
    }
    const reader = new FileReader();
    reader.onload = () => setPicture(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault(); 
    setSaving(true); 
    setStatus('');
    try { 
      const updated = await updateProfile({ name, picture }); 
      setUser(updated); 
      setStatus(t('profile.saveSuccess', 'تم حفظ التغييرات.')); 
    } catch (error) { 
      setStatus(error.response?.data?.message || t('profile.saveError', 'تعذر حفظ التغييرات.')); 
    } finally { 
      setSaving(false); 
    }
  };

  const logout = () => { 
    localStorage.removeItem('auth_token'); 
    window.location.assign('/'); 
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="p-4 pt-8 pb-10 space-y-6 relative"
    >
      {/* Background Liquid Orbs for the Glass to distort */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-brand-blue/30 rounded-full mix-blend-screen filter blur-[50px] opacity-60 animate-pulse pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-64 h-64 bg-purple-500/20 rounded-full mix-blend-screen filter blur-[60px] opacity-60 pointer-events-none" />

      <header className="mb-2 px-1 relative z-10">
        <p className="text-brand-blue text-xs tracking-widest font-medium uppercase opacity-90 drop-shadow-sm">{t('profile.manageAccount', 'إدارة حسابك')}</p>
        <h1 className="text-4xl font-bold tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm">{t('profile.myAccount', 'حسابي')}</h1>
      </header>

      {/* Liquid Glass Form Panel */}
      <form onSubmit={save} className="relative z-10 bg-white/5 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 p-6 rounded-[2.5rem] space-y-7 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)]">
        
        <div className="flex justify-center relative">
          {/* Picture Liquid Glass Ring */}
          <div className="absolute inset-0 m-auto h-32 w-32 bg-gradient-to-br from-brand-blue/40 to-transparent rounded-full blur-xl opacity-50 pointer-events-none" />
          
          <motion.button 
            whileTap={{ scale: 0.92 }}
            type="button" 
            onClick={() => inputRef.current?.click()} 
            className="relative h-28 w-28 overflow-hidden rounded-full border border-white/20 border-t-white/50 bg-white/5 backdrop-blur-xl shadow-[inset_0_2px_10px_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.3)] group transition-all duration-300"
          >
            {picture ? (
              <img src={picture} alt={t('profile.accountImageAlt', 'صورة الحساب')} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
              <UserRound className="m-auto h-12 w-12 text-white/50 transition-transform duration-700 group-hover:scale-110 drop-shadow-md" />
            )}
            {/* Liquid highlight reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
            
            <span className="absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-brand-blue/80 backdrop-blur-xl shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.6)] border border-white/30 text-white">
              <Camera size={14} className="drop-shadow-md"/>
            </span>
          </motion.button>
          <input ref={inputRef} onChange={choosePicture} type="file" accept="image/*" className="hidden" />
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">{t('profile.nameLabel', 'الاسم')}</label>
            <input 
              required 
              className="w-full bg-black/20 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-3xl px-5 py-4 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-blue/60 focus:bg-white/10 transition-all duration-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]" 
              value={name} 
              onChange={(event) => setName(event.target.value)} 
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">{t('profile.emailLabel', 'البريد الإلكتروني')}</label>
            <div className="w-full bg-black/10 border border-white/5 rounded-3xl px-5 py-4 text-white/40 cursor-not-allowed shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)]">
              {user?.email || '...'}
            </div>
          </div>
        </div>

        {/* Liquid Button */}
        <motion.button 
          whileTap={{ scale: 0.95 }}
          disabled={saving} 
          className="relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-3xl bg-brand-blue/80 backdrop-blur-xl border border-white/20 border-t-white/50 py-4 font-bold shadow-[0_8px_20px_rgba(var(--color-brand-blue),0.4),inset_0_1px_3px_rgba(255,255,255,0.6)] hover:bg-brand-blue transition-all duration-300 disabled:opacity-50 mt-6 text-white group"
        >
          {/* Button Specular Highlight */}
          <div className="absolute inset-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-3xl pointer-events-none" />
          <Save size={20} className="drop-shadow-md z-10" />
          <span className="drop-shadow-md z-10">{saving ? t('profile.saving', 'جارٍ الحفظ...') : t('profile.saveChanges', 'حفظ التغييرات')}</span>
        </motion.button>
        
        {status && (
          <motion.p 
            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }} 
            className="rounded-2xl bg-white/10 backdrop-blur-xl p-3 text-center text-sm font-medium border border-white/20 border-t-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] overflow-hidden"
          >
            {status}
          </motion.p>
        )}
      </form>

      <div className="space-y-3 relative z-10">
        <motion.a 
          whileTap={{ scale: 0.96 }}
          href="https://t.me/MuhammadAttiya" 
          target="_blank" 
          rel="noreferrer" 
          className="bg-white/5 backdrop-blur-[30px] border border-white/10 border-t-white/20 flex items-center justify-between p-4.5 rounded-[2rem] text-blue-200 hover:bg-white/10 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)]"
        >
          <span className="flex items-center gap-3 font-medium drop-shadow-sm">
            <div className="bg-brand-blue/30 backdrop-blur-md p-2.5 rounded-full border border-white/10 shadow-inner">
              <Send size={18} className="text-white drop-shadow-md"/> 
            </div>
            {t('profile.contactDev', 'راسل المطوّر على Telegram')}
          </span>
          <ExternalLink size={18} className="opacity-60" />
        </motion.a>

        <motion.button 
          whileTap={{ scale: 0.96 }}
          onClick={logout} 
          className="w-full bg-brand-red/10 backdrop-blur-[30px] border border-brand-red/20 border-t-brand-red/40 flex items-center justify-center gap-2 rounded-[2rem] py-4.5 text-red-200 font-bold hover:bg-brand-red/20 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.2)]"
        >
          <LogOut size={20} className="drop-shadow-sm" /> 
          <span className="drop-shadow-sm">{t('profile.logout', 'تسجيل الخروج')}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
