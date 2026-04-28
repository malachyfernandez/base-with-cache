import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface FadeInAfterDelayProps {
    delayMs?: number;
    fadeDuration?: number;
    children: React.ReactNode;
}

const FadeInAfterDelay = ({
    delayMs = 1000,
    fadeDuration = 300,
    children,
}: FadeInAfterDelayProps) => {
    const opacity = useSharedValue(.01);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    useEffect(() => {
        const fadeInTimer = setTimeout(() => {
            opacity.value = withTiming(1, { duration: fadeDuration });
        }, delayMs);

        return () => clearTimeout(fadeInTimer);
    }, [delayMs, fadeDuration, opacity]);

    return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default FadeInAfterDelay;
