import React, { forwardRef } from 'react';
import { Platform, View } from 'react-native';

interface AppDropdownMenuProps {
    children: React.ReactNode;
    className?: string;
    id?: string;
    onClick?: (event: any) => void;
    onMouseDown?: (event: any) => void;
    role?: string;
    style?: any;
}

const AppDropdownMenu = forwardRef<any, AppDropdownMenuProps>(({ children, className = '', id, onClick, onMouseDown, role = 'listbox', style }, ref) => {
    if (Platform.OS === 'web') {
        return React.createElement(
            'div',
            {
                ref,
                id,
                className: `rounded border border-subtle-border bg-background p-1 shadow-overlay ${className}`.trim(),
                onClick,
                onMouseDown,
                role,
                style,
            },
            children
        );
    }

    return (
        <View ref={ref} className={`rounded border border-subtle-border bg-background p-1 shadow-overlay ${className}`.trim()} style={style}>
            {children}
        </View>
    );
});

AppDropdownMenu.displayName = 'AppDropdownMenu';

export default AppDropdownMenu;
