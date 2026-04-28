import { getGameScopedKey } from './multiplayer';

export type NewserAssignment = {
    email: string;
    userId: string;
    assignedAt: number;
};

export type PublicUserData = {
    email?: string;
    name?: string;
    userId?: string;
};

export type NewspaperControlOwnerType = 'newser' | 'operator';

export type NewspaperControlState = {
    ownerType: NewspaperControlOwnerType;
    ownerUserId: string;
    newserUserId: string;
    newserEmail: string;
    updatedAt: number;
};

export const getNewserAssignmentKey = (gameId: string) => {
    return getGameScopedKey('newserAssignment', gameId);
};

export const getNewspaperControlKey = (gameId: string) => {
    return getGameScopedKey('newspaperControl', gameId);
};

export const getNewspaperDayItemId = (gameId: string, dayIndex: number) => {
    return `${gameId}-day-${dayIndex}`;
};

export const getNewspaperDayControlItemId = (dayIndex: number) => {
    return `day-${dayIndex}`;
};

export const normalizeNewserEmail = (value: string) => {
    return value.trim().toLowerCase();
};

export const resolveJoinedUserByEmail = ({
    email,
    userDatas,
}: {
    email: string;
    userDatas: PublicUserData[];
}) => {
    const normalizedEmail = normalizeNewserEmail(email);

    if (!normalizedEmail) {
        return null;
    }

    const matchingUser = userDatas.find((userData) => {
        return normalizeNewserEmail(userData.email ?? '') === normalizedEmail && Boolean(userData.userId);
    });

    if (!matchingUser?.userId) {
        return null;
    }

    return {
        email: matchingUser.email?.trim() || normalizedEmail,
        userId: matchingUser.userId,
    };
};

export const resolveValidNewserAssignment = ({
    assignment,
    userDatas,
}: {
    assignment?: NewserAssignment | null;
    userDatas: PublicUserData[];
}) => {
    const assignmentEmail = normalizeNewserEmail(assignment?.email ?? '');

    if (!assignmentEmail) {
        return null;
    }

    return resolveJoinedUserByEmail({
        email: assignmentEmail,
        userDatas,
    });
};

export const resolveNewspaperOwnerUserId = ({
    control,
    operatorUserId,
    validNewserUserId,
}: {
    control?: NewspaperControlState | null;
    operatorUserId: string;
    validNewserUserId?: string;
}) => {
    if (control?.ownerType === 'operator' && control.ownerUserId) {
        return control.ownerUserId;
    }

    if (validNewserUserId) {
        return validNewserUserId;
    }

    return operatorUserId;
};
