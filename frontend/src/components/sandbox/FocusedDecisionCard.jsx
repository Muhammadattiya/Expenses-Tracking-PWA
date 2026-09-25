import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, 
  Sparkles, RotateCcw, CreditCard, Wallet, Calendar, AlertCircle, 
  Bookmark, ChevronDown, ChevronUp, ArrowRightLeft, Sliders, CheckCircle2,
  Clock, TrendingDown, DollarSign, HelpCircle, Info, X
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// Context for Stable MetricCard Calculation Hints across re-renders
const SandboxHintContext = createContext({
  activeHintCard: null,
  setActiveHintCard: () => {},
  hints: {},
  howCalculatedText: '',
  basisLabelText: '',
  lang: 'ar',
  shouldReduceMotion: false
});

// Color helper for emergency buffer months (prevents negative buffer displaying as green)
const getBufferColor = (months) => {
  const m = Number(months);
  if (isNaN(m) || m <= 0) return 'text-rose-400';
  if (m < 3) return 'text-amber-400';
  return 'text-emerald-400';
};

// Clean, embedded metric card inside the master decision hero with contextual calculation basis hint
function MetricCardWrapper({ title, cardKey, hint, children }) {
  const { hints, howCalculatedText, lang } = useContext(SandboxHintContext);
  const effectiveHint = hint || (hints && hints[cardKey]);
  const hintText = effectiveHint 
    ? (lang === 'ar' ? (effectiveHint.hintAr || effectiveHint.hintEn) : (effectiveHint.hintEn || effectiveHint.hintAr))
    : null;

  return (
    <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex flex-col justify-between gap-2.5 transition-all hover:border-[#8D6346]/40 group">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider truncate">
          {title}
        </span>
        {hintText && (
          <span 
            className="text-white/30 group-hover:text-[#E8C5A8] transition-colors cursor-help shrink-0 p-1 -m-1" 
            title={hintText}
            aria-label={hintText}
            role="note"
          >
            <HelpCircle size={12} />
          </span>
        )}
      </div>

      <div className="my-0.5">
        {children}
      </div>

      {hintText && (
        <div className="pt-2 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-white/60 leading-relaxed">
          <Info size={11} className="text-[#E8C5A8] shrink-0 mt-0.5" />
          <span className="line-clamp-2" title={hintText}>
            {hintText}
          </span>
        </div>
      )}
    </div>
  );
}

export default function FocusedDecisionCard({ 
  simulationResult, 
  accounts = [], 
  onCommit, 
  onDiscard, 
  onSave,
  onModifyScenario,
  onAdjustScenario,
  money 
}) {
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [showFullBreakdown, setShowFullBreakdown] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [activeHintCard, setActiveHintCard] = useState(null);

  // Close score modal on Escape key
  useEffect(() => {
    if (!showScoreModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowScoreModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showScoreModal]);

  if (!simulationResult) return null;

  const { before = {}, after = {}, decision = {}, actions = [] } = simulationResult;
  const primaryAction = actions[0] || {};
  const p = primaryAction.payload || {};
  const isMultiAction = actions.length > 1;
  const isInstallment = primaryAction.type === 'installment';
  const isPurchase = primaryAction.type === 'purchase';

  const targetAccId = p.accountId || p.linkedAccountId;
  const accBefore = (before.accounts || []).find(a => a._id?.toString() === targetAccId?.toString());
  const accAfter = (after.accounts || []).find(a => a._id?.toString() === targetAccId?.toString());
  const matchedAcc = (accounts || []).find(a => a._id?.toString() === targetAccId?.toString());
  const accountName = matchedAcc?.name || accBefore?.name || accAfter?.name || (lang === 'ar' ? 'الحساب المحدد' : 'Selected Account');

  // Key Balance & Buffer calculations
  const cashBefore = before.cashRemaining || 0;
  const cashAfter = after.cashRemaining || 0;
  const cashDiff = cashAfter - cashBefore;

  const rawShieldBefore = decision.emergencyCoverageMonthsBefore !== undefined ? decision.emergencyCoverageMonthsBefore : (before.emergencyCoverageMonths || 0);
  const rawShieldAfter = decision.emergencyCoverageMonthsAfter !== undefined ? decision.emergencyCoverageMonthsAfter : (decision.emergencyCoverageMonths || after.emergencyCoverageMonths || 0);
  const shieldBefore = Math.max(0, rawShieldBefore);
  const shieldAfter = Math.max(0, rawShieldAfter);

  const unpaidBills = after.unpaidBillsTotal || 0;
  const billsSafe = after.cashRemaining >= 0;

  // Monthly burden changes
  const instBurdenBefore = before.monthlyInstallmentBurden || 0;
  const instBurdenAfter = after.monthlyInstallmentBurden || 0;
  const newMonthlyBurden = isInstallment 
    ? (Number(p.monthlyAmount) || Math.round((Number(p.totalAmount) - Number(p.downPayment || 0)) / Math.max(1, Number(p.totalMonths) || 12)))
    : (instBurdenAfter - instBurdenBefore);

  // Verdict Theme Styles
  const verdictStatus = decision.verdict?.status || (decision.risk === 'Critical' ? 'critical' : (decision.risk === 'High' ? 'caution' : 'safe'));
  
  const statusStyles = {
    safe: {
      border: 'border-emerald-500/30',
      glow: 'rgba(52, 199, 89, 0.12)',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      badgeTextAr: 'آمن وموصى به ✓',
      badgeTextEn: 'Safe & Recommended ✓'
    },
    caution: {
      border: 'border-amber-500/30',
      glow: 'rgba(245, 158, 11, 0.12)',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      badgeTextAr: 'قابل للتطبيق بحذر !',
      badgeTextEn: 'Viable with Caution !'
    },
    critical: {
      border: 'border-rose-500/35',
      glow: 'rgba(255, 59, 48, 0.12)',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      badgeTextAr: 'خطر مالي حرج ⚠️',
      badgeTextEn: 'Critical Risk ⚠️'
    }
  };

  const style = statusStyles[verdictStatus] || statusStyles.safe;
  const VerdictIcon = style.icon;

  // Title of the Scenario
  let scenarioTitle = '';
  if (isInstallment) {
    const tot = Number(p.totalAmount) || 0;
    const mos = Number(p.totalMonths) || 12;
    const title = p.title || (lang === 'ar' ? 'شراء بالتقسيط' : 'Installment Purchase');
    scenarioTitle = lang === 'ar'
      ? `${title} بقيمة ${money(tot)} عبر ${mos} شهر`
      : `${title} for ${money(tot)} over ${mos} months`;
  } else if (isPurchase) {
    const amt = Number(p.amount) || Math.abs(cashDiff);
    const title = p.notes || (lang === 'ar' ? 'شراء كاش' : 'Cash Purchase');
    scenarioTitle = lang === 'ar'
      ? `${title} بقيمة ${money(amt)} (كاش فوري)`
      : `${title} for ${money(amt)} (Cash)`;
  } else if (primaryAction.type === 'salary') {
    const amt = Number(p.newAmount || p.amount) || 0;
    scenarioTitle = lang === 'ar'
      ? `تعديل الدخل الشهري إلى ${money(amt)}`
      : `Monthly Income Adjustment to ${money(amt)}`;
  } else if (primaryAction.type === 'debt') {
    const amt = Number(p.amount) || 0;
    const isBorrow = p.action === 'borrow' || p.action === 'take';
    scenarioTitle = lang === 'ar'
      ? (isBorrow ? `اقتراض سلفة بقيمة ${money(amt)}` : `سداد مديونية بقيمة ${money(amt)}`)
      : (isBorrow ? `New Loan / Borrow ${money(amt)}` : `Debt Payoff of ${money(amt)}`);
  } else if (primaryAction.type === 'investment') {
    const amt = Number(p.amount) || 0;
    const isBuy = p.action === 'buy';
    scenarioTitle = lang === 'ar'
      ? (isBuy ? `شراء أصل استثماري بقيمة ${money(amt)}` : `تسييل استثمار بقيمة ${money(amt)}`)
      : (isBuy ? `Investment Asset Purchase ${money(amt)}` : `Liquidating Investment ${money(amt)}`);
  } else if (primaryAction.type === 'recurring') {
    const amt = Number(p.amount) || 0;
    const isDisable = p.action === 'disable';
    scenarioTitle = lang === 'ar'
      ? (isDisable ? `إيقاف معاملة دورية بقيمة ${money(amt)}/شهر` : `تعديل معاملة دورية بقيمة ${money(amt)}/شهر`)
      : (isDisable ? `Cancelling recurring expense ${money(amt)}/mo` : `Recurring expense ${money(amt)}/mo`);
  } else if (primaryAction.type === 'bill') {
    const amt = Number(p.amount) || 0;
    scenarioTitle = lang === 'ar'
      ? `سداد فاتورة بقيمة ${money(amt)}`
      : `Bill Payment of ${money(amt)}`;
  } else if (primaryAction.type === 'budget') {
    const amt = Number(p.amount) || 0;
    scenarioTitle = lang === 'ar'
      ? `ضبط سقف الميزانية عند ${money(amt)}/شهر`
      : `Budget Cap Adjustment to ${money(amt)}/mo`;
  } else if (isMultiAction) {
    scenarioTitle = lang === 'ar'
      ? `سيناريو مركب (${actions.length} خطوات)`
      : `Combined Scenario (${actions.length} actions)`;
  } else {
    scenarioTitle = t(`sandbox.${primaryAction.type}`) || primaryAction.type;
  }

  // Why It Matters explanation
  const whyItMattersText = lang === 'ar'
    ? (decision.whyItMattersAr || decision.verdict?.reasonAr)
    : (decision.whyItMattersEn || decision.verdict?.reasonEn);

  const tradeoff = decision.comparativeTradeoff;

  // Quick Action Alternative Handlers
  const handleQuickAlternative = (type, params = {}) => {
    if (!onAdjustScenario) return;
    if (type === 'to_installment') {
      const tot = Number(p.amount) || 30000;
      const mos = 12;
      const mon = Math.round(tot / mos);
      onAdjustScenario([{
        type: 'installment',
        payload: {
          title: p.notes || (lang === 'ar' ? 'شراء بالتقسيط' : 'Installment Purchase'),
          totalAmount: tot,
          downPayment: 0,
          totalMonths: mos,
          monthlyAmount: mon,
          dueDayOfMonth: 15,
          linkedAccountId: targetAccId
        }
      }]);
    } else if (type === 'to_cash') {
      const tot = Number(p.totalAmount) || 30000;
      onAdjustScenario([{
        type: 'purchase',
        payload: {
          notes: p.title || (lang === 'ar' ? 'شراء كاش' : 'Cash Purchase'),
          amount: tot,
          accountId: targetAccId
        }
      }]);
    } else if (type === 'months') {
      const newMonths = params.months || 6;
      const tot = Number(p.totalAmount) || 0;
      const down = Number(p.downPayment) || 0;
      const newMonthly = Math.round(Math.max(0, tot - down) / newMonths);
      onAdjustScenario([{
        ...primaryAction,
        payload: {
          ...p,
          totalMonths: newMonths,
          monthlyAmount: newMonthly
        }
      }]);
    } else if (type === 'down_payment') {
      const tot = Number(p.totalAmount) || 0;
      const down = Math.round(tot * 0.2); // 20% down payment
      const mos = Number(p.totalMonths) || 12;
      const newMonthly = Math.round(Math.max(0, tot - down) / mos);
      onAdjustScenario([{
        ...primaryAction,
        payload: {
          ...p,
          downPayment: down,
          monthlyAmount: newMonthly
        }
      }]);
    } else if (type === 'amount_scale') {
      const factor = params.factor || 0.75;
      if (isInstallment) {
        const newTot = Math.round((Number(p.totalAmount) || 0) * factor);
        const down = Number(p.downPayment) || 0;
        const mos = Number(p.totalMonths) || 12;
        const newMonthly = Math.round(Math.max(0, newTot - down) / mos);
        onAdjustScenario([{
          ...primaryAction,
          payload: {
            ...p,
            totalAmount: newTot,
            monthlyAmount: newMonthly
          }
        }]);
      } else {
        const newAmt = Math.round((Number(p.amount) || 0) * factor);
        onAdjustScenario([{
          ...primaryAction,
          payload: {
            ...p,
            amount: newAmt
          }
        }]);
      }
    } else if (type === 'invest_surplus') {
      const surplus = Math.max(500, Math.round((decision.scenarioDetails?.surplusDelta || 2000) * 0.5));
      onAdjustScenario([
        primaryAction,
        {
          type: 'investment',
          payload: {
            action: 'buy',
            amount: surplus,
            accountId: targetAccId
          }
        }
      ]);
    } else if (type === 'accelerate_debt') {
      const surplus = Math.max(500, Math.round((decision.scenarioDetails?.surplusDelta || 2000) * 0.5));
      onAdjustScenario([
        primaryAction,
        {
          type: 'debt',
          payload: {
            action: 'repay',
            amount: surplus,
            accountId: targetAccId
          }
        }
      ]);
    } else if (type === 'borrow_half' || type === 'repay_half' || type === 'invest_half' || type === 'reduce_half') {
      const halfAmt = Math.round((Number(p.amount) || 0) * 0.5);
      onAdjustScenario([{
        ...primaryAction,
        payload: {
          ...p,
          amount: halfAmt
        }
      }]);
    } else if (type === 'cut_more_10') {
      const newCap = Math.round((Number(p.amount) || 0) * 0.9);
      onAdjustScenario([{
        ...primaryAction,
        payload: {
          ...p,
          amount: newCap
        }
      }]);
    } else if (type === 'cut_more_25') {
      const newCap = Math.round((Number(p.amount) || 0) * 0.75);
      onAdjustScenario([{
        ...primaryAction,
        payload: {
          ...p,
          amount: newCap
        }
      }]);
    }
  };

  // Tailored 3 Metric Cards for Each Scenario with Bilingual Calculation Hints
  const hints = decision.metricHints || {};

  const renderTailoredImpactCards = () => {
    const sc = decision.scenarioDetails || {};

    if (primaryAction.type === 'salary') {
      const netSavings = sc.monthlyNetSavings ?? after.currentSavings ?? 0;
      const surplusDelta = sc.surplusDelta ?? 0;
      const growthPct = sc.growthPct ?? 100;
      return (
        <>
          <MetricCardWrapper
            title={t('sandbox.metrics.netMonthlySurplus')}
            cardKey="card1"
            hint={hints.card1}
          >
            <p className="text-base sm:text-lg font-black text-white tabular-nums">
              {money(netSavings)}
            </p>
            <p className="text-[10px] text-emerald-400 mt-0.5 tabular-nums font-bold">
              {surplusDelta >= 0 ? `+${money(surplusDelta)}` : money(surplusDelta)} / {lang === 'ar' ? 'شهر' : 'mo'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.savingsVelocity')}
            cardKey="card2"
            hint={hints.card2}
          >
            <p className="text-base sm:text-lg font-black text-[#E8C5A8] tabular-nums">
              {growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">
              {t('sandbox.metrics.accelerateGoals')}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.shieldCoverage')}
            cardKey="card3"
            hint={hints.card3}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/50 line-through tabular-nums">
                {shieldBefore} {lang === 'ar' ? 'شهر' : 'mo'}
              </span>
              <ArrowRight size={12} className="text-[#E8C5A8] rtl:rotate-180 shrink-0" />
              <span className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
                {shieldAfter} {lang === 'ar' ? 'شهر' : 'mo'}
              </span>
            </div>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">
              {t('sandbox.shieldProtected')}
            </p>
          </MetricCardWrapper>
        </>
      );
    }

    if (primaryAction.type === 'debt') {
      const isBorrow = sc.isBorrow ?? (p.action === 'borrow' || p.action === 'take');
      const debtAmount = sc.amount ?? Number(p.amount) ?? 0;
      const totalDebtAfter = sc.totalDebtAfter ?? after.totalDebtRemaining ?? 0;
      const dti = sc.dti ?? after.dtiRatio ?? 0;
      return (
        <>
          <MetricCardWrapper
            title={isBorrow ? t('sandbox.metrics.borrowedAmount') : t('sandbox.metrics.repaidAmount')}
            cardKey="card1"
            hint={hints.card1}
          >
            <p className={`text-base sm:text-lg font-black tabular-nums ${isBorrow ? 'text-white' : 'text-emerald-400'}`}>
              {isBorrow ? `+${money(debtAmount)}` : `-${money(debtAmount)}`}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {isBorrow ? (lang === 'ar' ? 'سيولة نقدية مضافة' : 'Added cash') : (lang === 'ar' ? 'سيولة مسددة' : 'Paid cash')}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.totalDebtRemaining')}
            cardKey="card2"
            hint={hints.card2}
          >
            <p className="text-base sm:text-lg font-black text-[#E8C5A8] tabular-nums">
              {money(totalDebtAfter)}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 truncate">
              {lang === 'ar' ? 'إجمالي الالتزامات بعد الإجراء' : 'Total obligations after'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.debtBurdenDTI')}
            cardKey="card3"
            hint={hints.card3}
          >
            <p className={`text-base sm:text-lg font-black tabular-nums ${dti > 40 ? 'text-rose-400' : (dti > 25 ? 'text-amber-400' : 'text-emerald-400')}`}>
              {dti}%
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium">
              {dti > 40 ? t('sandbox.criticalRatio') : (dti > 25 ? t('sandbox.cautionRatio') : t('sandbox.healthyRatio'))}
            </p>
          </MetricCardWrapper>
        </>
      );
    }

    if (primaryAction.type === 'investment') {
      const isBuy = sc.isBuy ?? (p.action === 'buy');
      const invAmount = sc.amount ?? Number(p.amount) ?? 0;
      const portVal = sc.portVal ?? after.totalInvestments ?? 0;
      return (
        <>
          <MetricCardWrapper
            title={isBuy ? t('sandbox.metrics.liquidCashDrain') : (lang === 'ar' ? 'السيولة المستردة' : 'Liquidated Cash')}
            cardKey="card1"
            hint={hints.card1}
          >
            <p className="text-base sm:text-lg font-black text-white tabular-nums">
              {isBuy ? `-${money(invAmount)}` : `+${money(invAmount)}`}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 tabular-nums">
              {money(cashAfter)} {lang === 'ar' ? 'كاش متبقٍ' : 'cash left'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.portfolioAssets')}
            cardKey="card2"
            hint={hints.card2}
          >
            <p className="text-base sm:text-lg font-black text-[#E8C5A8] tabular-nums">
              {money(portVal)}
            </p>
            <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">
              {isBuy ? (lang === 'ar' ? 'تحويل كاش إلى أصول' : 'Converted to assets') : (lang === 'ar' ? 'تسييل إلى كاش' : 'Liquidated to cash')}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.shieldCoverage')}
            cardKey="card3"
            hint={hints.card3}
          >
            <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
              {shieldAfter} {lang === 'ar' ? 'شهر' : 'mo'}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">
              {t('sandbox.metrics.wealthPreserved100')}
            </p>
          </MetricCardWrapper>
        </>
      );
    }

    if (primaryAction.type === 'recurring') {
      const isDisable = sc.isDisable ?? (p.action === 'disable');
      const monthlyAmt = sc.monthlyAmount ?? Number(p.amount) ?? 0;
      const annualImpact = sc.annualImpact ?? (monthlyAmt * 12);
      return (
        <>
          <MetricCardWrapper
            title={isDisable ? (lang === 'ar' ? 'التوفير الشهري' : 'Monthly Savings') : (lang === 'ar' ? 'العبء الشهري الإضافي' : 'Monthly Cost')}
            cardKey="card1"
            hint={hints.card1}
          >
            <p className={`text-base sm:text-lg font-black tabular-nums ${isDisable ? 'text-emerald-400' : 'text-white'}`}>
              {isDisable ? `+${money(monthlyAmt)}` : `-${money(monthlyAmt)}`}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {lang === 'ar' ? 'تأثير مباشر على التدفق' : 'Direct cash flow impact'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.annualSubscriptionImpact')}
            cardKey="card2"
            hint={hints.card2}
          >
            <p className={`text-base sm:text-lg font-black tabular-nums ${isDisable ? 'text-emerald-400' : 'text-[#E8C5A8]'}`}>
              {isDisable ? `+${money(annualImpact)}` : `-${money(annualImpact)}`}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 truncate">
              {lang === 'ar' ? 'الأثر التراكمي (12 شهراً)' : '12-Month Cumulative'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.shieldCoverage')}
            cardKey="card3"
            hint={hints.card3}
          >
            <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
              {shieldAfter} {lang === 'ar' ? 'شهر' : 'mo'}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">
              {decision.emergencyFloorBreached ? t('sandbox.breachShort') : t('sandbox.shieldProtected')}
            </p>
          </MetricCardWrapper>
        </>
      );
    }

    if (primaryAction.type === 'bill') {
      const billAmt = sc.amount ?? Number(p.amount) ?? Math.abs(cashDiff);
      return (
        <>
          <MetricCardWrapper
            title={lang === 'ar' ? 'قيمة الفاتورة المسددة' : 'Bill Amount Paid'}
            cardKey="card1"
            hint={hints.card1}
          >
            <p className="text-base sm:text-lg font-black text-white tabular-nums">
              {money(billAmt)}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {lang === 'ar' ? 'يُخصم فوراً من الحساب' : 'Debited upfront'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.cashUntilPayday')}
            cardKey="card2"
            hint={hints.card2}
          >
            <p className={`text-base sm:text-lg font-black tabular-nums ${cashAfter < 0 ? 'text-rose-400' : 'text-white'}`}>
              {money(cashAfter)}
            </p>
            <p className={`text-[10px] font-bold mt-0.5 ${billsSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
              {billsSafe ? t('sandbox.billsCoveredSafe') : t('sandbox.billsTight')}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={lang === 'ar' ? 'باقي الفواتير المجدولة' : 'Upcoming Bills'}
            cardKey="card3"
            hint={hints.card3}
          >
            <p className="text-base sm:text-lg font-black text-[#E8C5A8] tabular-nums">
              {money(unpaidBills)}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 truncate">
              {unpaidBills > 0 ? (lang === 'ar' ? 'مطلوبة هذا الشهر' : 'due this month') : (lang === 'ar' ? 'جميع الفواتير مغطاة' : 'all caught up')}
            </p>
          </MetricCardWrapper>
        </>
      );
    }

    if (primaryAction.type === 'budget') {
      const budgetCap = Number(p.amount) || 0;
      const sixMonthSurplus = sc.sixMonthSurplus ?? (budgetCap * 6);
      return (
        <>
          <MetricCardWrapper
            title={t('sandbox.metrics.monthlySpendingCap')}
            cardKey="card1"
            hint={hints.card1}
          >
            <p className="text-base sm:text-lg font-black text-white tabular-nums">
              {money(budgetCap)}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5">
              {lang === 'ar' ? 'سقف المصروفات المحدث' : 'Revised monthly limit'}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.metrics.sixMonthCompoundSurplus')}
            cardKey="card2"
            hint={hints.card2}
          >
            <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
              +{money(sixMonthSurplus)}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 truncate">
              {t('sandbox.metrics.accelerateGoals')}
            </p>
          </MetricCardWrapper>

          <MetricCardWrapper
            title={t('sandbox.shieldCoverage')}
            cardKey="card3"
            hint={hints.card3}
          >
            <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
              {shieldAfter} {lang === 'ar' ? 'شهر' : 'mo'}
            </p>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">
              {decision.emergencyFloorBreached ? t('sandbox.breachShort') : t('sandbox.shieldProtected')}
            </p>
          </MetricCardWrapper>
        </>
      );
    }

    // Default: Purchase / Installment / Pipeline
    return (
      <>
        {/* Card 1: Immediate Cash / Account Balance */}
        <MetricCardWrapper
          title={isInstallment 
            ? (lang === 'ar' ? 'الخصم الفوري (المقدم)' : 'Immediate Down Payment') 
            : (lang === 'ar' ? 'السيولة المتبقية' : 'Available Cash')}
          cardKey="card1"
          hint={hints.card1}
        >
          {isInstallment ? (
            <div>
              <p className="text-base sm:text-lg font-black text-white tabular-nums">
                {money(p.downPayment || 0)}
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">
                {Number(p.downPayment) > 0 ? (lang === 'ar' ? 'يُخصم فوراً عند التنفيذ' : 'Debited upfront') : (lang === 'ar' ? 'بدون مقدم فوري' : 'Zero down payment')}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/50 line-through tabular-nums">
                  {money(cashBefore)}
                </span>
                <ArrowRight size={12} className="text-[#E8C5A8] rtl:rotate-180 shrink-0" />
                <span className={`text-base sm:text-lg font-black tabular-nums ${
                  cashAfter < 0 ? 'text-rose-400' : 'text-white'
                }`}>
                  {money(cashAfter)}
                </span>
              </div>
              <p className="text-[10px] text-white/50 mt-0.5 tabular-nums">
                {cashDiff < 0 ? `-${money(Math.abs(cashDiff))}` : `+${money(cashDiff)}`}
              </p>
            </div>
          )}
        </MetricCardWrapper>

        {/* Card 2: Emergency Buffer Runway */}
        <MetricCardWrapper
          title={t('sandbox.shieldCoverage')}
          cardKey="card2"
          hint={hints.card2}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/50 line-through tabular-nums">
                {shieldBefore} {lang === 'ar' ? 'شهر' : 'mo'}
              </span>
              <ArrowRight size={12} className="text-[#E8C5A8] rtl:rotate-180 shrink-0" />
              <span className={`text-base sm:text-lg font-black tabular-nums ${
                decision.emergencyFloorBreached ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {shieldAfter} {lang === 'ar' ? 'شهر' : 'mo'}
              </span>
            </div>
            <p className="text-[10px] text-white/50 mt-0.5 font-medium truncate">
              {decision.emergencyFloorBreached
                ? (lang === 'ar' ? 'تحت سقف الأمان' : 'Below safety floor')
                : (lang === 'ar' ? 'درع الأمان محمي' : 'Buffer protected')}
            </p>
          </div>
        </MetricCardWrapper>

        {/* Card 3: Monthly Commitment / Bills */}
        <MetricCardWrapper
          title={isInstallment 
            ? (lang === 'ar' ? 'القسط الشهري الجديد' : 'New Monthly Payment') 
            : (lang === 'ar' ? 'الفواتير القادمة' : 'Upcoming Bills')}
          cardKey="card3"
          hint={hints.card3}
        >
          {isInstallment ? (
            <div>
              <p className="text-base sm:text-lg font-black text-[#E8C5A8] tabular-nums">
                {money(newMonthlyBurden)} <span className="text-[10px] font-normal text-white/60">/ {lang === 'ar' ? 'شهر' : 'mo'}</span>
              </p>
              <p className="text-[10px] text-white/50 mt-0.5">
                {p.totalMonths || 12} {t('sandbox.months')}
              </p>
            </div>
          ) : (
            <div>
              <p className={`text-sm sm:text-base font-extrabold ${billsSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                {billsSafe ? t('sandbox.billsCoveredSafe') : t('sandbox.billsTight')}
              </p>
              <p className="text-[10px] text-white/50 mt-0.5 truncate">
                {unpaidBills > 0 ? `${money(unpaidBills)} ${lang === 'ar' ? 'فواتير مجدولة' : 'scheduled'}` : (lang === 'ar' ? 'بدون فواتير متأخرة' : 'Zero overdue bills')}
              </p>
            </div>
          )}
        </MetricCardWrapper>
      </>
    );
  };

  const hasTradeoff = (isPurchase || isInstallment) && Boolean(tradeoff);

  return (
    <div className="w-full space-y-6">
      {/* 1. MASTER DECISION CARD: Unified Hero Surface */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full rounded-[30px] p-6 sm:p-7 bg-[#2B2321]/40 backdrop-blur-[32px] border ${style.border} relative overflow-hidden space-y-5`}
        style={{ boxShadow: `0 12px 40px ${style.glow}, inset 0 1px 2px rgba(255,255,255,0.12)` }}
      >
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-20 start-1/2 -translate-x-1/2 w-80 h-32 blur-[90px] pointer-events-none opacity-25 rounded-full"
          style={{ backgroundColor: verdictStatus === 'safe' ? '#34C759' : (verdictStatus === 'caution' ? '#F59E0B' : '#FF3B30') }}
        />

        {/* Top Meta: Verdict Badge, Resilience Score, Scenario Meta, Save Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border ${style.badge}`}>
              {lang === 'ar' ? style.badgeTextAr : style.badgeTextEn}
            </span>

            {decision.score !== undefined && (
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setShowScoreModal(true)}
                  aria-haspopup="dialog"
                  aria-expanded={showScoreModal}
                  title={t('sandbox.scoreBreakdownTitle')}
                  aria-label={t('sandbox.scoreBreakdownTitle')}
                  className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 hover:text-white transition-all tabular-nums flex items-center gap-1.5 cursor-pointer active:scale-95 group shadow-sm"
                >
                  <span className="text-white/60 text-[10px] font-normal">{t('sandbox.scoreLabel')}:</span>
                  <span className="tabular-nums font-black">{decision.score}/100</span>
                  <HelpCircle size={12} className="text-[#E8C5A8] group-hover:text-white transition-colors" />
                </button>
                <span className="text-[11px] text-white/45 hidden sm:inline truncate max-w-[280px]" title={t('sandbox.scoreBasedOnSummary')}>
                  {t('sandbox.scoreBasedOnSummary')}
                </span>
              </div>
            )}

            {isInstallment && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white/60 bg-white/5 border border-white/10">
                {p.totalMonths || 12} {t('sandbox.months')}
              </span>
            )}
          </div>

          {onSave && (
            <button
              onClick={onSave}
              title={t('sandbox.saveScenario')}
              aria-label={t('sandbox.saveScenario')}
              className="min-h-[44px] sm:min-h-[32px] px-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-xs font-medium cursor-pointer active:scale-95"
            >
              <Bookmark size={13} />
              <span>{t('sandbox.saveScenario')}</span>
            </button>
          )}
        </div>

        {/* Scenario Title & Editorial Narrative */}
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {scenarioTitle}
          </h1>
          {whyItMattersText && (
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-2xl">
              {whyItMattersText}
            </p>
          )}
        </div>

        {/* 3 Metric Pills embedded directly inside the Master Card */}
        <SandboxHintContext.Provider value={{
          hints,
          howCalculatedText: t('sandbox.howCalculated'),
          basisLabelText: t('sandbox.basisLabel'),
          lang,
          shouldReduceMotion
        }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 relative z-10">
            {renderTailoredImpactCards()}
          </div>
        </SandboxHintContext.Provider>
      </motion.div>

      {/* 3. RISKS & WARNINGS: Clean inline notices (only if issues exist) */}
      {decision.overdrawnAccounts && decision.overdrawnAccounts.length > 0 && (
        <div className="w-full p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs sm:text-sm text-rose-200">
          <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">
              {t('sandbox.accountOverdraftTitle')}
            </span>
            <p>
              {decision.overdrawnAccounts.map(a => `${a.name}: ${money(a.deficit)}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {decision.emergencyFloorBreached && cashDiff < 0 && (!decision.overdrawnAccounts || decision.overdrawnAccounts.length === 0) && (
        <div className="w-full p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs sm:text-sm text-amber-200">
          <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">
              {t('sandbox.breachShort')}
            </span>
            <p>
              {t('sandbox.breachNotice', { percent: decision.floorBreachPercent || 0 })}
            </p>
          </div>
        </div>
      )}

      {/* 4. CASH VS. INSTALLMENTS TRADE-OFF: Clean 2-column comparative layout */}
      {hasTradeoff && (
        <div className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <ArrowRightLeft size={14} className="text-[#E8C5A8]" />
              {t('sandbox.tradeoffTitle')}
            </span>

            {onAdjustScenario && (
              <button
                type="button"
                onClick={() => handleQuickAlternative(tradeoff.simulatedMode === 'cash' ? 'to_installment' : 'to_cash')}
                className="min-h-[44px] sm:min-h-[36px] px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {tradeoff.simulatedMode === 'cash' ? (
                  <>
                    <CreditCard size={13} className="text-[#E8C5A8]" />
                    <span>{t('sandbox.tryInstallmentOption')}</span>
                  </>
                ) : (
                  <>
                    <DollarSign size={13} className="text-[#E8C5A8]" />
                    <span>{t('sandbox.tryCashOption')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Option A: Cash */}
            <div className={`p-4 rounded-xl ${tradeoff.simulatedMode === 'cash' ? 'bg-[#8D6346]/15 border border-[#8D6346]/35' : 'bg-black/20'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-xs">{t('sandbox.payMethodCash')}</span>
                {tradeoff.simulatedMode === 'cash' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8D6346] text-white font-bold">
                    {lang === 'ar' ? 'المحاكى حالياً' : 'Current'}
                  </span>
                )}
              </div>
              <div className="space-y-2.5 text-[11px]">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.immediateCashOutflow')}:</span>
                    <span className="font-bold text-white tabular-nums">{money(tradeoff.cash.immediateCash)}</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffCashImmediateHint')}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.monthlyBurdenCommitment')}:</span>
                    <span className="font-bold text-white/70">{t('sandbox.zeroMonthlyBurden')}</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffCashMonthlyHint')}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.emergencyBufferAfter')}:</span>
                    <span className={`font-bold tabular-nums ${getBufferColor(tradeoff.cash.emergencyMonths)}`}>
                      {tradeoff.cash.emergencyMonths} {lang === 'ar' ? 'شهر' : 'mo'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffCashBufferHint')}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.billsSafetyStatus')}:</span>
                    <span className={`font-bold ${tradeoff.cash.billsCovered ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tradeoff.cash.billsCovered ? t('sandbox.billsCoveredSafe') : t('sandbox.billsTight')}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffCashBillsHint')}</p>
                </div>
              </div>
            </div>

            {/* Option B: Installments */}
            <div className={`p-4 rounded-xl ${tradeoff.simulatedMode === 'installment' ? 'bg-[#8D6346]/15 border border-[#8D6346]/35' : 'bg-black/20'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-xs">{t('sandbox.payMethodInstallment')}</span>
                {tradeoff.simulatedMode === 'installment' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8D6346] text-white font-bold">
                    {lang === 'ar' ? 'المحاكى حالياً' : 'Current'}
                  </span>
                )}
              </div>
              <div className="space-y-2.5 text-[11px]">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.immediateCashOutflow')}:</span>
                    <span className="font-bold text-white tabular-nums">{money(tradeoff.installment.immediateCash)}</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffInstImmediateHint')}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.monthlyBurdenCommitment')}:</span>
                    <span className="font-bold text-[#E8C5A8] tabular-nums">+{money(tradeoff.installment.monthlyCommitment)} / {lang === 'ar' ? 'شهر' : 'mo'}</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffInstMonthlyHint')}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.emergencyBufferAfter')}:</span>
                    <span className={`font-bold tabular-nums ${getBufferColor(tradeoff.installment.emergencyMonths)}`}>
                      {tradeoff.installment.emergencyMonths} {lang === 'ar' ? 'شهر' : 'mo'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffInstBufferHint')}</p>
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-white/70">
                    <span>{t('sandbox.billsSafetyStatus')}:</span>
                    <span className={`font-bold ${tradeoff.installment.billsCovered ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tradeoff.installment.billsCovered ? t('sandbox.billsCoveredSafe') : t('sandbox.billsTight')}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-snug">{t('sandbox.tradeoffInstBillsHint')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. EXPLORE ALTERNATIVES: Floating pill chips (Unboxed, natural flow) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-[#E8C5A8]" />
            {t('sandbox.exploreAlternatives')}
          </span>

          {onModifyScenario && (
            <button
              type="button"
              onClick={onModifyScenario}
              className="min-h-[44px] px-3 -me-3 text-xs text-[#E8C5A8] hover:text-white transition-colors cursor-pointer font-medium flex items-center"
            >
              {t('sandbox.modifyScenario')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dynamic Suggestions from Decision Evaluator */}
          {decision.suggestedAlternatives && decision.suggestedAlternatives.map(alt => (
            <button
              key={alt.id}
              type="button"
              onClick={() => handleQuickAlternative(alt.id, alt.params)}
              className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-[#8D6346]/25 border border-white/10 hover:border-[#8D6346]/40 text-white/90 hover:text-white text-xs font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles size={13} className="text-[#E8C5A8] shrink-0" />
              <span>{t(alt.labelKey) || (lang === 'ar' ? alt.labelAr : alt.labelEn)}</span>
            </button>
          ))}

          {isPurchase && (
            <button
              type="button"
              onClick={() => handleQuickAlternative('to_installment')}
              className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-[#8D6346]/25 border border-white/10 hover:border-[#8D6346]/40 text-white/90 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <CreditCard size={13} className="text-[#E8C5A8] shrink-0" />
              <span>{t('sandbox.tryInstallmentOption')}</span>
            </button>
          )}

          {isInstallment && (
            <>
              <button
                type="button"
                onClick={() => handleQuickAlternative('to_cash')}
                className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-[#8D6346]/25 border border-white/10 hover:border-[#8D6346]/40 text-white/90 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <DollarSign size={13} className="text-[#E8C5A8] shrink-0" />
                <span>{t('sandbox.tryCashOption')}</span>
              </button>

              {(p.totalMonths || 12) !== 6 && (
                <button
                  type="button"
                  onClick={() => handleQuickAlternative('months', { months: 6 })}
                  className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Clock size={13} className="text-[#E8C5A8] shrink-0" />
                  <span>{t('sandbox.tryShorterDuration')}</span>
                  <span className="text-[10px] text-white/40 font-normal hidden sm:inline">({t('sandbox.tryShorterDurationSub')})</span>
                </button>
              )}

              {(p.totalMonths || 12) !== 24 && (
                <button
                  type="button"
                  onClick={() => handleQuickAlternative('months', { months: 24 })}
                  className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Clock size={13} className="text-[#E8C5A8] shrink-0" />
                  <span>{t('sandbox.tryLongerDuration')}</span>
                  <span className="text-[10px] text-white/40 font-normal hidden sm:inline">({t('sandbox.tryLongerDurationSub')})</span>
                </button>
              )}

              {!p.downPayment && (
                <button
                  type="button"
                  onClick={() => handleQuickAlternative('down_payment')}
                  className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Wallet size={13} className="text-[#E8C5A8] shrink-0" />
                  <span>{t('sandbox.tryDownPayment')}</span>
                  <span className="text-[10px] text-[#E8C5A8] font-normal hidden sm:inline">({t('sandbox.tryDownPaymentSub')})</span>
                </button>
              )}
            </>
          )}

          {/* Quick amount scaler (-25%) */}
          {(isPurchase || isInstallment) && (
            <button
              type="button"
              onClick={() => handleQuickAlternative('amount_scale', { factor: 0.75 })}
              className="min-h-[44px] sm:min-h-[38px] px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-2"
            >
              <TrendingDown size={13} className="text-[#E8C5A8] shrink-0" />
              <span>{t('sandbox.tryDifferentAmount', { 
                amount: money(Math.round(((isInstallment ? p.totalAmount : p.amount) || 0) * 0.75)) 
              })}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#8D6346]/30 text-[#E8C5A8] font-bold">
                -25%
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 6. PROGRESSIVE DISCLOSURE: Financial Breakdown */}
      <div className="w-full pt-1">
        <button
          type="button"
          id="btn-financial-breakdown-toggle"
          aria-expanded={showFullBreakdown}
          aria-controls="full-financial-breakdown"
          onClick={() => setShowFullBreakdown(!showFullBreakdown)}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between text-xs text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <span className="font-bold">
            {showFullBreakdown ? t('sandbox.hideFinancialBreakdown') : t('sandbox.fullFinancialBreakdown')}
          </span>
          {showFullBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {showFullBreakdown && (
            <motion.div
              id="full-financial-breakdown"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              className="pt-3 space-y-3 overflow-hidden"
            >
              {/* Detailed Accounts Table */}
              <div className="p-4 rounded-xl bg-black/25 border border-white/5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    {t('sandbox.accountsImpact')}
                  </span>
                  <span className="text-[10px] text-white/40">
                    {t('sandbox.accountsImpactHint')}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {(after.accounts || []).map((acc) => {
                    const beforeAcc = (before.accounts || []).find(a => a._id?.toString() === acc._id?.toString());
                    const bBal = beforeAcc?.balance || 0;
                    const aBal = acc.balance || 0;
                    const diff = aBal - bBal;
                    return (
                      <div key={acc._id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-white/80 font-medium">{acc.name}</span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-white/40">{money(bBal)}</span>
                          <ArrowRight size={10} className="text-[#E8C5A8] rtl:rotate-180" />
                          <span className={`font-bold ${aBal < 0 ? 'text-rose-400' : 'text-white'}`}>
                            {money(aBal)}
                          </span>
                          {diff !== 0 && (
                            <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              ({diff > 0 ? '+' : ''}{money(diff)})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Net Worth & Burn Rate Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-black/25 border border-white/5 space-y-1">
                  <span className="text-white/40 text-[10px] block uppercase font-bold">{t('sandbox.netWorth')}</span>
                  <span className="font-black text-white tabular-nums text-sm sm:text-base block">{money(after.netWorth || 0)}</span>
                  <p className="text-[10px] text-white/45 leading-snug">{t('sandbox.netWorthHint')}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-black/25 border border-white/5 space-y-1">
                  <span className="text-white/40 text-[10px] block uppercase font-bold">{t('emergencyFund.monthlyBurn')}</span>
                  <span className="font-black text-white tabular-nums text-sm sm:text-base block">{money(after.essentialMonthlyBurn || 0)}/mo</span>
                  <p className="text-[10px] text-white/45 leading-snug">{t('sandbox.burnRateHint')}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 7. PRIMARY ACTION BUTTONS: Clean, floating action row */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          id="btn-commit-reality"
          onClick={onCommit}
          className="w-full sm:flex-1 h-12 rounded-full font-black text-sm text-white bg-gradient-to-r from-[#8D6346] via-[#A87954] to-[#8D6346] hover:brightness-110 shadow-[0_4px_20px_rgba(141,99,70,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles size={16} className="text-[#F5E6D8]" />
          <span>{t('sandbox.commitToReality')}</span>
        </motion.button>

        {onModifyScenario && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onModifyScenario}
            className="w-full sm:w-auto h-12 px-6 rounded-full font-bold text-xs text-[#E8C5A8] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sliders size={14} />
            <span>{t('sandbox.modifyScenario')}</span>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onDiscard}
          className="w-full sm:w-auto h-12 px-6 rounded-full font-bold text-xs text-white/60 hover:text-white bg-transparent hover:bg-white/5 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>{t('sandbox.newSimulation')}</span>
        </motion.button>
      </div>

      {/* 9. RESILIENCE SCORE BREAKDOWN MODAL (Rule 8: createPortal to document.body) */}
      {showScoreModal && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowScoreModal(false); }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-breakdown-title"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#1C1819] border border-[#8D6346]/40 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-[0_24px_64px_rgba(0,0,0,0.6)] space-y-4 max-h-[85vh] flex flex-col relative overflow-hidden text-right rtl:text-right ltr:text-left"
          >
            {/* Top ambient glow */}
            <div className="absolute -top-16 start-1/2 -translate-x-1/2 w-48 h-24 bg-[#8D6346] opacity-30 blur-[60px] pointer-events-none rounded-full" />

            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8] shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <h3 id="score-breakdown-title" className="text-base font-black text-white truncate">
                    {t('sandbox.scoreBreakdownTitle')}
                  </h3>
                  <p className="text-[11px] text-white/50 truncate">
                    {t('sandbox.scoreBreakdownDesc')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowScoreModal(false)}
                aria-label={t('sandbox.close')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Score Summary Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-white/50 block font-medium">
                  {t('sandbox.scoreLabel')}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                    {decision.score}
                  </span>
                  <span className="text-xs text-white/40 font-bold">/ 100</span>
                </div>
              </div>

              <div className="text-end">
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${style.badge}`}>
                  {lang === 'ar' ? style.badgeTextAr : style.badgeTextEn}
                </span>
                <span className="text-[10px] text-white/40 block mt-1 tabular-nums">
                  {t('sandbox.startingBase')}: 100
                </span>
              </div>
            </div>

            {/* Formula explanation note */}
            <p className="text-[11px] text-white/70 leading-relaxed bg-[#8D6346]/10 border border-[#8D6346]/25 p-3 rounded-2xl">
              {t('sandbox.scoreFormulaHint')}
            </p>

            {/* Factors List */}
            <div className="space-y-2 overflow-y-auto flex-1 pe-1 custom-scrollbar">
              {(!decision.scoreBreakdown?.factors || decision.scoreBreakdown.factors.length === 0) ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1.5">
                  <ShieldCheck size={24} className="text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-emerald-300">
                    {t('sandbox.noDeductions')}
                  </p>
                </div>
              ) : (
                decision.scoreBreakdown.factors.map((f, i) => {
                  const isPositive = f.type === 'positive';
                  return (
                    <div 
                      key={i}
                      className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block">
                          {lang === 'ar' ? f.titleAr : f.titleEn}
                        </span>
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          {lang === 'ar' ? f.hintAr : f.hintEn}
                        </p>
                      </div>

                      <span className={`text-xs font-black px-2.5 py-1 rounded-xl shrink-0 tabular-nums ${
                        isPositive 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isPositive ? `+${f.points}` : f.points} {t('sandbox.points')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowScoreModal(false)}
              className="w-full min-h-[48px] py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-colors active:scale-[0.98] cursor-pointer"
            >
              {t('sandbox.close')}
            </button>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
