/**
 * LayoutStateAnimatedView - A compound component system for layout-based screen transitions
 * 
 * This component provides a declarative API for managing layout screen transitions based on
 * page hierarchy and directional animations. Unlike traditional state-based animation
 * systems, this uses a page-tree approach where animations are determined by the
 * relative position of pages in the component tree.
 * 
 * @example Basic Usage
 * ```tsx
 * <LayoutStateAnimatedView.Container stateVar={currentScreen} className='flex-1'>
 *   <LayoutStateAnimatedView.Option page={1} stateValue='allGames'>
 *     <AllGamesPage />
 *   </LayoutStateAnimatedView.Option>
 *   
 *   <LayoutStateAnimatedView.OptionContainer page={2} pushInAnimation={fromRight}>
 *     <LayoutStateAnimatedView.Option stateValue='game'>
 *       <GamePage />
 *     </LayoutStateAnimatedView.Option>
 *   </LayoutStateAnimatedView.OptionContainer>
 * </LayoutStateAnimatedView.Container>
 * ```
 * 
 * @example Custom Animation Direction
 * ```tsx
 * <LayoutStateAnimatedView.OptionContainer page={3} pushInAnimation={fromTop}>
 *   <LayoutStateAnimatedView.Option stateValue='settings'>
 *     <SettingsPage />
 *   </LayoutStateAnimatedView.Option>
 * </LayoutStateAnimatedView.OptionContainer>
 * ```
 * 
 * @component LayoutStateAnimatedView.Container
 * The root container that manages the current active state and coordinates transitions.
 * 
 * @props {TState} stateVar - The current active state value
 * @props {string} className - Optional CSS classes for styling
 * @props {ReactNode} children - Option and OptionContainer components
 * 
 * @component LayoutStateAnimatedView.Option
 * Represents a single screen/page in the navigation hierarchy.
 * 
 * @props {TState} stateValue - The state value that activates this option
 * @props {number} page - Page number (inherited from OptionContainer if not provided)
 * @props {ReactNode} children - Content to render when this option is active
 * 
 * @component LayoutStateAnimatedView.OptionContainer
 * Groups options with shared animation settings and page numbering.
 * The higher-numbered page's pushInAnimation controls both forward and backward transitions.
 * 
 * @props {number} page - Page number for determining animation direction
 * @props {LayoutStateAnimatedViewPushInAnimation} pushInAnimation - Animation preset (defaults to fromRight)
 * @props {ReactNode} children - Option components within this container
 * 
 * @animation Behavior
 * - Only adjacent page changes animate (page difference of exactly 1)
 * - Same-page changes and non-adjacent jumps render with no animation
 * - The higher-numbered page's pushInAnimation determines the transition direction
 * - Elements are completely removed from DOM after exit animation completes
 * 
 * @animation Presets
 * - fromRight: Enter from right, exit to left (default)
 * - fromLeft: Enter from left, exit to right  
 * - fromTop: Enter from top, exit to bottom
 * - fromBottom: Enter from bottom, exit to top
 * 
 * @performance Notes
 * - Leaving elements have pointerEvents='none' during transition
 * - DOM cleanup happens exactly when exit animation completes
 * - No performance overhead from hidden elements after transition
 */
import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

type TransitionStateKey = string;

export type LayoutStateAnimatedViewAnimation = {
    duration?: number;
    opacity?: [number, number];
    x?: [number, number];
    y?: [number, number];
    scale?: [number, number];
};

type LayoutStateAnimatedViewTransition = {
    entering: LayoutStateAnimatedViewAnimation;
    exiting: LayoutStateAnimatedViewAnimation;
};

export type LayoutStateAnimatedViewPushInAnimation = {
    forward: LayoutStateAnimatedViewTransition;
    backward: LayoutStateAnimatedViewTransition;
};

interface LayoutStateAnimatedViewContainerProps<TState extends TransitionStateKey> extends PropsWithChildren {
    stateVar: TState;
    className?: string;
}

interface LayoutStateAnimatedViewOptionProps<TState extends TransitionStateKey> extends PropsWithChildren {
    stateValue: TState;
    page?: number;
}

interface LayoutStateAnimatedViewOptionContainerProps extends PropsWithChildren {
    page: number;
    pushInAnimation?: LayoutStateAnimatedViewPushInAnimation;
}

type ResolvedOption<TState extends TransitionStateKey> = {
    stateValue: TState;
    page: number;
    pushInAnimation?: LayoutStateAnimatedViewPushInAnimation;
    children: ReactNode;
};

type LeavingContent = {
    key: string;
    children: ReactNode;
};

