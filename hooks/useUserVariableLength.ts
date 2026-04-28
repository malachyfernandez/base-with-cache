import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type PrimitiveIndexValue = string | number | boolean;

interface UseUserVariableLengthOptions {
  key: string;
  filterFor: PrimitiveIndexValue;
}

/**
 * Exact accessible variable count for one key + filter.
 *
 * ```ts
 * const profileCount = useUserVariableLength({
 *   key: "profile", // REQUIRED: var key
 *   filterFor: "admin", // REQUIRED: exact filter value
 * });
 * ```
 *
 * Output:
 * - returns `number | undefined`
 * - `undefined` while loading
 * - count is exact for the current viewer
 *
 * This only supports the constant-time `key + filterFor` shape.
 * It does not include search, pagination, or ad hoc `userIds` scoping.
 */
export function useUserVariableLength({
  key,
  filterFor,
}: UseUserVariableLengthOptions) {
  return useQuery(api.user_vars.length, {
    key,
    filterFor,
  }) as number | undefined;
}
