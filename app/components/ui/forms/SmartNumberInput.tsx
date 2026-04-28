import React from 'react';
import FontNumberInput from './FontNumberInput';

interface SmartNumberInputProps {
    placeholder?: string;
    className?: string;
    value: string;
    onChangeText: (value: string) => void;
    onIsValid: (isValid: boolean) => void;
    minValue?: number;
    maxValue?: number;
}

const SmartNumberInput = ({ 
    placeholder = "Enter number",
    className = "",
    value,
    onChangeText,
    onIsValid,
    minValue,
    maxValue
}: SmartNumberInputProps) => {
    const handleNumberChange = (displayValue: string, isValid: boolean, numericValue: number | null) => {
        onChangeText(displayValue);
        onIsValid(isValid);
    };

    return (
        <FontNumberInput
            placeholder={placeholder}
            className={className}
            value={value}
            onChangeText={handleNumberChange}
            minValue={minValue}
            maxValue={maxValue}
        />
    );
};

export default SmartNumberInput;
