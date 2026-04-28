import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import Column from '../../layout/Column';
import LoadingText from './LoadingText';

// Type for useValue / useList result shape
type UserVarResult<T = unknown> = {
    state?: {
        isSyncing?: boolean;
    };
    value?: T;
} | undefined;

// Type for useFindValues / useFindListItems result (array or undefined)
type UserVarGetResult<T = unknown> = Array<{ value: T }> | undefined;

// Type for the dependency items we accept
type DependencyItem = UserVarResult<unknown> | UserVarGetResult<unknown> | boolean | undefined;

interface LoadingContainerProps {
    children: React.ReactNode;
    /** Array of variables to check - can be useValue results, useList results,
     *  useFindValues results, useFindListItems results, or boolean flags */
    dependencies: DependencyItem[];
    /** Text to show in LoadingText while loading */
    loadingText: string;
    /** Optional delay before showing loading text (ms) */
    loadingDelayMs?: number;
    /** Container className for styling (applied to both loading and content containers) */
    className?: string;
    /** Fade-in animation duration (ms), default 300 */
    fadeInDuration?: number;
}

/**
 * LoadingContainer - A generic loading wrapper that fades in content once all dependencies are ready.
 * 
 * Checks each dependency:
 * - undefined → loading (useFindValues/useFindListItems still fetching)
 * - { state: { isSyncing: true } } → loading (useValue/useList still syncing)
 * - false boolean → loading (explicit flag)
 * - Anything else → ready
 *
 * @example
 * ```tsx
 * const [profile] = useValue('profile');
 * const posts = useFindListItems('posts');
 *
 * <LoadingContainer
 *   dependencies={[profile, posts]}
 *   loadingText="Loading..."
 *   className='flex-1 min-h-[760px] pb-8'
 * >
 *   <ProfileContent profile={profile.value} posts={posts} />
 * </LoadingContainer>
 * ```
 */
const LoadingContainer = ({
    children,
    dependencies,
    loadingText,
    loadingDelayMs,
    className = '',
    fadeInDuration = 300,
}: LoadingContainerProps) => {
    const isLoading = dependencies.some((dep) => {
        // undefined means still loading (useFindValues/useFindListItems)
        if (dep === undefined) return true;

        // Check for isSyncing in state (useValue/useList results)
        if (typeof dep === 'object' && dep !== null && 'state' in dep) {
            const state = (dep as UserVarResult)?.state;
            if (state?.isSyncing === true) return true;
        }

        // false boolean means loading
        if (dep === false) return true;

        return false;
    });

    if (isLoading) {
        return (
            <Column className={`gap-7 items-center justify-center ${className}`}>
                <LoadingText text={loadingText} delayMs={loadingDelayMs} />
            </Column>
        );
    }

    return (
        <Animated.View 
            entering={FadeIn.duration(fadeInDuration)}
            className={className}
        >
            {children}
        </Animated.View>
    );
};

export default LoadingContainer;
