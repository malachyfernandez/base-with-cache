/**
 * AppButton - A versatile button component with multiple visual variants
 * 
 * This component provides a consistent button interface across the app with
 * built-in press animations, multiple styling variants, and accessibility features.
 * 
 * @example Basic Usage
 * ```tsx
 * <AppButton onPress={handlePress}>
 *   <FontText>Click me</FontText>
 * </AppButton>
 * ```
 * 
 * @example Different Variants
 * ```tsx
 * <AppButton variant="outline" onPress={handleCancel}>
 *   <FontText>Cancel</FontText>
 * </AppButton>
 * 
 * <AppButton variant="accent" onPress={handleSubmit}>
 *   <FontText color="white">Submit</FontText>
 * </AppButton>
 * 
 * <AppButton variant="grey" onPress={handleDelete}>
 *   <FontText color="white">Delete</FontText>
 * </AppButton>
 * ```
 * 
 * @props {React.ReactNode} children - Content to display inside the button
 * @props {'outline' | 'outline-alt' | 'filled' | 'grey' | 'accent' | 'red'} variant - Visual style variant (default: 'outline-alt')
 * @props {string} className - Additional CSS classes for styling
 * @props {() => void} onPress - Function called when button is pressed
 * @props {boolean} dropShadow - Whether to show drop shadow (default: true)
 * @props {boolean} disabled - Whether the button is disabled (default: false)
 * 
 * @variants
 * - outline: Similar to outline but with lighter hover effect (default)
 * - outline-alt: Transparent background with border, hover effect fills background
 * - filled: Solid text background with brightness hover effect
 * - grey: Solid grey background (#374559ae) with brightness hover effect
 * - accent: Solid accent background with brightness hover effect
 * - red: Transparent background with red border and red text styling
 * 
 * @features
 * - Built-in press animation with brightness changes
 * - TouchableOpacity with proper active opacity
 * - Consistent sizing (h-10) and rounded corners
 * - Proper accessibility with pointerEvents handling
 * - Gap spacing for internal content layout
 * 
 * @styling Notes
 * - Uses flexbox layout for consistent content alignment
 * - Base styles include overflow-hidden and rounded corners
 * - Press states use brightness filters for visual feedback
 * - Drop shadow can be disabled for cleaner designs
 */
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Row from '../../layout/Row';
import { BlurView } from 'expo-blur';

interface AppButtonProps {
    children: React.ReactNode;
    variant?: 'outline-alt' | 'outline' | 'outline-accent' | 'outline-accent-light' | 'outline-invert' | 'filled' | 'grey' | 'red' | 'none' | 'black' | 'green';
    className?: string;
    onPress?: () => void;
    dropShadow?: boolean;
    disabled?: boolean;
    blurred?: boolean;
}

const AppButton = ({
    children,
    variant = 'outline',
    className = '',
    onPress,
    dropShadow = true,
    disabled = false,
    blurred = false,
}: AppButtonProps) => {
    const [isPressed, setIsPressed] = useState(false);

    const baseStyles = 'h-12 flex-row items-center justify-center rounded gap-2 overflow-hidden';
    let extraStyles = '';

    let pressedStyles = 'brightness-50';

    if (variant === 'outline-alt') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-border ${bg} group hover:bg-border`;

    } else if (variant === 'outline') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-border ${bg} group hover:bg-border/10`;

    } else if (variant === 'outline-accent') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-accent ${bg} group hover:bg-accent/10`;

    } else if (variant === 'outline-accent-light') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-accent-light ${bg} group hover:bg-accent-light/10`;

    } else if (variant === 'outline-invert') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-text-inverted ${bg} group hover:bg-text-inverted/10`;

    } else if (variant === 'grey') {
        const bg = 'bg-[#374559ae]';
        extraStyles = bg;
        pressedStyles = 'brightness-80';
    } else if (variant === 'none') {
        const bg = 'bg-none';
        extraStyles = bg;
        pressedStyles = 'brightness-100';
    } else if (variant === 'green') {
        const bg = 'bg-accent';
        extraStyles = `${bg} group hover:bg-accent-hover active:brightness-75`;
    } else if (variant === 'filled') {
        const bg = 'bg-text';
        extraStyles = `${bg} group hover:brightness-150 active:brightness-50`;
    } else if (variant === 'black') {
        const bg = 'bg-text';
        extraStyles = `${bg} group hover:brightness-150 active:brightness-50`;
    } else if (variant === 'red') {
        const bg = 'bg-none';
        extraStyles = `border-2 border-red-500 ${bg} group hover:bg-red-500/10`;
    } else {
        const bg = 'bg-text';
        extraStyles = `${bg} group hover:brightness-150 active:brightness-50`;
    }



    const buttonContent = (
        <TouchableOpacity
            className={`${baseStyles} ${extraStyles} ${className} ${isPressed ? pressedStyles : ''} ${disabled ? 'opacity-50' : ''}`}
            onPressIn={() => !disabled && setIsPressed(true)}
            onPressOut={() => !disabled && setIsPressed(false)}
            onPress={disabled ? undefined : onPress}
            activeOpacity={disabled ? 1 : 0.8}
            disabled={disabled}
        >
            <Row className="gap-4 items-center justify-center w-full h-full" pointerEvents='none'>
                {children}
            </Row>

        </TouchableOpacity>
    );

    return blurred ? (
        <BlurView intensity={20} className='rounded'>
            {buttonContent}
        </BlurView>
    ) : buttonContent;
};

export default AppButton;
