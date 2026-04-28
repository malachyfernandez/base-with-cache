import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type PrimitiveIndexValue = string | number | boolean;
type Privacy = "PUBLIC" | "PRIVATE" | { allowList: string[] };
type AccessScope = "PUBLIC" | "PRIVATE" | "SHARED";

const DEFAULT_SORT_KEY = "PROPERTY_LAST_MODIFIED";

const privacyValidator = v.union(
  v.literal("PUBLIC"),
  v.literal("PRIVATE"),
  v.object({ allowList: v.array(v.string()) })
);

function isPrimitiveIndexValue(value: unknown): value is PrimitiveIndexValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function normalizePropertyRef(reference: string) {
  return reference.trim().toUpperCase();
}

function normalizePrivacy(privacy: Privacy): Privacy {
  if (privacy === "PUBLIC" || privacy === "PRIVATE") return privacy;

  const unique = Array.from(
    new Set(privacy.allowList.map((x) => x.trim()).filter(Boolean))
  );

  return { allowList: unique };
}

function privacyToAccessScope(privacy: Privacy): AccessScope {
  if (privacy === "PUBLIC") return "PUBLIC";
  if (privacy === "PRIVATE") return "PRIVATE";
  return "SHARED";
}

function sameStringArray(a?: string[], b?: string[]) {
  const left = a ?? [];
  const right = b ?? [];

  if (left.length !== right.length) return false;

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }

  return true;
}

function samePrivacy(a?: Privacy, b?: Privacy) {
  if (!a || !b) return a === b;

  if (a === "PUBLIC" || a === "PRIVATE") {
    return a === b;
  }

  if (b === "PUBLIC" || b === "PRIVATE") {
    return false;
  }

  return sameStringArray(a.allowList, b.allowList);
}

function shouldIgnoreSelfReference(
  reference: string,
  kind: "filter" | "search" | "sort"
) {
  const normalized = normalizePropertyRef(reference);

  if (kind === "filter") {
    return (
      normalized === "PROPERTY_FILTER_KEY" ||
      normalized === "PROPERTY_FILTER_VALUE"
    );
  }

  if (kind === "search") {
    return (
      normalized === "PROPERTY_SEARCH_KEYS" ||
      normalized === "PROPERTY_SEARCH_VALUE"
    );
  }

  return (
    normalized === "PROPERTY_SORT_KEY" ||
    normalized === "PROPERTY_SORT_VALUE"
  );
}

function getPropertyValue(
  context: {
    id?: string;
    definitionId?: string;
    key: string;
    itemId: string;
    userToken: string;
    value: any;
    privacy: Privacy;
    filterKey?: string;
    filterValue?: PrimitiveIndexValue;
    searchKeys?: string[];
    searchValue?: string;
    sortKey?: string;
    sortValue?: PrimitiveIndexValue;
    lastModified: number;
    createdAt: number;
  },
  reference: string
) {
  const normalized = normalizePropertyRef(reference);

  switch (normalized) {
    case "PROPERTY_ID":
    case "PROPERTY__ID":
      return context.id;
    case "PROPERTY_ITEMID":
      return context.itemId;
    case "PROPERTY_CREATED_AT":
    case "PROPERTY_TIME_CREATED":
      return context.createdAt;
    case "PROPERTY_FILTER_KEY":
      return context.filterKey;
    case "PROPERTY_FILTER_VALUE":
      return context.filterValue;
    case "PROPERTY_KEY":
      return context.key;
    case "PROPERTY_LAST_MODIFIED":
      return context.lastModified;
    case "PROPERTY_PRIVACY":
      return context.privacy;
    case "PROPERTY_SEARCH_KEYS":
      return context.searchKeys;
    case "PROPERTY_SEARCH_VALUE":
      return context.searchValue;
    case "PROPERTY_SORT_KEY":
      return context.sortKey;
    case "PROPERTY_SORT_VALUE":
      return context.sortValue;
    case "PROPERTY_USER_TOKEN":
      return context.userToken;
    case "PROPERTY_VALUE":
      return context.value;
    default:
      return undefined;
  }
}

