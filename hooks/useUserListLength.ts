import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../convex/_generated/api";
import { devWarn } from "../utils/devWarnings";

type PrimitiveIndexValue = string | number | boolean;

interface UseUserListLengthOptions {
  key: string;
  filterFor: PrimitiveIndexValue;
  itemId?: string;
}

/**
 * Exact accessible list-item count for one key + filter, with optional item narrowing.
 *
 * ```ts
 * const commentCount = useUserListLength({
 *   key: "comments", // REQUIRED: list key
 *   filterFor: postId, // REQUIRED: exact filter value
 *   itemId: "comment_123", // OPTIONAL: exact item id
 * });
 * ```
 *
 * Output:
 * - returns `number | undefined`
 * - `undefined` while loading
 * - with `itemId`, count is exact for `key + filterFor + itemId`
 * - without `itemId`, count is exact for `key + filterFor`
 * - count is exact for the current viewer
 *
 * Nuance:
 * - `itemId` stays on the constant-time path by using extra item-specific count rows
 * - shared list data with `itemId` is valid, but large shared allow-lists increase count-maintenance fan-out
 * - in development, a warning logs when this `itemId` shape resolves through shared access
 *
 * ```ts
 * const totalComments = useUserListLength({
 *   key: "comments", // REQUIRED: list key
 *   filterFor: postId, // REQUIRED: exact filter value
 * });
 * ```
 *
 * This only supports exact-match count shapes.
 * It does not include search, pagination, or ad hoc `userIds` scoping.
 */
export function useUserListLength({
  key,
  filterFor,
  itemId,
}: UseUserListLengthOptions) {
  const warnedSignatureRef = useRef<string | null>(null);

  const count = useQuery(api.user_lists.length, {
    key,
    filterFor,
    itemId,
  }) as number | undefined;

  const shouldWarnOnSharedItemId = useQuery(
    api.user_lists.lengthSharedItemIdWarning,
    {
      key,
      filterFor,
      itemId,
    }
  ) as boolean | undefined;

  useEffect(() => {
    if (!itemId) {
      warnedSignatureRef.current = null;
      return;
    }

    const signature = `${key}::${String(filterFor)}::${itemId}`;

    if (!shouldWarnOnSharedItemId || warnedSignatureRef.current === signature) {
      return;
    }

    devWarn(
      "userlist_length_shared_item",
      `useUserListLength({ key="${key}", filterFor="${String(filterFor)}", itemId="${itemId}" }) is resolving through shared list access. This is okay for small numbers of shared rows, but consider PUBLIC privacy for large fan-out count shapes.`
    );

    warnedSignatureRef.current = signature;
  }, [filterFor, itemId, key, shouldWarnOnSharedItemId]);

  return count;
}
