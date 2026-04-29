
import React, { PropsWithChildren } from 'react';
import { Text } from 'react-native';

interface BigTextProps extends PropsWithChildren {
    className?: string;
}

const BigText = ({ children, className }: BigTextProps) => {
    return (
        <Text className={`text-8xl font-bold text-text-inverted ${className}`}>
            {children}
        </Text>
    );
};

export default BigText;