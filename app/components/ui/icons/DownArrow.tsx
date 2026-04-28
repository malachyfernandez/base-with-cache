import React from 'react';
import { View, StyleSheet } from 'react-native';

interface DownArrowProps {
    size?: number;
    color?: string;
    className?: string;
}

const DownArrow = ({ size = 24, color = 'currentColor', className = '' }: DownArrowProps) => {
    const styles = StyleSheet.create({
        container: {
            width: size,
            height: size,
            justifyContent: 'center',
            alignItems: 'center',
        },
        arrow: {
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: size * 0.4,
            borderRightWidth: size * 0.4,
            borderTopWidth: size * 0.6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
            transform: [{ rotate: '0deg' }],
        },
        staff: {
            width: size * 0.2,
            height: size * 0.15,
            backgroundColor: color,
            marginBottom: -2,
        }
    });

    return (
        <View style={styles.container} className={className}>
            <View style={styles.staff} />
            <View style={styles.arrow} />
        </View>
    );
};

export default DownArrow;
