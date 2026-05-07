# WARNING: TAKE EVERYTHING BELOW WITH A GRAIN OF SALT

THIS DOCUMENTATION WAS WRITTEN BY AN AI ASSISTANT AFTER READING THE CODEBASE IN A SINGLE SESSION. THE PROJECT WAS BUILT OVER MANY DIFFERENT THREADS AND CONVERSATIONS THAT I DO NOT HAVE FULL CONTEXT OVER. SOME DETAILS MAY BE INACCURATE, OUTDATED, OR MISSING IMPORTANT CONTEXT. USE THIS AS A STARTING POINT FOR UNDERSTANDING THE SYSTEM, BUT VERIFY DETAILS AGAINST THE ACTUAL CODE AND PROJECT HISTORY.

---

# Layout Component System Overview

## Core Philosophy

The Layout component is a plug-and-play, self-contained layout engine. You simply pass it a list of screen components, and it handles **everything else**: splitting, resizing, adding new screens, closing screens, animations, and hover previews. The consuming code only needs to provide content and optionally receive layout config updates.

```tsx
<Layout config={layoutConfig} onConfigChange={setLayoutConfig} theme={customTheme}>
  <Layout.Screen screenId={1}><MyComponent /></Layout.Screen>
  <Layout.Screen screenId={2}><AnotherComponent /></Layout.Screen>
  <Layout.Screen screenId={3}><YetAnother /></Layout.Screen>
</Layout>
```

The Layout manages the entire layout tree internally. You describe the structure via a `config` prop (a tree of `SplitNode` and `ScreenNode`), and Layout renders it with all interaction capabilities built in.

---

## Layout Tree Structure

The layout is defined by a recursive tree:

```ts
type LayoutNode = SplitNode | ScreenNode;

type SplitNode = {
  type: 'split';
  direction: 'row' | 'column';  // horizontal or vertical split
  children: LayoutNode[];
  size?: string | number;       // flex grow value (e.g., '38%', 0.5)
};

type ScreenNode = {
  type: 'screen';
  screenId: string | number;    // maps to Layout.Screen children
  size?: string | number;
};
```

Each `SplitNode` divides its space among children using flexbox. The `size` field controls the `flexGrow` ratio. If omitted, children share space equally.

Example config:
```ts
{
  type: 'split',
  direction: 'row',
  children: [
    { type: 'screen', screenId: 1, size: '38%' },
    { type: 'screen', screenId: 2, size: '62%' }
  ]
}
```

---

## Four-Layer Rendering Architecture

The Layout renders **four independent layers** stacked on top of each other. This separation is critical for smooth animations and correct interaction handling.

### Layer 1: Window Layer (`layerMode="window"`)
- Renders the actual screen content (your components)
- Animates size changes via CSS transitions (web) or Reanimated springs (native)
- This is the "real" content that users interact with

### Layer 2: Controls Layer (`layerMode="controls"`)
- Renders invisible interaction buttons (edge buttons, gap buttons)
- Positioned absolutely over the window layer with `pointerEvents="box-none"`
- Does NOT animate layout changes — buttons stay anchored while content resizes beneath
- Catches hover/press events and triggers layout mutations
- Also renders close (X) buttons on screens

### Layer 3: Wireframe Layer (`layerMode="wireframe"`)
- Renders dark blurred boxes with white outlines for each screen
- Positioned with `pointerEvents="none"` — purely visual, no interaction
- Shows the **preview layout** when you hover over a button
- Fades in/out via a layer-level opacity animation (not per-screen animations)
- This prevents layout jumps during exit animations

### Layer 4: Hover-Focus Layer (`layerMode="hover-focus"`)
- Renders ONLY the single button you're currently hovering
- Lifted above everything with a white outline
- Uses the **static committed layout config** (not the animated wireframe config)
- Never animates layout changes — button position stays fixed even while wireframe animates underneath
- This guarantees the button stays exactly under your cursor

**Layer order (back to front):** Window → Controls → Wireframe → Hover-Focus

---

## Wireframe Preview System (The "Outlined Popup")

When you hover over a button (edge or gap), a dark outlined box appears showing where a new screen would be inserted. This is the wireframe layer.

### How It Works

1. **Hover detection** — The controls layer's button receives `onHoverIn`
2. **Build action plan** — The system computes two tree snapshots:
   - `introConfig`: New screen at 0% size, existing screens unchanged
   - `finalConfig`: All screens renormalized to equal shares
3. **Fade in wireframe** — After a configurable delay (`hoverDelayMs`), the wireframe layer fades in with `introConfig`
4. **Expand animation** — The wireframe then animates from `introConfig` to `finalConfig`
5. **Hold duration** — Optional `wireframeFadeInHoldDuration` pauses at full opacity before expanding
6. **Fade out on hover-out** — If you stop hovering, the wireframe fades out from its final position (no contraction animation)

### Why This Matters

The wireframe preview gives users immediate visual feedback about what will happen when they click. It shows:
- Where the new screen will appear
- How existing screens will be resized to accommodate it
- The final layout structure

The hover-focus layer ensures the button you're hovering stays visible and interactive, even while the wireframe is animating underneath.

---

## Adding Screens (Split Actions)

Two kinds of actions modify the layout tree:

### Edge Action
Pressing a button on the outer border of a screen wraps that screen in a new split with a new sibling.

