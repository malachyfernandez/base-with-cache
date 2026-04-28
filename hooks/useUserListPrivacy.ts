import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Privacy } from "./useUserList";

/**
 * Change one whole list's access mode.
 *
 * ```ts
 * const setListPrivacy = useUserListPrivacy();
 *
 * setListPrivacy({
 *   key: "posts", // REQUIRED: list key
 *   privacy: "PUBLIC", // REQUIRED: access mode
 * });
 * ```
 *
 * Output:
 * - returns a Convex mutation promise
 * - applies to every item in that list
 * - updates future getter visibility too
 *
 * Allowlist example:
 *
 * ```ts
 * const setListPrivacy = useUserListPrivacy();
 *
 * setListPrivacy({
 *   key: "posts",
 *   privacy: ["user_a", "user_b"],
 * });
 * ```
 *
 * Allowlist notes:
 * - array input becomes `{ allowList: [...] }` on the backend
 * - owner still keeps access
 * - every item in that list follows the same allowlist
 * - changing list privacy can change public/shared counts and getter visibility
 */
export function useUserListPrivacy() {
  const mutation = useMutation(api.user_lists.updatePrivacy);

  return ({ key, privacy }: { key: string; privacy: Privacy }) => {
    const backendPrivacy = Array.isArray(privacy)
      ? { allowList: privacy }
      : privacy;

    return mutation({
      key,
      privacy: backendPrivacy,
    });
  };
}
