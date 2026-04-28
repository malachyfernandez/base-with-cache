import React from 'react';
import { Svg, Path } from 'react-native-svg';

interface ChevronDownIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const ChevronDownIcon = ({ size = 24, color = 'currentColor', className = '' }: ChevronDownIconProps) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <Path 
                d="M7 10L12 15L17 10" 
                stroke={color} 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
        </Svg>
    );
};

export default ChevronDownIcon;
