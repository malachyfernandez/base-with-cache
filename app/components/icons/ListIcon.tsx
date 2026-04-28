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

interface ListIconProps {
  size?: number;
  color?: string;
}

export function ListIcon({ size = 24, color = 'currentColor' }: ListIconProps) {
  // Animation shared values - start at initial values from the animate tags
  const line1DashOffset = useSharedValue(14);
  const line2DashOffset = useSharedValue(12);
  const line3DashOffset = useSharedValue(20);
  const line4DashOffset = useSharedValue(14);

  useEffect(() => {
    // Animate each line with the same timing as the original SVG
    line1DashOffset.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    
    line2DashOffset.value = withDelay(200, withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    }));
    
    line3DashOffset.value = withDelay(400, withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    }));
    
    line4DashOffset.value = withDelay(600, withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    }));
  }, []);

  const line1AnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: line1DashOffset.value,
  }));

  const line2AnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: line2DashOffset.value,
  }));

  const line3AnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: line3DashOffset.value,
  }));

  const line4AnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: line4DashOffset.value,
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
          animatedProps={line1AnimatedProps}
          strokeDasharray="14"
          strokeDashoffset={14}
          d="M4 5h13"
        />
        <AnimatedPath
          animatedProps={line2AnimatedProps}
          strokeDasharray="12"
          strokeDashoffset={12}
          d="M4 10h10"
        />
        <AnimatedPath
          animatedProps={line3AnimatedProps}
          strokeDasharray="20"
          strokeDashoffset={20}
          d="M4 15h16"
        />
        <AnimatedPath
          animatedProps={line4AnimatedProps}
          strokeDasharray="14"
          strokeDashoffset={14}
          d="M4 20h13"
        />
      </G>
    </Svg>
  );
}

export default ListIcon;
