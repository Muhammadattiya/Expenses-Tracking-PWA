import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { createIncomeProfile } from '../../api/incomeProfiles';
import { Loader2 } from 'lucide-react';

export default function IncomeProfileStep({ stepData, handleNext, setLoadingGlobal, setIsOverlayActive }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [showOverlay, setShowOverlay] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    monthDay: 1,
    weekDay: 0,
    account: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (setIsOverlayActive) setIsOverlayActive(true);
    
    // 2.5 second overlay
    const timer = setTimeout(() => {
      setShowOverlay(false);
      if (setIsOverlayActive) setIsOverlayActive(false);
    }, 2500);

    // Fetch accounts and categories
    const fetchData = async () => {
      try {
        const [accs, cats] = await Promise.all([getAccounts(), getCategories()]);
        setAccounts(accs);
        // Try to filter income categories if applicable, else show all
        const incomeCats = cats.filter(c => c.type === 'income' || c.type === 'both' || !c.type);
        setCategories(incomeCats.length > 0 ? incomeCats : cats);
        
        if (accs.length > 0) {
          setFormData(prev => ({ ...prev, account: accs[0]._id }));
        }
        if (incomeCats.length > 0) {
          setFormData(prev => ({ ...prev, category: incomeCats[0]._id }));
        } else if (cats.length > 0) {
          setFormData(prev => ({ ...prev, category: cats[0]._id }));
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.account || !formData.category) return;
    
    setLoading(true);
    setLoadingGlobal(true);
    try {
      await createIncomeProfile({
        name: formData.name,
        amount: Number(formData.amount),
        frequency: formData.frequency,
        monthDay: Number(formData.monthDay),
        weekDay: Number(formData.weekDay),
        account: formData.account,
        category: formData.category
      });
      // On success, go to next step
      setLoading(false);
      setLoadingGlobal(false);
      handleNext();
    } catch (err) {
      console.error("Error creating income profile:", err);
      // Even if it fails (e.g. offline), we might want to proceed or show error
      setLoading(false);
      setLoadingGlobal(false);
    }
  };

  const inputClasses = "w-full h-[36px] bg-black/30 backdrop-blur-[20px] rounded-[14px] border border-white/5 shadow-inner text-white/90 px-3 text-[12px] font-['Exo_2'] focus:outline-none focus:border-white/20 transition-colors appearance-none";
  const labelClasses = "block text-[11px] font-medium text-white/70 mb-0.5 font-['Exo_2']";

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-[90px] px-6 z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <AnimatePresence mode="wait">
        {showOverlay ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/40 backdrop-blur-[10px]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-56 h-56 mb-8"
            >
              <img src="/images/onboarding1.png" alt="Finova Logo" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] opacity-90 mix-blend-screen" style={{ filter: 'brightness(0.5) sepia(1) hue-rotate(-30deg) saturate(2)', transform: 'rotate(39.01deg)' }} />
            </motion.div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[28px] font-bold text-center text-white/90 font-['Exo_2'] max-w-[300px] leading-snug drop-shadow-lg"
            >
              {t('onboarding.screen3Overlay')}
            </motion.h2>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full flex-1 flex flex-col pb-2 min-h-0"
          >
            <h2 className="text-[18px] font-bold text-white text-center font-['Exo_2'] drop-shadow-sm mb-3">
              {t('onboarding.screen3Title')}
            </h2>

            <form onSubmit={handleSave} className="flex-1 flex flex-col px-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              
              <div className="flex flex-col gap-3 pb-4">
                  {/* Income Name */}
                  <div>
                    <label className={labelClasses}>{t('onboarding.incomeName')}</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('onboarding.incomeNamePlaceholder')}
                      className={inputClasses}
                      required
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className={labelClasses}>{t('onboarding.howMuch')}</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={inputClasses}
                      required
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className={labelClasses}>{t('onboarding.howOften')}</label>
                    <select
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleChange}
                      className={inputClasses}
                      required
                    >
                      <option value="monthly" className="bg-[#2a1d15]">{t('onboarding.monthly')}</option>
                      <option value="weekly" className="bg-[#2a1d15]">{t('onboarding.weekly')}</option>
                    </select>
                  </div>

                  {/* Pay Date */}
                  <div>
                    <label className={labelClasses}>{t('onboarding.whenPaid')}</label>
                    <div className="flex items-center gap-4">
                      {formData.frequency === 'monthly' ? (
                        <>
                          <input
                            type="number"
                            name="monthDay"
                            value={formData.monthDay}
                            onChange={handleChange}
                            min="1"
                            max="31"
                            className={`${inputClasses} w-24 text-center`}
                            required
                          />
                          <span className="text-white/60 text-[13px] font-medium font-['Exo_2']">{t('onboarding.ofEveryMonth')}</span>
                        </>
                      ) : (
                        <select
                          name="weekDay"
                          value={formData.weekDay}
                          onChange={handleChange}
                          className={inputClasses}
                          required
                        >
                          <option value="0" className="bg-[#2a1d15]">Sunday</option>
                          <option value="1" className="bg-[#2a1d15]">Monday</option>
                          <option value="2" className="bg-[#2a1d15]">Tuesday</option>
                          <option value="3" className="bg-[#2a1d15]">Wednesday</option>
                          <option value="4" className="bg-[#2a1d15]">Thursday</option>
                          <option value="5" className="bg-[#2a1d15]">Friday</option>
                          <option value="6" className="bg-[#2a1d15]">Saturday</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Account */}
                  <div>
                    <label className={labelClasses}>{t('onboarding.whereItGoes')}</label>
                    <select
                      name="account"
                      value={formData.account}
                      onChange={handleChange}
                      className={inputClasses}
                      required
                    >
                      <option value="" disabled className="bg-[#2a1d15]">{t('onboarding.selectAccount')}</option>
                      {accounts.map(acc => (
                        <option key={acc._id} value={acc._id} className="bg-[#2a1d15]">{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className={labelClasses}>{t('onboarding.whatKind')}</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={inputClasses}
                      required
                    >
                      <option value="" disabled className="bg-[#2a1d15]">{t('onboarding.selectCategory')}</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id} className="bg-[#2a1d15]">{isRTL ? cat.nameAr || cat.name : cat.name}</option>
                      ))}
                    </select>
                  </div>
              </div>

              {/* Decorative Logo */}
              <div className="flex-1 flex flex-col justify-center items-center min-h-[100px] py-4 pointer-events-none">
                <motion.div
                  className="w-[120px] h-[120px]"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-full h-full"
                  >
                    <img 
                      src="/images/onboarding1.png"
                      alt="Decoration"
                      className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] opacity-40"
                      style={{ transform: "rotate(15deg)" }}
                    />
                  </motion.div>
                </motion.div>
              </div>

              {/* Save Button */}
              <div className="pt-1 flex justify-center mt-auto pb-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading}
                  className="w-full max-w-[160px] h-[36px] flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.6)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(141,99,70,0.8)] transition-colors relative z-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-white/90" />
                  ) : (
                    <span className="text-white/90 font-medium text-[13px] font-['Exo_2'] tracking-wide">{t('onboarding.save')}</span>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
