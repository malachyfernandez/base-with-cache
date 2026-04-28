import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Nuke all tables - DEV ONLY
 * Deletes all data from every table in the database.
 * WARNING: This will permanently delete ALL data!
 */
export const nukeAllTables = mutation({
  args: {},
  handler: async (ctx, args) => {
    const tables = [
      "globals",
      "user_vars",
      "permissions", 
      "user_var_public_counts",
      "user_var_owner_counts",
      "user_var_shared_counts",
      "user_list_definitions",
      "user_lists",
      "list_permissions",
      "user_list_public_counts",
      "user_list_owner_counts",
      "user_list_shared_counts",
    ] as const;

    const deletedCounts: Record<string, number> = {};
    const batchSize = 50; // Process in smaller batches to avoid read limits

    for (const table of tables) {
      let deletedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        // Get a batch of documents
        const docs = await ctx.db.query(table).take(batchSize);
        
        if (docs.length === 0) {
          hasMore = false;
        } else {
          // Delete this batch
          for (const doc of docs) {
            await ctx.db.delete(doc._id);
            deletedCount++;
          }
        }
      }
      
      deletedCounts[table] = deletedCount;
    }

    return {
      message: "All tables nuked successfully",
      deletedCounts,
    };
  },
});

/**
 * Get table counts - DEV ONLY
 * Returns the number of documents in each table.
 */
export const getTableCounts = mutation({
  handler: async (ctx) => {
    const tables = [
      "globals",
      "user_vars",
      "permissions",
      "user_var_public_counts", 
      "user_var_owner_counts",
      "user_var_shared_counts",
      "user_list_definitions",
      "user_lists",
      "list_permissions",
      "user_list_public_counts",
      "user_list_owner_counts",
      "user_list_shared_counts",
    ] as const;

    const counts: Record<string, number> = {};
    const batchSize = 100; // Count in smaller batches to avoid read limits

    for (const table of tables) {
      let totalCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        const docs = await ctx.db.query(table).take(batchSize);
        
        if (docs.length === 0) {
          hasMore = false;
        } else {
          totalCount += docs.length;
        }
      }
      
      counts[table] = totalCount;
    }

    return counts;
  },
});