const DEFAULT_DURATION = 250;

const NO_ANIMATION_TRANSITION: LayoutStateAnimatedViewTransition = {
    entering: {},
    exiting: {},
};

const getDuration = (animation: LayoutStateAnimatedViewAnimation) => animation.duration ?? DEFAULT_DURATION;

const getValuePair = (value?: [number, number], fallbackStart = 0, fallbackEnd = 0) => {
    return value ?? [fallbackStart, fallbackEnd];
};

const applyAnimation = (
    animation: LayoutStateAnimatedViewAnimation,
    opacity: SharedValue<number>,
    translateX: SharedValue<number>,
    translateY: SharedValue<number>,
    scale: SharedValue<number>,
) => {
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
};

const createTransition = (
    entering: LayoutStateAnimatedViewAnimation,
    exiting: LayoutStateAnimatedViewAnimation,
): LayoutStateAnimatedViewTransition => ({
    entering,
    exiting,
});

const createPushInAnimation = (
    forward: LayoutStateAnimatedViewTransition,
    backward: LayoutStateAnimatedViewTransition,
): LayoutStateAnimatedViewPushInAnimation => ({
    forward,
    backward,
});

const enterFromBottom = (duration = 350, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    y: [distance, 0],
});

const enterFromRight = (duration = 300, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    x: [distance, 0],
});

const enterFromLeft = (duration = 300, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    x: [-distance, 0],
});

const enterFromTop = (duration = 350, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [0, 1],
    y: [-distance, 0],
});

const exitToBottom = (duration = 250, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    y: [0, distance],
});

const exitToTop = (duration = 250, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    y: [0, -distance],
});

const exitToLeft = (duration = 250, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    x: [0, -distance],
});

const exitToRight = (duration = 250, distance = 24): LayoutStateAnimatedViewAnimation => ({
    duration,
    opacity: [1, 0],
    x: [0, distance],
});

const fromRight = createPushInAnimation(
    createTransition(enterFromRight(), exitToLeft()),
    createTransition(enterFromLeft(), exitToRight()),
);

const fromLeft = createPushInAnimation(
    createTransition(enterFromLeft(), exitToRight()),
    createTransition(enterFromRight(), exitToLeft()),
);

const fromTop = createPushInAnimation(
    createTransition(enterFromTop(), exitToBottom()),
    createTransition(enterFromBottom(), exitToTop()),
);

const fromBottom = createPushInAnimation(
    createTransition(enterFromBottom(), exitToTop()),
    createTransition(enterFromTop(), exitToBottom()),
);

const LayoutStateAnimatedViewOption = <TState extends TransitionStateKey>(_props: LayoutStateAnimatedViewOptionProps<TState>) => null;

const LayoutStateAnimatedViewOptionContainer = (_props: LayoutStateAnimatedViewOptionContainerProps) => null;

const collectOptions = <TState extends TransitionStateKey>(
    children: ReactNode,
    inheritedPage?: number,
    inheritedPushInAnimation?: LayoutStateAnimatedViewPushInAnimation,
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
                    inheritedPage,
                    inheritedPushInAnimation,
                ),
            );
            return;
        }

        if (child.type === LayoutStateAnimatedViewOptionContainer) {
            const optionContainerProps = child.props as LayoutStateAnimatedViewOptionContainerProps;

            options.push(
                ...collectOptions<TState>(
                    optionContainerProps.children,
                    optionContainerProps.page,
                    optionContainerProps.pushInAnimation ?? fromRight,
                ),
            );
            return;
        }

        if (child.type === LayoutStateAnimatedViewOption) {
            const optionProps = child.props as LayoutStateAnimatedViewOptionProps<TState>;
            const page = optionProps.page ?? inheritedPage;

            if (page == null) {
                return;
            }

            options.push({
                stateValue: optionProps.stateValue,
                page,
                pushInAnimation: inheritedPushInAnimation,
                children: optionProps.children,
            });
        }
    });

    return options;
};

const getTransitionForPageChange = <TState extends TransitionStateKey>(
    previousOption?: ResolvedOption<TState>,
    nextOption?: ResolvedOption<TState>,
) => {
    if (!previousOption || !nextOption) {
        return null;
    }

    if (previousOption.page === nextOption.page) {
        return null;
    }

    if (Math.abs(previousOption.page - nextOption.page) !== 1) {
        return null;
    }

    const higherPageOption = previousOption.page > nextOption.page ? previousOption : nextOption;
    const pushInAnimation = higherPageOption.pushInAnimation;

    if (!pushInAnimation) {
        return null;
    }

    return nextOption.page > previousOption.page ? pushInAnimation.forward : pushInAnimation.backward;
};

