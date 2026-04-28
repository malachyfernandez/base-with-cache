import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Privacy } from "./useUserList";
import { encodeUserValue } from "./userValueSerialization";

type ObjectKeys<T> = T extends object ? Extract<keyof T, string> : never;

/**
 * Upsert one list item by key + itemId.
 *
 * ```ts
 * const setPost = useUserListSet<Post>();
 *
 * setPost({
 *   key: "posts", // REQUIRED: list key
 *   itemId: "post_123", // REQUIRED: item id
 *   value: { title: "Hi", body: "..." }, // REQUIRED: item value
 *   privacy: "PUBLIC", // list access mode
 *   filterKey: "status", // exact filter key
 *   searchKeys: ["title", "body"], // search source keys
 *   sortKey: "PROPERTY_LAST_MODIFIED", // stored sort key
 * });
 * ```
 *
 * Output:
 * - returns a Convex mutation promise
 * - creates the item if missing
 * - otherwise replaces stored `value`
 * - list config lives on the shared definition row
 *
 * Important:
 * - `privacy`, `filterKey`, `searchKeys`, and `sortKey` are list-level config
 * - all items in the same `key` share that config
 * - server derives `filterValue`, `searchValue`, and `sortValue`
 *
 * Config sync example:
 *
 * ```ts
 * const setPost = useUserListSet<Post>();
 *
 * setPost({
 *   key: "posts",
 *   itemId: "post_123",
 *   value: { title: "Hi", body: "...", status: "draft" },
 *   privacy: "PRIVATE",
 *   filterKey: "status",
 *   searchKeys: ["title", "body"],
 *   sortKey: "status",
 *   overwriteStoredConfig: true, // default: keep filter/search/sort synced
 *   overwriteStoredPrivacy: false, // default: keep privacy sticky
 * });
 * ```
 *
 * Config sync notes:
 * - `overwriteStoredConfig` covers filter/search/sort only (defaults to `true`)
 * - `overwriteStoredPrivacy` covers privacy only (defaults to `false`)
 * - toggling either controls whether normal writes re-apply props vs. preserve stored values
 * - use with care because it updates the shared list definition for that key
 */
export function useUserListSet<T = any>() {
  const mutation = useMutation(api.user_lists.set);

  /**
   * Upsert one list item by key + itemId.
   *
   * ```ts
   * const setPost = useUserListSet<Post>();
   *
   * setPost({
   *   key: "posts", // REQUIRED: list key
   *   itemId: "post_123", // REQUIRED: item id
   *   value: { title: "Hi", body: "..." }, // REQUIRED: item value
   *   privacy: "PUBLIC", // list access mode
   *   filterKey: "status", // exact filter key
   *   searchKeys: ["title", "body"], // search source keys
   *   sortKey: "PROPERTY_LAST_MODIFIED", // stored sort key
   * });
   * ```
   *
   * Output:
   * - returns a Convex mutation promise
   * - creates the item if missing
   * - otherwise replaces stored `value`
   * - list config lives on the shared definition row
   *
   * Important:
   * - `privacy`, `filterKey`, `searchKeys`, and `sortKey` are list-level config
   * - all items in the same `key` share that config
   * - server derives `filterValue`, `searchValue`, and `sortValue`
   *
   * Config sync example:
   *
   * ```ts
   * const setPost = useUserListSet<Post>();
   *
   * setPost({
   *   key: "posts",
   *   itemId: "post_123",
   *   value: { title: "Hi", body: "...", status: "draft" },
   *   privacy: "PRIVATE",
   *   filterKey: "status",
   *   searchKeys: ["title", "body"],
   *   sortKey: "status",
   *   overwriteStoredConfig: true, // default: keep filter/search/sort synced
   *   overwriteStoredPrivacy: false, // default: keep privacy sticky
   * });
   * ```
   *
   * Config sync notes:
   * - `overwriteStoredConfig` covers filter/search/sort only (defaults to `true`)
   * - `overwriteStoredPrivacy` covers privacy only (defaults to `false`)
   * - toggling either controls whether normal writes re-apply props vs. preserve stored values
   * - use with care because it updates the shared list definition for that key
   */
  function setUserList({
    key,
    itemId,
    value,
    privacy,
    filterKey,
    searchKeys,
    sortKey,
    overwriteStoredConfig,
    overwriteStoredPrivacy,
  }: {
    key: string;
    itemId: string;
    value: T;
    privacy?: Privacy;
    filterKey?: ObjectKeys<T> | string;
    searchKeys?: (ObjectKeys<T> | string)[];
    sortKey?: ObjectKeys<T> | string;
    overwriteStoredConfig?: boolean;
    overwriteStoredPrivacy?: boolean;
  }) {
    const backendPrivacy = Array.isArray(privacy)
      ? { allowList: privacy }
      : privacy;
    const encodedValue = encodeUserValue(value);

    return mutation({
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
  }

  return setUserList;
}
