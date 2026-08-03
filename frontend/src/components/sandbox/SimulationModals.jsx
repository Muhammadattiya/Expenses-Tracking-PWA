import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';

export default function SimulationModals({ type, onClose, onSubmit, metadata }) {
  const [payload, setPayload] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(payload);
  };

  const renderFields = () => {
    switch (type) {
      case 'purchase':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Amount</label>
              <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" onChange={e => setPayload({...payload, amount: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Account</label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder="Select Account"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Category</label>
              <CustomSelect 
                options={metadata.categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                value={payload.categoryId}
                onChange={val => setPayload({...payload, categoryId: val})}
                placeholder="Select Category"
              />
            </div>
          </>
        );
      case 'salary':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">New Salary Amount (or Additional Income)</label>
              <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" onChange={e => setPayload({...payload, newAmount: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Destination Account</label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder="Select Account"
              />
            </div>
          </>
        );
      case 'budget':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Action</label>
              <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, action: e.target.value})}>
                <option value="">Select Action...</option>
                <option value="increase">Increase Budget</option>
                <option value="decrease">Decrease Budget</option>
                <option value="create">Create Virtual Budget</option>
                <option value="delete">Delete Budget</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Category</label>
              <CustomSelect 
                options={metadata.categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                value={payload.categoryId}
                onChange={val => setPayload({...payload, categoryId: val})}
                placeholder="Select Category"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Amount</label>
              <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, amount: e.target.value})} />
            </div>
          </>
        );
      case 'debt':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Action</label>
              <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, action: e.target.value})}>
                <option value="">Select Action...</option>
                <option value="take">Take New Debt</option>
                <option value="repay">Repay Existing Debt</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Amount</label>
              <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, amount: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Account</label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder="Select Account"
              />
            </div>
          </>
        );
      case 'bill':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Action</label>
              <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, action: e.target.value})}>
                <option value="">Select Action...</option>
                <option value="pay">Pay Bill</option>
                <option value="delay">Delay Bill</option>
                <option value="delete">Delete Bill</option>
                <option value="add">Add Virtual Bill</option>
              </select>
            </div>
            {payload.action !== 'add' && (
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">Bill</label>
                <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, billId: e.target.value})}>
                  <option value="">Select Bill...</option>
                  {metadata.bills.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.expectedAmount})</option>
                  ))}
                </select>
              </div>
            )}
            {['add', 'pay'].includes(payload.action) && (
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">Amount</label>
                <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, amount: e.target.value})} />
              </div>
            )}
            {payload.action === 'pay' && (
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">Account</label>
                <CustomSelect 
                  options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                  value={payload.accountId}
                  onChange={val => setPayload({...payload, accountId: val})}
                  placeholder="Select Account"
                />
              </div>
            )}
          </>
        );
      case 'recurring':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Action</label>
              <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, action: e.target.value})}>
                <option value="">Select Action...</option>
                <option value="disable">Disable</option>
                <option value="enable">Enable</option>
                <option value="edit">Edit Amount</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Recurring Tx</label>
              <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, recurringId: e.target.value})}>
                <option value="">Select...</option>
                {metadata.recurring.map(r => (
                  <option key={r._id} value={r._id}>{r.title} ({r.amount})</option>
                ))}
              </select>
            </div>
            {payload.action === 'edit' && (
               <div className="space-y-1">
                 <label className="text-xs text-[var(--color-text-muted)] font-medium">Amount</label>
                 <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, amount: e.target.value})} />
               </div>
            )}
          </>
        );
      case 'investment':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Action</label>
              <select className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, action: e.target.value})}>
                <option value="">Select Action...</option>
                <option value="buy">Buy Investment</option>
                <option value="sell">Sell Investment</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Amount</label>
              <input required type="number" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[var(--color-text-main)] focus:border-brand-blue outline-none" onChange={e => setPayload({...payload, amount: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">Account</label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder="Select Account"
              />
            </div>
          </>
        );
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-[#1c1c1e] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative z-10 animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white capitalize">{type} Simulation</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="sim-form" onSubmit={handleSubmit} className="space-y-5">
             {renderFields()}
          </form>
        </div>
        
        <div className="p-6 border-t border-white/5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium text-white transition-colors">
            Cancel
          </button>
          <button type="submit" form="sim-form" className="flex-[2] flex items-center justify-center gap-2 py-3 bg-brand-blue hover:bg-brand-blue/90 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-brand-blue/30">
            <Play className="w-4 h-4 fill-current" />
            Run Simulation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