const LayoutStateAnimatedViewContainer = <TState extends TransitionStateKey>({
    stateVar,
    className,
    children,
}: LayoutStateAnimatedViewContainerProps<TState>) => {
    const options = useMemo(() => collectOptions<TState>(children), [children]);
    const currentOption = options.find((option) => option.stateValue === stateVar);
    const currentContent = currentOption?.children ?? null;

    const previousStateRef = useRef<TState | undefined>(undefined);
    const previousOptionRef = useRef<ResolvedOption<TState> | undefined>(currentOption);
    const previousContentRef = useRef<ReactNode>(currentContent);
    const leavingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [leavingContent, setLeavingContent] = useState<LeavingContent | null>(null);

    const enteringOpacity = useSharedValue(1);
    const enteringTranslateX = useSharedValue(0);
    const enteringTranslateY = useSharedValue(0);
    const enteringScale = useSharedValue(1);
    const leavingOpacity = useSharedValue(1);
    const leavingTranslateX = useSharedValue(0);
    const leavingTranslateY = useSharedValue(0);
    const leavingScale = useSharedValue(1);

    const enteringStyle = useAnimatedStyle(() => {
        return {
            opacity: enteringOpacity.value,
            transform: [
                { translateX: enteringTranslateX.value },
                { translateY: enteringTranslateY.value },
                { scale: enteringScale.value },
            ],
        };
    });

    const leavingStyle = useAnimatedStyle(() => {
        return {
            opacity: leavingOpacity.value,
            transform: [
                { translateX: leavingTranslateX.value },
                { translateY: leavingTranslateY.value },
                { scale: leavingScale.value },
            ],
        };
    });

    useEffect(() => {
        const previousState = previousStateRef.current;

        if (previousState == null) {
            applyAnimation(NO_ANIMATION_TRANSITION.entering, enteringOpacity, enteringTranslateX, enteringTranslateY, enteringScale);
            previousStateRef.current = stateVar;
            previousOptionRef.current = currentOption;
            previousContentRef.current = currentContent;
            return;
        }

        if (previousState !== stateVar) {
            if (leavingTimeoutRef.current) {
                clearTimeout(leavingTimeoutRef.current);
            }

            const activeTransition = getTransitionForPageChange(previousOptionRef.current, currentOption);

            if (!activeTransition || previousContentRef.current == null) {
                setLeavingContent(null);
                applyAnimation(NO_ANIMATION_TRANSITION.entering, enteringOpacity, enteringTranslateX, enteringTranslateY, enteringScale);
                applyAnimation(NO_ANIMATION_TRANSITION.exiting, leavingOpacity, leavingTranslateX, leavingTranslateY, leavingScale);
            } else {
                setLeavingContent({
                    key: `${String(previousState)}-${String(stateVar)}-${Date.now()}`,
                    children: previousContentRef.current,
                });

                applyAnimation(activeTransition.entering, enteringOpacity, enteringTranslateX, enteringTranslateY, enteringScale);
                applyAnimation(activeTransition.exiting, leavingOpacity, leavingTranslateX, leavingTranslateY, leavingScale);

                leavingTimeoutRef.current = setTimeout(() => {
                    setLeavingContent(null);
                }, getDuration(activeTransition.exiting));
            }
        }

        previousStateRef.current = stateVar;
        previousOptionRef.current = currentOption;
        previousContentRef.current = currentContent;
    }, [currentContent, currentOption, enteringOpacity, enteringScale, enteringTranslateX, enteringTranslateY, leavingOpacity, leavingScale, leavingTranslateX, leavingTranslateY, stateVar]);

    useEffect(() => {
        return () => {
            if (leavingTimeoutRef.current) {
                clearTimeout(leavingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <View className={className} style={styles.container}>
            {leavingContent ? (
                <Animated.View
                    key={leavingContent.key}
                    pointerEvents='none'
                    style={[styles.overlay, leavingStyle]}
                >
                    {leavingContent.children}
                </Animated.View>
            ) : null}

            <Animated.View key={String(stateVar)} style={[styles.fill, enteringStyle]}>
                {currentContent}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    fill: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
});

const LayoutStateAnimatedView = {
    Container: LayoutStateAnimatedViewContainer,
    Option: LayoutStateAnimatedViewOption,
    OptionContainer: LayoutStateAnimatedViewOptionContainer,
};

export {
    createPushInAnimation,
    fromBottom,
    fromLeft,
    fromRight,
    fromTop,
};

export default LayoutStateAnimatedView;
