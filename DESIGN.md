---
name: Finova
description: Apple-inspired Liquid Glass and warm copper design system for offline-first personal wealth management
colors:
  primary: "#8D6346"
  copper-light: "#E8C5A8"
  copper-dark: "#3D2E2B"
  obsidian-canvas: "#141115"
  obsidian-debts: "#100E11"
  gain-green: "#34C759"
  loss-red: "#FF3B30"
  warning-amber: "#F59E0B"
  info-blue: "#007AFF"
  neutral-text: "#ffffff"
  neutral-muted: "rgba(255, 255, 255, 0.6)"
typography:
  display:
    fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  pill: "24px"
  card: "30px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.copper-light}"
    textColor: "{colors.copper-dark}"
  card-liquid-glass:
    backgroundColor: "rgba(43, 35, 33, 0.3)"
    rounded: "{rounded.card}"
    padding: "24px"
  pill-tab-active:
    backgroundColor: "rgba(141, 99, 70, 0.2)"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: Finova

## Overview

**Creative North Star: "The Obsidian Liquid Vault"**

Finova balances Cupertino-grade optical purity with the warm, tactile dignity of an artisanal atelier. Rather than treating finance as cold administrative ledger-keeping, Finova renders personal wealth through deep obsidian horizons, organic ambient copper radiance, and crystal-clear **Liquid Glass**. Surfaces feel physically grounded and luminous, revealing the atmospheric glow and scrollable content beneath them through high-clarity optical translucency rather than muddy frosting.

Every interaction conveys intentional craftsmanship. Buttons compress with calibrated iOS-like spring physics (`whileTap scale 0.95`), segmented indicators slide smoothly across pill tracks using shared layout animations, and financial figures maintain laser-aligned composure with strict tabular numerals. The interface breathes with serene minimalism, honoring Arabic RTL by default while seamlessly flipping to English LTR without losing architectural equilibrium.

**Key Characteristics:**
- **Liquid Glass Optics**: Crystal-clear pure CSS translucency (`backdrop-blur-[32px]`) with delicate specular rim borders (`border-white/10`) revealing underlying ambient lights.
- **Warm Artisanal Warmth**: Deep obsidian canvases (`#141115` / `#100E11`) paired with rich copper accents (`#8D6346`, `#E8C5A8`, `#3D2E2B`).
- **Tactile Fluid Physics**: iOS-grade spring micro-interactions on taps, gesture cards, and segmented navigation tabs.
- **Bidi Symmetry**: Natural RTL-first layout that mirrors into LTR gracefully using logical CSS properties.
- **Confirmed Anti-References**: Strictly avoid cold sterile corporate finance spreadsheets, garish neon crypto gradients, muddy opaque frosted glass, cartoonish gamification badges, and SVG displacement filters.

## Colors

Finova's palette pairs deep obsidian grounds with warm copper fire and high-contrast semantic indicators.

### Primary
- **Warm Copper Ember** (`#8D6346`): Primary focal point, active indicators, floating buttons, and core brand radiance. Used with disciplined restraint to preserve its premium luster.

### Secondary
- **Pale Bisque Frost** (`#E8C5A8`): Secondary text highlights, subtle pill borders, warm accents, and high-readability labels against dark glass.

### Tertiary
- **Roasted Espresso** (`#3D2E2B`): Deep structural borders, contrast backing, and container separators on dark surfaces.

### Neutral
- **Obsidian Night** (`#141115`): Midnight canvas for the Dashboard and root layout.
- **Deep Obsidian** (`#100E11`): Warm-tinted midnight canvas for Debts and specialized views.
- **Pure White** (`#ffffff`): Primary text (`text-white/90`), achieving an 18.7:1 contrast ratio against the obsidian background.
- **Muted Starlight** (`rgba(255, 255, 255, 0.6)`): Secondary descriptions, category tags, and inactive states.

### Semantic Financial Colors
- **Verdant Mint** (`#34C759`): Positive cash flow, income, gains, and "Owed to Me" balances (AAA 9.46:1 contrast against dark backgrounds).
- **Crimson Coral** (`#FF3B30`): Negative cash flow, expenses, losses, and "I Owe" balances.
- **Sunlit Amber** (`#F59E0B`): Budget thresholds, pay-day warnings, and overdue reminders.
- **Cerulean Bill** (`#007AFF`): Scheduled bills, informational notices, and subscription tracking.

