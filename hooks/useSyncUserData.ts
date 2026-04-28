import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";

export const useSyncUserData = (userData: any, setUserData: any) => {
    const { user, isLoaded: isClerkLoaded } = useUser();
    const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

    useEffect(() => {
        if (!isClerkLoaded) {
            return;
        }

        if (isConvexAuthLoading) {
            return;
        }

        const isLoggedIn = !!user;
        const isLoaded = userData !== undefined;

        if (!isLoggedIn) {
            return;
        }

        if (!isConvexAuthenticated) {
            return;
        }

        if (isLoaded) {
            const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";
            const clerkName = user.fullName ?? "";
            const clerkUserId = user.id ?? "";

            // Check if data actually needs updating to avoid infinite loops
            const needsUpdate =
                !userData.email ||
                userData.email !== clerkEmail ||
                userData.name !== clerkName ||
                userData.userId !== clerkUserId;

            if (needsUpdate) {
                setUserData({
                    ...userData,
                    name: clerkName,
                    email: clerkEmail,
                    userId: clerkUserId,
                });
            }
        }
    }, [user, userData, isClerkLoaded, isConvexAuthLoading, isConvexAuthenticated]);
};