import React from 'react';
import { View } from 'react-native';
import FontText from '../../text/FontText';

interface AppDropdownEmptyStateProps {
    className?: string;
    text: string;
}

const AppDropdownEmptyState = ({ className = '', text }: AppDropdownEmptyStateProps) => {
    return (
        <View className='px-4 py-4'>
            <FontText variant='subtext' className={`text-center opacity-60 ${className}`.trim()}>
                {text}
            </FontText>
        </View>
    );
};

export default AppDropdownEmptyState;
