import React from 'react';
import FontText from './FontText';
import { useFindValues } from 'hooks/useData';

interface NameFromUserIDProps {
    userid: string;
}

const NameFromUserID = ({ userid }: NameFromUserIDProps) => {
    
    const userDatas = useFindValues("userData", {
        userIds: [userid],
    });

    const email = userDatas?.[0]?.value?.email;
    
    return (
        <FontText className='text-sm opacity-50'>{email}</FontText>
    );
}

export default NameFromUserID;
