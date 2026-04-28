/**
 * StateAnimatedView - A compound component system for state-based animations
 * 
 * This component provides a declarative API for managing animations that trigger
 * only when the attached state variable changes to specific values. Unlike React's
 * entering/exiting animations, these animations are unaffected by component mounting/unmounting
 * and only respond to state changes.
 * 
 * @example Basic Usage
 * ```tsx
 * <StateAnimatedView.Container stateVar={showSidebar} className='flex-1'>
 *   <StateAnimatedView.Option 
 *     stateValue={true}
 *     onValue={FadeInLeft.duration(100)}
 *     onNotValue={FadeOutLeft.duration(100)}
 *   >
 *     <SidebarContent />
 *   </StateAnimatedView.Option>
 *   
 *   <StateAnimatedView.Option 
 *     stateValue={false}
 *     onValue={FadeInLeft.duration(100)}
 *     onNotValue={FadeOutLeft.duration(100)}
 *   >
 *     <ButtonContent />
 *   </StateAnimatedView.Option>
 * </StateAnimatedView.Container>
 * ```
 * 
 * @component StateAnimatedView.Container
 * The root container that manages the current active state and coordinates animations.
 * 
 * @props {TState} stateVar - The current active state value
 * @props {string} className - Optional CSS classes for styling
 * @props {ReactNode} children - Option components
 * 
 * @component StateAnimatedView.Option
 * Represents a content option that animates based on state value changes.
 * 
 * @props {TState} stateValue - The state value that activates this option
 * @props {ReactNode} children - Content to render when this option's state value matches
 * @props {AnimationConfig} onValue - Animation to play when state becomes this value
 * @props {AnimationConfig} onNotValue - Animation to play when state changes away from this value
 * 
 * @animation Behavior
 * - Animations only trigger when the stateVar changes
 * - No entering/exiting animations - immune to component mount/unmount
 * - onValue triggers when state becomes this option's stateValue
 * - onNotValue triggers when state changes from this option's stateValue to something else
 * - Only one option renders at a time based on matching stateValue
 */

import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    EntryExitAnimationFunction,
    BaseAnimationBuilder,
} from 'react-native-reanimated';

type StateKey = string | number | boolean | null | undefined;

export interface AnimationConfig {
    duration?: number;
    opacity?: [number, number];
    x?: [number, number];
    y?: [number, number];
    scale?: [number, number];
}

// Union type to support both AnimationConfig and Reanimated animation builders
type AnimationType = AnimationConfig | BaseAnimationBuilder;

interface StateAnimatedViewContainerProps<TState extends StateKey> extends PropsWithChildren {
    stateVar: TState;
    className?: string;
}

interface StateAnimatedViewOptionProps<TState extends StateKey> extends PropsWithChildren {
    stateValue: TState;
    onValue?: AnimationType;
    onNotValue?: AnimationType;
    className?: string;
}

type ResolvedOption<TState extends StateKey> = {
    stateValue: TState;
    onValue?: AnimationType;
    onNotValue?: AnimationType;
    className?: string;
    children: ReactNode;
};

const DEFAULT_DURATION = 250;
const NO_ANIMATION: AnimationConfig = {};

const isReanimatedBuilder = (animation: AnimationType): animation is BaseAnimationBuilder => {
    return typeof animation === 'object' && 'build' in animation;
};

const getDuration = (animation: AnimationConfig) => animation.duration ?? DEFAULT_DURATION;

const getValuePair = (value?: [number, number], fallbackStart = 0, fallbackEnd = 0) => {
    return value ?? [fallbackStart, fallbackEnd];
};

