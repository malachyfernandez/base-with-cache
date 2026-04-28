import React, { useState } from 'react';
import FontDateInput from './FontDateInput';

interface SmartDateInputProps {
    placeholder?: string;
    className?: string;
    value: string;
    onChangeText: (value: string) => void;
    onIsValid: (isValid: boolean) => void;
    earliestDate?: Date | string;
    latestDate?: Date | string;
}

const SmartDateInput = ({ 
    placeholder = "MM/DD/YYYY",
    className = "",
    value,
    onChangeText,
    onIsValid,
    earliestDate,
    latestDate
}: SmartDateInputProps) => {
    const handleDateChange = (displayValue: string, isValid: boolean, canonicalValue: string | null) => {
        onChangeText(displayValue);
        onIsValid(isValid);
    };

    return (
        <FontDateInput
            placeholder={placeholder}
            className={className}
            value={value}
            onChangeText={handleDateChange}
            earliestDate={earliestDate}
            latestDate={latestDate}
        />
    );
};

export default SmartDateInput;
