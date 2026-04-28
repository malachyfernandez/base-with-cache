import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { devWarn } from "../utils/devWarnings";
import { userVarConfig } from "../utils/userVarConfig";
import { decodeUserValue, encodeUserValue } from "./userValueSerialization";
import { globalRateLimitMonitor } from "./useRateLimitMonitor";
import { deepEqual } from "../utils/deepEqual";

type ObjectKeys<T> = T extends object ? Extract<keyof T, string> : never;
type PrimitiveIndexValue = string | number | boolean;

// Frontend privacy input shape:
// - "PUBLIC"
// - "PRIVATE"
// - array of user IDs, which is converted to { allowList: [...] } on the backend
export type Privacy = "PUBLIC" | "PRIVATE" | string[];

// Stored/backend privacy output shape
export type StoredPrivacy =
    | "PUBLIC"
    | "PRIVATE"
    | { allowList: string[] };

export type OptimisticTimeoutBehavior = "reset" | "keep";

type SyncState = {
    isSyncing: boolean;
    lastOpStatus?: "idle" | "pending" | "confirmed" | "timed_out";
    lastOpStartedAt?: number;
    lastOpTimedOutAt?: number;
};

export type UserVariableRecord<T> = {
    id?: string;
    _id?: string;
    key?: string;
    userToken?: string;

    value: T;
    privacy?: StoredPrivacy;

    filterKey?: string;
    filterValue?: PrimitiveIndexValue;

    searchKeys?: string[];
    searchValue?: string;

    sortKey?: string;
    sortValue?: PrimitiveIndexValue;

    createdAt?: number;
    lastModified?: number;
};

export type UserVariableResult<T> = UserVariableRecord<T> & {
    confirmedValue?: T;
    state: SyncState;
};

export type UserVarOpStatusInfo<T> = {
    key: string;
    status: "pending" | "confirmed" | "timed_out";
    optimisticValue: T;
    lastConfirmedValue: T | undefined;
    msSinceSet: number;
};

