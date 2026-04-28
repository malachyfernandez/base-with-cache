# SVG to React Native Icon Conversion Process

This document explains the complete methodology for converting raw SVG files into properly formatted React Native icon components for the game tab bar.

## The Problem: Original SVG Files

Source SVG files located at `/Users/malachyfernandez/Documents/1-programing/wolfspoint-extra/ideas and icons/vectors for icons/` have several issues:

1. **Attribution text** - `<text>` elements in bottom-left corner (e.g., "Created by...")
2. **Incorrect viewBox** - ViewBox is `0 0 100 125` with lots of empty space above/below the actual icon
3. **Icons not centered** - The path content is offset and not centered within the viewBox
4. **Need styling props** - Original SVGs are static; we need dynamic `color` and `strokeWidth` props

Example original SVG structure:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125" x="0px" y="0px">
  <title>50 icon officee</title>
  <path d="M53.73,82.019c-9.068-.316..."/>
  <text>...</text>
</svg>
```

## The Solution: ViewBox Fitting Method

Instead of transforming the path data (which corrupts coordinates), we **analyze the path to find its bounds** and then adjust the `viewBox` to tightly fit around the actual icon content.

### Step 1: Parse Path Data to Find Bounds

Parse the SVG path `d` attribute to extract all coordinate points:

```javascript
function getPathBounds(d) {
  // Normalize: handle compact notation like "-.316", "c-9.068-.316"
  let normalized = d
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')    // number → command
    .replace(/([A-Za-z])([-0-9])/g, '$1 $2')   // command → number
    .replace(/([0-9])-/g, '$1 -')              // number → minus
    .replace(/-\./g, '-0.');                   // "-.316" → "-0.316"
  
  // Tokenize into commands and numbers
  const tokens = normalized.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+/g) || [];
  
  // Parse each command and track current position
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let currentX = 0, currentY = 0;
  
  for (each token) {
    // Handle commands: M/m (move), L/l (line), H/h (horizontal), V/v (vertical)
    // C/c (cubic bezier), S/s (smooth cubic), Q/q (quadratic), T/t (smooth quad)
    // A/a (arc), Z/z (close path)
    
    // For each point encountered, update bounds:
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
```

### Step 2: Calculate Tight ViewBox

Add padding (5%) around the content and calculate new viewBox:

```javascript
const padding = Math.max(bounds.width, bounds.height) * 0.05;
const viewBoxMinX = bounds.minX - padding;
const viewBoxMinY = bounds.minY - padding;
const viewBoxWidth = bounds.width + padding * 2;
const viewBoxHeight = bounds.height + padding * 2;

const viewBox = `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`;
```

### Step 3: Generate React Native Component

Create component with **original path data** but **fitted viewBox**:

```typescript
import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

interface IconProps extends SvgProps {
  color?: string;
  strokeWidth?: number;
}

const SvgNewspaper = ({ color = "#000", strokeWidth = 0, ...props }: IconProps) => (
  <Svg viewBox="17.01 20.14 69.56 65.04" {...props}>
    <Path
      fill={color}
      stroke={color}
      strokeWidth={strokeWidth}
      d="M53.73,82.019c-9.068-.316-18.135..."
    />
  </Svg>
);
export default SvgNewspaper;
```

**Key points:**
- Path `d` attribute is copied **exactly** from source SVG
- `viewBox` is calculated to tightly fit the content
- Added `color` prop (controls both fill and stroke)
- Added `strokeWidth` prop (0 = filled only, >0 = outline thickness)

## The Tool: svg-viewbox-fitter.js

Located at: `/Users/malachyfernandez/Documents/1-programing/wolffspoint/scripts/svg-viewbox-fitter.js`

### Usage

```bash
node scripts/svg-viewbox-fitter.js [source-dir] [output-dir]
```

Defaults:
- Source: `/Users/malachyfernandez/Documents/1-programing/wolfspoint-extra/ideas and icons/vectors for icons`
- Output: `/Users/malachyfernandez/Documents/1-programing/wolffspoint/app/components/ui/icons`

### Processed Files

| Source SVG | Component | ViewBox (fitted) |
|------------|-----------|------------------|
| `Newspaper.svg` | `Newspaper.tsx` | `17.01 20.14 69.56 65.04` |
| `Nightly.svg` | `Nightly.tsx` | `17.93 18.31 60.06 59.66` |
| `Players.svg` | `Players.tsx` | `27.57 17.75 50.60 65.08` |
| `Roles.svg` | `Roles.tsx` | `16.48 13.16 64.26 73.81` |
| `RuleBook.svg` | `RuleBook.tsx` | `15.29 15.35 77.77 71.11` |
| `PhoneBookl.svg` | `PhoneBook.tsx` | `11.52 20.02 75.64 71.72` |
| `BetterTownSquare.svg` | `TownSquare.tsx` | `-4.52 -3.56 77.72 62.64` |
| `config.svg` | `Config.tsx` | `10.59 11.88 72.14 71.83` |
| `home.svg` | `Home.tsx` | `-5.00 -5.00 110.00 110.00` |

## Usage in GameTabBar

Icons are rendered with centralized control for size, color, and stroke:

```tsx
<GameTabBar
  activeTab={activeTab}
  onTabPress={setActiveTab}
  tabs={playerTabs}
  iconSize={36}           // Size in pixels
  iconStrokeWidth={2}     // Stroke thickness for bolder icons
/>
```

Color logic:
```tsx
const textColor = String(useCSSVariable('--color-text') || '#1a1a1a');
const goldPalette = guildedButtonRingPresets.gold;
const iconColor = isActive ? textColor : goldPalette.middle;
```

## Making Icons Thicker

To create bolder icons without modifying the SVG:

1. Set `iconStrokeWidth={2}` (or higher) in GameTabBar
2. The stroke is drawn in the same color as the fill
3. This creates an outline effect, making the icon appear thicker

## Tab Label Styling

Labels use Libre Baskerville font, uppercase:

```css
.guilded-game-tab-label {
  font-family: 'LibreBaskerville', serif;
  font-size: 8px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## Verification

After conversion, verify TypeScript compiles:
```bash
npx tsc --noEmit
```

## Why This Method Works

1. **Preserves original artwork** - Path data is never modified
2. **Proper centering** - ViewBox tightly fits content, so icon is centered
3. **Scalable** - SVG scales properly within its container
4. **Dynamic styling** - Color and strokeWidth props allow runtime customization
5. **Consistent** - All icons use same approach, just with different viewBox values

## Common Mistakes to Avoid

❌ **Don't transform path coordinates** - This corrupts the SVG data  
❌ **Don't standardize to `0 0 100 100`** - This stretches/distorts non-square icons  
❌ **Don't remove the viewBox entirely** - SVG won't scale properly  

✅ **Do calculate tight viewBox from actual bounds**  
✅ **Do preserve original path data exactly**  
✅ **Do add small padding (5%) for visual breathing room**
