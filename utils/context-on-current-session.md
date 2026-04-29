# Resizable Windowing System Architecture

## Overview

The resizable windowing system is a React Native (web-first) layout engine that renders a tree of split containers and screens. Users can hover or press buttons to insert new screens, and the layout animates the structural change with smooth, velocity-scaled transitions.

## Layout Tree

The layout is defined by a recursive `LayoutNode` tree:

```ts
type LayoutNode = SplitNode | ScreenNode;

type SplitNode = {
  type: 'split';
  direction: 'row' | 'column';
  children: LayoutNode[];
  size?: string | number;
};

type ScreenNode = {
  type: 'screen';
  screenId: string | number;
  size?: string | number;
};
```

Each `SplitNode` divides its space among its children via `flexGrow`, driven by the `size` field (e.g. `'38%'`, `'62%'`). When `size` is omitted, it defaults to an equal share.

## Two-Layer Rendering

The `Layout` component renders two identical layers:

1. **Window layer** (`layerMode="window"`) — renders the actual screen content and animates size changes.
2. **Controls layer** (`layerMode="controls"`) — renders invisible interaction buttons aligned with container edges and inter-screen gaps. It is absolutely positioned over the window layer with `pointerEvents="box-none"` so it catches presses without blocking underlying content.

Both layers share the same tree structure, but the controls layer is static (it does not animate flexGrow). This separation keeps buttons anchored while the window layer resizes beneath them.

## Insertion Actions

Two kinds of user actions modify the tree:

- **Edge action** — pressing a button on the outer border of a screen. The system wraps that screen in a new `SplitNode` with a new sibling `ScreenNode`.
- **Split action** — pressing a button in the gap between two sibling screens. The system inserts a new `ScreenNode` into the parent's `children` array at that gap index.

```ts
type LayoutAction =
  | { type: 'edge'; key: string; path: string; side: Side }
  | { type: 'split'; key: string; path: string; index: number; direction: Direction };
```

## Staged Animation: Snap-Then-Grow

Every action produces a `LayoutActionPlan` containing two tree snapshots:

```ts
type LayoutActionPlan = {
  introConfig: LayoutNode;  // New screen at 0% size; existing screens unchanged
  finalConfig: LayoutNode;  // All screens renormalized to equal shares
};
```

The animation is executed in three stages via staged state commits:

1. **Snap to intro** — the window layer is switched to `introConfig` with animation disabled. The DOM immediately reflects the new tree with the new screen at zero width/height.
2. **Enable animation** — a flag (`animateWindowSizes`) is flipped on.
3. **Commit final** — the window layer is switched to `finalConfig`. Because animation is now enabled, the CSS `transition` (or Reanimated spring on native) drives each screen's `flexGrow` from its intro value to its final value.

On web, `react-dom`'s `flushSync` is used between stages to guarantee synchronous React commits so the browser sees discrete paint boundaries.

## Web CSS Transitions vs. Reanimated

On **web**, `LayoutRenderer` outputs a plain `View` (not `Animated.View`) and applies CSS transition styles directly to `flexGrow`:

```ts
{
  transitionProperty: 'flex-grow',
  transitionDuration: `${computedDurationMs}ms`,
  transitionTimingFunction: 'cubic-bezier(...)',
  willChange: 'flex-grow',
  flexGrow: targetFlexGrow,
}
```

On **native**, the same component uses `react-native-reanimated`'s `useSharedValue`, `withSpring`, and `useAnimatedStyle` to animate `flexGrow`.

## Velocity-Scaled Animation Duration

Instead of a fixed animation duration, the system scales the duration proportionally to the pixel distance the UI must travel.

- The root `View` measures its pixel dimensions via `onLayout`.
- `computeScreenRects` recursively maps every `screenId` to a pixel rectangle for a given tree configuration.
- `computeMaxScreenDistance` compares two configurations and returns the largest center-point distance any single screen moves.
- `getScaledAnimationDuration` converts that distance into a millisecond value using a constant velocity (`2 px/ms`), clamped between 120 ms and 600 ms.

Both the expand (hover/press) and contract (hover-out) animations use the distance-appropriate duration.

## Hover Behavior

- **Hover delay** — a configurable prop (`hoverDelayMs`, default 300 ms, overridden to 400 ms in `MainPage`). When the user hovers a button, the opacity of all other buttons fades to transparent immediately, but the layout shift does not begin until the delay elapses.
- **Hover-out contract** — when the mouse leaves, the layout animates back to its pre-hover state using an ease-in timing function (slow start, fast end), the mirror of the expand's ease-out.
- **Press suppression** — if the user presses a button while hovering, the hover-out animation is suppressed because the layout has already been committed.
- **Button dimming** — all non-hovered buttons become `opacity: 0` during a hover, with a 150 ms CSS opacity transition on web.

## Component API

```tsx
<Layout
  config={exampleConfig}
  hoverDelayMs={400}
  theme={{
    borderWidth: 30,
    gapWidth: 30,
    inactiveButtonThicknessRatio: 0.3,
    borderRadius: 60,
    buttonSpanRatio: 0.7,
    canvasColor: { l: 0.18, c: 0, h: 0 },
    panelColor: { l: 0.3, c: 0, h: 0 },
    buttonColor: { l: 0.35, c: 0.03, h: 320 },
    contrastStep: -0.03,
    hoverBrightness: 0.05,
    buttonClassName: 'border-[1px] border-text/20 scale-70',
  }}
>
  <Layout.Screen screenId={1}><DemoContent /></Layout.Screen>
  <Layout.Screen screenId={2}><DemoContent /></Layout.Screen>
  <Layout.Screen screenId={3}><DemoContent /></Layout.Screen>
  <Layout.Screen screenId={4}><DemoContent /></Layout.Screen>
</Layout>
```

`Layout.Screen` is a slot component whose children are stored in a `screenMap` and rendered inside the recursive `LayoutRenderer` when it reaches the matching `ScreenNode`.

## Theme System

Colors are authored in OKLCH (`{ l, c, h }`) and converted to CSS at render time. The `panelColor` and `buttonColor` are automatically darkened per depth level using `contrastStep`. A `buttonClassName` string can be passed for Tailwind-style utility classes on every button.

## Key Files

- `app/components/Layout.tsx` — core engine (`Layout`, `LayoutRenderer`, tree mutators, animation logic)
- `app/components/MainPage.tsx` — example usage with `exampleConfig` and theme overrides