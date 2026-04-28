import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
} from 'react-native-reanimated';

interface LoadingStateProps {
    children: React.ReactNode;
    delay?: number; // Default 200ms
    animationDuration?: number; // Default 300ms
}

const LoadingState = ({ 
    children, 
    delay = 200, 
    animationDuration = 300 
}: LoadingStateProps) => {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShouldShow(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    if (!shouldShow) {
        return null;
    }

    return (
        <Animated.View
            entering={FadeInUp.duration(animationDuration).springify()}
        >
            {children}
        </Animated.View>
    );
};

export default LoadingState;
