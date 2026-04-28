# React Native Animated SVG Agent Guide

Detailed playbook for porting animated SVGs (e.g., Material Line Icons) from the web snippet to a React Native + Reanimated implementation that compiles cleanly.

## 0. Context
- Upstream assets ship regular SVG markup that uses the DOM-only `<animate>` element.
- `react-native-svg` exposes the same primitives (`Svg`, `Path`, `G`, `Mask`, etc.) but **does not** support `<animate>` children on `Path`/`Rect`.
- Our solution: swap the DOM animation tags for `react-native-reanimated` animated props that drive the same `strokeDashoffset` / `fillOpacity` values over time.

## 1. Start from the vendor snippet
You’ll typically be given something like:

```tsx
import Svg, { Path, G, Rect } from 'react-native-svg';

export function LineMdEmojiCry(props) {
  return (
    <Svg width="1em" height="1em" viewBox="0 0 24 24">
      <mask id="...">
        <G ...>
          <Path strokeDasharray="64" strokeDashoffset="64" d="...">
            <animate attributeName="stroke-dashoffset" dur="0.6s" values="64;0" />
          </Path>
          <!-- more paths with <animate> -->
        </G>
      </mask>
      <Rect width="24" height="24" fill="currentColor" mask="url(#...)" />
    </Svg>
  );
}
```

The structure (mask + grouped paths) is valid. The **only** part that breaks RN is the `<animate>` child elements.

## 2. Convert to a plain TSX icon (no animation yet)
1. `tsx`-ify the component (PascalCase, typed props, export function).
2. Remove every `<animate>` child, keeping the `Path` props as-is. Set the animated attributes (`strokeDashoffset`, `fillOpacity`) to the **final** visual state so you can spot-check the look.
3. Example (pre-animation) `SadEmoji` state lives in `app/components/icons/SadEmoji.tsx` before we reintroduced animation.
4. This step ensures the icon renders without runtime/type errors.

## 3. Introduce Reanimated-driven props
1. Add the Reanimated hooks:
   ```ts
   import Animated, {
     Easing,
     useAnimatedProps,
     useSharedValue,
     withDelay,
     withTiming,
   } from 'react-native-reanimated';
   const AnimatedPath = Animated.createAnimatedComponent(Path);
   ```
2. For every animated attribute from the vendor snippet:
   - Create a `useSharedValue` initialized to the **starting** value from the old `<animate values="start;end">`.
   - In `useEffect`, reset the values and trigger the timing animation. Mirror any `begin="X"` offsets using `withDelay`.
   - Example for the emoji outline: start at `64`, animate to `0` over `0.6s`.
3. Map each shared value to `useAnimatedProps` and spread into the matching `AnimatedPath`:
   ```tsx
   const outlineDashOffset = useSharedValue(64);
   useEffect(() => {
     outlineDashOffset.value = withTiming(0, {
       duration: 600,
       easing: Easing.out(Easing.cubic),
     });
   }, [outlineDashOffset]);

   const outlineAnimatedProps = useAnimatedProps(() => ({
     strokeDashoffset: outlineDashOffset.value,
   }));

   <AnimatedPath
     animatedProps={outlineAnimatedProps}
     strokeDasharray="64"
     strokeDashoffset={64} // default value for the initial render
     d="..."
   />
   ```
4. Repeat for every animated property:
   - Eyes/mouth: `strokeDashoffset` values (`2 → 0`, `12 → 0`)
   - Tears: `fillOpacity` (`0 → 1`)

## 4. Apply to multiple icons
- `SadEmoji` (mask-based) and `UserIcon` (simple stroked paths) both follow the same pattern.
- If you get another icon with `<animate>`, clone one of these files and adjust:
  - Update the paths and dash arrays.
  - Duplicate shared values per animated element.
  - Match durations/delays from the vendor snippet.

## 5. Verify
- Run `npx tsc --noEmit` to guarantee the `Path` components no longer have invalid children.
- If the icon compiles but doesn’t animate, confirm the shared value starts at the *initial* value and you aren’t missing a `withTiming` call.

## 6. Reference implementations
- `app/components/icons/SadEmoji.tsx` (mask + multi-part animation).
- `app/components/icons/UserIcon.tsx` (simple stroke animation).

Follow this checklist whenever you port additional animated icons from web SVG to React Native Reanimated.

## 7. React Native Reanimated Animation Guidelines

### Critical Animation Rules

1. **NEVER use `.springify()` for fast animations**
   - Spring animations ignore duration settings under 300ms
   - Always use plain `.duration()` for animations under 300ms
   - Example: `ZoomIn.duration(100)` ✅ vs `ZoomIn.duration(100).springify()` ❌

2. **ALWAYS add `key` props to animated components**
   - Reanimated requires keys for proper component identification
   - Sometimes works without keys, but it's good practice to include them
   - Example: `key="url-input"`, `key="upload-buttons"`

3. **Use 100ms for perfect animation speed**
   - 100ms provides the ideal balance between responsiveness and visibility
   - Faster than 100ms (like 10ms) is barely perceptible
   - Slower than 100ms feels sluggish for UI transitions

### Animation Examples

```tsx
// ✅ CORRECT - Fast, responsive animation
<Animated.View
  entering={ZoomIn.duration(100)}
  exiting={ZoomOut.duration(100)}
  key="url-input"
>

// ❌ WRONG - Springify ignores fast duration
<Animated.View
  entering={ZoomIn.duration(100).springify()}  // Will act like 300ms+
  exiting={ZoomOut.duration(100).springify()}
  key="url-input"
>

// ❌ WRONG - Missing key (can cause animation issues)
<Animated.View
  entering={ZoomIn.duration(100)}
  exiting={ZoomOut.duration(100)}
>
```

### Animation Duration Guidelines
- **100ms**: Perfect for UI transitions, button states, form inputs
- **300ms+**: Use `.springify()` for longer, more fluid animations
- **50ms**: Too fast, barely visible
- **10ms**: Essentially invisible, appears broken

These rules ensure consistent, responsive animations throughout the app.