### Named Rules
**The Ember Rarity Rule.** The primary copper accent (`#8D6346`) is reserved for focal points, active states, and tactile interactions; it must never exceed 15% of surface area to maintain its luminous prestige.

**The Semantic Integrity Rule.** Financial greens (`#34C759`) and reds (`#FF3B30`) denote financial gain/owed and loss/debt strictly; they never serve as decorative background accents.

## Typography

**Display Font:** 'Exo 2' (with `-apple-system`, `BlinkMacSystemFont`, `sans-serif`)  
**Body Font:** 'Exo 2' (with `-apple-system`, `BlinkMacSystemFont`, `sans-serif`)  
**Label/Mono Font:** 'Exo 2' with `tabular-nums tracking-tight`

**Character:** 'Exo 2' offers technical precision with modern geometric warmth. When paired with tabular numerals, it renders balances and financial statistics with architectural stability.

### Hierarchy
- **Display** (ExtraBold 800, `clamp(2.25rem, 5vw, 3rem)`, line-height 1.1, tracking -0.02em): Hero net worth, master balance totals, and primary onboarding numbers.
- **Headline** (Bold 700, `1.5rem` / 24px, line-height 1.25): Page titles, section anchors, and summary headers.
- **Title** (SemiBold 600, `1.25rem` / 20px, line-height 1.3): Card headings, account names, and modal titles.
- **Body** (Regular 400 & Medium 500, `1rem` / 16px, line-height 1.5): Transaction descriptions, narrative insights, and form values.
- **Label** (Medium 500, `0.875rem` / 14px, tracking 0.02em): Pill metrics, category badges, table headers, and navigation tags.

### Named Rules
**The Tabular Rigor Rule.** Every financial balance, currency symbol, metric, and timestamp must strictly enforce `tabular-nums tracking-tight` to preserve column alignment and eliminate layout jitter during live balance recalculations.

## Layout

