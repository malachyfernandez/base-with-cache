import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, G } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

interface HomeIconProps {
  size?: number;
  color?: string | 'accent';
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function HomeIcon({ size = 24, color = '#1a1a1a' }: HomeIconProps) {
  const resolvedColor = String(useCSSVariable(`--color-${color}`) || color);

  // Animate in order: base (0.2s), walls (0.2s delay), door (0.4s delay), roof (0.5s delay)
  const baseDashOffset = useSharedValue(16);
  const wallsDashOffset = useSharedValue(14);
  const doorDashOffset = useSharedValue(24);
  const roofDashOffset = useSharedValue(28);

  useEffect(() => {
    // Reset to initial values
    baseDashOffset.value = 16;
    wallsDashOffset.value = 14;
    doorDashOffset.value = 24;
    roofDashOffset.value = 28;

    // Base line: no delay, 0.2s duration
    baseDashOffset.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });

    // Walls: 0.2s delay, 0.2s duration
    wallsDashOffset.value = withDelay(
      200,
      withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Door: 0.4s delay, 0.4s duration
    doorDashOffset.value = withDelay(
      400,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Roof: 0.5s delay, 0.6s duration
    roofDashOffset.value = withDelay(
      500,
      withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [baseDashOffset, wallsDashOffset, doorDashOffset, roofDashOffset]);

  const baseAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: baseDashOffset.value,
  }));

  const wallsAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: wallsDashOffset.value,
  }));

  const doorAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: doorDashOffset.value,
  }));

  const roofAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: roofDashOffset.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Icon from Material Line Icons by Vjacheslav Trushkin - https://github.com/cyberalien/line-md/blob/master/license.txt */}
      <G fill="none" stroke={resolvedColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <AnimatedPath
          animatedProps={baseAnimatedProps}
          strokeDasharray="16"
          strokeDashoffset={16}
          d="M5 21h14"
        />
        <AnimatedPath
          animatedProps={wallsAnimatedProps}
          strokeDasharray="14"
          strokeDashoffset={14}
          d="M5 21v-13M19 21v-13"
        />
        <AnimatedPath
          animatedProps={doorAnimatedProps}
          strokeDasharray="24"
          strokeDashoffset={24}
          d="M9 21v-8h6v8"
        />
        <AnimatedPath
          animatedProps={roofAnimatedProps}
          strokeDasharray="28"
          strokeDashoffset={28}
          d="M2 10l10 -8l10 8"
        />
      </G>
    </Svg>
  );
}

export default HomeIcon;
