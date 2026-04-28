import React from 'react';
import Column from '../../layout/Column';
import FontText from '../text/FontText';

interface DialogHeaderProps {
    text: string;
    subtext?: string;
    className?: string;
}

const DialogHeader = ({ text, subtext, className }: DialogHeaderProps) => {
    return (
        <Column className={`gap-0 bg-text px-5 py-4 items-center -mx-5 -mt-5 mb-5 ${className || ''}`.trim()}>
            <FontText weight='medium' color='white'>{text}</FontText>
            {subtext && (
                <FontText variant='subtext' weight='medium' color='white'>{subtext}</FontText>
            )}
        </Column>
    );
};

export default DialogHeader;
