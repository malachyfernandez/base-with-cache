import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { UserVariableRecord } from "./useUserVariable";
import { decodeUserValue } from "./userValueSerialization";

type PrimitiveIndexValue = string | number | boolean;

interface UseUserVariableGetOptions {
  key: string;
  searchFor?: string;
  filterFor?: PrimitiveIndexValue;
  userIds?: string[];
  returnTop?: number;
  startAfter?: string;
}

/**
 * Query accessible user variables by key.
 *
 * ```ts
 * const profiles = useUserVariableGet<Profile>({
 *   key: "profile", // REQUIRED: var key
 *   userIds: followingList, // owner ids only
 *   searchFor: "mala", // text query
 *   filterFor: "admin", // exact filter value
 *   returnTop: 20, // page size
 * });
 * ```
 *
 * Output:
 * - returns `UserVariableRecord<T>[] | undefined`
 * - `undefined` while loading
 * - each row includes the full stored record shape
 *
 * Mental model:
 * - `useUserVariable(...)` is "my one variable for this key"
 * - `useUserVariableGet(...)` is "many accessible users' variables for this key"
 *
 * Access rules:
 * - your own variable is always visible to you
 * - `PUBLIC` variables are visible to everyone
 * - allowlist variables are visible to the owner and listed users
 * - `PRIVATE` variables are visible only to the owner
 *
 * Query inputs:
 * - `searchFor`: matches stored `searchValue`
 * - `filterFor`: exact match against stored `filterValue`
 * - `userIds`: explicit owner filter
 * - `returnTop`: page size
 * - `startAfter`: pass the previous last `id` for forward paging
 *
 * Important:
 * - sorting comes from the stored `sortKey` on each variable
 * - result order is stored `sortValue` desc, then `lastModified` desc
 * - for exact constant-time counts, use `useUserVariableLength({ key, filterFor })`
 */
export function useUserVariableGet<TValue = any>({
  key,
  searchFor,
  filterFor,
  userIds,
  returnTop,
  startAfter,
}: UseUserVariableGetOptions) {
  const results = useQuery(api.user_vars_get.search, {
    key,
    searchFor,
    filterFor,
    userIds,
    returnTop,
    startAfter,
  });

  return results?.map((record) => ({
    ...record,
    value: decodeUserValue(record.value as TValue),
  })) as UserVariableRecord<TValue>[] | undefined;
}