function resolveConfiguredValue(
  reference: string,
  context: {
    id?: string;
    definitionId?: string;
    key: string;
    itemId: string;
    userToken: string;
    value: any;
    privacy: Privacy;
    filterKey?: string;
    filterValue?: PrimitiveIndexValue;
    searchKeys?: string[];
    searchValue?: string;
    sortKey?: string;
    sortValue?: PrimitiveIndexValue;
    lastModified: number;
    createdAt: number;
  },
  kind: "filter" | "search" | "sort"
) {
  if (!reference.trim()) return undefined;
  if (shouldIgnoreSelfReference(reference, kind)) return undefined;

  const normalized = normalizePropertyRef(reference);

  if (normalized.startsWith("PROPERTY_")) {
    return getPropertyValue(context, normalized);
  }

  return context.value?.[reference];
}

function buildFilterValue(
  context: {
    id?: string;
    definitionId?: string;
    key: string;
    itemId: string;
    userToken: string;
    value: any;
    privacy: Privacy;
    filterKey?: string;
    filterValue?: PrimitiveIndexValue;
    searchKeys?: string[];
    searchValue?: string;
    sortKey?: string;
    sortValue?: PrimitiveIndexValue;
    lastModified: number;
    createdAt: number;
  }
) {
  if (!context.filterKey) return undefined;

  const resolved = resolveConfiguredValue(context.filterKey, context, "filter");

  return isPrimitiveIndexValue(resolved) ? resolved : undefined;
}

function buildSearchValue(
  context: {
    id?: string;
    definitionId?: string;
    key: string;
    itemId: string;
    userToken: string;
    value: any;
    privacy: Privacy;
    filterKey?: string;
    filterValue?: PrimitiveIndexValue;
    searchKeys?: string[];
    searchValue?: string;
    sortKey?: string;
    sortValue?: PrimitiveIndexValue;
    lastModified: number;
    createdAt: number;
  }
) {
  if (!context.searchKeys || context.searchKeys.length === 0) {
    return undefined;
  }

  const parts: string[] = [];

  for (const key of context.searchKeys) {
    const resolved = resolveConfiguredValue(key, context, "search");

    if (typeof resolved === "string") {
      const trimmed = resolved.trim();
      if (trimmed) parts.push(trimmed);
      continue;
    }

    if (typeof resolved === "number" || typeof resolved === "boolean") {
      parts.push(String(resolved));
    }
  }

  const finalValue = parts.join(" ").trim();
  return finalValue.length > 0 ? finalValue : undefined;
}

function buildSortValue(
  context: {
    id?: string;
    definitionId?: string;
    key: string;
    itemId: string;
    userToken: string;
    value: any;
    privacy: Privacy;
    filterKey?: string;
    filterValue?: PrimitiveIndexValue;
    searchKeys?: string[];
    searchValue?: string;
    sortKey?: string;
    sortValue?: PrimitiveIndexValue;
    lastModified: number;
    createdAt: number;
  }
) {
  if (!context.sortKey) return undefined;

  const resolved = resolveConfiguredValue(context.sortKey, context, "sort");

  return isPrimitiveIndexValue(resolved) ? resolved : undefined;
}

function shapeListRecord(item: any, definition: any) {
  if (!item) return item;

  return {
    ...item,
    id: item._id,
    privacy: definition?.privacy,
    filterKey: definition?.filterKey,
    searchKeys: definition?.searchKeys,
    sortKey: definition?.sortKey,
  };
}

async function getDefinitionByUserKey(
  ctx: any,
  userToken: string,
  key: string
) {
  return await ctx.db
    .query("user_list_definitions")
    .withIndex("by_user_key", (q: any) =>
      q.eq("userToken", userToken).eq("key", key)
    )
    .unique();
}

