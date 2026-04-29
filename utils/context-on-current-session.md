# Current Session: Resizable Windowing System Animation

This document tracks the architecture and animation attempts for the resizable windowing system.

## Architecture Overview

### Two-Layer System

The layout uses a two-layer rendering approach:

- **Window layer** (`layerMode="window"`): Renders the actual content with animated sizes
- **Controls layer** (`layerMode="controls"`): Renders interactive buttons on top, always transparent

Both layers render the same tree structure, but the controls layer is absolutely positioned and pointer-events-managed so buttons stay fixed while the window layer animates.

### Layout Tree Structure

The layout is a tree of `LayoutNode`:

```ts
type LayoutNode = SplitNode | ScreenNode;

type SplitNode = {
  type: 'split';
  direction: 'row' | 'column';
  children: LayoutNode[];
  size?: string | number;  // flex percentage like "50%"
};

type ScreenNode = {
  type: 'screen';
  screenId: string | number;
  size?: string | number;
};
```

Example config from MainPage:

```ts
const exampleConfig: LayoutNode = {
  type: 'split',
  direction: 'row',
  children: [
    {
      type: 'split',
      direction: 'column',
      size: '74%',
      children: [
        {
          type: 'split',
          direction: 'row',
          size: '48%',
          children: [
            { type: 'screen', screenId: 1, size: '38%' },
            { type: 'screen', screenId: 2, size: '62%' },
          ],
        },
        { type: 'screen', screenId: 3, size: '52%' },
      ],
    },
    { type: 'screen', screenId: 4, size: '26%' },
  ],
};
```

### Layout State Management

The `Layout` component manages three config states:

```ts
const [committedConfig, setCommittedConfig] = React.useState(config);  // The actual committed layout
const [previewConfig, setPreviewConfig] = React.useState<LayoutNode | null>(null);  // Hover preview
const [windowConfig, setWindowConfig] = React.useState(config);  // What the window layer renders
const [animateWindowSizes, setAnimateWindowSizes] = React.useState(false);  // Animation flag
```

The window layer renders either `previewConfig` (during hover) or `windowConfig` (committed state).

### Recursive Renderer

`LayoutRenderer` recursively renders the tree using `react-native-reanimated`:

```ts
const LayoutRenderer = ({ node, animateSizes }: RendererProps) => {
  const targetFlexGrow = getFlexGrowValue(node.size);
  const flexGrow = useSharedValue(targetFlexGrow);

  React.useEffect(() => {
    cancelAnimation(flexGrow);
    if (animateSizes) {
      flexGrow.value = withSpring(targetFlexGrow, SIZE_SPRING);
      return;
    }
    flexGrow.value = targetFlexGrow;
  }, [animateSizes, flexGrow, targetFlexGrow]);

  const animatedFlexStyle = useAnimatedStyle(() => ({
    flexGrow: flexGrow.value,
  }));

  return <Animated.View style={[BASE_FLEX_STYLE, animatedFlexStyle]}>{/* ... */}</Animated.View>;
};
```

The animation strategy is: when `animateSizes` becomes true, spring the `flexGrow` from current value to target.

### Layout Actions

Buttons trigger `LayoutAction` events:

```ts
type LayoutAction =
  | { type: 'edge'; key: string; path: string; side: 'top' | 'right' | 'bottom' | 'left' }
  | { type: 'split'; key: string; path: string; index: number; direction: 'row' | 'column' };
```

- **Edge action**: Pressing a border button to add a new screen
- **Split action**: Pressing a gap button to insert a screen between existing ones

### Layout Mutation Logic

The system builds a plan with two configs:

```ts
type LayoutActionPlan = {
  introConfig: LayoutNode;  // New structure with 0% sizes
  finalConfig: LayoutNode;  // New structure with final normalized sizes
};
```

For split actions (inserting into a gap):
- `introConfig`: Existing children keep current sizes, new child at 0%
- `finalConfig`: All children renormalized to share space equally

