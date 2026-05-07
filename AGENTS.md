<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

<!-- svg-conversion-start -->
## SVG to React Native Component Conversion

This project uses SVGR for converting SVG files to React Native components.

### Conversion Process

1. **Convert SVG to React Native component:**
   ```bash
   npx @svgr/cli --native --typescript --out-dir app/components/icons/ path/to/svg/file.svg
   ```

2. **Key Options:**
   - `--native`: Essential for React Native compatibility (uses react-native-svg components)
   - `--typescript`: Generates .tsx files with proper types
   - `--out-dir`: Specifies where generated components should be saved
   - `--icon`: Scales SVG to standard icon size (usually 1em) - optional

3. **Usage in Components:**
   ```tsx
   import SvgComponent from '../icons/ConvertedSvg';
   
   // Use as container with centered text
   <View className="relative justify-center items-center">
     <SvgComponent width={154} height={60} />
     <Text className="absolute">Centered Text</Text>
   </View>
   ```

4. **Requirements:**
   - Ensure `react-native-svg` is installed in the project
   - Generated components use `Svg`, `Path`, `Circle` from react-native-svg
   - Components accept standard SvgProps for customization

### Example Workflow

The GameTabBar component was updated to use SVG containers:
- SVG acts as the outer container
- Text is positioned absolutely in the center
- No icons displayed, text-only design
- Scalable and themeable through props
<!-- svg-conversion-end -->

<!-- web-pointer-events-start -->
## Web Pointer Events Guidelines

This project runs on web (via Expo/React Native Web). **Never use `pointerEvents="box-none"`** on web because it doesn't work as expected and can block touches to underlying elements.

### Rules:
- **Avoid `pointerEvents="box-none"`** - On web this can still intercept touches even when it shouldn't
- **Prefer explicit layering** - Place interactive controls in the top-most layer (e.g., controls overlay)
- **Use `pointerEvents="auto"`** (default) for interactive elements
- **Use `pointerEvents="none"`** only when you want to completely disable a container

### Example:
Instead of putting interactive buttons in a window layer with `box-none` overlay, put them in the controls layer that sits on top:

```tsx
// ❌ Bad - buttons in window layer under overlay
<View style={{ flex: 1 }}>
  <Button onPress={...} />  {/* May not receive touches */}
</View>
<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
  <OverlayContent />
</View>

// ✅ Good - buttons in controls layer (top overlay)
<View style={{ flex: 1 }}>
  <Content />
</View>
<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
  <ControlsLayer>
    <Button onPress={...} />  {/* Guaranteed to receive touches */}
  </ControlsLayer>
</View>
```
<!-- web-pointer-events-end -->

<!-- layout-architecture-start -->
## Layout Component Architecture

This project uses a single `Layout` component that declaratively manages screen layout, splitting, and resizing through a tree-based configuration.

### Core Idea

Instead of managing multiple layout components manually, you pass a single `config` object to the `Layout` component. The config is a tree of `SplitNode` and `ScreenNode` types that describes how screens should be arranged and sized.

### Configuration Tree

```tsx
type LayoutNode = 
  | { type: 'split'; direction: 'row' | 'column'; children: LayoutNode[]; size?: string | number }
  | { type: 'screen'; screenId: string | number; size?: string | number };
```

- **Split nodes** contain children and define direction (row/column)
- **Screen nodes** are leaf nodes that render actual content
- **Size** can be a percentage (`'50%'`) or auto-distributed among siblings

### Multi-Layer Rendering

The Layout component renders four stacked layers for different purposes:

1. **Window layer** — Renders actual screen content with animated transitions
2. **Controls layer** — Renders edge buttons and split controls (interactive overlay)
3. **Wireframe layer** — Shows preview of layout changes during hover
4. **Hover-focus layer** — Highlights hovered buttons with special styling

This separation ensures controls are always interactive and animations are smooth.

### Usage Pattern

```tsx
<Layout config={layoutConfig} theme={customTheme} buttonIcon={<CustomIcon />}>
  <Layout.Screen screenId={1}>
    <MyScreenContent />
  </Layout.Screen>
  <Layout.Screen screenId={2}>
    <AnotherScreen />
  </Layout.Screen>
</Layout>
```

Consuming code only needs to:
- Provide the layout config tree
- Render screen content via `Layout.Screen`
- Optionally customize theme and button icon

All layout logic (splitting, resizing, closing, animations) is handled internally.

### Key Features

- **Declarative layout** — Config tree describes structure, not imperative mutations
- **Auto-splitting** — Edge and split buttons trigger automatic tree mutations
- **Animated transitions** — Smooth spring animations for all layout changes
- **Screen closing** — Built-in close functionality with shrink-to-zero animation
- **Theme system** — Comprehensive styling via OKLCH color space
- **Minimal boilerplate** — Consuming code focuses on content, not layout mechanics

### Why This Architecture

The goal is to keep consuming code (like `MainPage.tsx`) minimal. All complex layout logic lives in `Layout.tsx`, so you can:
- Change layout structure by editing a config object
- Add/remove screens by toggling `Layout.Screen` children
- Customize visuals via a theme prop
- Never write layout-specific animation or state management code
<!-- layout-architecture-end -->