async function adjustUserListPublicCount(
  ctx: any,
  key: string,
  filterValue: PrimitiveIndexValue | undefined,
  itemId: string | undefined,
  delta: number
) {
  if (delta === 0) return;

  const existing = await ctx.db
    .query("user_list_public_counts")
    .withIndex("by_key_filter_item", (q: any) =>
      q.eq("key", key).eq("filterValue", filterValue).eq("itemId", itemId)
    )
    .unique();

  const nextCount = (existing?.count ?? 0) + delta;

  if (nextCount <= 0) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return;
  }

  if (existing) {
    await ctx.db.patch(existing._id, { count: nextCount });
    return;
  }

  await ctx.db.insert("user_list_public_counts", {
    key,
    filterValue,
    itemId,
    count: nextCount,
  });
}

async function adjustUserListOwnerCount(
  ctx: any,
  ownerUserToken: string,
  key: string,
  filterValue: PrimitiveIndexValue | undefined,
  itemId: string | undefined,
  accessScope: AccessScope,
  delta: number
) {
  if (delta === 0) return;

  const existing = await ctx.db
    .query("user_list_owner_counts")
    .withIndex("by_owner_key_filter_item_scope", (q: any) =>
      q
        .eq("ownerUserToken", ownerUserToken)
        .eq("key", key)
        .eq("filterValue", filterValue)
        .eq("itemId", itemId)
        .eq("accessScope", accessScope)
    )
    .unique();

  const nextCount = (existing?.count ?? 0) + delta;

  if (nextCount <= 0) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return;
  }

  if (existing) {
    await ctx.db.patch(existing._id, { count: nextCount });
    return;
  }

  await ctx.db.insert("user_list_owner_counts", {
    ownerUserToken,
    key,
    filterValue,
    itemId,
    accessScope,
    count: nextCount,
  });
}

async function adjustUserListSharedCount(
  ctx: any,
  allowedUserId: string,
  key: string,
  filterValue: PrimitiveIndexValue | undefined,
  itemId: string | undefined,
  delta: number
) {
  if (delta === 0) return;

  const existing = await ctx.db
    .query("user_list_shared_counts")
    .withIndex("by_user_key_filter_item", (q: any) =>
      q
        .eq("allowedUserId", allowedUserId)
        .eq("key", key)
        .eq("filterValue", filterValue)
        .eq("itemId", itemId)
    )
    .unique();

  const nextCount = (existing?.count ?? 0) + delta;

  if (nextCount <= 0) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return;
  }

  if (existing) {
    await ctx.db.patch(existing._id, { count: nextCount });
    return;
  }

  await ctx.db.insert("user_list_shared_counts", {
    allowedUserId,
    key,
    filterValue,
    itemId,
    count: nextCount,
  });
}

async function applyUserListCountDelta(
  ctx: any,
  {
    ownerUserToken,
    key,
    filterValue,
    itemId,
    privacy,
    delta,
  }: {
    ownerUserToken: string;
    key: string;
    filterValue: PrimitiveIndexValue | undefined;
    itemId: string | undefined;
    privacy: Privacy;
    delta: number;
  }
) {
  const accessScope = privacyToAccessScope(privacy);
  const countItemIds = itemId === undefined ? [undefined] : [undefined, itemId];

  for (const countItemId of countItemIds) {
    if (accessScope === "PUBLIC") {
      await adjustUserListPublicCount(
        ctx,
        key,
        filterValue,
        countItemId,
        delta
      );
    }

    await adjustUserListOwnerCount(
      ctx,
      ownerUserToken,
      key,
      filterValue,
      countItemId,
      accessScope,
      delta
    );

    if (typeof privacy === "object" && privacy !== null) {
      for (const allowedUserId of privacy.allowList) {
        await adjustUserListSharedCount(
          ctx,
          allowedUserId,
          key,
          filterValue,
          countItemId,
          delta
        );
      }
    }
  }
}

