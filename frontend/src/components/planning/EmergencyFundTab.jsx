import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Wallet, 
  Settings2, 
  Check, 
  ChevronRight, 
  X, 
  Plus, 
  Lock,
  Sparkles
} from 'lucide-react';
import { getEmergencyFund, updateEmergencyFund } from '../../api/emergencyFund';
import { getAccounts } from '../../api/accounts';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getIconComponent } from '../IconPicker';
import FinancialShieldWidget from '../emergency/FinancialShieldWidget';
import { triggerHaptic } from '../../utils/haptics';
import { formatAccountName, formatAccountType } from '../../utils/transactionFormatters';

export default function EmergencyFundTab() {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();

  const [shield, setShield] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changeAccountModalOpen, setChangeAccountModalOpen] = useState(false);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shieldData, accs] = await Promise.all([
        getEmergencyFund().catch(() => null),
        getAccounts().catch(() => [])
      ]);
      setShield(shieldData || null);
      setAccounts(accs || []);
    } catch (err) {
      console.error('[EMERGENCY_TAB] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectEmergencyAccount = async (accId) => {
    try {
      setIsUpdatingAccount(true);
      await updateEmergencyFund({ linkedAccountId: accId });
      showToast(t('common.saveSuccess') || 'Emergency account updated', 'success');
      setChangeAccountModalOpen(false);
      window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'EMERGENCY_ACCOUNT_UPDATED' } }));
      await loadData();
    } catch (err) {
      console.error('[EMERGENCY_ACCOUNT_UPDATE_ERROR]:', err);
      showToast(err?.response?.data?.message || 'Failed to update emergency account', 'error');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-[2.5rem] bg-white/5 border border-white/10" />
        <div className="h-80 rounded-[2.5rem] bg-white/5 border border-white/10" />
      </div>
    );
  }

  const linkedAccount = shield?.linkedAccount;
  const AccIconComponent = linkedAccount ? getIconComponent(linkedAccount.icon, 'Shield') : Shield;

  return (
    <div className="w-full space-y-6">
      {/* Emergency Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 bg-black/20 border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-[40px] group"
      >
        <div 
          className="absolute -top-16 -end-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none opacity-25"
          style={{ backgroundColor: linkedAccount?.color || '#34C759' }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3.5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
                style={{ 
                  backgroundColor: `${linkedAccount?.color || '#34C759'}25`,
                  borderColor: `${linkedAccount?.color || '#34C759'}40`,
                  color: linkedAccount?.color || '#34C759'
                }}
              >
                <AccIconComponent size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {linkedAccount ? formatAccountName(linkedAccount.name, lang) : (t('planning.emergency.noAccountTitle') || 'No Emergency Account')}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40 flex items-center gap-1">
                    <Lock size={10} />
                    {t('planning.emergency.designatedAccount') || 'Emergency Vault'}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {linkedAccount ? (
                    <span className="capitalize">{formatAccountType(linkedAccount.type, t)}</span>
                  ) : (
                    <span>{t('planning.emergency.noAccountDesc') || 'Designate an account specifically for your emergency reserve.'}</span>
                  )}
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                triggerHaptic('selection');
                setChangeAccountModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5 shrink-0"
              title={t('planning.emergency.chooseAccount') || 'Choose Emergency Account'}
            >
              <Settings2 size={16} />
            </motion.button>
          </div>

          {linkedAccount ? (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between">
              <div>
                <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
                  {t('emergencyFund.currentLiquidReserve') || 'Current Reserve Balance'}
                </span>
                <div className="text-2xl sm:text-4xl font-black text-white tracking-tight tabular-nums mt-0.5">
                  {money(linkedAccount.balance || shield?.currentReserveAmount || 0)}
                </div>
              </div>

              <div className="text-end">
                <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">
                  {t('emergencyFund.monthsProtected') || 'Protected Runway'}
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#34C759] tabular-nums mt-0.5">
                  {shield?.runwayDurationMonths || 0} {t('emergencyFund.months') || 'months'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-white/10">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setChangeAccountModalOpen(true)}
                className="w-full py-3 bg-[#8D6346] hover:bg-[#A37352] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                <span>{t('planning.emergency.chooseAccount') || 'Select Emergency Account'}</span>
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Financial Shield Widget (Moved exclusively to this page) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <div className="mb-2 px-1">
          <h4 className="text-sm font-bold text-white/70 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#34C759]" />
            {t('planning.emergency.shieldSectionTitle') || 'Emergency Shield Health'}
          </h4>
        </div>
        <FinancialShieldWidget onUpdate={loadData} />
      </motion.div>

      {/* Change Emergency Account Modal */}
      {changeAccountModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#1C1817] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="text-[#34C759]" size={20} />
                {t('planning.emergency.chooseAccount') || 'Select Emergency Account'}
              </h3>
              <button 
                onClick={() => setChangeAccountModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 text-white/60 hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-white/50 mb-4">
              {t('planning.emergency.chooseAccountDesc')}
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {accounts.filter(a => !a.isArchived).map(acc => {
                const AccIcon = getIconComponent(acc.icon, 'Wallet');
                const isCurrent = acc._id === linkedAccount?._id;

                return (
                  <motion.button
                    key={acc._id}
                    whileTap={{ scale: 0.98 }}
                    disabled={isUpdatingAccount}
                    onClick={() => handleSelectEmergencyAccount(acc._id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start ${
                      isCurrent 
                        ? 'bg-[#34C759]/15 border-[#34C759]/50' 
                        : 'bg-white/5 hover:bg-[#8D6346]/10 border-white/5 hover:border-[#8D6346]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ 
                          backgroundColor: `${acc.color || '#8D6346'}20`,
                          borderColor: `${acc.color || '#8D6346'}40`,
                          color: acc.color || '#E8C5A8'
                        }}
                      >
                        <AccIcon size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {formatAccountName(acc.name, lang)}
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                          )}
                        </div>
                        <div className="text-[11px] text-white/40 capitalize">{formatAccountType(acc.type, t)}</div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <Check size={18} className="text-[#34C759]" />
                    ) : (
                      <ChevronRight size={16} className="text-white/40 rtl:rotate-180" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
