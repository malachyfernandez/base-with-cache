import React from 'react';
import { Svg, Path } from 'react-native-svg';

interface CloseIconSVGProps {
    size?: number;
}

const CloseIconSVG = ({ size = 32 }: CloseIconSVGProps) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path 
                d="M18 6L6 18M6 6l12 12" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
        </Svg>
    );
};

export default CloseIconSVG;