async function syncListPermissions(
  ctx: any,
  definitionId: Id<"user_list_definitions">,
  ownerUserToken: string,
  key: string,
  privacy: Privacy
) {
  const existing = await ctx.db
    .query("list_permissions")
    .withIndex("by_definition", (q: any) => q.eq("definitionId", definitionId))
    .collect();

  if (typeof privacy !== "object" || privacy === null) {
    for (const permission of existing) {
      await ctx.db.delete(permission._id);
    }
    return;
  }

  const desired = new Set(privacy.allowList);
  const existingSet = new Set(existing.map((p: any) => p.allowedUserId));

  for (const permission of existing) {
    if (!desired.has(permission.allowedUserId)) {
      await ctx.db.delete(permission._id);
    }
  }

  for (const allowedUserId of desired) {
    if (!existingSet.has(allowedUserId)) {
      await ctx.db.insert("list_permissions", {
        definitionId,
        allowedUserId,
        key,
        ownerUserToken,
      });
    }
  }
}

async function reindexItemsForDefinition(ctx: any, definition: any) {
  const items = await ctx.db
    .query("user_lists")
    .withIndex("by_user_key_sort", (q: any) =>
      q.eq("userToken", definition.userToken).eq("key", definition.key)
    )
    .collect();

  const accessScope = privacyToAccessScope(definition.privacy);
  const effectiveSortKey = definition.sortKey ?? DEFAULT_SORT_KEY;

  for (const item of items) {
    const baseContext = {
      id: String(item._id),
      definitionId: String(definition._id),
      key: item.key,
      itemId: item.itemId,
      userToken: item.userToken,
      value: item.value,
      privacy: definition.privacy,
      filterKey: definition.filterKey,
      searchKeys: definition.searchKeys,
      sortKey: effectiveSortKey,
      lastModified: item.lastModified,
      createdAt: item.createdAt,
    };

    const filterValue = buildFilterValue(baseContext);

    const searchValue = buildSearchValue({
      ...baseContext,
      filterValue,
    });

    const sortValue = buildSortValue({
      ...baseContext,
      filterValue,
      searchValue,
    });

    await ctx.db.patch(item._id, {
      accessScope,
      filterValue,
      searchValue,
      sortValue,
    });
  }
}

export const get = query({
  args: {
    key: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userToken = identity?.subject;

    if (!userToken) return null;

    const definition = await getDefinitionByUserKey(ctx, userToken, args.key);
    if (!definition) return null;

    const item = await ctx.db
      .query("user_lists")
      .withIndex("by_user_key_item", (q) =>
        q
          .eq("userToken", userToken)
          .eq("key", args.key)
          .eq("itemId", args.itemId)
      )
      .unique();

    if (!item) return null;

    return shapeListRecord(item, definition);
  },
});

export const length = query({
  args: {
    key: v.string(),
    filterFor: v.union(v.string(), v.number(), v.boolean()),
    itemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewerUserId = identity?.subject;
    const countItemId = args.itemId;

    const publicCount = await ctx.db
      .query("user_list_public_counts")
      .withIndex("by_key_filter_item", (q) =>
        q
          .eq("key", args.key)
          .eq("filterValue", args.filterFor)
          .eq("itemId", countItemId)
      )
      .unique();

    let total = publicCount?.count ?? 0;

    if (!viewerUserId) {
      return total;
    }

    const ownPrivateCount = await ctx.db
      .query("user_list_owner_counts")
      .withIndex("by_owner_key_filter_item_scope", (q) =>
        q
          .eq("ownerUserToken", viewerUserId)
          .eq("key", args.key)
          .eq("filterValue", args.filterFor)
          .eq("itemId", countItemId)
          .eq("accessScope", "PRIVATE")
      )
      .unique();

    const ownSharedCount = await ctx.db
      .query("user_list_owner_counts")
      .withIndex("by_owner_key_filter_item_scope", (q) =>
        q
          .eq("ownerUserToken", viewerUserId)
          .eq("key", args.key)
          .eq("filterValue", args.filterFor)
          .eq("itemId", countItemId)
          .eq("accessScope", "SHARED")
      )
      .unique();

    const sharedCount = await ctx.db
      .query("user_list_shared_counts")
      .withIndex("by_user_key_filter_item", (q) =>
        q
          .eq("allowedUserId", viewerUserId)
          .eq("key", args.key)
          .eq("filterValue", args.filterFor)
          .eq("itemId", countItemId)
      )
      .unique();

    total += ownPrivateCount?.count ?? 0;
    total += ownSharedCount?.count ?? 0;
    total += sharedCount?.count ?? 0;

    return total;
  },
});

