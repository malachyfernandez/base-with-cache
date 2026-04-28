import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Removes one item from a user list.
 *
 * ```ts
 * const removePost = useUserListRemove();
 *
 * removePost({
 *   key: "posts", // REQUIRED: list key
 *   itemId: "post_123", // REQUIRED: item id
 * });
 * ```
 *
 * Output:
 * - returns a Convex mutation promise
 * - deletes item row only (definition remains)
 */
export function useUserListRemove() {
  const mutation = useMutation(api.user_lists.remove);

  return ({ key, itemId }: { key: string; itemId: string }) => {
    return mutation({ key, itemId });
  };
}
