import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    selectedStateAppearance?: 'negative' | 'positive';
}

const CustomCheckbox = ({ checked, onChange, selectedStateAppearance = 'negative' }: CheckboxProps) => {
    const isPositiveSelected = selectedStateAppearance === 'positive';
    const isSelectedGreen = checked ? isPositiveSelected : !isPositiveSelected;
    const iconText = checked ? (isPositiveSelected ? '✓' : '×') : null;
    const iconStyle = isPositiveSelected ? styles.checkText : styles.xText;

    return (
        <TouchableOpacity
            onPress={() => onChange(!checked)}
            style={[
                styles.checkbox,
                isSelectedGreen ? styles.greenState : styles.redState
            ]}
        >
            {iconText && (
                <View style={styles.xContainer}>
                    <Text style={iconStyle}>{iconText}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    redState: {
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
    },
    greenState: {
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
    },
    xContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    xText: {
        color: '#991b1b',
        fontSize: 16,
        fontWeight: 'bold',
    },
    checkText: {
        color: '#166534',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CustomCheckbox;
