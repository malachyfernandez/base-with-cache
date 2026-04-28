import React, { useEffect, useState } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import FontText from '../text/FontText';

interface LoadingTextProps {
    text: string;
    delayMs?: number;
    fadeDuration?: number;
}

const LoadingText = ({
    text,
    delayMs = 1000,
    fadeDuration = 300,
}: LoadingTextProps) => {
    const [dots, setDots] = useState(1);
    const opacity = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    useEffect(() => {
        const fadeInTimer = setTimeout(() => {
            opacity.value = withTiming(1, { duration: fadeDuration });
        }, delayMs);

        return () => clearTimeout(fadeInTimer);
    }, [delayMs, fadeDuration, opacity]);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((current) => (current % 3) + 1);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    const dotsText = '.'.repeat(dots);

    return (
        <Animated.View style={animatedStyle}>
            <FontText weight='medium' className='bg-text-inverted/20 p-4 rounded-2xl'>
                {text}{dotsText}
            </FontText>
        </Animated.View>
    );
};

export default LoadingText;
