import React from 'react';
import Column from '../layout/Column';

interface PaperContainerProps {
    children: React.ReactNode;
}

const PaperContainer = ({ children }: PaperContainerProps) => {
    return (
        <Column className='gap-4 w-full bg-background border-2 border-border rounded-xl p-4'>
            {children}
        </Column>
    );
};

export default PaperContainer;
