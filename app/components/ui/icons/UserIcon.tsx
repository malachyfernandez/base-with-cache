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

interface UserIconProps {
  size?: number;
  color?: string | 'accent';
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function UserIcon({ size = 24, color = '#1a1a1a' }: UserIconProps) {
  const resolvedColor = String(useCSSVariable(`--color-${color}`) || color);
  const bodyDashOffset = useSharedValue(28);
  const headDashOffset = useSharedValue(28);

  useEffect(() => {
    bodyDashOffset.value = 28;
    headDashOffset.value = 28;

    bodyDashOffset.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    headDashOffset.value = withDelay(
      400,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [bodyDashOffset, headDashOffset]);

  const bodyAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: bodyDashOffset.value,
  }));

  const headAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: headDashOffset.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Icon from Material Line Icons by Vjacheslav Trushkin - https://github.com/cyberalien/line-md/blob/master/license.txt */}
      <G
        fill="none"
        stroke={resolvedColor}
        strokeDasharray="28"
        strokeDashoffset="28"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <AnimatedPath
          animatedProps={bodyAnimatedProps}
          strokeDasharray="28"
          strokeDashoffset={28}
          d="M4 21v-1c0 -3.31 2.69 -6 6 -6h4c3.31 0 6 2.69 6 6v1"
        />
        <AnimatedPath
          animatedProps={headAnimatedProps}
          strokeDasharray="28"
          strokeDashoffset={28}
          d="M12 11c-2.21 0 -4 -1.79 -4 -4c0 -2.21 1.79 -4 4 -4c2.21 0 4 1.79 4 4c0 2.21 -1.79 4 -4 4Z"
        />
      </G>
    </Svg>
  );
}

export default UserIcon;