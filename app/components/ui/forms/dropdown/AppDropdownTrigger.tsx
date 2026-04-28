import React, { forwardRef } from 'react';
import { Platform, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import FontText from '../../text/FontText';

interface AppDropdownTriggerProps {
    className?: string;
    isOpen: boolean;
    isPlaceholder: boolean;
    label: string;
    onPress?: () => void;
    [key: string]: any;
}

const AppDropdownTrigger = forwardRef<any, AppDropdownTriggerProps>(
    ({ className = '', isOpen, isPlaceholder, label, onPress, ...props }, ref) => {
        if (Platform.OS === 'web') {
            return React.createElement(
                'button',
                {
                    ref,
                    type: 'button',
                    'aria-expanded': isOpen,
                    'aria-haspopup': 'listbox',
                    onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                        event.preventDefault?.();
                        event.stopPropagation?.();
                        onPress?.();
                    },
                    onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                        event.preventDefault?.();
                        event.stopPropagation?.();
                    },
                    ...props,
                    style: {
                        appearance: 'none',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        margin: 0,
                        padding: 0,
                        textAlign: 'left',
                        width: '100%',
                    },
                },
                React.createElement(
                    'div',
                    {
                        className: `w-full flex items-center justify-between rounded border border-subtle-border bg-background px-3 py-3 text-left ${className}`.trim(),
                    },
                    <>
                        <FontText weight='medium' className={isPlaceholder ? 'opacity-60' : ''}>
                            {label}
                        </FontText>
                        <ChevronDown size={18} color='rgb(46, 41, 37)' />
                    </>
                )
            );
        }

        return (
            <Pressable ref={ref} onPress={onPress} className={`w-full flex-row items-center justify-between rounded border border-subtle-border bg-background px-3 py-3 ${className}`.trim()} {...props}>
                <FontText weight='medium' className={isPlaceholder ? 'opacity-60' : ''}>
                    {label}
                </FontText>
                <ChevronDown size={18} color='rgb(46, 41, 37)' />
            </Pressable>
        );
    }
);

AppDropdownTrigger.displayName = 'AppDropdownTrigger';

export default AppDropdownTrigger;