Example: Press the right edge of screen 1 → screen 1 becomes a row split containing [screen 1, new screen].

### Split Action
Pressing a button in the gap between two sibling screens inserts a new screen at that position.

Example: Press the gap between screen 1 and screen 2 → becomes [screen 1, new screen, screen 2].

Both actions produce a `LayoutActionPlan` containing the two config snapshots (`introConfig` and `finalConfig`).

---

## Staged Animation: Snap-Then-Grow

Animations use a three-stage commit pattern to ensure smooth transitions:

1. **Snap to intro** — Switch the target layer to `introConfig` with animation disabled. The DOM immediately reflects the new tree with the new screen at zero width/height.
2. **Enable animation** — Flip the animation flag on.
3. **Commit final** — Switch to `finalConfig`. Because animation is enabled, CSS transitions (or Reanimated springs) drive each screen's `flexGrow` from intro to final values.

On web, `react-dom`'s `flushSync` is used between stages to guarantee synchronous React commits so the browser sees discrete paint boundaries.

---

## Drag-to-Resize on Gap Buttons

You can drag gap buttons (the buttons between screens) to resize adjacent screens in real-time.

### How It Works

1. **Pointer down** on a gap button → `onPointerDown` attaches global pointer event listeners
2. **Drag start** (after 3px movement) → Records initial flex shares and parent dimensions
3. **Drag move** → Computes new shares based on pointer delta, enforces 5% minimum size, updates internal config
4. **Drag end** → If total drag < 3px, treats as click (triggers split action); otherwise commits the new sizes

### Key Implementation Details

- Uses native DOM `pointermove`/`pointerup` events (not React events) for smooth tracking
- Updates internal config during drag without triggering external `onConfigChange` (to prevent feedback loops)
- Skips hover effects during drag to prevent flicker
- The external config is only updated after drag completes

---

## Controlled Component Pattern

The Layout can be either uncontrolled (internal state only) or controlled (external state via `onConfigChange`):

```tsx
// Controlled pattern
const [config, setConfig] = useState<LayoutNode>(exampleConfig);
<Layout config={config} onConfigChange={setConfig} ... >
  {/* screens */}
</Layout>
```

When controlled:
- Layout emits config changes via `onConfigChange` when you add/remove/resize screens
- The parent component receives updates and passes the new `config` back
- During drag operations, external config updates are ignored to prevent feedback loops
- This allows the parent to persist layout state to storage, sync with backend, etc.

---

## Velocity-Scaled Animation Duration

Instead of fixed animation times, the system scales duration based on pixel distance:

1. Compute screen rectangles for the "from" and "to" configurations
2. Find the maximum center-point distance any single screen moves
3. Convert distance to milliseconds using a constant velocity (~2 px/ms)
4. Clamp between 120ms (minimum) and 600ms (maximum)

This means small layout changes are snappy, while large rearrangements feel appropriately paced.

---

## Theme System

Colors use OKLCH color space for perceptually uniform gradients:

```ts
type OKLCHColor = { l: number; c: number; h: number };
```

The theme includes:
- **Canvas/panel colors** — Background colors for the layout and nested containers
- **Button colors** — Colors for edge/gap buttons, darkened per depth level via `contrastStep`
- **Wireframe colors** — Border/background/blur settings for the preview layer
- **Hovered button colors** — Special styling for the hover-focus layer
- **Dimensional settings** — Border width, gap width, border radius, button span ratio
- **Timing settings** — Hover delay, wireframe fade hold durations

Colors are converted to CSS at render time via `oklchToCssColor()`.

---

## Screen Slots

Content is provided via `Layout.Screen` children:

```tsx
<Layout config={config}>
  <Layout.Screen screenId={1}><MyContent /></Layout.Screen>
  <Layout.Screen screenId={2}><OtherContent /></Layout.Screen>
</Layout>
```

Internally, Layout extracts these into a `Map<screenId, ReactNode>` and renders them when the recursive renderer encounters matching `ScreenNode`s. This decouples the tree structure from the actual content.

---

## Closing Screens

Each screen in the controls layer has a close (X) button. Clicking it:
1. Computes the layout after removing that screen (siblings absorb the space)
2. Animates the screen shrinking to zero size
3. Removes it from the tree after animation completes

---

## Web vs Native Differences

**Web:**
- Uses CSS transitions for `flexGrow` animations
- `flushSync` for staged commits
- Native DOM pointer events for drag handling
- Plain `View` components (not `Animated.View`)

**Native:**
- Uses `react-native-reanimated` springs
- `useSharedValue`, `withSpring`, `useAnimatedStyle`
- Gesture system for drag handling
- `Animated.View` for all animated containers

---

## Key Files

- `app/components/Layout.tsx` — Core engine (Layout, LayoutRenderer, four-layer rendering, tree mutators, animation logic, wireframe management, drag handlers)
- `app/components/MainPage.tsx` — Example usage with controlled state pattern

---

## Summary

The Layout component encapsulates all complexity of:
- Recursive tree-based layout rendering
- Interactive button placement (edges and gaps)
- Hover previews (wireframe layer)
- Smooth animations (staged commits, velocity-scaled timing)
- Drag-to-resize interactions
- Screen addition/removal
- Controlled/uncontrolled state patterns

You plug in your screen components, and Layout handles the rest.