import React from 'react';
import { View, StyleSheet } from 'react-native';

interface UpArrowProps {
    size?: number;
    color?: string;
    className?: string;
}

const UpArrow = ({ size = 24, color = 'currentColor', className = '' }: UpArrowProps) => {
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
            borderBottomWidth: size * 0.6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            transform: [{ rotate: '0deg' }],
        },
        staff: {
            width: size * 0.2,
            height: size * 0.15,
            backgroundColor: color,
            marginTop: -2,
        }
    });

    return (
        <View style={styles.container} className={className}>
            <View style={styles.arrow} />
            <View style={styles.staff} />
        </View>
    );
};

export default UpArrow;
