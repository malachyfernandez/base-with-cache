import React from 'react';
import { Svg, Path } from 'react-native-svg';

interface ChevronUpIconProps {
    size?: number;
    color?: string;
    className?: string;
}

const ChevronUpIcon = ({ size = 24, color = 'currentColor', className = '' }: ChevronUpIconProps) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <Path 
                d="M7 14L12 9L17 14" 
                stroke={color} 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
        </Svg>
    );
};

export default ChevronUpIcon;
