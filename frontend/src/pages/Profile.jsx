import { useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink, LogOut, Save, Send, UserRound } from 'lucide-react';
import { getCurrentUser, updateProfile } from '../api/auth';

export default function Profile() {
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
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setStatus('اختر صورة بحجم أقل من 3MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPicture(reader.result);
    reader.readAsDataURL(file);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setStatus('');
    try { const updated = await updateProfile({ name, picture }); setUser(updated); setStatus('تم حفظ التغييرات.'); }
    catch (error) { setStatus(error.response?.data?.message || 'تعذر حفظ التغييرات.'); }
    finally { setSaving(false); }
  };
  const logout = () => { localStorage.removeItem('auth_token'); window.location.assign('/'); };
  return <div className="space-y-6">
    <header><p className="text-blue-400 text-sm">إدارة حسابك</p><h1 className="text-2xl font-bold">حسابي</h1></header>
    <form onSubmit={save} className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-5">
      <div className="flex justify-center"><button type="button" onClick={() => inputRef.current?.click()} className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-blue-400/50 bg-black/30">{picture ? <img src={picture} alt="صورة الحساب" className="h-full w-full object-cover" /> : <UserRound className="m-auto h-full text-gray-400" />}<span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full bg-blue-500"><Camera size={15}/></span></button><input ref={inputRef} onChange={choosePicture} type="file" accept="image/*" className="hidden" /></div>
      <div><label className="mb-1 block text-sm text-gray-400">الاسم</label><input required className="field" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div><label className="mb-1 block text-sm text-gray-400">البريد الإلكتروني</label><p className="field cursor-not-allowed text-gray-400">{user?.email || '...'}</p></div>
      <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3 font-bold disabled:opacity-50"><Save size={18}/>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button>
      {status && <p className="rounded-xl bg-white/5 p-3 text-center text-sm text-gray-300">{status}</p>}
    </form>
    <a href="https://t.me/MuhammadAttiya" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sky-200"><span className="flex items-center gap-2"><Send size={18}/> راسل المطوّر على Telegram</span><ExternalLink size={17}/></a>
    <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-red-300"><LogOut size={18}/> تسجيل الخروج</button>
  </div>;
}
