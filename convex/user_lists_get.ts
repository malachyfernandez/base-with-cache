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

function shapeListRecord(record: any, definition: any) {
  return {
    ...record,
    id: record._id,
    privacy: definition?.privacy,
    filterKey: definition?.filterKey,
    searchKeys: definition?.searchKeys,
    sortKey: definition?.sortKey,
  };
}

function applyStartAfter<T extends { doc: any }>(
  records: T[],
  startAfter?: string
) {
  if (!startAfter) return records;

  const index = records.findIndex(
    (entry) => String(entry.doc._id) === startAfter
  );

  if (index === -1) return records;
  return records.slice(index + 1);
}

export const search = query({
  args: {
    key: v.string(),
    itemId: v.optional(v.string()),
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

    const resultMap = new Map<string, { doc: any; definition: any }>();
    const definitionCache = new Map<string, any>();

    const getDefinition = async (
      definitionId: Id<"user_list_definitions">
    ) => {
      const cacheKey = String(definitionId);

      if (definitionCache.has(cacheKey)) {
        return definitionCache.get(cacheKey);
      }

      const definition = await ctx.db.get(definitionId);
      definitionCache.set(cacheKey, definition);
      return definition;
    };

    const sharedPermissions = viewerUserId
      ? await ctx.db
          .query("list_permissions")
          .withIndex("by_user_key", (q) =>
            q.eq("allowedUserId", viewerUserId).eq("key", args.key)
          )
          .collect()
      : [];

    const sharedDefinitionIdSet = new Set(
      sharedPermissions.map((permission) => String(permission.definitionId))
    );

    const canViewerAccessDefinition = (definition: any) => {
      if (!definition) return false;

      if (viewerUserId && definition.userToken === viewerUserId) {
        return true;
      }

      if (definition.privacy === "PUBLIC") {
        return true;
      }

      if (viewerUserId && sharedDefinitionIdSet.has(String(definition._id))) {
        return true;
      }

      return false;
    };

    const addIfEligible = (doc: any, definition: any) => {
      if (!doc || !definition) return;
      if (doc.key !== args.key) return;
      if (args.itemId && doc.itemId !== args.itemId) return;
      if (!matchesFilter(doc, args.filterFor)) return;
      if (!matchesSearch(doc, args.searchFor)) return;

      resultMap.set(String(doc._id), { doc, definition });
    };

    const collectForUserDefinition = async (definition: any) => {
      if (!definition) return;
      if (!canViewerAccessDefinition(definition)) return;

      if (args.itemId) {
        const item = await ctx.db
          .query("user_lists")
          .withIndex("by_user_key_item", (q) =>
            q
              .eq("userToken", definition.userToken)
              .eq("key", args.key)
              .eq("itemId", args.itemId!)
          )
          .unique();

        if (item) addIfEligible(item, definition);
        return;
      }

      if (args.searchFor?.trim()) {
        const items = await ctx.db
          .query("user_lists")
          .withSearchIndex("search_user_items", (q) => {
            let search = q.search("searchValue", args.searchFor!);
            search = search.eq("userToken", definition.userToken);
            search = search.eq("key", args.key);

            if (args.filterFor !== undefined) {
              search = search.eq("filterValue", args.filterFor);
            }

            return search;
          })
          .take(takeCount);

        for (const item of items) {
          addIfEligible(item, definition);
        }
        return;
      }

      if (args.filterFor !== undefined) {
        const items = await ctx.db
          .query("user_lists")
          .withIndex("by_user_key_filter_sort", (q) =>
            q
              .eq("userToken", definition.userToken)
              .eq("key", args.key)
              .eq("filterValue", args.filterFor)
          )
          .order("desc")
          .take(takeCount);

        for (const item of items) {
          addIfEligible(item, definition);
        }
        return;
      }

      const items = await ctx.db
        .query("user_lists")
        .withIndex("by_user_key_sort", (q) =>
          q.eq("userToken", definition.userToken).eq("key", args.key)
        )
        .order("desc")
        .take(takeCount);

      for (const item of items) {
        addIfEligible(item, definition);
      }
    };

    const collectForSharedDefinition = async (definition: any) => {
      if (!definition) return;
      if (!canViewerAccessDefinition(definition)) return;

      if (args.itemId) {
        const item = await ctx.db
          .query("user_lists")
          .withIndex("by_definition_item", (q) =>
            q.eq("definitionId", definition._id).eq("itemId", args.itemId!)
          )
          .unique();

        if (item) addIfEligible(item, definition);
        return;
      }

      if (args.searchFor?.trim()) {
        const items = await ctx.db
          .query("user_lists")
          .withSearchIndex("search_definition_items", (q) => {
            let search = q.search("searchValue", args.searchFor!);
            search = search.eq("definitionId", definition._id);

            if (args.filterFor !== undefined) {
              search = search.eq("filterValue", args.filterFor);
            }

            return search;
          })
          .take(takeCount);

        for (const item of items) {
          addIfEligible(item, definition);
        }
        return;
      }

      if (args.filterFor !== undefined) {
        const items = await ctx.db
          .query("user_lists")
          .withIndex("by_definition_filter_sort", (q) =>
            q
              .eq("definitionId", definition._id)
              .eq("filterValue", args.filterFor)
          )
          .order("desc")
          .take(takeCount);

        for (const item of items) {
          addIfEligible(item, definition);
        }
        return;
      }

      const items = await ctx.db
        .query("user_lists")
        .withIndex("by_definition_sort", (q) =>
          q.eq("definitionId", definition._id)
        )
        .order("desc")
        .take(takeCount);

      for (const item of items) {
        addIfEligible(item, definition);
      }
    };

    const collectPublic = async () => {
      if (args.itemId) {
        const items = await ctx.db
          .query("user_lists")
          .withIndex("by_key_access_item", (q) =>
            q.eq("key", args.key).eq("accessScope", "PUBLIC").eq("itemId", args.itemId!)
          )
          .collect();

        for (const item of items) {
          const definition = await getDefinition(item.definitionId);
          addIfEligible(item, definition);
        }
        return;
      }

      if (args.searchFor?.trim()) {
        const items = await ctx.db
          .query("user_lists")
          .withSearchIndex("search_public_items", (q) => {
            let search = q.search("searchValue", args.searchFor!);
            search = search.eq("key", args.key);
            search = search.eq("accessScope", "PUBLIC");

            if (args.filterFor !== undefined) {
              search = search.eq("filterValue", args.filterFor);
            }

            return search;
          })
          .take(takeCount);

        for (const item of items) {
          const definition = await getDefinition(item.definitionId);
          addIfEligible(item, definition);
        }
        return;
      }

      if (args.filterFor !== undefined) {
        const items = await ctx.db
          .query("user_lists")
          .withIndex("by_key_access_filter_sort", (q) =>
            q
              .eq("key", args.key)
              .eq("accessScope", "PUBLIC")
              .eq("filterValue", args.filterFor)
          )
          .order("desc")
          .take(takeCount);

        for (const item of items) {
          const definition = await getDefinition(item.definitionId);
          addIfEligible(item, definition);
        }
        return;
      }

      const items = await ctx.db
        .query("user_lists")
        .withIndex("by_key_access_sort", (q) =>
          q.eq("key", args.key).eq("accessScope", "PUBLIC")
        )
        .order("desc")
        .take(takeCount);

      for (const item of items) {
        const definition = await getDefinition(item.definitionId);
        addIfEligible(item, definition);
      }
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
        const definition = await ctx.db
          .query("user_list_definitions")
          .withIndex("by_user_key", (q) =>
            q.eq("userToken", userId).eq("key", args.key)
          )
          .unique();

        await collectForUserDefinition(definition);
      }

      const sorted = Array.from(resultMap.values()).sort((a, b) =>
        compareDocs(a.doc, b.doc)
      );

      const paged = applyStartAfter(sorted, args.startAfter);

      return paged
        .slice(0, limit)
        .map(({ doc, definition }) => shapeListRecord(doc, definition));
    }

    await collectPublic();

    if (viewerUserId) {
      const ownDefinition = await ctx.db
        .query("user_list_definitions")
        .withIndex("by_user_key", (q) =>
          q.eq("userToken", viewerUserId).eq("key", args.key)
        )
        .unique();

      await collectForUserDefinition(ownDefinition);

      for (const permission of sharedPermissions) {
        const definition = await getDefinition(permission.definitionId);
        if (!definition) continue;

        if (viewerUserId === definition.userToken) {
          continue;
        }

        await collectForSharedDefinition(definition);
      }
    }

    const sorted = Array.from(resultMap.values()).sort((a, b) =>
      compareDocs(a.doc, b.doc)
    );

    const paged = applyStartAfter(sorted, args.startAfter);

    return paged
      .slice(0, limit)
      .map(({ doc, definition }) => shapeListRecord(doc, definition));
  },
});
