# Resizable Windowing System Architecture

## Overview

The resizable windowing system is a React Native (web-first) layout engine that renders a tree of split containers and screens. Users can hover or press buttons to insert new screens, and the layout animates the structural change with smooth, velocity-scaled transitions. A wireframe overlay previews the new layout on hover, while a separate hover-focus layer highlights the button being hovered.

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

## Four-Layer Rendering

The `Layout` component renders four independent layers:

1. **Window layer** (`layerMode="window"`) — renders the actual screen content and animates size changes. This is the real interactive content.
2. **Controls layer** (`layerMode="controls"`) — renders invisible interaction buttons aligned with container edges and inter-screen gaps. Absolutely positioned over the window layer with `pointerEvents="box-none"` so it catches presses without blocking underlying content. Does NOT animate flexGrow — buttons stay anchored while content resizes beneath them.
3. **Wireframe layer** (`layerMode="wireframe"`) — renders subtle dark blurred boxes for each content screen with white outlines. Absolutely positioned with `pointerEvents="none"`. Animates in and out via a layer-level opacity fade (not individual screen animations) so the layout never jumps during exit. Shows the preview layout when hovering a button.
4. **Hover-focus layer** (`layerMode="hover-focus"`) — renders ONLY the single button the user is currently hovering, lifted above everything with a white outline. Uses the **static committed layout config** (`committedConfig`) with **no animation** (`animateSizes={false}`) so the button position never shifts, even while the wireframe layer animates underneath.

Layer order (back to front): Window → Controls → Wireframe → Hover-focus.

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

1. **Snap to intro** — the target layer is switched to `introConfig` with animation disabled. The DOM immediately reflects the new tree with the new screen at zero width/height.
2. **Enable animation** — a flag (`animateWindowSizes` or `animateWireframeSizes`) is flipped on.
3. **Commit final** — the layer is switched to `finalConfig`. Because animation is now enabled, the CSS `transition` (or Reanimated spring on native) drives each screen's `flexGrow` from its intro value to its final value.

On web, `react-dom`'s `flushSync` is used between stages to guarantee synchronous React commits so the browser sees discrete paint boundaries.

## Wireframe Fade Hold Durations

Two theme props control pauses around the wireframe animation:

- **`wireframeFadeInHoldDuration`** (ms, default 0) — after the wireframe fades in to full opacity, how long to hold before starting the layout expand animation.
- **`wireframeFadeOutHoldDuration`** (ms, default 0) — after the wireframe fades out to zero opacity, how long to hold at opacity 0 before unmounting the layer.

For example, `wireframeFadeInHoldDuration: 500` means: hover → wireframe fades in → waits 500ms at full opacity → then plays the expand layout animation.

## Wireframe Opacity Animation

The wireframe layer is wrapped in an `Animated.View` with a `useAnimatedStyle` hook reading `wireframeOpacity` (a `useSharedValue`). This layer-level opacity is animated with `withTiming` so the entire overlay fades in/out as a unit. Individual wireframe screen boxes do NOT have their own enter/exit animations — this prevents layout shifts during fade-out.

The wireframe is visible only when `resolvedTheme.wireframeVisible` is true and both `wireframeConfig` and `wireframeVisibilityMap` are present.

## Hover-Focus Independence

The hover-focus layer is critically decoupled from the wireframe:

- It renders using `committedConfig` (the static, already-committed layout) NOT the animated `wireframeConfig`.
- `animateSizes={false}` — it never animates layout changes.
- It only renders the single hovered button (`renderOnlyActionKey: hoveredActionKey`).
- This guarantees the button stays exactly where the user's cursor is, with no position shift regardless of what the wireframe layer is doing underneath.

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

- **Hover delay** — a configurable prop (`hoverDelayMs`, default 300 ms, overridden to 100 ms in `MainPage`). When the user hovers a button, the wireframe does not appear until the delay elapses.
- **Hover-out** — when the mouse leaves, the wireframe fades out via opacity (120ms) while staying frozen at its final preview position. No layout contraction occurs.
- **Press suppression** — if the user presses a button while hovering, the hover-out is suppressed because the layout has already been committed.
- **No button dimming** — buttons do NOT fade out during hover. The wireframe layer covers the content preview while the controls layer remains fully visible underneath for interaction.

## Component API

```tsx
<Layout
  config={exampleConfig}
  hoverDelayMs={100}
  theme={{
    borderWidth: 30,
    gapWidth: 30,
    inactiveButtonThicknessRatio: 0.33,
    borderRadius: 60,
    buttonSpanRatio: 0.7,
    contrastStep: -0.03,
    hoverBrightness: 0.05,
    canvasColor: { l: 0.18, c: 0, h: 0 },
    panelColor: { l: 0.3, c: 0, h: 0 },
    buttonColor: { l: 0.35, c: 0.03, h: 320 },
    buttonClassName: 'border-[1px] border-text/20 scale-70',

    // Wireframe overlay (preview on hover)
    wireframeVisible: true,
    wireframeBorderColor: { l: 1, c: 0, h: 0 },
    wireframeBorderOpacity: 0.85,
    wireframeBorderWidth: 1,
    wireframeBackgroundColor: { l: 0.28, c: 0, h: 0 },
    wireframeBackgroundOpacity: 0.18,
    wireframeBlurIntensity: 8,
    wireframeBlurTint: 'dark',
    wireframeRadiusOffset: 0,
    wireframeFadeInHoldDuration: 100,
    wireframeFadeOutHoldDuration: 200,

    // Hovered button lift (the one button shown above wireframe)
    hoveredButtonVisible: true,
    hoveredButtonClassName: 'rounded-full scale-70',
    hoveredButtonColor: { l: 1, c: 0, h: 0 },
    hoveredButtonBorderColor: { l: 1, c: 0, h: 0 },
    hoveredButtonBorderOpacity: 0,
    hoveredButtonBorderWidth: 1,
    hoveredButtonBackgroundColor: { l: 1, c: 0, h: 0 },
    hoveredButtonBackgroundOpacity: 0,
    hoveredButtonBlurIntensity: 24,
    hoveredButtonBlurTint: 'light',
    hoveredButtonHoverBrightness: 0.04,
    hoveredButtonRadiusOffset: 0,
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

- `app/components/Layout.tsx` — core engine (`Layout`, `LayoutRenderer`, four-layer rendering, tree mutators, animation logic, wireframe opacity management)
- `app/components/MainPage.tsx` — example usage with `exampleConfig` and full theme overrides