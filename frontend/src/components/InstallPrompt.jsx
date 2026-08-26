import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const { t } = useLanguage();
  useEffect(() => { const handler = (event) => { event.preventDefault(); setPromptEvent(event); }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler); }, []);
  if (!promptEvent) return null;
  return <button aria-label={t('pwa.installTitle')} onClick={async () => { await promptEvent.prompt(); setPromptEvent(null); }} className="fixed left-4 top-4 z-50 rounded-full border border-blue-400/30 bg-blue-500/20 p-3 text-blue-200"><Download size={19}/></button>;
}
