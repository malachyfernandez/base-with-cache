import React from 'react';
import Column from '../../layout/Column';
import Row from '../../layout/Row';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import ConvexDialog from './ConvexDialog';
import DialogHeader from './DialogHeader';

interface UnsavedChangesDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onStay: () => void;
    onLeave: () => void;
}

const UnsavedChangesDialog = ({ isOpen, onOpenChange, onStay, onLeave }: UnsavedChangesDialogProps) => {
        return (
        <ConvexDialog.Root isOpen={isOpen} onOpenChange={onOpenChange}>
            <ConvexDialog.Portal>
                <ConvexDialog.Overlay />
                <ConvexDialog.Content className='max-w-md p-6'>
                    <DialogHeader text="Unsaved Changes" />
                    <Column className='gap-4 pt-4'>
                        <FontText className='text-center'>
                            You have unsaved changes. Are you sure you want to leave without saving?
                        </FontText>
                        <Row className='gap-4 justify-center pt-4'>
                            <AppButton variant='outline' className='w-24' onPress={onStay}>
                                <FontText weight='medium'>Stay</FontText>
                            </AppButton>
                            <AppButton variant='filled' className='w-24' onPress={onLeave}>
                                <FontText weight='medium' color='white'>Leave</FontText>
                            </AppButton>
                        </Row>
                    </Column>
                </ConvexDialog.Content>
            </ConvexDialog.Portal>
        </ConvexDialog.Root>
    );
};

export default UnsavedChangesDialog;
