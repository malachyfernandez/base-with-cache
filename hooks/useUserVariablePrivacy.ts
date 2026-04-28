import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Privacy } from "./useUserVariable";

/**
 * Change one variable's access mode only.
 *
 * ```ts
 * const setPrivacy = useUserVariablePrivacy();
 *
 * setPrivacy({
 *   key: "profile", // REQUIRED: var key
 *   privacy: "PUBLIC", // REQUIRED: access mode
 * });
 * ```
 *
 * Output:
 * - returns a Convex mutation promise
 * - only updates `privacy`
 * - keeps stored `value` unchanged
 *
 * Allowlist example:
 *
 * ```ts
 * const setPrivacy = useUserVariablePrivacy();
 *
 * setPrivacy({
 *   key: "profile",
 *   privacy: ["user_a", "user_b"],
 * });
 * ```
 *
 * Allowlist notes:
 * - array input becomes `{ allowList: [...] }` on the backend
 * - owner still keeps access
 * - only listed users gain access
 * - later `setValue(...)` calls keep that stored privacy unless config overwrite is enabled
 */
export function useUserVariablePrivacy() {
  const mutation = useMutation(api.user_vars.updatePrivacy).withOptimisticUpdate(
    (localStore, args) => {
      const existing = localStore.getQuery(api.user_vars.get, {
        key: args.key,
      }) as any;

      if (!existing) return;

      localStore.setQuery(api.user_vars.get, { key: args.key }, {
        ...existing,
        privacy: args.privacy,
      });
    }
  );

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
