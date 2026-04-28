import React from 'react';
import { View } from 'react-native';
import AppButton from './AppButton';
import FontText from '../text/FontText';
import StatusButton from '../StatusButton';

interface DisableableButtonProps {
    isEnabled: boolean;
    enabledText: string;
    disabledText: string;
    onPress: () => void;
    className?: string;
    enabledVariant?: 'filled' | 'grey' | 'outline' | 'outline-alt' | 'accent';
}

const DisableableButton = ({
    isEnabled,
    enabledText,
    disabledText,
    onPress,
    className = '',
    enabledVariant = 'filled',
}: DisableableButtonProps) => {
    return isEnabled ? (
        <AppButton 
            className={`w-32 h-12 ${className}`} 
            variant={enabledVariant} 
            onPress={onPress}
        >
            <FontText color={enabledVariant === 'outline' || enabledVariant === 'outline-alt' ? 'black' : 'white'} weight='medium'>
                {enabledText}
            </FontText>
        </AppButton>
    ) : (
        <StatusButton 
            buttonText={enabledText}
            buttonAltText={disabledText}
            className={`w-32 h-12 ${className}`}
        />
    );
};

export default DisableableButton;
