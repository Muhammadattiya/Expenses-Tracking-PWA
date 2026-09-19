# Liquid scrub (hovering pill)

Reusable finger-follow highlight for a **row of equal slots** (tab pills, segmented controls, tool strips). It is **not** Apple’s private Liquid Glass renderer. It does **not** modify `.liquidglass`.

## Files

| File | Role |
|---|---|
| `frontend/src/hooks/useLiquidScrub.js` | Pointer math, springs, `hoverIndex`, commit-on-drop |
| `frontend/src/components/dock/LiquidBlob.jsx` | The floating gel (transform + inset/drop shadow only) |
| `frontend/src/components/BottomNav.jsx` | First consumer: Home / Reports / Profile rail |
| `DESIGN.md` → Navigation | One-line pointer back here |

## What it is

Three layers stacked on a glass rail:

1. **Material** — the existing `.liquidglass` class on a static surface. Never animate the filter. Never add a second `backdrop-filter` on this class.
2. **Gel blob** — `LiquidBlob`, a rounded highlight that *floats* (stronger drop shadow, sits slightly high in the rail). Its `x` is a Framer `useSpring`, so it lags the finger and looks self-propelled.
3. **Specular sheen** — a `mix-blend-screen` radial gradient on the **parent track**, not on the glass class. Opacity is a spring. Position tracks the pointer.

Do **not** lift or scale the track on press. The island stays planted; only the gel blob moves.

## Physics

| Phase | Spring | Motion |
|---|---|---|
| Follow (finger down, moving) | stiffness 150, damping 18, mass 1.2 | Blob `x` = finger − half width, clamped inside the rail. **Does not** snap to slots while dragging. |
| Preview | — | `hoverIndex` = nearest slot **center** to the finger. That icon uses copper (`#8D6346`) as a *preview*, not `aria-current`. |
| Drop | same spring, new target | Blob target jumps to the **nearest slot center** (`nearestVisual`). Spring carries it. `onCommit(index)` fires immediately. Blob stays mounted **320ms** so the settle is visible, then unmounts. |
| Preview copper | — | While `scrubbing`, only `items[hoverIndex]` uses `#8D6346` + `scale 1.12`. The real `aria-current` tab dims unless the gel is still on it. |
| Reduced motion | duration 0 | No lift, no sheen follow, no blob. Taps still navigate. |

RTL: pointer math is physical (left → right). Convert visual slot → item index with `count - 1 - visual` when `rtl` is true. The rail can still have `dir="rtl"` for reading order.

## Hook API

```js
import useLiquidScrub from '../../hooks/useLiquidScrub';
import LiquidBlob from './LiquidBlob';

const {
  trackRef,      // outer control (sheen + lift)
  railRef,       // slot row (blob lives here)
  held,          // pointer down
  scrubbing,     // moved enough to count as a drag
  hoverIndex,    // previewed item, or null
  didScrub,      // ref: ignore the click after a drag
  sheenBg, sheenO, blobX, blobW,
  bindTrack,     // spread onto trackRef element
} = useLiquidScrub({
  count: items.length,
  rtl: lang === 'ar',
  reduceMotion,
  enabled: !menuOpen,
  onCommit: (index) => navigate(items[index].path),
});
```

Spread `bindTrack` on the track. Put `railRef` on the slot row. Render `<LiquidBlob x={blobX} width={blobW} />` **inside** the rail while `scrubbing`. Hide the resting `layoutId` indicator while `scrubbing` so two gels do not stack.

On item click: if `didScrub.current`, `preventDefault()`.

## Do / don’t

- **Do** reuse this on any equal-width slot row (dock pill, segmented control, filter chips).
- **Do** keep `.liquidglass` static. Transforms belong on the track or the blob, not on the filter.
- **Do** treat copper-on-hover as preview only. Commit happens on drop.
- **Don’t** slot-snap while the finger is down — that kills the float.
- **Don’t** put extra live `blur()` on the glass class.
- **Don’t** use this for unequal-width items without measuring each item’s center.

## BottomNav wiring (copy this)

```jsx
const preview = scrubbing && hoverIndex === index;
const lit = preview || (isActive && !scrubbing);
// icon class: lit ? 'text-[#8D6346] drop-shadow-md' : 'text-white/60'
// hide layoutId pill while scrubbing
{scrubbing && <LiquidBlob x={blobX} width={blobW} />}
```

`LiquidBlob` sits `top: 3px / bottom: 7px` with `0 10px 18px` drop shadow so it reads as a lens above the icons.

## First shipped on

`BottomNav` destination pill (Home / Reports / Profile). The dock does not translate on hold. Only the blob drifts and snaps.
