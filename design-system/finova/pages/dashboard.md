# Finova Page Guidelines: Dashboard

> **Page Scope**: `src/pages/Dashboard.jsx`  
> **Parent Design System**: `design-system/finova/MASTER.md`

---

## 1. Canvas & Atmosphere

```jsx
{/* Fixed Background Ambient Glows */}
<div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
  <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
  <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
</div>
```

---

## 2. Hero Component: Visa-Style Account Card

- **Container Dimensions**: `w-full h-[220px] md:h-[260px] lg:h-[300px] max-w-[340px] md:max-w-[400px] lg:max-w-[460px] mx-auto rounded-[30px] p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden`
- **Surface Styling**:
  - Pure CSS glass: `backdrop-blur-2xl bg-black/20 border border-white/10`
  - Box Shadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2)`
- **Header Section**:
  - Account Name: `text-white/90 text-xl font-medium tracking-wide`
  - Account Icon Container: `w-12 h-12 rounded-full flex items-center justify-center bg-white/10`
  - Icon Shadow: `inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.2)`
  - Active Color: `#8D6346` (default / all)
- **Hero Balance**:
  - Label: `text-white/50 font-medium text-xs md:text-sm tracking-wider uppercase`
  - Value: `text-white font-extrabold text-4xl md:text-5xl tabular-nums tracking-tight drop-shadow-sm`
  - Currency: `text-xl md:text-2xl font-medium opacity-70`
- **Gain / Loss Pills**:
  - Container: `flex gap-3 w-full mt-3`
  - Gain Pill: `flex-1 bg-white/5 rounded-[20px] py-2 px-3 flex flex-col items-center justify-center gap-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.1)]`
    - Label: `text-green-400 text-[11px] font-semibold tracking-wider uppercase`
    - Amount: `text-white font-medium text-sm tracking-wide tabular-nums`
  - Loss Pill: `flex-1 bg-white/5 rounded-[20px] py-2 px-3 flex flex-col items-center justify-center gap-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.1)]`
    - Label: `text-red-400 text-[11px] font-semibold tracking-wider uppercase`
    - Amount: `text-white font-medium text-sm tracking-wide tabular-nums`

---

## 3. Payday Survival Widget

- **Border / Background by Risk Tier**:
  - Safe: `background: rgba(16, 185, 129, 0.15)`, `border: rgba(16, 185, 129, 0.3)`, text: `text-emerald-400`
  - Low Risk: `background: rgba(59, 130, 246, 0.15)`, `border: rgba(59, 130, 246, 0.3)`, text: `text-blue-400`
  - Medium Risk: `background: rgba(245, 158, 11, 0.15)`, `border: rgba(245, 158, 11, 0.3)`, text: `text-amber-400`
  - High Risk: `background: rgba(255, 0, 0, 0.2)`, `border: rgba(255, 0, 0, 0.3)`, text: `text-[#ff4444]`
- **Structure**: `rounded-[24px] p-4 border backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]`

---

## 4. Period & Category Filters

- **Month / Period Selector**: `px-2 py-2 bg-[rgba(141,99,70,0.3)] backdrop-blur-xl border border-white/10 rounded-[20px]`
- **Category Filter Pill**: `px-3 py-2 bg-[rgba(141,99,70,0.3)] backdrop-blur-xl border border-white/10 rounded-[20px] active:scale-95`
- **Text Styling**: `text-white font-medium text-[12.5px] tracking-wide`
