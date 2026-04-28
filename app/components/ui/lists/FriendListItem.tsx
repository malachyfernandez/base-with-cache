import React from 'react';
import FontText from '../text/FontText';
import { useFindValues } from 'hooks/useData';
import Column from '../../layout/Column';
import Row from '../../layout/Row';

interface FriendListItemProps {
    friend: string;
}

const FriendListItem = ({ friend }: FriendListItemProps) => {
    const friendData = useFindValues("userData", {
        userIds: [friend],
    });

    const email = friendData?.[0]?.value.email;
    const userId = friendData?.[0]?.value.userId;
    const name = friendData?.[0]?.value.name;


    return (
        <Column className='gap-1'>
            {email && (
                <Row className='gap-4'>
                    <FontText weight='bold'>{email}</FontText>
                </Row>
            )}
            {name && (
                <Row className='gap-4'>
                    <FontText>{name}</FontText>
                </Row>
            )}
            {userId && (
                <Row className='gap-4'>
                    <FontText className='text-sm opacity-50'>{`User ID: ${userId}`}</FontText>
                </Row>
            )}
            
        </Column>
    );
};

export default FriendListItem;
