import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * Nuke all database tables - DEV ONLY
 * 
 * Hook to completely wipe all Convex tables.
 * 
 * @example
 * ```tsx
 * const { nukeAll, isLoading, error } = useNukeDatabase();
 * 
 * const handleNuke = async () => {
 *   const result = await nukeAll();
 *   console.log("Nuked tables:", result.deletedCounts);
 * };
 * ```
 * 
 * @returns {{
 *   nukeAll: () => Promise<{message: string, deletedCounts: Record<string, number>}>,
 *   isLoading: boolean,
 *   error: Error | null
 * }}
 */
export const useNukeDatabase = () => {
  const nukeMutation = useMutation(api.devUtils.nukeAllTables);

  const nukeAll = async () => {
    return await nukeMutation({});
  };

  return {
    nukeAll,
    isLoading: false, // Convex mutations don't expose isLoading directly
    error: null, // Convex mutations don't expose error directly
  };
};

/**
 * Get table counts - DEV ONLY
 * 
 * Hook to check how many documents are in each table.
 * 
 * @example
 * ```tsx
 * const { getCounts, isLoading, error } = useTableCounts();
 * 
 * const handleCheck = async () => {
 *   const counts = await getCounts();
 *   console.log("Table counts:", counts);
 * };
 * ```
 * 
 * @returns {{
 *   getCounts: () => Promise<Record<string, number>>,
 *   isLoading: boolean,
 *   error: Error | null
 * }}
 */
export const useTableCounts = () => {
  const countsMutation = useMutation(api.devUtils.getTableCounts);

  const getCounts = async () => {
    return await countsMutation();
  };

  return {
    getCounts,
    isLoading: false, // Convex mutations don't expose isLoading directly
    error: null, // Convex mutations don't expose error directly
  };
};
