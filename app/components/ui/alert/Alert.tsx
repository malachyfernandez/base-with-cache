import React from 'react';
import { View } from 'react-native';
import ConvexDialog from '../dialog/ConvexDialog';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';

export interface AlertButton {
    text: string;
    variant?: 'black' | 'green' | 'grey' | 'outline' | 'outline-alt';
    onPress: () => void;
    className?: string;
}

export interface AlertProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message?: string;
    buttons: AlertButton[];
    className?: string;
}

const Alert = ({
    isOpen,
    onOpenChange,
    title,
    message,
    buttons,
    className = 'p-6 max-w-sm mx-auto',
}: AlertProps) => {
        return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Trigger asChild>
                <View />
            </ConvexDialog.Trigger>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className={className}>
                    <Column className='gap-4'>
                        <FontText weight='bold' className='text-lg text-center'>
                            {title}
                        </FontText>
                        {message && (
                            <FontText className='text-center text-muted'>
                                {message}
                            </FontText>
                        )}
                        <Row className='gap-3 justify-center'>
                            {buttons.map((button, index) => (
                                <AppButton
                                    key={index}
                                    className={button.className || 'w-32 h-10'}
                                    variant={button.variant || 'black'}
                                    onPress={button.onPress}
                                >
                                    <FontText 
                                        color={button.variant === 'outline' ? 'black' : 'white'} 
                                        weight='medium'
                                    >
                                        {button.text}
                                    </FontText>
                                </AppButton>
                            ))}
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default Alert;
