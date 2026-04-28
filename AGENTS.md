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