const applyAnimation = (
    animation: AnimationType,
    opacity: SharedValue<number>,
    translateX: SharedValue<number>,
    translateY: SharedValue<number>,
    scale: SharedValue<number>,
) => {
    if (isReanimatedBuilder(animation)) {
        // For reanimated builders, we need to extract the animation configuration
        const animationName = (animation as any).constructor?.name || '';
        const duration = (animation as any).durationMs || DEFAULT_DURATION; // Extract duration if set
        
        if (animationName.includes('FadeIn')) {
            opacity.value = 0;
            opacity.value = withTiming(1, { duration });
        } else if (animationName.includes('FadeOut')) {
            opacity.value = 1;
            opacity.value = withTiming(0, { duration });
        } else if (animationName.includes('ZoomIn')) {
            opacity.value = 0;
            scale.value = 0.8;
            opacity.value = withTiming(1, { duration });
            scale.value = withTiming(1, { duration });
        } else if (animationName.includes('ZoomOut')) {
            opacity.value = 1;
            scale.value = 1;
            opacity.value = withTiming(0, { duration });
            scale.value = withTiming(0.8, { duration });
        } else {
            // Default fade for unknown animations
            opacity.value = withTiming(1, { duration });
        }
        
        // Reset other properties
        if (!animationName.includes('Zoom')) {
            translateX.value = 0;
            translateY.value = 0;
            scale.value = 1;
        } else {
            translateX.value = 0;
            translateY.value = 0;
        }
    } else {
        // Handle existing AnimationConfig objects
        const [opacityStart, opacityEnd] = getValuePair(animation.opacity, 1, 1);
        const [xStart, xEnd] = getValuePair(animation.x, 0, 0);
        const [yStart, yEnd] = getValuePair(animation.y, 0, 0);
        const [scaleStart, scaleEnd] = getValuePair(animation.scale, 1, 1);
        const duration = getDuration(animation);

        opacity.value = opacityStart;
        translateX.value = xStart;
        translateY.value = yStart;
        scale.value = scaleStart;

        opacity.value = withTiming(opacityEnd, { duration });
        translateX.value = withTiming(xEnd, { duration });
        translateY.value = withTiming(yEnd, { duration });
        scale.value = withTiming(scaleEnd, { duration });
    }
};

const StateAnimatedViewOption = <TState extends StateKey>(_props: StateAnimatedViewOptionProps<TState>) => null;

const collectOptions = <TState extends StateKey>(
    children: ReactNode,
): ResolvedOption<TState>[] => {
    const options: ResolvedOption<TState>[] = [];

    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) {
            return;
        }

        if (child.type === React.Fragment) {
            options.push(
                ...collectOptions<TState>(
                    (child.props as PropsWithChildren).children,
                ),
            );
            return;
        }

        if (child.type === StateAnimatedViewOption) {
            const optionProps = child.props as StateAnimatedViewOptionProps<TState>;
            options.push({
                stateValue: optionProps.stateValue,
                onValue: optionProps.onValue,
                onNotValue: optionProps.onNotValue,
                className: optionProps.className,
                children: optionProps.children,
            });
        }
    });

    return options;
};

const StateAnimatedViewContainer = <TState extends StateKey>({
    stateVar,
    className,
    children,
}: StateAnimatedViewContainerProps<TState>) => {
    const options = useMemo(() => collectOptions<TState>(children), [children]);
    const currentOption = options.find((option) => option.stateValue === stateVar);
    const currentContent = currentOption?.children ?? null;

    const previousStateRef = useRef<TState | undefined>(undefined);
    const previousOptionRef = useRef<ResolvedOption<TState> | undefined>(currentOption);

    const opacity = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        };
    });

    useEffect(() => {
        const previousState = previousStateRef.current;
        const previousOption = previousOptionRef.current;

        if (previousState == null) {
            // Initial render - no animation
            applyAnimation(NO_ANIMATION, opacity, translateX, translateY, scale);
            previousStateRef.current = stateVar;
            previousOptionRef.current = currentOption;
            return;
        }

        if (previousState !== stateVar) {
            // State changed - trigger appropriate animations
            
            // Animate the previous option away (if it exists)
            if (previousOption?.onNotValue) {
                applyAnimation(previousOption.onNotValue, opacity, translateX, translateY, scale);
            }
            
            // Animate the current option in (if it exists and is different from previous)
            if (currentOption && currentOption.stateValue !== previousState && currentOption.onValue) {
                applyAnimation(currentOption.onValue, opacity, translateX, translateY, scale);
            } else if (!currentOption?.onNotValue && !currentOption?.onValue) {
                // No animation specified, reset to default
                applyAnimation(NO_ANIMATION, opacity, translateX, translateY, scale);
            }
        }

        previousStateRef.current = stateVar;
        previousOptionRef.current = currentOption;
    }, [currentContent, currentOption, opacity, scale, translateX, translateY, stateVar]);

    return (
        <View className={className} style={styles.container}>
            <Animated.View style={[styles.fill, animatedStyle]} className={currentOption?.className}>
                {currentContent}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    fill: {
        flex: 1,
    },
});

const StateAnimatedView = {
    Container: StateAnimatedViewContainer,
    Option: StateAnimatedViewOption,
};

export default StateAnimatedView;
