import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { devWarn } from "../utils/devWarnings";
import { userVarConfig } from "../utils/userVarConfig";
import { decodeUserValue, encodeUserValue } from "./userValueSerialization";
import { globalRateLimitMonitor } from "./useRateLimitMonitor";
import { deepEqual } from "../utils/deepEqual";

type ObjectKeys<T> = T extends object ? Extract<keyof T, string> : never;
type PrimitiveIndexValue = string | number | boolean;

export type Privacy = "PUBLIC" | "PRIVATE" | string[];

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

export type UserListRecord<T> = {
  id?: string;
  _id?: string;
  definitionId?: string;

  key?: string;
  itemId?: string;
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

export type UserListResult<T> = UserListRecord<T> & {
  confirmedValue?: T;
  state: SyncState;
};

export type UserListOpStatusInfo<T> = {
  key: string;
  itemId: string;
  status: "pending" | "confirmed" | "timed_out";
  optimisticValue: T;
  lastConfirmedValue: T | undefined;
  msSinceSet: number;
};

/**
 * Persistent single item inside one user list.
 *
 * ```ts
 * const [post, setPost] = useUserList<Post>({
 *   key: "posts", // REQUIRED: list key
 *   itemId: "post_123", // REQUIRED: item id
 *   defaultValue: { title: "", body: "" }, // create fallback
 *   privacy: "PUBLIC", // list access mode
 *   filterKey: "status", // exact filter key
 *   searchKeys: ["title", "body"], // search source keys
 *   sortKey: "PROPERTY_LAST_MODIFIED", // stored sort key
 * });
 * ```
 *
 * Output:
 * - returns `[record, setValue]`
 * - `record.value`: current UI value
 * - `record.confirmedValue`: last server value
 * - `record.state`: `{ isSyncing, lastOpStatus, lastOpStartedAt, lastOpTimedOutAt }`
 * - `setValue(newValue)`: replaces the whole stored item value
 *
 * Record shape:
 * - `id` / `_id`
 * - `definitionId`
 * - `key`
 * - `itemId`
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
 * - this is "my one item in my one list"
 * - each authenticated user gets at most one row per `key + itemId`
 * - list config lives on the shared list definition
 * - item rows store actual values plus derived indexed fields
 *
 * List-level config:
 * - `privacy`
 * - `filterKey`
 * - `searchKeys`
 * - `sortKey`
 *
 * All items in the same list key share that config.
 *
 * Derived server fields:
 * - `filterValue`
 * - `searchValue`
 * - `sortValue`
 *
 * Property references:
 * - plain keys read from `value`
 * - `PROPERTY_*` keys read from record metadata
 *
 * Examples:
 * ```ts
 * filterKey: "status" // reads value.status
 * searchKeys: ["title", "body"] // reads value fields
 * sortKey: "PROPERTY_LAST_MODIFIED" // reads record.lastModified
 * filterKey: "PROPERTY_ITEMID" // reads itemId
 * ```
 *
 * Supported `PROPERTY_*` references:
 * - `PROPERTY_ID`
 * - `PROPERTY__ID`
 * - `PROPERTY_ITEMID`
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
 * - `setValue(...)` replaces the stored item value
 * - it does not merge objects
 *
 * Config sync example:
 *
 * ```ts
 * const [post, setPost] = useUserList<Post>({
 *   key: "posts",
 *   itemId: "post_123",
 *   defaultValue: { title: "", body: "" },
 *   privacy: "PRIVATE",
 *   filterKey: "status",
 *   searchKeys: ["title", "body"],
 *   overwriteStoredConfig: true, // default: keep filter/search/sort synced
 *   overwriteStoredPrivacy: false, // default: keep privacy sticky
 * });
 * ```
 *
 * Config sync notes:
 * - `overwriteStoredConfig` covers filter/search/sort only (defaults to `true`)
 * - `overwriteStoredPrivacy` covers privacy only (defaults to `false`)
 * - toggling either controls whether normal writes re-apply props vs. preserve stored values
 * - this still affects the shared list definition (all items for that key)
 *
 * Timeout example:
 *
 * ```ts
 * const [post, setPost] = useUserList<Post>({
 *   key: "posts",
 *   itemId: "post_123",
 *   defaultValue: { title: "", body: "" },
 *   timeoutMs: 10000,
 *   optimisticTimeoutBehavior: "keep",
 *   onOpStatusChange(info) {
 *     console.log(info.status, info.itemId, info.msSinceSet);
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
export function useUserList<T>({
  key,
  itemId,
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
  itemId: string;
  defaultValue?: T;
  privacy?: Privacy;
  filterKey?: ObjectKeys<T> | string;
  searchKeys?: (ObjectKeys<T> | string)[];
  sortKey?: ObjectKeys<T> | string;
  timeoutMs?: number;
  optimisticTimeoutBehavior?: OptimisticTimeoutBehavior;
  overwriteStoredConfig?: boolean;
  overwriteStoredPrivacy?: boolean;
  onOpStatusChange?: (info: UserListOpStatusInfo<T>) => void;
}): [UserListResult<T>, (newValue: T) => void] {
  const record = useQuery(api.user_lists.get, { key, itemId });

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
      `Rolled back list key="${key}" itemId="${itemId}" to last confirmed value after timeout.` 
    );
  }, [
    itemId,
    key,
    opState.lastOpStatus,
    opState.lastOpTimedOutAt,
    shouldAutoResetOnTimeout,
  ]);

  const setMutation = useMutation(api.user_lists.set).withOptimisticUpdate(
    (localStore, args) => {
      const existing = localStore.getQuery(api.user_lists.get, {
        key,
        itemId,
      }) as any;

      const now = Date.now();

      localStore.setQuery(api.user_lists.get, { key, itemId }, {
        ...(existing ?? {}),
        key,
        itemId,
        value: args.value,
        lastModified: now,
        createdAt: existing?.createdAt ?? now,
        privacy: existing?.privacy ?? args.privacy,
        filterKey: existing?.filterKey ?? args.filterKey,
        searchKeys: existing?.searchKeys ?? args.searchKeys,
        sortKey: existing?.sortKey ?? args.sortKey,
        id: existing?.id,
        _id: existing?._id,
        definitionId: existing?.definitionId,
        userToken: existing?.userToken,
        filterValue: existing?.filterValue,
        searchValue: existing?.searchValue,
        sortValue: existing?.sortValue,
      });
    }
  );

  const setValue = (newValue: T) => {
    // Track mutation for rate limit monitoring
    globalRateLimitMonitor.trackCall(`user_lists:${key}:${itemId}`);

    if (deepEqual(newValue, valueRef.current)) {
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
      itemId,
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
        `Setter for list key="${key}" itemId="${itemId}" has not been confirmed after ${msSinceSet}ms (timeoutMs=${timeoutMs}). ResetBehavior=${optimisticTimeoutBehavior}.` 
      );

      pending.hasTimedOut = true;

      setOpState({
        lastOpStatus: "timed_out",
        lastOpStartedAt: startedAt,
        lastOpTimedOutAt: Date.now(),
      });

      onOpStatusChange?.({
        key,
        itemId,
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
      itemId,
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
          itemId,
          status: "confirmed",
          optimisticValue: newValue,
          lastConfirmedValue: newValue,
          msSinceSet: Date.now() - startedAt,
        });
      })
      .catch(() => {
        const pending = pendingOpRef.current;
        if (!pending || pending.id !== opId) return;

        if (pending.timeoutHandle) {
          clearTimeout(pending.timeoutHandle);
        }

        pendingOpRef.current = null;
        setOpState({
          lastOpStatus: "idle",
          lastOpStartedAt: undefined,
          lastOpTimedOutAt: undefined,
        });
      });
  };

  useEffect(() => {
    if (didAutoCreateRef.current) return;
    if (record !== null) return;
    if (defaultValue === undefined) return;

    didAutoCreateRef.current = true;
    setValue(defaultValue as T);
  }, [record, defaultValue]);

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
    } as UserListResult<T>,
    setValue,
  ];
}
