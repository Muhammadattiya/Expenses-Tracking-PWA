import React from 'react';
import { 
  ArrowRight, Wallet, Receipt, TrendingUp, TrendingDown, 
  Layers, ShieldCheck, ShoppingBag, CreditCard, Banknote, 
  PieChart, Calendar, Repeat, Sparkles, CheckCircle2, ListFilter
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const ACTION_ICONS = {
  purchase: ShoppingBag,
  installment: CreditCard,
  salary: Banknote,
  budget: PieChart,
  debt: CreditCard,
  bill: Calendar,
  recurring: Repeat,
  investment: TrendingUp
};

const MetricCard = ({ label, before, after, diff, money, customFormatter = null, invertColors = false }) => {
  const { t } = useLanguage();
  let isPositive = diff > 0;
  if (invertColors) isPositive = !isPositive;
  
  let colorClass = 'text-white/50';
  if (diff !== 0) {
    colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';
  }

  const formatVal = (val) => (customFormatter ? customFormatter(val) : money(val));

  return (
    <div className="rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-5 hover:border-[#8D6346]/40 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <p className="text-xs font-semibold text-white/60 mb-3">{label}</p>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
            {t('sandbox.currentVal')}
          </p>
          <p className="text-base font-bold text-white/80 tabular-nums">{formatVal(before)}</p>
        </div>
        
        <ArrowRight className="w-4 h-4 text-white/30 hidden sm:block rtl:rotate-180 shrink-0" />
        
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
            {t('sandbox.simulatedVal')}
          </p>
          <p className="text-base font-bold text-white tabular-nums">{formatVal(after)}</p>
        </div>
        
        <div className="sm:text-end">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">
            {t('sandbox.diffVal')}
          </p>
          <p className={`text-base font-black tabular-nums ${colorClass}`}>
            {diff > 0 ? '+' : ''}{formatVal(diff)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ResultsView({ before, after, difference, money, actions = [] }) {
  const { t, lang } = useLanguage();

  const formatMonths = (val) => `${val || 0} ${t('sandbox.months')}`;
  const formatPercent = (val) => `${val || 0}%`;

  return (
    <div className="space-y-6">
      {/* 1. Evaluated Actions Summary in this Simulation */}
      {actions && actions.length > 0 && (
        <div className="rounded-[2.5rem] bg-[#2B2321]/25 backdrop-blur-[24px] border border-[#8D6346]/30 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-[#8D6346]/30 text-[#E8C5A8] border border-[#8D6346]/40">
                <ListFilter size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {t('sandbox.simulatedPlan')}
                </h4>
                <p className="text-[11px] text-white/50">
                  {t('sandbox.evaluatedActionsCount', { count: actions.length })}
                </p>
              </div>
            </div>

            <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#8D6346]/20 border border-[#8D6346]/40 text-[#E8C5A8]">
              {actions.length} {t('sandbox.actions')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.map((act, idx) => {
              const Icon = ACTION_ICONS[act.type] || ShoppingBag;
              const p = act.payload || {};
              const title = p.title || p.notes || t(`sandbox.${act.type}`);
              const amountVal = p.amount || p.totalAmount || 0;

              return (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-2xl bg-black/25 border border-white/5 flex items-start gap-3"
                >
                  <div className="p-2 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] shrink-0 mt-0.5">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-[#E8C5A8] uppercase tracking-wider">
                        {t(`sandbox.${act.type}`)}
                      </span>
                      {amountVal > 0 && (
                        <span className="text-xs font-black text-white tabular-nums">
                          {money(amountVal)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-white/90 truncate mt-0.5">
                      {title}
                    </p>
                    {p.totalMonths && (
                      <p className="text-[10px] text-white/50 mt-0.5">
                        {p.totalMonths} {t('sandbox.months')} • {money(p.monthlyAmount)} / {t('sandbox.perMonth')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Key Quantitative Comparison Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white px-1">
          {t('sandbox.comparisonTitle')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Total Liquid Balance */}
          <MetricCard 
            label={t('sandbox.totalBalance')} 
            before={before.currentBalance} 
            after={after.currentBalance} 
            diff={difference.balance} 
            money={money} 
          />

          {/* Emergency Shield Reserve */}
          <MetricCard 
            label={t('sandbox.shieldReserve')} 
            before={before.emergencyReserve || 0} 
            after={after.emergencyReserve || 0} 
            diff={difference.emergencyReserve || 0} 
            money={money} 
          />

          {/* Emergency Coverage Runway */}
          <MetricCard 
            label={t('sandbox.shieldCoverage')} 
            before={before.emergencyCoverageMonths || 0} 
            after={after.emergencyCoverageMonths || 0} 
            diff={difference.emergencyCoverage || 0} 
            money={money} 
            customFormatter={formatMonths}
          />

          {/* Debt-to-Income (DTI) Ratio */}
          <MetricCard 
            label={t('sandbox.dtiRatio')} 
            before={before.dtiRatio || 0} 
            after={after.dtiRatio || 0} 
            diff={difference.dtiRatio || 0} 
            money={money} 
            customFormatter={formatPercent}
            invertColors={true}
          />

          {/* Estimated Monthly Net Savings */}
          <MetricCard 
            label={t('sandbox.monthlySavings')} 
            before={before.currentSavings} 
            after={after.currentSavings} 
            diff={difference.savings} 
            money={money} 
          />
          
          {/* Total Debt & Installments */}
          <MetricCard 
            label={t('sandbox.totalDebt')} 
            before={before.totalDebtRemaining} 
            after={after.totalDebtRemaining} 
            diff={difference.debt} 
            money={money} 
            invertColors={true}
          />

          {/* Essential Monthly Commitments */}
          <MetricCard 
            label={t('sandbox.essentialCommitments')} 
            before={before.essentialMonthlyBurn || 0} 
            after={after.essentialMonthlyBurn || 0} 
            diff={difference.essentialBurn || 0} 
            money={money} 
            invertColors={true}
          />

          {/* Budget Usage */}
          <MetricCard 
            label={t('sandbox.budgetUsage')} 
            before={before.totalBudgetSpent} 
            after={after.totalBudgetSpent} 
            diff={difference.budgetUsage} 
            money={money} 
            invertColors={true}
          />
          
          {/* Cash Remaining */}
          <MetricCard 
            label={t('sandbox.cashRemaining')} 
            before={before.cashRemaining} 
            after={after.cashRemaining} 
            diff={difference.cashRemaining} 
            money={money} 
          />
          
          {/* Net Worth */}
          <MetricCard 
            label={t('sandbox.netWorth')} 
            before={before.netWorth} 
            after={after.netWorth} 
            diff={difference.netWorth} 
            money={money} 
          />
        </div>
      </div>

      {/* 3. Accounts Breakdown */}
      {before.accounts && before.accounts.length > 0 && (
        <div className="pt-2">
          <h4 className="text-sm font-bold text-white px-1 mb-3">
            {t('sandbox.accountsImpact')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {before.accounts.map(bAcc => {
              const aAcc = after.accounts?.find(a => a._id === bAcc._id);
              const diff = (aAcc?.balance || 0) - bAcc.balance;
              const isAffected = diff !== 0;
              return (
                <div 
                  key={bAcc._id} 
                  className={`rounded-2xl p-3.5 backdrop-blur-[20px] border transition-colors ${
                    isAffected 
                      ? 'bg-[#8D6346]/15 border-[#8D6346]/40 shadow-sm' 
                      : 'bg-black/20 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet size={16} className={isAffected ? 'text-[#E8C5A8]' : 'text-white/40'} />
                    <p className="font-bold text-xs text-white truncate">{bAcc.name}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50 tabular-nums">{money(bAcc.balance)}</span>
                    <ArrowRight size={13} className="text-white/30 rtl:rotate-180" />
                    <span className={`font-bold tabular-nums ${isAffected ? 'text-white' : 'text-white/50'}`}>
                      {money(aAcc?.balance || 0)}
                    </span>
                  </div>
                  {isAffected && (
                    <p className={`text-[11px] mt-1.5 font-black text-end tabular-nums ${diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {diff > 0 ? '+' : ''}{money(diff)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
