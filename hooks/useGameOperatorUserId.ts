import { useMemo } from 'react';
import { useFindListItems } from './useData';

export const useGameOperatorUserId = (gameId: string) => {
    const gameRows = useFindListItems("games", {
        itemId: gameId,
        returnTop: 1,
    });

    return useMemo(() => {
        return {
            operatorUserId: gameRows?.[0]?.userToken ?? '',
            isLoading: gameRows === undefined,
        };
    }, [gameRows]);
};
