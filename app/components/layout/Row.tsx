import React, { PropsWithChildren } from 'react';
import { View, ViewStyle, Text } from 'react-native';
import { mergeGapStyle } from './gapStyle';

interface RowProps extends PropsWithChildren {
    className?: string;
    pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
    onLayout?: (event: any) => void;
    style?: ViewStyle;
}

const normalizeChildren = (children: React.ReactNode) => {
    return React.Children.map(children, (child) => {
        if (typeof child === 'string') {
            const trimmedChild = child.trim();
            return trimmedChild ? <Text>{trimmedChild}</Text> : null;
        }

        if (typeof child === 'number') {
            return <Text>{child}</Text>;
        }

        return child;
    });
};

const Row = ({ children, className, pointerEvents, onLayout, style }: RowProps) => {
    return (
        <View className={`flex-row ${className}`} style={mergeGapStyle(className, style)} pointerEvents={pointerEvents} onLayout={onLayout}>
            {normalizeChildren(children)}
        </View>
    );
};

export default Row;
