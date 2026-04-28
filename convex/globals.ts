
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("globals")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return record?.value ?? null;
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("globals")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (record) {
      await ctx.db.patch(record._id, { value: args.value });
    } else {
      await ctx.db.insert("globals", { key: args.key, value: args.value });
    }
  },
});