export const lengthSharedItemIdWarning = query({
  args: {
    key: v.string(),
    filterFor: v.union(v.string(), v.number(), v.boolean()),
    itemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.itemId) {
      return false;
    }

    const identity = await ctx.auth.getUserIdentity();
    const viewerUserId = identity?.subject;

    if (!viewerUserId) {
      return false;
    }

    const ownSharedCount = await ctx.db
      .query("user_list_owner_counts")
      .withIndex("by_owner_key_filter_item_scope", (q) =>
        q
          .eq("ownerUserToken", viewerUserId)
          .eq("key", args.key)
          .eq("filterValue", args.filterFor)
          .eq("itemId", args.itemId)
          .eq("accessScope", "SHARED")
      )
      .unique();

    if ((ownSharedCount?.count ?? 0) > 0) {
      return true;
    }

    const sharedCount = await ctx.db
      .query("user_list_shared_counts")
      .withIndex("by_user_key_filter_item", (q) =>
        q
          .eq("allowedUserId", viewerUserId)
          .eq("key", args.key)
          .eq("filterValue", args.filterFor)
          .eq("itemId", args.itemId)
      )
      .unique();

    return (sharedCount?.count ?? 0) > 0;
  },
});

export const set = mutation({
  args: {
    key: v.string(),
    itemId: v.string(),
    value: v.any(),
    privacy: v.optional(privacyValidator),
    filterKey: v.optional(v.string()),
    searchKeys: v.optional(v.array(v.string())),
    sortKey: v.optional(v.string()),
    overwriteStoredConfig: v.optional(v.boolean()),
    overwriteStoredPrivacy: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const userToken = identity.subject;
    const now = Date.now();
    const overwriteStoredConfig = args.overwriteStoredConfig ?? false;
    const overwriteStoredPrivacy = args.overwriteStoredPrivacy ?? false;

    const existingDefinition = await getDefinitionByUserKey(ctx, userToken, args.key);

    const nextPrivacy = normalizePrivacy(
      overwriteStoredPrivacy
        ? (args.privacy ?? existingDefinition?.privacy ?? "PRIVATE")
        : (existingDefinition?.privacy ?? args.privacy ?? "PRIVATE")
    );

    const nextFilterKey = overwriteStoredConfig
      ? (args.filterKey ?? existingDefinition?.filterKey)
      : (existingDefinition?.filterKey ?? args.filterKey);

    const nextSearchKeys = overwriteStoredConfig
      ? (args.searchKeys ?? existingDefinition?.searchKeys)
      : (existingDefinition?.searchKeys ?? args.searchKeys);

    const nextSortKey = overwriteStoredConfig
      ? (args.sortKey ?? existingDefinition?.sortKey ?? DEFAULT_SORT_KEY)
      : (existingDefinition?.sortKey ?? args.sortKey ?? DEFAULT_SORT_KEY);

    const definitionConfigChanged =
      !existingDefinition ||
      !samePrivacy(existingDefinition.privacy, nextPrivacy) ||
      existingDefinition.filterKey !== nextFilterKey ||
      !sameStringArray(existingDefinition.searchKeys, nextSearchKeys) ||
      existingDefinition.sortKey !== nextSortKey;

    const previousItems =
      existingDefinition && definitionConfigChanged
        ? await ctx.db
            .query("user_lists")
            .withIndex("by_user_key_sort", (q) =>
              q.eq("userToken", userToken).eq("key", args.key)
            )
            .collect()
        : null;

    let definitionId = existingDefinition?._id;

    if (!existingDefinition) {
      definitionId = await ctx.db.insert("user_list_definitions", {
        userToken,
        key: args.key,
        lastModified: now,
        createdAt: now,
        privacy: nextPrivacy,
        filterKey: nextFilterKey,
        searchKeys: nextSearchKeys,
        sortKey: nextSortKey,
      });
    } else if (definitionConfigChanged) {
      await ctx.db.patch(existingDefinition._id, {
        lastModified: now,
        privacy: nextPrivacy,
        filterKey: nextFilterKey,
        searchKeys: nextSearchKeys,
        sortKey: nextSortKey,
      });
    }

    if (!definitionId) {
      throw new Error("Failed to resolve list definition id");
    }

    const finalDefinition = (await ctx.db.get(definitionId)) as any;
    if (!finalDefinition) {
      throw new Error("Failed to load final list definition");
    }

    await syncListPermissions(
      ctx,
      definitionId,
      userToken,
      args.key,
      finalDefinition.privacy
    );

    const existingItem = await ctx.db
      .query("user_lists")
      .withIndex("by_user_key_item", (q) =>
        q
          .eq("userToken", userToken)
          .eq("key", args.key)
          .eq("itemId", args.itemId)
      )
      .unique();

    const previousSnapshot =
      existingItem && !definitionConfigChanged
        ? {
            filterValue: existingItem.filterValue as PrimitiveIndexValue | undefined,
            itemId: existingItem.itemId as string | undefined,
            privacy: (existingDefinition?.privacy ?? finalDefinition.privacy) as Privacy,
          }
        : null;

    const itemCreatedAt = existingItem?.createdAt ?? now;
    const accessScope = privacyToAccessScope(finalDefinition.privacy);

    const baseContext = {
      id: existingItem?._id ? String(existingItem._id) : undefined,
      definitionId: String(definitionId),
      key: args.key,
      itemId: args.itemId,
      userToken,
      value: args.value,
      privacy: finalDefinition.privacy as Privacy,
      filterKey: finalDefinition.filterKey,
      searchKeys: finalDefinition.searchKeys,
      sortKey: finalDefinition.sortKey ?? DEFAULT_SORT_KEY,
      lastModified: now,
      createdAt: itemCreatedAt,
    };

    const filterValue = buildFilterValue(baseContext);
    const searchValue = buildSearchValue({
      ...baseContext,
      filterValue,
    });
    const sortValue = buildSortValue({
      ...baseContext,
      filterValue,
      searchValue,
    });

    let itemId = existingItem?._id;

    if (existingItem) {
      await ctx.db.patch(existingItem._id, {
        definitionId,
        value: args.value,
        lastModified: now,
        accessScope,
        filterValue,
        searchValue,
        sortValue,
      });
    } else {
      itemId = await ctx.db.insert("user_lists", {
        definitionId,
        userToken,
        key: args.key,
        itemId: args.itemId,
        value: args.value,
        lastModified: now,
        createdAt: itemCreatedAt,
        accessScope,
        filterValue,
        searchValue,
        sortValue,
      });
    }

    if (!itemId) {
      throw new Error("Failed to resolve list item id");
    }

    if (existingDefinition && definitionConfigChanged) {
      const updatedDefinition = (await ctx.db.get(definitionId)) as any;
      if (updatedDefinition) {
        await reindexItemsForDefinition(ctx, updatedDefinition);

        if (previousItems) {
          for (const item of previousItems) {
            await applyUserListCountDelta(ctx, {
              ownerUserToken: userToken,
              key: args.key,
              filterValue: item.filterValue as PrimitiveIndexValue | undefined,
              itemId: item.itemId,
              privacy: existingDefinition.privacy as Privacy,
              delta: -1,
            });
          }
        }

        const currentItems = await ctx.db
          .query("user_lists")
          .withIndex("by_user_key_sort", (q) =>
            q.eq("userToken", userToken).eq("key", args.key)
          )
          .collect();

        for (const item of currentItems) {
          await applyUserListCountDelta(ctx, {
            ownerUserToken: userToken,
            key: args.key,
            filterValue: item.filterValue as PrimitiveIndexValue | undefined,
            itemId: item.itemId,
            privacy: updatedDefinition.privacy as Privacy,
            delta: 1,
          });
        }
      }
    }

    const finalItem = await ctx.db.get(itemId);
    const latestDefinition = (await ctx.db.get(definitionId)) as any;

    if (
      finalItem &&
      latestDefinition &&
      (!existingDefinition || !definitionConfigChanged)
    ) {
      const nextSnapshot = {
        filterValue: finalItem.filterValue as PrimitiveIndexValue | undefined,
        itemId: finalItem.itemId as string | undefined,
        privacy: latestDefinition.privacy as Privacy,
      };

      const didCountChange =
        !previousSnapshot ||
        previousSnapshot.filterValue !== nextSnapshot.filterValue ||
        !samePrivacy(previousSnapshot.privacy, nextSnapshot.privacy);

      if (didCountChange) {
        if (previousSnapshot) {
          await applyUserListCountDelta(ctx, {
            ownerUserToken: userToken,
            key: args.key,
            filterValue: previousSnapshot.filterValue,
            itemId: previousSnapshot.itemId,
            privacy: previousSnapshot.privacy,
            delta: -1,
          });
        }

        await applyUserListCountDelta(ctx, {
          ownerUserToken: userToken,
          key: args.key,
          filterValue: nextSnapshot.filterValue,
          itemId: nextSnapshot.itemId,
          privacy: nextSnapshot.privacy,
          delta: 1,
        });
      }
    }

    return shapeListRecord(finalItem, latestDefinition);
  },
});

