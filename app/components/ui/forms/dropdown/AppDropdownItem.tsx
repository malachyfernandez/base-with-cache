import React from 'react';
import { Platform, Pressable } from 'react-native';
import FontText from '../../text/FontText';

interface AppDropdownItemProps {
    className?: string;
    isSelected: boolean;
    label: string;
    onSelect: () => void;
    selectedClassName?: string;
}

const AppDropdownItem = ({ className = '', isSelected, label, onSelect, selectedClassName = '' }: AppDropdownItemProps) => {
    const stateClassName = isSelected
        ? `bg-accent-hover ${selectedClassName}`.trim()
        : 'bg-background active:bg-border/10';

    if (Platform.OS === 'web') {
        return React.createElement(
            'button',
            {
                type: 'button',
                role: 'option',
                'aria-selected': isSelected,
                onClick: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                    event.preventDefault?.();
                    event.stopPropagation?.();
                    onSelect();
                },
                onMouseDown: (event: { preventDefault?: () => void; stopPropagation?: () => void }) => {
                    event.preventDefault?.();
                    event.stopPropagation?.();
                },
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
                    className: `w-full rounded px-3 py-3 text-left ${stateClassName} ${className}`.trim(),
                },
                <FontText weight={isSelected ? 'medium' : 'regular'}>
                    {label}
                </FontText>
            )
        );
    }

    return (
        <Pressable className={`w-full rounded px-3 py-3 ${stateClassName} ${className}`.trim()} onPress={onSelect}>
            <FontText weight={isSelected ? 'medium' : 'regular'}>
                {label}
            </FontText>
        </Pressable>
    );
};

export default AppDropdownItem;
