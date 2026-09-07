import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const { t, lang } = useLanguage();

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      type="button"
      aria-label={t('pwa.installTitle')}
      onClick={async () => {
        await promptEvent.prompt();
        setPromptEvent(null);
      }}
      className={`fixed ${lang === 'ar' ? 'left-4' : 'right-4'} top-4 z-50 rounded-full liquidglass bg-[#1C1819]/85 backdrop-blur-xl border border-white/15 p-3 text-[#E8C5A8] shadow-[0_8px_25px_rgba(0,0,0,0.5)] hover:bg-[#8D6346]/25 hover:border-[#8D6346]/50 transition-all active:scale-90 flex items-center justify-center`}
    >
      <Download size={19} className="text-[#E8C5A8]" />
    </button>
  );
}
