import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, Calendar, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getCurrentUser, updatePreferences } from '../../api/auth';

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
    const dayNum = Number(trackingStartDayMonthly);
    if (trackingPeriod === 'monthly' && (isNaN(dayNum) || dayNum < 1 || dayNum > 31)) {
      showToast(t('common.error'), 'error');
      return;
    }
    try {
      setSaving(true);
      await updatePreferences({
        trackingPeriod,
        trackingStartDayMonthly: Math.min(31, Math.max(1, dayNum || 1)),
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
    <section className="space-y-6">
      <header className="flex items-center gap-4 mb-8">
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={onBack} 
          aria-label={t('common.back')}
          className="w-12 h-12 flex shrink-0 items-center justify-center rounded-[2rem] bg-[#8D6346]/40 backdrop-blur-[32px] border border-white/10 border-t-white/30 border-s-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[#8D6346]/60 transition-colors"
        >
          <ArrowLeft size={20} className="text-white/90 rtl:rotate-180" />
        </motion.button>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RefreshCcw className="w-6 h-6 text-[#8D6346]" />
          {t('profile.trackingCycle')}
        </h2>
      </header>

      <form onSubmit={handleSave} className="relative z-10 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#8D6346]/20 border border-[#8D6346]/30 flex items-center justify-center shadow-inner">
              <Loader2 className="w-7 h-7 text-[#8D6346] animate-spin" />
            </div>
            <span className="text-white/60 text-sm font-medium">{t('common.loading')}</span>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/80">{t('settings.defaultBudgetPeriod')}</label>
              <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setTrackingPeriod('monthly')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${trackingPeriod === 'monthly' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {trackingPeriod === 'monthly' && <motion.div layoutId="trackingPeriodTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                  <Calendar size={18} />
                  {t('budgets.monthly')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setTrackingPeriod('weekly')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${trackingPeriod === 'weekly' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {trackingPeriod === 'weekly' && <motion.div layoutId="trackingPeriodTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                  <RefreshCcw size={18} />
                  {t('budgets.weekly')}
                </motion.button>
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
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          setTrackingStartDayMonthly('');
                        } else {
                          const parsed = parseInt(raw, 10);
                          setTrackingStartDayMonthly(isNaN(parsed) ? '' : Math.min(31, Math.max(1, parsed)));
                        }
                      }}
                      className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white focus:outline-none focus:border-[#8D6346]/50"
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
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none"
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
    </section>
  );
}
