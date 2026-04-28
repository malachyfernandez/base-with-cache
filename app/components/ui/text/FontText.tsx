import React, { PropsWithChildren } from 'react';
import { Text, TextStyle, LayoutChangeEvent } from 'react-native';
import { useFonts } from 'expo-font';
import { useCSSVariable } from 'uniwind';

type FontWeight = 'regular' | 'medium' | 'bold';
type FontTextVariant = 'default' | 'heading' | 'subtext' | 'cardHeader' | 'lowercaseCardHeader';
type TextColor = 'black' | 'white' | 'red';

interface FontTextProps extends PropsWithChildren {
    className?: string;
    weight?: FontWeight;
    variant?: FontTextVariant;
    color?: TextColor | string | 'text-inverted';
    style?: TextStyle;
    onLayout?: (event: LayoutChangeEvent) => void;
}

const WEIGHT_MAP: Record<FontWeight, '400' | '500' | '700'> = {
    regular: '400',
    medium: '500',
    bold: '700',
};

const FontText = ({
    children,
    className = '',
    weight = 'regular',
    variant = 'default',
    color = '',
    style,
    onLayout
}: FontTextProps) => {
    const [fontsLoaded] = useFonts({
        'LibreBaskerville': require('../../../../assets/fonts/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf'),
    });

    const resolvedColor = String(useCSSVariable(`--color-${color}`) || color);

    if (variant === 'subtext') {
        className += ' text-xs opacity-70';
    }

    if (variant === 'cardHeader') {
        className += ' text-xs opacity-70 uppercase tracking-wider';
    }

    if (variant === 'lowercaseCardHeader') {
        className += ' text-xs opacity-70 tracking-wider';
    }

    if (!fontsLoaded) {
        return (
            <Text
                className={`text-text ${className}`}
                style={{ color: resolvedColor, ...style }}
                onLayout={onLayout}
            >
                {children}
            </Text>
        );
    }

    return (
        <Text
            className={`text-text ${className}`}
            style={{
                fontFamily: 'LibreBaskerville',
                fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
                color: resolvedColor,
                ...style
            }}
            onLayout={onLayout}
        >
            {children}
        </Text>
    );
};

export default FontText;
