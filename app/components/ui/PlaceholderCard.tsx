import React from 'react';
import Column from '../layout/Column';

interface PlaceholderCardProps {
    children: React.ReactNode;
}

/**
 * Generic placeholder card container with consistent styling.
 * Provides rounded corners, subtle background, padding, and centered layout.
 * Content (icon, text, buttons) should be passed as children.
 */
const PlaceholderCard = ({ children }: PlaceholderCardProps) => {
    return (
        <Column className='gap-5 items-center justify-center py-16'>
            <Column className='gap-5 rounded-3xl bg-text/5 px-16 py-8 max-w-md items-center'>
                {children}
            </Column>
        </Column>
    );
};

export default PlaceholderCard;
