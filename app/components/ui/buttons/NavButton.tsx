import React from 'react';

import AppButton from './AppButton';
import FontText from '../text/FontText';

type PageState = "Profile" | "Following" | "Feed";

interface NavButtonProps {
    buttonID: PageState;
    pageState: PageState;
    setPageState: (value: PageState) => void;
}

const NavButton = ({ buttonID, pageState, setPageState }: NavButtonProps) => (
    <AppButton variant="grey" className="w-20%" onPress={() => setPageState(buttonID)}>
        <FontText weight={pageState === buttonID ? 'bold' : 'regular'}>
            {buttonID}
        </FontText>
    </AppButton>
);

export default NavButton;