export const remove = mutation({
  args: {
    key: v.string(),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const userToken = identity.subject;
    const definition = await getDefinitionByUserKey(ctx, userToken, args.key);

    const item = await ctx.db
      .query("user_lists")
      .withIndex("by_user_key_item", (q) =>
        q
          .eq("userToken", userToken)
          .eq("key", args.key)
          .eq("itemId", args.itemId)
      )
      .unique();

    if (!item) {
      return { success: true };
    }

    if (definition) {
      await applyUserListCountDelta(ctx, {
        ownerUserToken: userToken,
        key: args.key,
        filterValue: item.filterValue as PrimitiveIndexValue | undefined,
        itemId: item.itemId,
        privacy: definition.privacy as Privacy,
        delta: -1,
      });
    }

    await ctx.db.delete(item._id);
    return { success: true };
  },
});

export const updatePrivacy = mutation({
  args: {
    key: v.string(),
    privacy: privacyValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const userToken = identity.subject;

    const definition = await getDefinitionByUserKey(ctx, userToken, args.key);

    if (!definition) {
      throw new Error(
        `Cannot update privacy for list key="${args.key}" because the list definition does not exist yet.` 
      );
    }

    const nextPrivacy = normalizePrivacy(args.privacy);
    const now = Date.now();

    const items = await ctx.db
      .query("user_lists")
      .withIndex("by_user_key_sort", (q) =>
        q.eq("userToken", userToken).eq("key", args.key)
      )
      .collect();

    for (const item of items) {
      await applyUserListCountDelta(ctx, {
        ownerUserToken: userToken,
        key: args.key,
        filterValue: item.filterValue as PrimitiveIndexValue | undefined,
        itemId: item.itemId,
        privacy: definition.privacy as Privacy,
        delta: -1,
      });
    }

    await ctx.db.patch(definition._id, {
      privacy: nextPrivacy,
      lastModified: now,
    });

    await syncListPermissions(
      ctx,
      definition._id,
      userToken,
      args.key,
      nextPrivacy
    );

    const finalDefinition = await ctx.db.get(definition._id);
    if (!finalDefinition) {
      throw new Error("Failed to load updated list definition");
    }

    // Reindex all items because PROPERTY_PRIVACY may be used in
    // filter/search/sort config and accessScope definitely changes.
    await reindexItemsForDefinition(ctx, finalDefinition);

    for (const item of items) {
      await applyUserListCountDelta(ctx, {
        ownerUserToken: userToken,
        key: args.key,
        filterValue: item.filterValue as PrimitiveIndexValue | undefined,
        itemId: item.itemId,
        privacy: nextPrivacy,
        delta: 1,
      });
    }

    return finalDefinition;
  },
});
