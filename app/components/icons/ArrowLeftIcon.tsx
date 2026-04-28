import React, { useEffect } from 'react';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ArrowLeftIconProps {
  size?: number;
  color?: string;
}

export function ArrowLeftIcon({ size = 24, color = 'currentColor' }: ArrowLeftIconProps) {
  // Animation shared value - only for the arrow head now
  const arrowDashOffset = useSharedValue(10);

  useEffect(() => {
    // Animate the arrow head (no delay needed since there's no shaft)
    arrowDashOffset.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const arrowAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arrowDashOffset.value,
  }));

  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24"
    >
      <G 
        fill="none" 
        stroke={color} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2"
      >
        <AnimatedPath
          animatedProps={arrowAnimatedProps}
          strokeDasharray="10"
          strokeDashoffset={10}
          d="M5 12l5 5M5 12l5 -5"
        />
      </G>
    </Svg>
  );
}

export default ArrowLeftIcon;
