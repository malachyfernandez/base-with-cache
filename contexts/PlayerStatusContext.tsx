import React, { createContext, useContext } from 'react';

interface PlayerStatusContextValue {
    isPlayerDead: boolean;
}

const PlayerStatusContext = createContext<PlayerStatusContextValue>({
    isPlayerDead: false,
});

export function usePlayerStatus() {
    return useContext(PlayerStatusContext);
}

interface PlayerStatusProviderProps {
    isPlayerDead?: boolean;
    children: React.ReactNode;
}

export function PlayerStatusProvider({ isPlayerDead = false, children }: PlayerStatusProviderProps) {
    return (
        <PlayerStatusContext.Provider value={{ isPlayerDead }}>
            {children}
        </PlayerStatusContext.Provider>
    );
}
