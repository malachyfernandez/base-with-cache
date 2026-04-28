import React, { useState, useRef, useEffect } from 'react';
import { TextInput, Text, TextStyle, Pressable } from 'react-native';
import { useFonts } from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'bold';
type FontTextVarient = 'default' | 'heading' | 'subtext';
type TextColor = 'black' | 'white';

interface InlineEditableTextProps {
    value: string;
    onChange: (newValue: string) => void;
    className?: string;
    weight?: FontWeight;
    varient?: FontTextVarient;
    color?: TextColor;
    style?: TextStyle;
    placeholder?: string;
    onEditStart?: () => void;
    onEditEnd?: () => void;
    compact?: boolean;
    autoSelect?: boolean;
}

const InlineEditableText = ({
    value,
    onChange,
    className = '',
    weight = 'regular',
    varient = 'default',
    color = 'black',
    style,
    placeholder = '',
    onEditStart,
    onEditEnd,
    compact = false,
    autoSelect = true
}: InlineEditableTextProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [shouldSelect, setShouldSelect] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const [fontsLoaded] = useFonts({
        'Poppins-Regular': require('../../../../assets/fonts/Poppins/Poppins-Regular.ttf'),
        'Poppins-Medium': require('../../../../assets/fonts/Poppins/Poppins-Medium.ttf'),
        'Poppins-Bold': require('../../../../assets/fonts/Poppins/Poppins-Bold.ttf'),
    });

    // Update editValue when prop value changes (sync with external state)
    // Only update if we're not currently editing to avoid overwriting user input
    useEffect(() => {
        if (!isEditing) {
            setEditValue(value);
        }
    }, [value, isEditing]);

    const getFontFamily = () => {
        switch (weight) {
            case 'medium':
                return 'Poppins-Medium';
            case 'bold':
                return 'Poppins-Bold';
            default:
                return 'Poppins-Regular';
        }
    };

    const getTailwindColor = () => {
        return color === 'black' ? 'text-text' : 'text-white';
    };

    const getClassName = () => {
        let finalClassName = className;
        if (varient === 'subtext') {
            finalClassName += ' text-sm opacity-50';
        }
        return finalClassName;
    };

    const handlePress = () => {
        setIsEditing(true);
        setShouldSelect(autoSelect);
        onEditStart?.();
        // Focus the input on next frame
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    const handleSubmit = () => {
        if (editValue.trim() !== value) {
            onChange(editValue.trim());
        }
        setIsEditing(false);
        setShouldSelect(false);
        onEditEnd?.();
    };

    const handleBlur = () => {
        handleSubmit();
    };

    const handleKeyPress = (e: any) => {
        if (e.nativeEvent.key === 'Enter') {
            handleSubmit();
        }
    };

    if (isEditing) {
        return (
            <TextInput
                ref={inputRef}
                value={editValue}
                onChangeText={(text) => {
                    setEditValue(text);
                    // Clear selection after first character change
                    if (shouldSelect) {
                        setShouldSelect(false);
                    }
                }}
                onSubmitEditing={handleSubmit}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                multiline
                selection={shouldSelect ? { start: 0, end: editValue.length } : undefined}
                className={`border-2 bg-white rounded-lg text-base focus:outline-none ${
                    compact 
                        ? 'border-blue-400 p-1' 
                        : 'border-blue-500 p-3'
                }`}
                style={[
                    {
                        fontFamily: fontsLoaded ? getFontFamily() : undefined,
                        color: '#000000',
                        minWidth: compact ? 80 : 160,
                        minHeight: compact ? 24 : 60,
                        maxWidth: compact ? 120 : 1600,
                        maxHeight: compact ? 60 : 600,
                        position: 'absolute',
                        zIndex: 1000,
                        fontSize: 14,
                        textAlignVertical: 'center',
                    },
                    style
                ]}
                placeholderTextColor="#9CA3AF"
            />
        );
    }

    return (
        <Pressable onPress={handlePress}>
            <Text
                className={`${getTailwindColor()} ${getClassName()}`}
                style={{
                    fontFamily: fontsLoaded ? getFontFamily() : undefined,
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'dotted',
                    ...style
                }}
            >
                {value || (placeholder && (
                    <Text className="opacity-50">{placeholder}</Text>
                ))}
            </Text>
        </Pressable>
    );
};

export default InlineEditableText;
