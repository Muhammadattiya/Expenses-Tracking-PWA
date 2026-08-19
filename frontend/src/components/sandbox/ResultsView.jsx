import React from 'react';
import { ArrowRight, Wallet, Receipt } from 'lucide-react';

const MetricCard = ({ label, before, after, diff, money, invertColors = false }) => {
  let isPositive = diff > 0;
  if (invertColors) isPositive = !isPositive;
  
  let colorClass = 'text-[var(--color-text-muted)]';
  if (diff !== 0) {
    colorClass = isPositive ? 'text-brand-green' : 'text-brand-red';
  }

  return (
    <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5 hover:border-white/20 transition-colors">
      <p className="text-sm font-medium text-[var(--color-text-muted)] mb-4">{label}</p>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Current</p>
          <p className="text-xl font-bold text-[var(--color-text-main)] tabular-nums">{money(before)}</p>
        </div>
        
        <ArrowRight className="w-5 h-5 text-[var(--color-text-muted)] hidden sm:block opacity-50" />
        
        <div>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Simulated</p>
          <p className="text-xl font-bold text-white tabular-nums">{money(after)}</p>
        </div>
        
        <div className="sm:text-right">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Difference</p>
          <p className={`text-lg font-black tabular-nums ${colorClass}`}>
            {diff > 0 ? '+' : ''}{money(diff)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ResultsView({ before, after, difference, money }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[var(--color-text-main)] px-2">Before & After Comparison</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard 
          label="Total Balance" 
          before={before.currentBalance} 
          after={after.currentBalance} 
          diff={difference.balance} 
          money={money} 
        />
        
        <MetricCard 
          label="Current Savings (This Month)" 
          before={before.currentSavings} 
          after={after.currentSavings} 
          diff={difference.savings} 
          money={money} 
        />
        
        <MetricCard 
          label="Budget Usage" 
          before={before.totalBudgetSpent} 
          after={after.totalBudgetSpent} 
          diff={difference.budgetUsage} 
          money={money} 
          invertColors={true} // Increasing budget usage is "red"
        />
        
        <MetricCard 
          label="Total Debt" 
          before={before.totalDebtRemaining} 
          after={after.totalDebtRemaining} 
          diff={difference.debt} 
          money={money}
          invertColors={true} // Increasing debt is "red"
        />
        
        <MetricCard 
          label="Unpaid Bills" 
          before={before.unpaidBillsTotal} 
          after={after.unpaidBillsTotal} 
          diff={difference.billsCoverage} 
          money={money}
          invertColors={true}
        />
        
        <MetricCard 
          label="Total Investments" 
          before={before.totalInvestments} 
          after={after.totalInvestments} 
          diff={difference.investments} 
          money={money}
        />
        
        <MetricCard 
          label="Cash Remaining (After Bills)" 
          before={before.cashRemaining} 
          after={after.cashRemaining} 
          diff={difference.cashRemaining} 
          money={money}
        />
        
        <MetricCard 
          label="Net Worth" 
          before={before.netWorth} 
          after={after.netWorth} 
          diff={difference.netWorth} 
          money={money}
        />
      </div>

      <div className="pt-4">
        <h3 className="text-lg font-bold text-[var(--color-text-main)] px-2 mb-4">Accounts Impact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {before.accounts.map(bAcc => {
            const aAcc = after.accounts.find(a => a._id === bAcc._id);
            const diff = (aAcc?.balance || 0) - bAcc.balance;
            const isAffected = diff !== 0;
            return (
              <div key={bAcc._id} className={`bg-black/10 shadow-inner border ${isAffected ? 'border-brand-blue/50' : 'border-white/5'} rounded-2xl p-4 transition-colors`}>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className={`w-4 h-4 ${isAffected ? 'text-brand-blue' : 'text-[var(--color-text-muted)]'}`} />
                  <p className="font-bold text-[var(--color-text-main)] truncate">{bAcc.name}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--color-text-muted)] tabular-nums">{money(bAcc.balance)}</p>
                  <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-50" />
                  <p className={`text-sm font-bold tabular-nums ${isAffected ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>{money(aAcc?.balance || 0)}</p>
                </div>
                {isAffected && (
                  <p className={`text-xs mt-2 font-bold text-right tabular-nums ${diff > 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    {diff > 0 ? '+' : ''}{money(diff)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {before.bills && before.bills.length > 0 && (
        <div className="pt-4">
          <h3 className="text-lg font-bold text-[var(--color-text-main)] px-2 mb-4">Bills Impact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {before.bills.map(bBill => {
              const aBill = after.bills.find(a => a._id === bBill._id);
              const bStatus = bBill.status;
              const aStatus = aBill?.status || 'paid'; // If deleted, consider it gone/paid
              const isAffected = bStatus !== aStatus;
              
              let statusLabel = aStatus;
              if (aStatus === 'paid') statusLabel = 'Paid';
              else if (aStatus === 'pending') statusLabel = 'Pending';
              
              return (
                <div key={bBill._id} className={`bg-black/10 shadow-inner border ${isAffected ? 'border-brand-orange/50' : 'border-white/5'} rounded-2xl p-4 transition-colors`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className={`w-4 h-4 ${isAffected ? 'text-amber-500' : 'text-[var(--color-text-muted)]'}`} />
                    <p className="font-bold text-[var(--color-text-main)] truncate">{bBill.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--color-text-muted)] uppercase tracking-wider">{bStatus}</p>
                    <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-50" />
                    <p className={`text-sm font-bold uppercase tracking-wider ${isAffected ? (aStatus === 'paid' ? 'text-brand-green' : 'text-amber-500') : 'text-[var(--color-text-muted)]'}`}>{statusLabel}</p>
                  </div>
                  {isAffected && (
                    <p className={`text-xs mt-2 font-bold text-right tabular-nums ${aStatus === 'paid' ? 'text-brand-green' : 'text-amber-500'}`}>
                      {aStatus === 'paid' ? `-${money(bBill.expectedAmount)}` : 'Changed'}
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
