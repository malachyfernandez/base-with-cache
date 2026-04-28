import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform, TextInput, TextInputProps, TextStyle } from 'react-native';
import { useFonts } from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'bold';

interface FontTextInputProps extends TextInputProps {
    className?: string;
    weight?: FontWeight;
    style?: TextStyle;
    autoGrow?: boolean;
    variant?: 'default' | 'styled';
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    onSubmitEditing?: (event: any) => void;
    submitBehavior?: 'submit' | 'newline';
}

const WEIGHT_MAP: Record<FontWeight, '400' | '500' | '700'> = {
    regular: '400',
    medium: '500',
    bold: '700',
};

const FontTextInput = ({
    className = '',
    weight = 'regular',
    style,
    autoGrow = false,
    variant = 'default',
    onChangeText,
    value,
    placeholder,
    onKeyDown,
    onSubmitEditing,
    submitBehavior,
    ...props
}: FontTextInputProps) => {
    const [fontsLoaded] = useFonts({
        'LibreBaskerville': require('../../../../assets/fonts/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf'),
    });
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const resizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
        if (!textarea) {
            return;
        }

        textarea.style.height = '0px';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    const getVariantClasses = () => {
        switch (variant) {
            case 'styled':
                return 'border-b-2 border-text/50 px-2 bg-text/5';
            default:
                return '';
        }
    };

    useLayoutEffect(() => {
        if (Platform.OS !== 'web' || !autoGrow || !textareaRef.current) {
            return;
        }

        const animationFrame = window.requestAnimationFrame(() => {
            resizeTextarea(textareaRef.current);
        });

        return () => {
            window.cancelAnimationFrame(animationFrame);
        };
    }, [autoGrow, fontsLoaded, resizeTextarea, value]);

    if (Platform.OS === 'web' && autoGrow) {
        return (
            <textarea
                ref={textareaRef}
                placeholder={placeholder}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => {
                    resizeTextarea(event.currentTarget);
                    onChangeText?.(event.target.value);
                }}
                onKeyDown={(event) => {
                    onKeyDown?.(event);

                    if (event.defaultPrevented) {
                        return;
                    }

                    if (submitBehavior === 'submit' && event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        onSubmitEditing?.({
                            nativeEvent: {
                                text: typeof value === 'string' ? value : '',
                            },
                        } as any);
                    }
                }}
                rows={1}
                className={`${className} ${getVariantClasses()} focus:outline-none rounded resize-none overflow-hidden`}
                style={{
                    fontFamily: fontsLoaded ? 'LibreBaskerville' : undefined,
                    fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
                    ...(style as React.CSSProperties),
                    minHeight: 44
                }}
            />
        );
    }

    return (
        <TextInput
            className={`${className} ${getVariantClasses()} text-text focus:outline-none rounded`}
            style={{
                fontFamily: fontsLoaded ? 'LibreBaskerville' : undefined,
                fontWeight: WEIGHT_MAP[weight] as '400' | '500' | '700',
                // color: 'black',
                ...style
            }}
            placeholderTextColor="rgb(0 0 0 / 0.3)"
            value={value}
            placeholder={placeholder}
            onChangeText={onChangeText}
            {...props}
        />
    );
};

export default FontTextInput;
