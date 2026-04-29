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
        <Column className={`gap-0 bg-text p-4 items-center -m-5 rounded-t-sm mb-0 ${className || ''}`}>
            <FontText weight='medium' color='text-inverted'>{text}</FontText>
            {subtext && (
                <FontText variant='subtext' weight='medium' color='text-inverted'>{subtext}</FontText>
            )}
        </Column>
    );
};

export default DialogHeader;
