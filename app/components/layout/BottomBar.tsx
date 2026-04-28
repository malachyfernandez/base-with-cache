import React, { PropsWithChildren } from 'react';

import Row from './Row';

interface BottomBarProps extends PropsWithChildren {
    className?: string;
}

const BottomBar = ({ children, className }: BottomBarProps) => {
    return (
        <Row className={`gap-4 p-4 -mb-1 sm:p-6 border-t w-full flex-wrap border-subtle-border justify-between ${className}`}>
            {children}
        </Row>
    );
};

export default BottomBar;
