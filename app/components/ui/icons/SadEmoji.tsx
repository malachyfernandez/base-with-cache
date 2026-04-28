import { type ComponentProps, useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, G, Rect, Mask } from 'react-native-svg';

type SadEmojiProps = ComponentProps<typeof Svg> & {
 size?: number;
 lineWidth?: number;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function SadEmoji({ size = 24, lineWidth = 2, ...props }: SadEmojiProps) {
  const maskId = useMemo(
    () => `sadEmojiMask-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const outlineDashOffset = useSharedValue(64);
  const leftEyeDashOffset = useSharedValue(2);
  const rightEyeDashOffset = useSharedValue(2);
  const mouthDashOffset = useSharedValue(12);
  const tearFillOpacity = useSharedValue(0);
  const tearHighlightOpacity = useSharedValue(0);

  useEffect(() => {
    outlineDashOffset.value = 64;
    leftEyeDashOffset.value = 2;
    rightEyeDashOffset.value = 2;
    mouthDashOffset.value = 12;
    tearFillOpacity.value = 0;
    tearHighlightOpacity.value = 0;

    outlineDashOffset.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    leftEyeDashOffset.value = withDelay(
      700,
      withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
    rightEyeDashOffset.value = withDelay(
      900,
      withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
    mouthDashOffset.value = withDelay(
      1100,
      withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
    tearFillOpacity.value = withDelay(
      900,
      withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
    tearHighlightOpacity.value = withDelay(
      900,
      withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [
    leftEyeDashOffset,
    mouthDashOffset,
    outlineDashOffset,
    rightEyeDashOffset,
    tearFillOpacity,
    tearHighlightOpacity,
  ]);

  const outlineAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: outlineDashOffset.value,
  }));

  const leftEyeAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: leftEyeDashOffset.value,
  }));

  const rightEyeAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: rightEyeDashOffset.value,
  }));

  const mouthAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: mouthDashOffset.value,
  }));

  const tearFillAnimatedProps = useAnimatedProps(() => ({
    fillOpacity: tearFillOpacity.value,
  }));

  const tearHighlightAnimatedProps = useAnimatedProps(() => ({
    fillOpacity: tearHighlightOpacity.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...props}>{/* Icon from Material Line Icons by Vjacheslav Trushkin - https://github.com/cyberalien/line-md/blob/master/license.txt */}
      <Mask id={maskId}>
        <G
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={lineWidth}
        >
          <AnimatedPath
            animatedProps={outlineAnimatedProps}
            strokeDasharray="64"
            strokeDashoffset={64}
            d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"
          />
          <AnimatedPath
            animatedProps={leftEyeAnimatedProps}
            strokeDasharray="2"
            strokeDashoffset={2}
            d="M9 9v1"
          />
          <AnimatedPath
            animatedProps={rightEyeAnimatedProps}
            strokeDasharray="2"
            strokeDashoffset={2}
            d="M15 9v1"
          />
          <AnimatedPath
            animatedProps={mouthAnimatedProps}
            strokeDasharray="12"
            strokeDashoffset={12}
            d="M8 16c0.5 -1 1.79 -2 4 -2c2.21 0 3.5 1 4 2"
          />
          <AnimatedPath
            animatedProps={tearFillAnimatedProps}
            fill="#000"
            fillOpacity={0}
            stroke="none"
            d="M9.55 12c1.19 1.88 2.45 4.18 2.45 5.5c0 2.5 -2 4.5 -4.5 4.5c-2.5 0 -4.5 -2 -4.5 -4.5c0 -1.32 1.26 -3.62 2.45 -5.5Z"
          />
          <AnimatedPath
            animatedProps={tearHighlightAnimatedProps}
            fill="#fff"
            fillOpacity={0}
            stroke="none"
            d="M7.5 13c0 0 2.5 3.12 2.5 4.5c0 1.38 -1.12 2.5 -2.5 2.5c-1.38 0 -2.5 -1.12 -2.5 -2.5c0 -1.38 2.5 -4.5 2.5 -4.5Z"
          />
        </G>
      </Mask>
      <Rect width="24" height="24" fill="currentColor" mask={`url(#${maskId})`} />
    </Svg>
  );
}

export default SadEmoji;