Finova is engineered for mobile-first handheld use with full desktop parity.
- **Grid & Spatial Model**: 8pt grid system. Page containers center within a `max-w-7xl` frame, with mobile gutters at 16px (`px-4`) and desktop gutters at 32px (`px-8`).
- **Vertical Rhythm**: Generous top padding (`pt-6`) with extended bottom clearance (`pb-32`) to ensure floating navigation never obstructs interactive cards or scroll targets.
- **Bidi Architecture**: Native RTL layout with absolute logical mirroring. All margins, paddings, borders, and position coordinates use logical Tailwind utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`).
- **Scroll Doctrine**: Virtualized lists (`react-virtuoso`) must use `useWindowScroll={true}` without fixed-height parent containers, letting the native browser scroll govern movement and eliminating dual scrollbars.

## Elevation & Depth

Finova conveys depth through pure CSS **Liquid Glass** optical layering rather than opaque drop shadows. Surfaces allow the underlying canvas and ambient copper glow spheres to show through with razor-sharp clarity.

### Shadow & Specular Vocabulary
- **Liquid Hero Rim** (`box-shadow: inset 0 1px 2px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.4)`): Used on hero account cards and balance containers to create physical bevel depth and luminous rim highlights.
- **Recessed Inset Well** (`box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.1)`): Used on nested stat wells, segmented tab shells, and quick gain/loss metric pills.
- **Floating Nav Shadow** (`box-shadow: 0 8px 30px rgba(0,0,0,0.3)`): Used on the floating bottom glass bar to separate it cleanly from scrolling content.
- **Copper Focus Glow** (`box-shadow: 0 0 12px rgba(141, 99, 70, 0.3)`): Applied to active input fields, active buttons, and tactile focus rings.

### Named Rules
**The Optical Translucency Rule.** Liquid Glass must remain crystal clear; under no circumstance should surface fill opacity exceed 35% on dark surfaces or rely on opaque grey frosting that blocks the underlying ambient glow.

**The Ambient Diffusion Rule.** Ambient lighting is achieved via blurred radial background spheres (`bg-[#8D6346] blur-[120px] opacity-30` to `opacity-60`) fixed beneath the glass layer; shadows on glass panels remain subtle and structural.

## Shapes

Finova features soft, continuous curvature modeled after native iOS hardware.
- **Floating Nav Pill**: 24px corner radius (`rounded-[24px]`).
- **Hero & Account Cards**: 30px corner radius (`rounded-[30px]`).
- **Debt & Summary Cards**: 32px corner radius (`rounded-[2rem]`).
- **Metric Pills & Badges**: 20px corner radius (`rounded-[20px]`).
- **Form Inputs & Modals**: 16px corner radius (`rounded-2xl`).
- **Action Buttons & Badges**: Fully pill-shaped (`rounded-full`).
- **Rim Borders**: Crisp 1px translucent borders (`border border-white/10` or `border-[#8D6346]/30`) that trace the edge without heavy contrast.

## Components

### Buttons
- **Primary Pill Button**:
  - Shape: Pill (`rounded-full`, 24px)
  - Color: Warm Copper Ember (`bg-[#8D6346] text-white`)
  - Padding: 12px 24px (`py-3 px-6`)
  - Micro-Interaction: `<motion.button whileTap={{ scale: 0.95 }}>`
  - Hover / Focus: `hover:bg-[#E8C5A8] hover:text-[#3D2E2B]` with `transition-colors duration-200`
- **Secondary Glass Button**:
  - Shape: Pill (`rounded-full`)
  - Color: Translucent obsidian (`bg-white/10 text-white border border-white/15`)
  - Hover: `hover:bg-white/20 active:scale-95`

### Segmented Tabs
- **Shell**: Translucent recessed well (`bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] p-1`).
- **Active Sliding Indicator**: Absolute animated pill (`<motion.div layoutId="tabPill" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-[24px]" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />`).

### Cards & Containers
- **Liquid Glass Hero Card**:
  - Surface: `bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10`
  - Radius: `rounded-[30px]` or `rounded-[2rem]`
  - Shadow: `shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.2)]`
  - Inner Structure: Houses balance metrics, swipeable account cards, and nested stat wells.

### Inputs & Form Fields
- **Translucent Field**:
  - Style: `bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40`
  - Focus: `focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] focus:outline-none`
  - Validation: Red border (`border-[#FF3B30]`) on error with dedicated error text.

### Navigation
- **Floating Bottom Bar**:
  - Structure: 328px wide by 48px high, centered at `bottom-8 z-[90]`.
  - Material: Liquid Glass pill (`rounded-[24px] px-4 backdrop-blur-2xl border border-white/10 bg-black/30`).
  - Active Tab: Resting highlight uses Framer Motion `layoutId="pillIndicator"`. Press-drag uses the reusable **liquid scrub** (finger-follow gel, snap to nearest slot on release, copper preview on the hovered icon). See `frontend/src/components/dock/LIQUID_SCRUB.md`. Do not add extra `backdrop-filter` on `.liquidglass` for this effect.

### Modals & Dialogs
- **Layering**: Must strictly mount through `createPortal(<div className="fixed inset-0 z-[100]...">...</div>, document.body)`.
- **Backdrop**: Deep dark veil with subtle blur (`bg-black/60 backdrop-blur-sm`).
- **Surface**: Ultra-clear Liquid Glass dialog with spring entrance animation.
- **Destructive Actions**: Always use `<ConfirmModal />`, never native `window.confirm()`.

## Do's and Don'ts

### Do:
- **Do** enforce pure CSS Liquid Glass (`backdrop-blur-[32px]`, `bg-[#2B2321]/30`, `border-white/10`) so underlying background glows remain vividly visible.
- **Do** format all financial metrics and balances with `tabular-nums tracking-tight`.
- **Do** apply physical spring physics (`whileTap={{ scale: 0.95 }}`) to all interactive buttons and cards.
- **Do** use logical CSS classes (`ms-`, `me-`, `start-`, `end-`) for dynamic RTL/LTR support.
- **Do** mount all modals into `document.body` via React Portals to prevent z-index stacking conflicts with `BottomNav`.
- **Do** keep long virtualized lists bound to window scroll (`useWindowScroll={true}`) to prevent double scrollbars.

- **Do** preserve the established `.liquidglass` class and implementation as-is without modification.

### Don't:
- **Don't** modify, alter, or attempt to replace the existing `.liquidglass` class and its specular glass filter; keep it intact as-is.
- **Don't** make glass surfaces opaque or muddy grey; keep opacity under 35% on dark surfaces so depth remains optical.
- **Don't** use generic flat primary buttons; buttons must feature tactile feedback and refined copper highlights.
- **Don't** hardcode physical layout directions (`left-`, `right-`, `ml-`, `mr-`) in UI components.
- **Don't** use native `window.confirm` for destructive operations.
- **Don't** expose technical variable names or raw localization keys in the user interface.
