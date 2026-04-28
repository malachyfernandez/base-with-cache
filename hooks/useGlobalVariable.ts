import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type GlobalVariableHook<T> = [
    value: T | undefined | null,
    setValue: (newValue: T) => void,
];

/**
 * **Global Variable Hook**
 *
 * This acts just like `useState`, but the data is shared globally across the entire
 * application (for all users) and saved to the database.
 *
 * ---
 * ### Examples
 *
 * **1. Simple: App-wide settings**
 * ```ts
 * const [siteName, setSiteName] = useGlobalVariable<string>("siteName", "My Awesome App");
 * ```
 *
 * **2. Shared Objects**
 * Useful for things like maintenance mode flags or daily messages.
 * ```ts
 * type SystemStatus = { isDown: boolean; message: string };
 *
 * const [status, setStatus] = useGlobalVariable<SystemStatus>("status", {
 * isDown: false,
 * message: "All systems go"
 * });
 * ```
 *
 * ---
 * @template T - The type of data to store.
 * @param key - A unique name for this global variable.
 * @param defaultValue - The fallback value if the variable hasn't been set yet.
 */
export function useGlobalVariable<T>(
    key: string,
    defaultValue?: T
): GlobalVariableHook<T> {

    const data = useQuery(api.globals.get, { key });

    const isLoading = (data === undefined);

    const value = isLoading
        ? undefined
        : (data ?? defaultValue ?? null);

    const setMutation = useMutation(api.globals.set)
        .withOptimisticUpdate((localStore, args) => {
            localStore.setQuery(api.globals.get, { key }, args.value);
        });

    const setValue = (newValue: T) => {
        setMutation({ key, value: newValue });
    };



    return [value, setValue];
}