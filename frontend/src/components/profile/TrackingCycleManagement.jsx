import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RefreshCcw, Calendar, Check, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getCurrentUser, updatePreferences } from '../../api/auth';
import SplashScreen from '../SplashScreen';

export default function TrackingCycleManagement({ onBack }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [trackingPeriod, setTrackingPeriod] = useState('monthly');
  const [trackingStartDayMonthly, setTrackingStartDayMonthly] = useState(1);
  const [trackingStartDayWeekly, setTrackingStartDayWeekly] = useState(0); // 0 = Sunday

  const isRTL = lang === 'ar';

  const fetchPrefs = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      const prefs = user.preferences || {};
      setTrackingPeriod(prefs.trackingPeriod || 'monthly');
      setTrackingStartDayMonthly(prefs.trackingStartDayMonthly || 1);
      setTrackingStartDayWeekly(prefs.trackingStartDayWeekly ?? 6); // Default Saturday like Settings
    } catch (error) {
      console.error(error);
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updatePreferences({
        trackingPeriod,
        trackingStartDayMonthly: Number(trackingStartDayMonthly),
        trackingStartDayWeekly: Number(trackingStartDayWeekly)
      });
      showToast(t('settings.preferencesSaved'), 'success');
      onBack();
    } catch (error) {
      console.error(error);
      showToast(t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = [
    { value: 6, label: t('days.saturday') },
    { value: 0, label: t('days.sunday') },
    { value: 1, label: t('days.monday') },
    { value: 2, label: t('days.tuesday') },
    { value: 3, label: t('days.wednesday') },
    { value: 4, label: t('days.thursday') },
    { value: 5, label: t('days.friday') }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="space-y-6"
    >
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack} 
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors group"
        >
          <ArrowLeft className={`w-5 h-5 transition-transform group-hover:-translate-x-1 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
        </button>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RefreshCcw className="w-6 h-6 text-[#8D6346]" />
          {t('profile.trackingCycle')}
        </h2>
      </header>

      <form onSubmit={handleSave} className="relative z-10 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] space-y-6">
        {loading ? (
          <SplashScreen />
        ) : (
          <>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/80">{t('settings.defaultBudgetPeriod')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTrackingPeriod('monthly')}
                  className={`py-3 px-4 rounded-[30px] border flex items-center justify-center gap-2 transition-all ${
                    trackingPeriod === 'monthly'
                      ? 'bg-[#8D6346]/20 border-[#8D6346]/40 text-white shadow-inner'
                      : 'bg-black/20 border-white/5 text-white/50 hover:bg-black/30'
                  }`}
                >
                  <Calendar size={18} />
                  {t('budgets.monthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingPeriod('weekly')}
                  className={`py-3 px-4 rounded-[30px] border flex items-center justify-center gap-2 transition-all ${
                    trackingPeriod === 'weekly'
                      ? 'bg-[#8D6346]/20 border-[#8D6346]/40 text-white shadow-inner'
                      : 'bg-black/20 border-white/5 text-white/50 hover:bg-black/30'
                  }`}
                >
                  <RefreshCcw size={18} />
                  {t('budgets.weekly')}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {trackingPeriod === 'monthly' ? (
                <motion.div
                  key="monthly"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-medium text-white/80">{t('settings.monthStartDate')}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={trackingStartDayMonthly}
                      onChange={(e) => setTrackingStartDayMonthly(e.target.value)}
                      className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-white focus:outline-none focus:border-[#8D6346]/50"
                      required
                    />
                  </div>
                  <p className="text-xs text-white/40">{t('settings.monthStartNotice')}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="weekly"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-medium text-white/80">{t('settings.weekStartDay')}</label>
                  <select
                    value={trackingStartDayWeekly}
                    onChange={(e) => setTrackingStartDayWeekly(e.target.value)}
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none"
                    required
                  >
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value} className="bg-[#2B2321] text-white">
                        {day.label}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              disabled={saving} 
              type="submit"
              className="w-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner hover:bg-[#8D6346]/30 text-white font-medium flex items-center justify-center rounded-[30px] py-4 text-[17px] transition-all font-['Exo_2'] disabled:opacity-50 mt-4 gap-2"
            >
              {saving ? (
                <>
                  <RefreshCcw size={18} className="animate-spin" />
                  {t('profile.saving')}
                </>
              ) : (
                <>
                  <Check size={18} />
                  {t('profile.saveChanges')}
                </>
              )}
            </motion.button>
          </>
        )}
      </form>
    </motion.section>
  );
}
