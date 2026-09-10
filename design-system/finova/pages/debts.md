# Finova Page Guidelines: Debts & Receivables

> **Page Scope**: `src/pages/Receivables.jsx`, `src/components/debts/PersonalDebts.jsx`, `src/components/debts/GroupExpenses.jsx`  
> **Parent Design System**: `design-system/finova/MASTER.md`

---

## 1. Canvas & Ambient Glows

```jsx
{/* Fixed Ambient Glow Spheres */}
<div className="fixed inset-0 pointer-events-none -z-10 bg-[#100E11] overflow-hidden">
  <div className="absolute top-[-50px] left-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full" />
  <div className="absolute top-[30%] right-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full" />
  <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full" />
</div>
```

---

## 2. Main Header & Tab Navigation

### 2.1 Header
- Title: `text-[24px] font-['Exo_2'] font-semibold tracking-tight text-white/90 drop-shadow-sm`
- Subtitle: `text-white/50 text-[16px] drop-shadow-sm`

### 2.2 Segmented Control Tabs (Group vs Personal)
- Container: `flex p-1 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] w-fit mx-auto`
- Buttons: `relative px-6 py-2.5 text-[15px] font-medium rounded-[24px] transition-colors duration-300 z-10`
- Active State Indicator:
  ```jsx
  <motion.div
    layoutId="receivablesTab"
    className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-[24px] shadow-sm"
    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
  />
  ```

---

## 3. Hero Summary Card

- Container:
  ```css
  bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 rounded-[2rem] flex flex-col justify-center gap-6
  ```
- **I OWE Metric**:
  - Icon: `ArrowDownRight` with `text-brand-red` (`#FF3B30`)
  - Icon Box: `w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 shadow-inner flex items-center justify-center`
  - Label: `text-[14px] font-medium text-white/90`
  - Value: `text-2xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-md`
- **OWED TO ME Metric**:
  - Icon: `ArrowUpRight` with `text-brand-green` (`#34C759`)
  - Icon Box: `w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 shadow-inner flex items-center justify-center`
  - Label: `text-[14px] font-medium text-white/90`
  - Value: `text-2xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-md`

---

## 4. Action Bar & Filter Chips

- **Segmented Filter Bar**: `bg-black/20 p-1 rounded-full shadow-inner relative flex`
- Filter Chips: `px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-colors relative z-10 capitalize`
  - Active Pill: `<motion.div layoutId="pdFilter" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />`
- **Add Debt Button**:
  ```jsx
  <motion.button 
    whileTap={{ scale: 0.95 }}
    className="flex items-center justify-center gap-1.5 rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner px-4 py-2 font-medium text-sm text-[#8D6346] hover:bg-[#8D6346]/30 transition-colors whitespace-nowrap shrink-0"
  >
    <Plus size={16} /> <span>{t('debts.addDebt')}</span>
  </motion.button>
  ```

---

## 5. Debt Item Cards

- **Card Shell**: `bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] flex flex-col group h-full transition-all`
- **Active / Selected Glow**: `ring-1 ring-[#8D6346]/50 shadow-2xl z-10`
- **Nested Detail Containers**:
  - Total Row: `bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3 flex justify-between items-center`
  - Stats Box (2-column): `bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-4 flex flex-col justify-center`
- **Card Action Buttons**:
  - Primary (Settle): `py-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[14px] hover:bg-[#8D6346]/30 transition-colors`
  - Secondary (Loan / Repay): `py-3 rounded-[30px] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/90 font-medium text-[14px] hover:bg-white/10 transition-colors`
