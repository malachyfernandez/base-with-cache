import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TextInput, TextInputProps, TextStyle, View, Text } from 'react-native';
import { useFonts } from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'bold';

type DateBoundary = Date | string | undefined;

const WEIGHT_MAP: Record<FontWeight, '400' | '500' | '700'> = {
    regular: '400',
    medium: '500',
    bold: '700',
};

const normalizeBoundary = (boundary?: DateBoundary) => {
    if (!boundary) return undefined;
    const date = boundary instanceof Date ? boundary : new Date(boundary);
    if (Number.isNaN(date.getTime())) return undefined;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const isToday = (date?: Date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const isTomorrow = (date?: Date) => {
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
};

const isYesterday = (date?: Date) => {
    if (!date) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
};

const getRelativeDateLabel = (date?: Date) => {
    if (!date) return '';
    if (isToday(date)) return 'today';
    if (isTomorrow(date)) return 'tomorrow';
    if (isYesterday(date)) return 'yesterday';
    return formatBoundaryLabel(date);
};

const formatBoundaryLabel = (boundary?: Date) => {
    if (!boundary) return '';
    const month = (boundary.getMonth() + 1).toString().padStart(2, '0');
    const day = boundary.getDate().toString().padStart(2, '0');
    const year = boundary.getFullYear();
    return `${month}/${day}/${year}`;
};

interface FontDateInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
    className?: string;
    weight?: FontWeight;
    style?: TextStyle;
    value?: string;
    onChangeText?: (displayValue: string, isValid: boolean, canonicalValue: string | null) => void;
    placeholder?: string;
    earliestDate?: Date | string;
    latestDate?: Date | string;
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const FontDateInput = ({
    className = '',
    weight = 'regular',
    style,
    value = '',
    onChangeText,
    placeholder = "MM/DD/YYYY",
    earliestDate,
    latestDate,
    ...props
}: FontDateInputProps) => {
    const [fontsLoaded] = useFonts({
        'LibreBaskerville': require('../../../../assets/fonts/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf'),
    });

    const toRawDigits = (input?: string): string => (input ?? '').replace(/\D/g, '').slice(0, 8);

    const [inputValue, setInputValue] = useState(() => toRawDigits(value));

    useEffect(() => {
        setInputValue(toRawDigits(value));
    }, [value]);

    const currentYearDigits = useMemo(() => new Date().getFullYear().toString(), []);
    const currentYearNumber = useMemo(() => Number(currentYearDigits), [currentYearDigits]);

    const earliestBoundary = useMemo(() => normalizeBoundary(earliestDate), [earliestDate]);
    const latestBoundary = useMemo(() => normalizeBoundary(latestDate), [latestDate]);

    const getDisplayValue = (rawValue: string): string => {
        if (rawValue.length <= 2) return rawValue;
        if (rawValue.length <= 4) return rawValue.slice(0, 2) + '/' + rawValue.slice(2);
        return rawValue.slice(0, 2) + '/' + rawValue.slice(2, 4) + '/' + rawValue.slice(4);
    };

    const getMaxDay = (month: number, year: number) => new Date(year, month, 0).getDate();

    const isRealDate = (month: number, day: number, year: number) => {
        if (month < 1 || month > 12) return false;
        if (year < 1900 || year > 2100) return false;
        const maxDay = getMaxDay(month, year);
        return day >= 1 && day <= maxDay;
    };

    const buildCanonicalDigits = useCallback((rawValue: string): string | null => {
        if (rawValue.length < 4) return null;
        const month = Number(rawValue.slice(0, 2));
        const day = Number(rawValue.slice(2, 4));
        if (Number.isNaN(month) || Number.isNaN(day)) return null;

        if (rawValue.length > 4 && rawValue.length < 8) {
            return null; // wait for full year if the user started typing it
        }

        const yearDigits = rawValue.length === 8 ? rawValue.slice(4, 8) : currentYearDigits;
        const year = Number(yearDigits);
        if (!isRealDate(month, day, year)) return null;

        const candidateDate = new Date(year, month - 1, day);
        if (earliestBoundary && candidateDate < earliestBoundary) return null;
        if (latestBoundary && candidateDate > latestBoundary) return null;

        return rawValue.length === 8 ? rawValue : rawValue + yearDigits;
    }, [currentYearDigits, earliestBoundary, latestBoundary]);

    const getOrdinalSuffix = (day: number): string => {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };

    const helperText = useMemo(() => {
        if (inputValue.length === 0) {
            if (earliestBoundary && latestBoundary) {
                const earliestLabel = getRelativeDateLabel(earliestBoundary);
                const latestLabel = getRelativeDateLabel(latestBoundary);
                return `Date must be between ${earliestLabel} and ${latestLabel}`;
            }
            if (earliestBoundary) {
                const label = getRelativeDateLabel(earliestBoundary);
                if (isToday(earliestBoundary)) {
                    return 'Date must be today or later';
                }
                if (isTomorrow(earliestBoundary)) {
                    return 'Date must be tomorrow or later';
                }
                return `Date must be on or after ${label}`;
            }
            if (latestBoundary) {
                const label = getRelativeDateLabel(latestBoundary);
                if (isToday(latestBoundary)) {
                    return 'Date must be today or earlier';
                }
                if (isYesterday(latestBoundary)) {
                    return 'Date must be yesterday or earlier';
                }
                return `Date must be on or before ${label}`;
            }
            return 'Enter month (MM)';
        }

        const monthDigits = inputValue.slice(0, 2);
        const month = Number(monthDigits);
        if (monthDigits.length < 2) {
            return 'Enter month (MM)';
        }
        if (Number.isNaN(month) || month < 1 || month > 12) {
            return 'Use 01-12 for month';
        }

        const monthName = MONTH_NAMES[month];
        if (inputValue.length === 2) {
            return `${monthName} — add day`;
        }

        if (inputValue.length === 3) {
            return `${monthName} — add day`;
        }

        const dayDigits = inputValue.slice(2, 4);
        if (dayDigits.length < 2) {
            return `${monthName} — add day`;
        }

        const day = Number(dayDigits);
        const maxDay = getMaxDay(month, currentYearNumber);
        if (Number.isNaN(day) || day < 1 || day > maxDay) {
            if (month === 2) {
                return 'February has 28 days (29 on leap years)';
            }
            return `${monthName} has at most ${maxDay} days`;
        }

        const dayText = `${monthName} ${day}${getOrdinalSuffix(day)}`;

        if (inputValue.length === 4) {
            const candidateDate = new Date(currentYearNumber, month - 1, Number(dayDigits));
            if (earliestBoundary && candidateDate < earliestBoundary) {
                return `Date must be on or after ${formatBoundaryLabel(earliestBoundary)}`;
            }
            if (latestBoundary && candidateDate > latestBoundary) {
                return `Date must be on or before ${formatBoundaryLabel(latestBoundary)}`;
            }
            return `${dayText}, ${currentYearDigits}`;
        }

        if (inputValue.length > 4 && inputValue.length < 8) {
            const partialYear = inputValue.slice(4);
            return `${dayText}, ${partialYear}`;
        }

        if (inputValue.length >= 4) {
            const yearDigits = inputValue.length >= 8 ? inputValue.slice(4, 8) : currentYearDigits;
            const year = Number(yearDigits);
            const candidateDate = new Date(year, month - 1, Number(dayDigits));
            if (earliestBoundary && candidateDate < earliestBoundary) {
                return `Date must be on or after ${formatBoundaryLabel(earliestBoundary)}`;
            }
            if (latestBoundary && candidateDate > latestBoundary) {
                return `Date must be on or before ${formatBoundaryLabel(latestBoundary)}`;
            }
            if (inputValue.length === 8) {
                return `${dayText}, ${yearDigits}`;
            }
        }

        return dayText;
    }, [inputValue, currentYearDigits, currentYearNumber, earliestBoundary, latestBoundary]);

    const canonicalDigits = useMemo(() => buildCanonicalDigits(inputValue), [inputValue, buildCanonicalDigits]);
    const isValid = Boolean(canonicalDigits);
    const showError = inputValue.length >= 4 && !isValid;
    const showValidationError = inputValue.length >= 4 && !isValid && (earliestBoundary || latestBoundary);

    const handleChangeText = (text: string) => {
        const formatted = toRawDigits(text);
        setInputValue(formatted);

        if (onChangeText) {
            const canonical = buildCanonicalDigits(formatted);
            const canonicalDisplay = canonical ? getDisplayValue(canonical) : null;
            onChangeText(getDisplayValue(formatted), Boolean(canonical), canonicalDisplay);
        }
    };

    return (
        <View className="w-full">
            <TextInput
                className={`${className} focus:outline-none rounded ${showError ? 'border-red-500' : ''}`}
                style={{
                    fontFamily: fontsLoaded ? 'LibreBaskerville' : undefined,
                    fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
                    color: 'text',
                    ...style
                }}
                placeholderTextColor="#0006"
                value={getDisplayValue(inputValue)}
                onChangeText={handleChangeText}
                placeholder={placeholder}
                keyboardType="numeric"
                maxLength={10}
                {...props}
            />
            {helperText.length > 0 && (
                <Text
                    className={`text-sm mt-1 ${showValidationError ? 'text-red-500' : 'text-gray-600'}`}
                    style={{
                        fontFamily: fontsLoaded ? 'LibreBaskerville' : undefined,
                        fontWeight: '400'
                    }}
                >
                    {helperText}
                </Text>
            )}
        </View>
    );
};

export default FontDateInput;
