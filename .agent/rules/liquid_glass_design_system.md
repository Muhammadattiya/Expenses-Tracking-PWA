# Finova: Liquid Glass Design System ✦

This document outlines the core UI/UX design language established in the Onboarding flow. This system—heavily inspired by Apple's dynamic physical interfaces—will be used across the entire Finova application to maintain a premium, immersive, and fluid experience.

---

## 1. Core Philosophy
- **Physical Depth**: Elements should feel like physical glass layers floating above a deep, glowing background.
- **Fluid Motion**: Nothing should teleport or "snap". Every transition (page changes, toggles, indicators) must use physics-based spring animations.
- **Typography as UI**: Text must be crisp, with calculated tracking (letter-spacing) and contrasting opacities to guide the eye without relying on heavy lines.
- **Immersive Lighting**: Strategic glowing orbs and inner shadows create a sense of environment rather than just a flat screen.

---

## 2. Color Palette & Lighting

### Background Environment
The root background is deeply dark, punctuated by soft, blurred glowing orbs (Ellipses) to give the glass elements something to refract.

- **Base App Background**: `bg-[#100E11]`
- **Theme Color (Brand)**: `#8D6346` (Copper/Warm Gold)
- **Glowing Orbs (Background Light)**:
  ```html
  <!-- Use strategically behind glass elements -->
  <div className="absolute ... w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full pointer-events-none" />
  ```

---

## 3. The "Liquid Glass" Materials

Never use flat colors for containers. Always use these exact formulas for depth, blur, and lighting reflections.

### 🌟 Primary Glass (Cards, Popups, Modals)
Used for main content blocks and mockups. It blends darkness with sharp edge reflections.
```javascript
className="bg-black/30 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem]"
```

### ✨ Action Glass (Primary Buttons, Active Pills)
Used for the Pagination Pill, Next buttons, or primary interactive areas. It injects a hint of the brand color.
```javascript
className="bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem]"
```

### 🌙 Recessed/Inactive Glass (Inputs, Inactive Dots)
Used for elements that are "pushed into" the surface.
```javascript
className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px]"
```

---

## 4. Typography

We use **Exo 2** for a modern, slightly futuristic yet clean aesthetic.

### Hero Titles
- **Classes**: `font-['Exo_2'] font-bold text-[22px] tracking-tight drop-shadow-sm text-white`
- **Usage**: Main headings for screens or alert popups.

### Secondary Text (Descriptions)
- **Classes**: `font-['Exo_2'] font-medium text-[15px] leading-[1.5em] tracking-[-0.01em] text-white/70`
- **Usage**: Explanatory text, subtitles. Always use `/70` or `/50` opacity rather than gray colors to allow the background light to naturally tint the text.

### Micro UI (Badges, Small Labels)
- **Classes**: `font-['Exo_2'] font-bold uppercase text-[11px] tracking-wide text-white/90`

---

## 5. Animation & Motion (Framer Motion)

Motion is critical to the Liquid Glass feel. We use **Spring** physics, not linear easing.

### Page Transitions (AnimatePresence)
Pages should slide and fade simultaneously without bouncing.
```javascript
<motion.div
  initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
  transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
>
```

### Seamless Morphing (The "Dynamic Island" Pill Effect)
For elements that move between states (like pagination dots, segmented controls, or tabs), extract them out of the page transition and use `layoutId`.
```javascript
// Active Element
<motion.div 
  layoutId="activePill"
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
>
  ...
</motion.div>

// Inactive Elements (Must include `layout` prop to make room smoothly)
<motion.div layout transition={{ type: "spring", stiffness: 400, damping: 30 }} />
```

### Micro-Interactions (Buttons)
Every button must have tactile feedback.
```javascript
<motion.button
  whileTap={{ scale: 0.95 }}
  className="... hover:bg-[rgba(141,99,70,0.6)] transition-colors"
>
```

### Floating / Idle Animations
Used for illustrations or icons to make the app feel "alive".
```javascript
<motion.img
  animate={{ y: [0, -10, 0] }}
  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
/>
```

---

## 6. Layout Rules
1. **No Scrollbars**: Views should fit the viewport dynamically using `flex-1` and `min-h-0`. If scrolling is absolutely necessary, hide the scrollbar.
2. **Absolute vs Flow**: 
   - Persistent UI (like bottom navigation or indicators) should be `absolute` at the root layer to avoid getting caught in `AnimatePresence` unmounts.
   - Use `pointer-events-none` on overlay elements (like glowing backgrounds or spacer divs) to prevent blocking clicks.
3. **Spacers**: If a persistent absolute element covers content at the bottom, use an empty spacer div (`shrink-0 mt-auto`) inside the scrollable/animated area exactly matching the height of the absolute element to preserve flexbox centering perfectly.

---

## 7. Interactive UI Mockups (Methodology)

The Onboarding flow features several "mini-app" mockups (Nova Agent, Smart Budgets, Push Notifications) that simulate actual app interactions. When building these in the future, follow this pattern:

### 1. Fixed Container Frame
Mockups should be contained within a clearly defined `Primary Glass` boundary that simulates a phone screen, widget, or chat interface.
```javascript
<motion.div className="w-full max-w-[230px] h-[250px] bg-black/20 backdrop-blur-[40px] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col justify-end">
  {/* Mockup content */}
</motion.div>
```

### 2. State-Driven Sequences
Instead of one massive CSS animation, use a React state machine to track the sequence (e.g., `idle` ➔ `analyzing` ➔ `applied`).
```javascript
const [mockupState, setMockupState] = useState('idle');

useEffect(() => {
  const sequence = async () => {
    setMockupState('analyzing');
    await new Promise(r => setTimeout(r, 1500));
    setMockupState('applied');
  };
  sequence();
}, []);
```

### 3. Component-Level AnimatePresence
Inside the mockup container, use an inner `<AnimatePresence>` to swap out components based on the state. This creates the illusion of a working interface.
```javascript
<AnimatePresence mode="wait">
  {mockupState === 'analyzing' && (
    <motion.div key="analyzing" initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0}}>
       <Sparkles className="animate-pulse" />
    </motion.div>
  )}
  {mockupState === 'applied' && (
    <motion.div key="applied" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}}>
       {/* Applied Result */}
    </motion.div>
  )}
</AnimatePresence>
```

### 4. Overlapping Glows (Z-Index Magic)
To make mockups feel magical, overlay soft gradients that fade in during specific states (e.g., during AI analysis). Place them absolutely inside the mockup frame with `pointer-events-none`.
```javascript
<div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-[#8D6346]/20 to-transparent z-0 pointer-events-none" />
```