/**
 * Persistent single value for one user key.
 *
 * ```ts
 * const [profile, setProfile] = useUserVariable<Profile>({
 *   key: "profile", // REQUIRED: var key
 *   defaultValue: { name: "", username: "" }, // create fallback
 *   privacy: "PUBLIC", // access mode
 *   filterKey: "username", // exact filter key
 *   searchKeys: ["username", "name"], // search source keys
 *   sortKey: "PROPERTY_LAST_MODIFIED", // stored sort key
 * });
 * ```
 *
 * Output:
 * - returns `[record, setValue]`
 * - `record.value`: current UI value
 * - `record.confirmedValue`: last server value
 * - `record.state`: `{ isSyncing, lastOpStatus, lastOpStartedAt, lastOpTimedOutAt }`
 * - `setValue(newValue)`: replaces the whole stored value
 *
 * Record shape:
 * - `id` / `_id`
 * - `key`
 * - `userToken`
 * - `value`
 * - `privacy`
 * - `filterKey` / `filterValue`
 * - `searchKeys` / `searchValue`
 * - `sortKey` / `sortValue`
 * - `createdAt` / `lastModified`
 * - `confirmedValue`
 * - `state`
 *
 * Mental model:
 * - this is "my one persistent value for this key"
 * - each authenticated user gets at most one record per `key`
 * - it feels like `useState`, but the backing record lives in Convex
 *
 * Auto-create:
 * - if no record exists and `defaultValue` is provided, the hook creates it once
 * - later loads reuse the stored record
 *
 * Stored config:
 * - `privacy`
 * - `filterKey`
 * - `searchKeys`
 * - `sortKey`
 *
 * Derived server fields:
 * - `filterValue`
 * - `searchValue`
 * - `sortValue`
 *
 * The client sends config keys.
 * The backend derives the indexed values.
 *
 * Property references:
 * - plain keys read from `value`
 * - `PROPERTY_*` keys read from record metadata
 *
 * Examples:
 * ```ts
 * filterKey: "color" // reads value.color
 * searchKeys: ["username", "name"] // reads value fields
 * sortKey: "score" // reads value.score
 * sortKey: "PROPERTY_LAST_MODIFIED" // reads record.lastModified
 * sortKey: "PROPERTY_CREATED_AT" // reads record.createdAt
 * ```
 *
 * Supported `PROPERTY_*` references:
 * - `PROPERTY_ID`
 * - `PROPERTY__ID`
 * - `PROPERTY_CREATED_AT`
 * - `PROPERTY_TIME_CREATED`
 * - `PROPERTY_FILTER_KEY`
 * - `PROPERTY_FILTER_VALUE`
 * - `PROPERTY_KEY`
 * - `PROPERTY_LAST_MODIFIED`
 * - `PROPERTY_PRIVACY`
 * - `PROPERTY_SEARCH_KEYS`
 * - `PROPERTY_SEARCH_VALUE`
 * - `PROPERTY_SORT_KEY`
 * - `PROPERTY_SORT_VALUE`
 * - `PROPERTY_USER_TOKEN`
 * - `PROPERTY_VALUE`
 *
 * Self-reference rule:
 * - `filterKey: "PROPERTY_FILTER_VALUE"` is ignored
 * - `searchKeys: ["PROPERTY_SEARCH_VALUE"]` is ignored
 * - `sortKey: "PROPERTY_SORT_VALUE"` is ignored
 *
 * Setter behavior:
 * - `setValue(...)` replaces the stored value
 * - it does not merge objects
 *
 * ```ts
 * const [user, setUser] = useUserVariable({
 *   key: "user",
 *   defaultValue: { name: "Bob", username: "bob123" },
 * });
 *
 * setUser({ name: "Alice" });
 * // result: { name: "Alice" }
 * ```
 *
 * Config sync example:
 *
 * ```ts
 * const [profile, setProfile] = useUserVariable<Profile>({
 *   key: "profile",
 *   defaultValue: { name: "", username: "" },
 *   privacy: "PRIVATE",
 *   filterKey: "username",
 *   overwriteStoredConfig: true, // default: keep filter/search/sort synced
 *   overwriteStoredPrivacy: false, // default: keep privacy sticky
 * });
 * ```
 *
 * Config sync notes:
 * - `overwriteStoredConfig` covers filter/search/sort only (defaults to `true`)
 * - `overwriteStoredPrivacy` covers privacy only (defaults to `false`)
 * - toggle them when you want normal value writes to re-apply incoming props
 * - global defaults live in `utils/userVarConfig.ts`
 *
 * Timeout example:
 *
 * ```ts
 * const [draft, setDraft] = useUserVariable({
 *   key: "draft",
 *   defaultValue: { text: "" },
 *   timeoutMs: 10000,
 *   optimisticTimeoutBehavior: "keep",
 *   onOpStatusChange(info) {
 *     console.log(info.status, info.optimisticValue, info.msSinceSet);
 *   },
 * });
 * ```
 *
 * Timeout notes:
 * - writes are optimistic
 * - `pending` means the UI updated before server confirmation
 * - `confirmed` means the latest write was acknowledged
 * - `timed_out` means confirmation missed `timeoutMs`
 * - `"reset"` rolls UI back to the last confirmed value
 * - `"keep"` leaves the optimistic value visible
 * - defaults live in `utils/userVarConfig.ts`
 */
