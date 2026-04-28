import React from 'react';
import { Svg, Path } from 'react-native-svg';

interface SendSVGProps {
    size?: number;
    color?: string;
    className?: string;
}

const SendSVG = ({ size = 32, color = 'white', className }: SendSVGProps) => {
    return (
        <Svg 
            width={size} 
            height={size} 
            viewBox="0 0 32 32" 
            fill="none" 
            className={className}
        >
            <Path 
                d="M2.66675 28L30.6667 16L2.66675 4V13.3333L22.6667 16L2.66675 18.6667V28Z" 
                fill={color}
            />
        </Svg>
    );
};

export default SendSVG;
