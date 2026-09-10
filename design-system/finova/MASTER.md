# Finova Master Design System (Copper Brown & Ambient Glass)

> **Source of Truth for Finova UI/UX**  
> **Aesthetic Philosophy**: Apple-inspired dark ambient glass with warm copper highlights. High-performance pure CSS glassmorphism, organic radial ambient glows, and fluid spring motion.

---

## 1. Core Architecture & Philosophy

- **Stack**: React 19 + Vite, Tailwind CSS v4, Framer Motion, Lucide React.
- **Direction**: Dynamic RTL / LTR support (Arabic default, English supported).
- **Glassmorphism Rule**: **NO SVG displacement or chromatic aberration filters**. Surfaces rely exclusively on pure CSS `backdrop-blur`, layered translucency (`bg-black/20`, `bg-[#2B2321]/30`), and subtle top/left highlight borders (`border-t-white/30`, `border-white/10`).

---

## 2. Color Palette & Tokens

### 2.1 Brand & Copper Spectrum
| Token | Hex / Value | CSS Variable | Usage |
|-------|------------|--------------|-------|
| **Brand Primary** | `#8D6346` | `--color-brand-copper` | Primary brand accent, active tabs, buttons, focal points |
| **Copper Light** | `#E8C5A8` | `--color-copper-light` | Subtle secondary text, label highlights, borders |
| **Copper Dark** | `#3D2E2B` | `--color-copper-dark` | Deep contrast surfaces, dark container borders |
| **Copper Glow** | `rgba(141, 99, 70, 0.4 - 0.6)` | `--glow-copper` | Radial blur background spheres |
| **Copper Surface Hover** | `rgba(141, 99, 70, 0.2)` | `--bg-surface-hover` | Hover state on glass elements |
| **Copper Surface Active**| `rgba(141, 99, 70, 0.35)` | `--bg-surface-active` | Active pill or button states |

### 2.2 Backgrounds & Ambient Atmosphere
| Surface | Hex / Value | Tailwind Class | Description |
|---------|------------|----------------|-------------|
| **Dashboard Canvas** | `#141115` | `bg-[#141115]` | Deep midnight obsidian background |
| **Debts Canvas** | `#100E11` | `bg-[#100E11]` | Deep obsidian with warm undertone |
| **Ambient Glow 1 (Top-Left)** | `#8D6346` (60% op, 120px blur) | `w-[295px] h-[295px] blur-[120px] opacity-60 bg-[#8D6346]` | Ambient atmospheric lighting |
| **Ambient Glow 2 (Mid-Right)** | `#8D6346` (60% op, 120px blur) | `w-[233px] h-[233px] blur-[120px] opacity-60 bg-[#8D6346]` | Secondary ambient warmth |
| **Ambient Glow 3 (Debts)** | `#8D6346` (30-40% op, 140px blur) | `w-[250px] h-[250px] blur-[140px] opacity-30 bg-[#8D6346]` | Spread background glow |

### 2.3 Cards & Glass Surfaces (Pure CSS)
| Surface | CSS / Tailwind | Visual Depth | Usage |
|---------|---------------|--------------|-------|
| **Debts Hero Card** | `bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem]` | Deep warm glass | Summary cards, debt items |
| **Dashboard Visa Card** | `bg-black/20 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)] rounded-[30px]` | Ultra-deep translucent | Account card, hero balance |
| **Nested Stat Container**| `bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3` | Inset translucent well | Inner stats, total amounts |
| **Gain / Loss Pill** | `bg-white/5 rounded-[20px] py-2 px-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.1)]` | Raised micro-glass | Quick metrics on cards |
| **Action Pill (Active)** | `bg-[#8D6346]/20 border border-[#8D6346]/30 text-white rounded-[24px]` | Warm glass highlight | Segmented tab indicator |

### 2.4 Semantic Financial Colors
| Meaning | Value | Tailwind | Contrast vs Dark BG |
|---------|-------|----------|---------------------|
| **Gain / Income / Owed To Me** | `#34C759` | `text-brand-green`, `text-green-400`, `bg-brand-green/10` | 9.46:1 (AAA) |
| **Loss / Expense / I Owe** | `#FF3B30` | `text-brand-red`, `text-red-400`, `bg-brand-red/10` | 3.55:1 (large text) / `#DC2626` (4.67:1 AA) |
| **Warning / Payday Risk** | `#F59E0B` | `text-amber-400`, `bg-amber-400/10` | 8.2:1 (AAA) |
| **Information / Bills** | `#007AFF` | `text-brand-blue`, `bg-brand-blue/10` | 4.02:1 (large text / icons) |

### 2.5 Typography Tokens
- **Font Family**: `'Exo 2', sans-serif` (`var(--font-sans)`).
- **Tabular Figures**: Always use `tabular-nums tracking-tight` for financial numbers, currency, and balances.
- **Primary Text**: `text-white/90` or `text-white font-extrabold` (Contrast: 18.7:1 vs `#141115`).
- **Secondary Text**: `text-white/50` or `text-white/70` (Contrast: 6.5:1+ vs dark surfaces).
- **Accent Text**: `text-[#8D6346]` or `text-[#E8C5A8]` for copper highlights.

---

## 3. Motion & Micro-Interactions

1. **Page Transitions**:
   ```jsx
   <AnimatePresence mode="wait">
     <motion.div
       initial={{ opacity: 0, y: 15 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -15 }}
       transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
     >
       {content}
     </motion.div>
   </AnimatePresence>
   ```

2. **Tactile Buttons**:
   - Small buttons: `<motion.button whileTap={{ scale: 0.95 }}>`
   - Large hero/action buttons: `<motion.button whileTap={{ scale: 0.98 }}>`

3. **Segmented Tabs**:
   - Tab shell: `bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] p-1`
   - Sliding indicator: `<motion.div layoutId="tabPill" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-[24px] shadow-sm" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />`

---

## 4. Component Rules

- **Modals**: Must use `createPortal(<div className="fixed inset-0 z-[100]...">...</div>, document.body)` to avoid z-index stacking conflicts with `BottomNav` and page animations.
- **Destructive Confirmations**: Never use native `window.confirm()`. Always use `<ConfirmModal />`.
- **Lists & Virtualization**: Use `useWindowScroll={true}` on `react-virtuoso` without fixed parent heights to avoid double scrollbars.
- **RTL Support**: Use logical Tailwind properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of physical directions (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`).
