import React from 'react';
import { View } from 'react-native';

interface MonoIconsOptionsHorizontalProps {
    width?: number;
    height?: number;
    className?: string;
}

export const MonoIconsOptionsHorizontal: React.FC<MonoIconsOptionsHorizontalProps> = ({ 
    width = 24, 
    height = 24, 
    className = "" 
}) => {
    return (
        <View 
            style={{ 
                width, 
                height, 
                justifyContent: 'center', 
                alignItems: 'center',
                flexDirection: 'row'
            }}
            className={className}
        >
            <View
                style={{
                    width: width * 0.15,
                    height: height * 0.15,
                    borderRadius: (width * 0.15) / 2,
                    backgroundColor: 'currentColor',
                    marginHorizontal: width * 0.1
                }}
            />
            <View
                style={{
                    width: width * 0.15,
                    height: height * 0.15,
                    borderRadius: (width * 0.15) / 2,
                    backgroundColor: 'currentColor',
                    marginHorizontal: width * 0.1
                }}
            />
            <View
                style={{
                    width: width * 0.15,
                    height: height * 0.15,
                    borderRadius: (width * 0.15) / 2,
                    backgroundColor: 'currentColor',
                    marginHorizontal: width * 0.1
                }}
            />
        </View>
    );
};

export default MonoIconsOptionsHorizontal;
