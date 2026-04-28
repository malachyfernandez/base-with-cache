import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import Row from '../../layout/Row';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { ListIcon } from '../../icons/ListIcon';

interface PagesButtonProps {
    onPress?: () => void;
}

export function PagesButton({ onPress }: PagesButtonProps) {
    // Animation for the sidebar reminder
    const sidebarAnimation = useSharedValue(0);
    
    useEffect(() => {
        const animateSidebar = () => {
            sidebarAnimation.value = withTiming(-2, {
                duration: 500,
                easing: Easing.inOut(Easing.ease),
            }, () => {
                sidebarAnimation.value = withTiming(2, {
                    duration: 500,
                    easing: Easing.inOut(Easing.ease),
                });
            });
        };

        // Start animation immediately, then repeat every 1500ms
        const interval = setInterval(animateSidebar, 1500);
        animateSidebar(); // Start first animation immediately

        return () => clearInterval(interval);
    }, []);

    const sidebarAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sidebarAnimation.value }],
    }));

    return (
        <TouchableOpacity 
        className='bg-inner-background border-y-2 border-r-2 border-border w-16 h-12 shadow-black/50 rounded-r-full justify-center items-center my-4 mr-4 pl-1' 
        style={{ shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 40 }}
        onPress={onPress}
    >
            <Row className='gap-0'>
                <Animated.View style={sidebarAnimatedStyle}>
                    <ArrowLeftIcon size={20} color="#000" />
                </Animated.View>
                <ListIcon size={20} color="#000" />
            </Row>
        </TouchableOpacity>
    );
}

export default PagesButton;
