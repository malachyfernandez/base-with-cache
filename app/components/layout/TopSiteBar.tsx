import React from 'react';
import Column from './Column';
import Row from './Row';
import FontText from '../ui/text/FontText';

interface TopSiteBarProps {
    className?: string;
}

const TopSiteBar = ({ className = '' }: TopSiteBarProps) => {
    return (
        <Column className={`gap-4 ${className ?? ''}`.trim()}>
            <Row className='gap-4 justify-end items-center h-14 w-fit px-4 top-0 right-0'>
                <FontText weight='bold' className='text-lg'>Base Project</FontText>
            </Row>
        </Column>
    );
};

export default TopSiteBar;