export function useUserVariable<T>({
    key,
    defaultValue,
    privacy = "PRIVATE",
    filterKey,
    searchKeys,
    sortKey,
    timeoutMs = userVarConfig.defaultTimeoutMs,
    optimisticTimeoutBehavior = "reset",
    overwriteStoredConfig = userVarConfig.overwriteStoredConfigOnSet,
    overwriteStoredPrivacy = userVarConfig.overwriteStoredPrivacyOnSet,
    onOpStatusChange,
}: {
    key: string;
    defaultValue?: T;
    privacy?: Privacy;
    filterKey?: ObjectKeys<T> | string;
    searchKeys?: (ObjectKeys<T> | string)[];
    sortKey?: ObjectKeys<T> | string;
    timeoutMs?: number;
    optimisticTimeoutBehavior?: OptimisticTimeoutBehavior;
    overwriteStoredConfig?: boolean;
    overwriteStoredPrivacy?: boolean;
    onOpStatusChange?: (info: UserVarOpStatusInfo<T>) => void;
}): [UserVariableResult<T>, (newValue: T) => void] {
    const record = useQuery(api.user_vars.get, { key });

    const isSyncing = record === undefined;

    const [confirmedValue, setConfirmedValue] = useState<T | undefined>(undefined);
    const confirmedValueRef = useRef<T | undefined>(undefined);

    const [opState, setOpState] = useState<{
        lastOpStatus: SyncState["lastOpStatus"];
        lastOpStartedAt?: number;
        lastOpTimedOutAt?: number;
    }>({ lastOpStatus: "idle" });

    const pendingOpRef = useRef<{
        id: number;
        startedAt: number;
        optimisticValue: T;
        timeoutHandle: ReturnType<typeof setTimeout> | null;
        hasTimedOut: boolean;
    } | null>(null);

    const opIdRef = useRef(0);
    const didAutoCreateRef = useRef(false);
    const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

    const decodedRecordValue =
        record?.value === undefined
            ? undefined
            : decodeUserValue(record.value as T);

    const baseValue: T = isSyncing
        ? (defaultValue as T)
        : ((decodedRecordValue ?? defaultValue) as T);

    useEffect(() => {
        if (record === undefined || record === null) return;
        if (pendingOpRef.current) return;

        const next = decodeUserValue(record.value as T);
        confirmedValueRef.current = next;
        setConfirmedValue(next);
    }, [record]);

    const shouldAutoResetOnTimeout = optimisticTimeoutBehavior === "reset";

    const value: T =
        shouldAutoResetOnTimeout && opState.lastOpStatus === "timed_out"
            ? ((confirmedValue ?? defaultValue) as T)
            : baseValue;

    const valueRef = useRef(value);
    valueRef.current = value;

    useEffect(() => {
        if (!shouldAutoResetOnTimeout) return;
        if (opState.lastOpStatus !== "timed_out") return;
        if (!opState.lastOpTimedOutAt) return;

        devWarn(
            "uservar_rollback",
            `Rolled back key="${key}" to last confirmed value after timeout.` 
        );
    }, [
        key,
        opState.lastOpStatus,
        opState.lastOpTimedOutAt,
        shouldAutoResetOnTimeout,
    ]);

    const setMutation = useMutation(api.user_vars.set).withOptimisticUpdate(
        (localStore, args) => {
            const existing = localStore.getQuery(api.user_vars.get, {
                key,
            }) as any;

            const now = Date.now();

            localStore.setQuery(api.user_vars.get, { key }, {
                ...(existing ?? {}),
                key,
                value: args.value,
                lastModified: now,
                createdAt: existing?.createdAt ?? now,
                privacy: existing?.privacy ?? args.privacy,
                filterKey: existing?.filterKey ?? args.filterKey,
                searchKeys: existing?.searchKeys ?? args.searchKeys,
                sortKey: existing?.sortKey ?? args.sortKey,
                id: existing?.id,
                _id: existing?._id,
                userToken: existing?.userToken,
                filterValue: existing?.filterValue,
                searchValue: existing?.searchValue,
                sortValue: existing?.sortValue,
            });
        }
    );

    const setValue = (newValue: T) => {
        // Track mutation for rate limit monitoring
        globalRateLimitMonitor.trackCall(`user_vars:${key}`);

        if (deepEqual(newValue, valueRef.current)) {
            return;
        }

        if (isConvexAuthLoading || !isConvexAuthenticated) {
            devWarn(
                "uservar_auth_not_ready",
                `Blocked set for key="${key}" because Convex auth is not ready.`
            );
            return;
        }

        const startedAt = Date.now();
        const opId = (opIdRef.current += 1);
        const encodedValue = encodeUserValue(newValue);

        const existingPending = pendingOpRef.current;
        if (existingPending?.timeoutHandle) {
            clearTimeout(existingPending.timeoutHandle);
        }

        setOpState({
            lastOpStatus: "pending",
            lastOpStartedAt: startedAt,
            lastOpTimedOutAt: undefined,
        });

        onOpStatusChange?.({
            key,
            status: "pending",
            optimisticValue: newValue,
            lastConfirmedValue: confirmedValueRef.current,
            msSinceSet: 0,
        });

        const backendPrivacy = Array.isArray(privacy)
            ? { allowList: privacy }
            : privacy;

        const timeoutHandle = setTimeout(() => {
            const pending = pendingOpRef.current;
            if (!pending || pending.id !== opId) return;

            const msSinceSet = Date.now() - startedAt;

            devWarn(
                "uservar_op_timeout",
                `Setter for key="${key}" has not been confirmed after ${msSinceSet}ms (timeoutMs=${timeoutMs}). ResetBehavior=${optimisticTimeoutBehavior}.` 
            );

            pending.hasTimedOut = true;

            setOpState({
                lastOpStatus: "timed_out",
                lastOpStartedAt: startedAt,
                lastOpTimedOutAt: Date.now(),
            });

            onOpStatusChange?.({
                key,
                status: "timed_out",
                optimisticValue: newValue,
                lastConfirmedValue: confirmedValueRef.current,
                msSinceSet,
            });
        }, timeoutMs);

        pendingOpRef.current = {
            id: opId,
            startedAt,
            optimisticValue: newValue,
            timeoutHandle,
            hasTimedOut: false,
        };

        const mutationPromise = setMutation({
            key,
            value: encodedValue,
            privacy: backendPrivacy,
            filterKey,
            searchKeys,
            sortKey,
            overwriteStoredConfig,
            overwriteStoredPrivacy,
        });

        Promise.resolve(mutationPromise)
            .then(() => {
                const pending = pendingOpRef.current;
                if (!pending || pending.id !== opId) return;

                if (pending.timeoutHandle) {
                    clearTimeout(pending.timeoutHandle);
                }

                if (pending.hasTimedOut) {
                    pendingOpRef.current = null;
                    return;
                }

                pendingOpRef.current = null;
                confirmedValueRef.current = newValue;
                setConfirmedValue(newValue);

                setOpState({
                    lastOpStatus: "confirmed",
                    lastOpStartedAt: startedAt,
                    lastOpTimedOutAt: undefined,
                });

                onOpStatusChange?.({
                    key,
                    status: "confirmed",
                    optimisticValue: newValue,
                    lastConfirmedValue: newValue,
                    msSinceSet: Date.now() - startedAt,
                });
            })
            .catch((error) => {
                const pending = pendingOpRef.current;
                if (!pending || pending.id !== opId) return;

                if (pending.timeoutHandle) {
                    clearTimeout(pending.timeoutHandle);
                }

                pendingOpRef.current = null;
                console.error(`useUserVariable set failed for key="${key}"`, error);
                setOpState({
                    lastOpStatus: "idle",
                    lastOpStartedAt: undefined,
                    lastOpTimedOutAt: undefined,
                });
            });
    };

    useEffect(() => {
        if (didAutoCreateRef.current) return;
        if (isConvexAuthLoading) return;
        if (!isConvexAuthenticated) return;
        if (record !== null) return;
        if (defaultValue === undefined) return;

        didAutoCreateRef.current = true;
        setValue(defaultValue as T);
    }, [record, defaultValue, isConvexAuthLoading, isConvexAuthenticated]);

    useEffect(() => {
        return () => {
            const pending = pendingOpRef.current;
            if (pending?.timeoutHandle) {
                clearTimeout(pending.timeoutHandle);
            }
            pendingOpRef.current = null;
        };
    }, []);

    return [
        {
            ...(record ?? {}),
            value,
            confirmedValue,
            state: {
                isSyncing,
                lastOpStatus: opState.lastOpStatus,
                lastOpStartedAt: opState.lastOpStartedAt,
                lastOpTimedOutAt: opState.lastOpTimedOutAt,
            },
        } as UserVariableResult<T>,
        setValue,
    ];
}