For edge actions (wrapping in new split):
- `introConfig`: Wrapped node at 100%, new sibling at 0%
- `finalConfig`: Both at 50%

Example helpers:

```ts
const insertScreenIntoChildrenIntro = (children: LayoutNode[], insertIndex: number, screenId: number): LayoutNode[] => {
  const currentShares = resolveShares(children);
  const rebuiltChildren = children.map((child, index) => ({
    ...child,
    size: formatPercent(currentShares[index] * 100),  // Keep current sizes
  }));

  rebuiltChildren.splice(normalizedIndex, 0, {
    type: 'screen',
    screenId,
    size: '0%',  // New screen at 0%
  });

  return rebuiltChildren;
};
```

## Animation Attempts

### Attempt 1: Global Layout Transitions

**What we tried:** Used `LinearTransition` from react-native-reanimated on all `Animated.View` components in the tree.

```ts
const LAYOUT_TRANSITION = LinearTransition.springify().mass(0.9).stiffness(260).damping(22);

<Animated.View layout={LAYOUT_TRANSITION} style={flexStyle}>
```

**Problem:** "It jumps all over the place." When adding a new wrapper, the entire tree reflows and everything shifts globally. The animation was too chaotic.

**User feedback:** "no those animations are not it. it jumps all over the place. think about it. If i were u i would have no animations on resize because whenever u add a new wrapper EVERYTHING shifts around. have no css transiton for the actial resizing (if that's what is causing this) and then instead snap right to it."

### Attempt 2: Snap-Then-Grow (Current)

**What we're trying:**
1. Remove all global layout transitions
2. On press, instantly commit the new structure with `introConfig` (new screens at 0%)
3. Enable animation mode
4. Switch to `finalConfig` to trigger `flexGrow` spring animation

**Current implementation:**

```ts
const handleActionPress = React.useCallback((action: LayoutAction) => {
  const plan = buildLayoutActionPlan(committedConfig, action, nextScreenId);

  // Phase 1: Set intro config (new screens at 0%)
  setCommittedConfig(plan.finalConfig);
  setWindowConfig(plan.introConfig);
  setPreviewConfig(null);

  // Phase 2: Multi-frame commit to ensure intro state paints
  const frameOne = requestAnimationFrame(() => {
    setAnimateWindowSizes(true);
    const frameTwo = requestAnimationFrame(() => {
      setWindowConfig(plan.finalConfig);  // Should trigger spring animation
    });
  });
}, [committedConfig]);
```

**Expected behavior:**
- Frame 1: Mount intro config (new structure, new screen at 0%)
- Frame 2: Enable animation flag
- Frame 3: Switch to final config, spring `flexGrow` from 0 to target

**Problem:** Still not animating. User reports "it just snaps."

**Possible issues:**
1. React batching: The state updates might still be collapsing into a single render
2. Web-specific: `react-native-reanimated`'s `withSpring` on `flexGrow` might not animate properly on web
3. Timing: Even with nested `requestAnimationFrame`, the browser might not paint the intermediate state
4. Reanimated worklet: The `useAnimatedStyle` might not be updating correctly on web

## What We Know

- The two-layer system works (hover preview, click commit)
- The layout mutation logic works (correct tree transformations)
- The intro/final config generation works (correct size values)
- The multi-frame commit is implemented but not producing visible animation
- Web is the primary target; iOS is secondary

## Next Steps to Try

1. **Force a paint**: Use `setTimeout` with a small delay instead of `requestAnimationFrame` to guarantee a paint
2. **Web-specific animation**: Try CSS transitions on `flex-grow` via `className` instead of reanimated
3. **Direct dimension animation**: Animate `width`/`height` instead of `flexGrow` (more expensive but more reliable)
4. **React Native Animated**: Try the non-reanimated `Animated` API for web compatibility
5. **Debug visibility**: Add console logs or visual indicators to verify each phase is actually happening