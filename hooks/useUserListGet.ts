import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { UserListRecord } from "./useUserList";
import { decodeUserValue } from "./userValueSerialization";

type PrimitiveIndexValue = string | number | boolean;

interface UseUserListGetOptions {
  key: string;
  itemId?: string;
  searchFor?: string;
  filterFor?: PrimitiveIndexValue;
  userIds?: string[];
  returnTop?: number;
  startAfter?: string;
}

/**
 * Query accessible list items by key.
 *
 * ```ts
 * const posts = useUserListGet<Post>({
 *   key: "posts", // REQUIRED: list key
 *   userIds: followingList, // owner ids only
 *   filterFor: "published", // exact filter value
 *   searchFor: "searchValue", // search Query
 *   itemId: "item123", // exact item lookup
 *   returnTop: 20, // page size
 * });
 * ```
 *
 * Output:
 * - returns `UserListRecord<T>[] | undefined`
 * - `undefined` while loading
 * - each row includes item fields plus list config fields like `privacy`, `filterKey`, `searchKeys`, and `sortKey`
 *
 * Mental model:
 * - `useUserList(...)` is "my one item in my one list"
 * - `useUserListGet(...)` is "many accessible items from many lists with this key"
 *
 * Query inputs:
 * - `itemId`: exact item lookup
 * - `searchFor`: matches stored `searchValue`
 * - `filterFor`: exact match against stored `filterValue`
 * - `userIds`: explicit owner filter
 * - `returnTop`: page size
 * - `startAfter`: pass the previous last `id` for forward paging
 *
 * Important:
 * - sorting comes from the stored `sortKey` on each owner's list definition
 * - result order is stored `sortValue` desc, then `lastModified` desc
 * - for exact constant-time counts, use `useUserListLength({ key, filterFor })`
 */
export function useUserListGet<TValue = any>({
  key,
  itemId,
  searchFor,
  filterFor,
  userIds,
  returnTop,
  startAfter,
}: UseUserListGetOptions) {
  const results = useQuery(api.user_lists_get.search, {
    key,
    itemId,
    searchFor,
    filterFor,
    userIds,
    returnTop,
    startAfter,
  });

  return results?.map((record) => ({
    ...record,
    value: decodeUserValue(record.value as TValue),
  })) as UserListRecord<TValue>[] | undefined;
}
