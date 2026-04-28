import React from 'react';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import AppButton from './AppButton';
import FontText from '../text/FontText';



/**
two inpots:
isAuthLoading: Boolean,
    authFlow: any,
 */
interface OAuthResult {
    createdSessionId?: string;
    setActive?: (params: { session: string }) => void;
}

interface AuthButtonProps {
    // isAuthLoading: boolean;

    // setIsAuthLoading: (loading: boolean) => void;

    authFlow: () => Promise<OAuthResult>;
    buttonText: string;
}

const AuthButton = ({
    // isAuthLoading,
    // setIsAuthLoading,
    authFlow,
    buttonText,
}: AuthButtonProps) => {


    const [isAuthLoading, setIsAuthLoading] = useState(false);



    const handleLogin = async (startOAuth: any) => {
        if (isAuthLoading) return;

        setIsAuthLoading(true);
        try {
            const { createdSessionId, setActive } = await startOAuth();
            if (createdSessionId) {
                setActive!({ session: createdSessionId });
            }
        } catch (err) {
            console.error("OAuth error", err);
        } finally {
            setIsAuthLoading(false);
        }
    };

    return (
        <AppButton variant='accent' onPress={() => handleLogin(authFlow)} className='p-4 h-14! justify-center items-center'>
            {/* <TouchableOpacity
            onPress={() => handleLogin(authFlow)}
            className="bg-text w-64 py-4 rounded-full active:opacity-80 flex-row justify-center items-center"
            // disable when auth is loading
            disabled={isAuthLoading}
        >
            <Text
                className="text-text-inverted font-bold text-lg"
            >
                {isAuthLoading ? "Loading..." : buttonText}
            </Text>
        </TouchableOpacity> */}
        <FontText color='white' weight='bold'>{buttonText}</FontText>
        </AppButton>
    );
};

export default AuthButton;