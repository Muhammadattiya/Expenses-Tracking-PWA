import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, LogOut, Save, Send, UserRound } from 'lucide-react';
import { getCurrentUser, updateProfile } from '../api/auth';
import { useLanguage } from '../contexts/LanguageContext';

export default function Profile() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [picture, setPicture] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { getCurrentUser().then((currentUser) => { setUser(currentUser); setName(currentUser.name); setPicture(currentUser.picture || ''); }); }, []);
  const choosePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setStatus(t('profile.imageSizeError', 'اختر صورة بحجم أقل من 3MB.')); return; }
    const reader = new FileReader();
    reader.onload = () => setPicture(reader.result);
    reader.readAsDataURL(file);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setStatus('');
    try { const updated = await updateProfile({ name, picture }); setUser(updated); setStatus(t('profile.saveSuccess', 'تم حفظ التغييرات.')); }
    catch (error) { setStatus(error.response?.data?.message || t('profile.saveError', 'تعذر حفظ التغييرات.')); }
    finally { setSaving(false); }
  };
  const logout = () => { localStorage.removeItem('auth_token'); window.location.assign('/'); };
  return <div className="p-4 pt-8 animate-fade-in space-y-6">
    <header><p className="text-brand-blue text-sm">{t('profile.manageAccount', 'إدارة حسابك')}</p><h1 className="text-2xl font-bold">{t('profile.myAccount', 'حسابي')}</h1></header>
    <form onSubmit={save} className="glass-panel p-6 rounded-[2rem] space-y-6">
      <div className="flex justify-center"><button type="button" onClick={() => inputRef.current?.click()} className="relative h-28 w-28 overflow-hidden rounded-full border-[3px] border-brand-blue/50 bg-black/30 shadow-lg">{picture ? <img src={picture} alt={t('profile.accountImageAlt', 'صورة الحساب')} className="h-full w-full object-cover" /> : <UserRound className="m-auto h-full text-[var(--color-text-muted)]" />}<span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-brand-blue"><Camera size={15}/></span></button><input ref={inputRef} onChange={choosePicture} type="file" accept="image/*" className="hidden" /></div>
      <div><label className="mb-2 block text-sm font-medium text-[var(--color-text-main)]">{t('profile.nameLabel', 'الاسم')}</label><input required className="field" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div><label className="mb-2 block text-sm font-medium text-[var(--color-text-main)]">{t('profile.emailLabel', 'البريد الإلكتروني')}</label><p className="field cursor-not-allowed text-[var(--color-text-muted)] opacity-60">{user?.email || '...'}</p></div>
      <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 font-bold hover:bg-brand-blue/90 transition disabled:opacity-50 mt-4"><Save size={20}/>{saving ? t('profile.saving', 'جارٍ الحفظ...') : t('profile.saveChanges', 'حفظ التغييرات')}</button>
      {status && <p className="rounded-xl bg-white/5 p-3 text-center text-sm text-[var(--color-text-main)] border border-white/10">{status}</p>}
    </form>
    <a href="https://t.me/MuhammadAttiya" target="_blank" rel="noreferrer" className="glass-panel border-brand-blue/20 bg-brand-blue/5 flex items-center justify-between p-5 text-blue-200 hover:bg-brand-blue/10 transition-colors"><span className="flex items-center gap-3 font-medium"><Send size={20} className="text-brand-blue"/> {t('profile.contactDev', 'راسل المطوّر على Telegram')}</span><ExternalLink size={18} className="text-brand-blue/70"/></a>
    <button onClick={logout} className="glass-panel flex w-full items-center justify-center gap-2 border-brand-red/30 bg-brand-red/5 py-4 text-brand-red hover:bg-brand-red/10 transition-colors font-bold"><LogOut size={20}/> {t('profile.logout', 'تسجيل الخروج')}</button>
  </div>;
}
