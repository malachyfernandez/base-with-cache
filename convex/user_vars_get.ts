import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type PrimitiveIndexValue = string | number | boolean;

function normalizeSearch(searchFor?: string) {
  const trimmed = searchFor?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

function matchesFilter(doc: any, filterFor?: PrimitiveIndexValue) {
  if (filterFor === undefined) return true;
  return doc.filterValue === filterFor;
}

function matchesSearch(doc: any, searchFor?: string) {
  const normalized = normalizeSearch(searchFor);
  if (!normalized) return true;

  const haystack = String(doc.searchValue ?? "").toLowerCase();
  return haystack.includes(normalized);
}

function comparePrimitiveDesc(
  a: PrimitiveIndexValue | undefined,
  b: PrimitiveIndexValue | undefined
) {
  const aMissing = a === undefined || a === null;
  const bMissing = b === undefined || b === null;

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return b - a;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(b) - Number(a);
  }

  return String(b).localeCompare(String(a));
}

function compareDocs(a: any, b: any) {
  const sortCompare = comparePrimitiveDesc(a.sortValue, b.sortValue);
  if (sortCompare !== 0) return sortCompare;

  return (b.lastModified ?? 0) - (a.lastModified ?? 0);
}

function shapeRecord(record: any) {
  return {
    ...record,
    id: record._id,
  };
}

function applyStartAfter<T extends { _id: any }>(
  records: T[],
  startAfter?: string
) {
  if (!startAfter) return records;

  const index = records.findIndex(
    (record) => String(record._id) === startAfter
  );

  if (index === -1) return records;
  return records.slice(index + 1);
}

export const search = query({
  args: {
    key: v.string(),
    searchFor: v.optional(v.string()),
    filterFor: v.optional(v.union(v.string(), v.number(), v.boolean())),
    userIds: v.optional(v.array(v.string())),
    returnTop: v.optional(v.number()),
    startAfter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewerUserId = identity?.subject;
    const limit = Math.max(1, Math.min(args.returnTop ?? 10, 200));
    const takeCount = args.startAfter
      ? Math.min(Math.max(limit * 10, 50), 500)
      : Math.min(Math.max(limit * 5, 25), 300);

    const resultMap = new Map<string, any>();

    const addIfEligible = (doc: any) => {
      if (!doc) return;
      if (doc.key !== args.key) return;
      if (!matchesFilter(doc, args.filterFor)) return;
      if (!matchesSearch(doc, args.searchFor)) return;

      resultMap.set(String(doc._id), doc);
    };

    const sharedVarIdSet = new Set<string>();
    const sharedVarIds: Id<"user_vars">[] = [];

    if (viewerUserId) {
      const permissions = await ctx.db
        .query("permissions")
        .withIndex("by_user", (q) => q.eq("allowedUserId", viewerUserId))
        .collect();

      for (const permission of permissions) {
        sharedVarIdSet.add(String(permission.varId));
        sharedVarIds.push(permission.varId);
      }
    }

    const canViewerAccess = (doc: any) => {
      if (!doc) return false;

      if (viewerUserId && doc.userToken === viewerUserId) {
        return true;
      }

      if (doc.privacy === "PUBLIC") {
        return true;
      }

      if (viewerUserId && sharedVarIdSet.has(String(doc._id))) {
        return true;
      }

      return false;
    };

    const hasUserIdsFilter = args.userIds !== undefined;
    const requestedUserIds = hasUserIdsFilter
      ? Array.from(new Set(args.userIds ?? []))
      : undefined;

    if (hasUserIdsFilter && requestedUserIds && requestedUserIds.length === 0) {
      return [];
    }

    if (hasUserIdsFilter && requestedUserIds && requestedUserIds.length > 0) {
      for (const userId of requestedUserIds) {
        const doc = await ctx.db
          .query("user_vars")
          .withIndex("by_user_key", (q) =>
            q.eq("userToken", userId).eq("key", args.key)
          )
          .unique();

        if (!doc) continue;
        if (!canViewerAccess(doc)) continue;

        addIfEligible(doc);
      }

      const sorted = Array.from(resultMap.values()).sort(compareDocs);
      const paged = applyStartAfter(sorted, args.startAfter);

      return paged.slice(0, limit).map(shapeRecord);
    }

    if (args.searchFor?.trim()) {
      const publicDocs = await ctx.db
        .query("user_vars")
        .withSearchIndex("search_public", (q) => {
          let search = q.search("searchValue", args.searchFor!);
          search = search.eq("key", args.key);
          search = search.eq("privacy", "PUBLIC");

          if (args.filterFor !== undefined) {
            search = search.eq("filterValue", args.filterFor);
          }

          return search;
        })
        .take(takeCount);

      for (const doc of publicDocs) {
        addIfEligible(doc);
      }
    } else if (args.filterFor !== undefined) {
      const publicDocs = await ctx.db
        .query("user_vars")
        .withIndex("by_key_privacy_filter_sort", (q) =>
          q
            .eq("key", args.key)
            .eq("privacy", "PUBLIC")
            .eq("filterValue", args.filterFor)
        )
        .order("desc")
        .take(takeCount);

      for (const doc of publicDocs) {
        addIfEligible(doc);
      }
    } else {
      const publicDocs = await ctx.db
        .query("user_vars")
        .withIndex("by_key_privacy_sort", (q) =>
          q.eq("key", args.key).eq("privacy", "PUBLIC")
        )
        .order("desc")
        .take(takeCount);

      for (const doc of publicDocs) {
        addIfEligible(doc);
      }
    }

    if (viewerUserId) {
      const ownDoc = await ctx.db
        .query("user_vars")
        .withIndex("by_user_key", (q) =>
          q.eq("userToken", viewerUserId).eq("key", args.key)
        )
        .unique();

      if (ownDoc) {
        addIfEligible(ownDoc);
      }

      if (sharedVarIds.length > 0) {
        for (const sharedId of sharedVarIds) {
          const doc = await ctx.db.get(sharedId);
          if (!doc) continue;
          if (!canViewerAccess(doc)) continue;

          addIfEligible(doc);
        }
      }
    }

    const sorted = Array.from(resultMap.values()).sort(compareDocs);
    const paged = applyStartAfter(sorted, args.startAfter);

    return paged.slice(0, limit).map(shapeRecord);
  },
});