import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

type PrimitiveIndexValue = string | number | boolean;
type Privacy = "PUBLIC" | "PRIVATE" | { allowList: string[] };
type AccessScope = "PUBLIC" | "PRIVATE" | "SHARED";

const DEFAULT_SORT_KEY = "PROPERTY_LAST_MODIFIED";

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
        key: string;
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
        key: string;
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
        key: string;
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
        key: string;
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
        key: string;
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

function shapeRecord(record: any) {
    if (!record) return record;

    return {
        ...record,
        id: record._id,
    };
}

async function adjustUserVarPublicCount(
    ctx: any,
    key: string,
    filterValue: PrimitiveIndexValue | undefined,
    delta: number
) {
    if (delta === 0) return;

    const existing = await ctx.db
        .query("user_var_public_counts")
        .withIndex("by_key_filter", (q: any) =>
            q.eq("key", key).eq("filterValue", filterValue)
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

    await ctx.db.insert("user_var_public_counts", {
        key,
        filterValue,
        count: nextCount,
    });
}

async function adjustUserVarOwnerCount(
    ctx: any,
    ownerUserToken: string,
    key: string,
    filterValue: PrimitiveIndexValue | undefined,
    accessScope: AccessScope,
    delta: number
) {
    if (delta === 0) return;

    const existing = await ctx.db
        .query("user_var_owner_counts")
        .withIndex("by_owner_key_filter_scope", (q: any) =>
            q
                .eq("ownerUserToken", ownerUserToken)
                .eq("key", key)
                .eq("filterValue", filterValue)
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

    await ctx.db.insert("user_var_owner_counts", {
        ownerUserToken,
        key,
        filterValue,
        accessScope,
        count: nextCount,
    });
}

async function adjustUserVarSharedCount(
    ctx: any,
    allowedUserId: string,
    key: string,
    filterValue: PrimitiveIndexValue | undefined,
    delta: number
) {
    if (delta === 0) return;

    const existing = await ctx.db
        .query("user_var_shared_counts")
        .withIndex("by_user_key_filter", (q: any) =>
            q
                .eq("allowedUserId", allowedUserId)
                .eq("key", key)
                .eq("filterValue", filterValue)
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

    await ctx.db.insert("user_var_shared_counts", {
        allowedUserId,
        key,
        filterValue,
        count: nextCount,
    });
}

async function applyUserVarCountDelta(
    ctx: any,
    {
        ownerUserToken,
        key,
        filterValue,
        privacy,
        delta,
    }: {
        ownerUserToken: string;
        key: string;
        filterValue: PrimitiveIndexValue | undefined;
        privacy: Privacy;
        delta: number;
    }
) {
    const accessScope = privacyToAccessScope(privacy);

    if (accessScope === "PUBLIC") {
        await adjustUserVarPublicCount(ctx, key, filterValue, delta);
    }

    await adjustUserVarOwnerCount(
        ctx,
        ownerUserToken,
        key,
        filterValue,
        accessScope,
        delta
    );

    if (typeof privacy === "object" && privacy !== null) {
        for (const allowedUserId of privacy.allowList) {
            await adjustUserVarSharedCount(
                ctx,
                allowedUserId,
                key,
                filterValue,
                delta
            );
        }
    }
}

async function syncPermissions(
    ctx: any,
    varId: any,
    privacy: Privacy
) {
    const existing = await ctx.db
        .query("permissions")
        .withIndex("by_var", (q: any) => q.eq("varId", varId))
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
            await ctx.db.insert("permissions", {
                varId,
                allowedUserId,
            });
        }
    }
}

export const get = query({
    args: {
        key: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const userToken = identity?.subject;

        if (!userToken) return null;

        const record = await ctx.db
            .query("user_vars")
            .withIndex("by_user_key", (q) =>
                q.eq("userToken", userToken).eq("key", args.key)
            )
            .unique();

        if (!record) return null;

        return shapeRecord(record);
    },
});

export const length = query({
    args: {
        key: v.string(),
        filterFor: v.union(v.string(), v.number(), v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const viewerUserId = identity?.subject;

        const publicCount = await ctx.db
            .query("user_var_public_counts")
            .withIndex("by_key_filter", (q) =>
                q.eq("key", args.key).eq("filterValue", args.filterFor)
            )
            .unique();

        let total = publicCount?.count ?? 0;

        if (!viewerUserId) {
            return total;
        }

        const ownPrivateCount = await ctx.db
            .query("user_var_owner_counts")
            .withIndex("by_owner_key_filter_scope", (q) =>
                q
                    .eq("ownerUserToken", viewerUserId)
                    .eq("key", args.key)
                    .eq("filterValue", args.filterFor)
                    .eq("accessScope", "PRIVATE")
            )
            .unique();

        const ownSharedCount = await ctx.db
            .query("user_var_owner_counts")
            .withIndex("by_owner_key_filter_scope", (q) =>
                q
                    .eq("ownerUserToken", viewerUserId)
                    .eq("key", args.key)
                    .eq("filterValue", args.filterFor)
                    .eq("accessScope", "SHARED")
            )
            .unique();

        const sharedCount = await ctx.db
            .query("user_var_shared_counts")
            .withIndex("by_user_key_filter", (q) =>
                q
                    .eq("allowedUserId", viewerUserId)
                    .eq("key", args.key)
                    .eq("filterValue", args.filterFor)
            )
            .unique();

        total += ownPrivateCount?.count ?? 0;
        total += ownSharedCount?.count ?? 0;
        total += sharedCount?.count ?? 0;

        return total;
    },
});

export const set = mutation({
    args: {
        key: v.string(),
        value: v.any(),

        privacy: v.optional(
            v.union(
                v.literal("PUBLIC"),
                v.literal("PRIVATE"),
                v.object({ allowList: v.array(v.string()) })
            )
        ),
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

        const existing = await ctx.db
            .query("user_vars")
            .withIndex("by_user_key", (q) =>
                q.eq("userToken", userToken).eq("key", args.key)
            )
            .unique();

        const previousSnapshot = existing
            ? {
                  filterValue: existing.filterValue as PrimitiveIndexValue | undefined,
                  privacy: existing.privacy as Privacy,
              }
            : null;

        const now = Date.now();
        const createdAt = existing?.createdAt ?? now;
        const overwriteStoredConfig = args.overwriteStoredConfig ?? false;
        const overwriteStoredPrivacy = args.overwriteStoredPrivacy ?? false;

        const nextPrivacy = normalizePrivacy(
            overwriteStoredPrivacy
                ? (args.privacy ?? existing?.privacy ?? "PRIVATE")
                : (existing?.privacy ?? args.privacy ?? "PRIVATE")
        );

        const nextFilterKey = overwriteStoredConfig
            ? (args.filterKey ?? existing?.filterKey)
            : (existing?.filterKey ?? args.filterKey);

        const nextSearchKeys = overwriteStoredConfig
            ? (args.searchKeys ?? existing?.searchKeys)
            : (existing?.searchKeys ?? args.searchKeys);

        const nextSortKey = overwriteStoredConfig
            ? (args.sortKey ?? existing?.sortKey ?? DEFAULT_SORT_KEY)
            : (existing?.sortKey ?? args.sortKey ?? DEFAULT_SORT_KEY);

        const baseContext = {
            id: existing?._id ? String(existing._id) : undefined,
            key: args.key,
            userToken,
            value: args.value,
            privacy: nextPrivacy,
            filterKey: nextFilterKey,
            searchKeys: nextSearchKeys,
            sortKey: nextSortKey,
            lastModified: now,
            createdAt,
        };

        const filterValue = buildFilterValue(baseContext);

        const searchContext = {
            ...baseContext,
            filterValue,
        };

        const searchValue = buildSearchValue(searchContext);

        const sortContext = {
            ...searchContext,
            searchValue,
        };

        const sortValue = buildSortValue(sortContext);

        let varId = existing?._id;

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                lastModified: now,
                privacy: nextPrivacy,
                filterKey: nextFilterKey,
                searchKeys: nextSearchKeys,
                sortKey: nextSortKey,
                filterValue,
                searchValue,
                sortValue,
            });
        } else {
            varId = await ctx.db.insert("user_vars", {
                userToken,
                key: args.key,
                value: args.value,
                lastModified: now,
                createdAt,
                privacy: nextPrivacy,
                filterKey: nextFilterKey,
                searchKeys: nextSearchKeys,
                sortKey: nextSortKey,
                filterValue,
                searchValue,
                sortValue,
            });
        }

        if (!varId) {
            throw new Error("Failed to resolve variable id");
        }

        await syncPermissions(ctx, varId, nextPrivacy);

        const finalRecord = await ctx.db.get(varId);
        if (!finalRecord) {
            throw new Error("Failed to load final variable");
        }

        const nextSnapshot = {
            filterValue: finalRecord.filterValue as PrimitiveIndexValue | undefined,
            privacy: finalRecord.privacy as Privacy,
        };

        const didCountChange =
            !previousSnapshot ||
            previousSnapshot.filterValue !== nextSnapshot.filterValue ||
            !samePrivacy(previousSnapshot.privacy, nextSnapshot.privacy);

        if (didCountChange) {
            if (previousSnapshot) {
                await applyUserVarCountDelta(ctx, {
                    ownerUserToken: userToken,
                    key: args.key,
                    filterValue: previousSnapshot.filterValue,
                    privacy: previousSnapshot.privacy,
                    delta: -1,
                });
            }

            await applyUserVarCountDelta(ctx, {
                ownerUserToken: userToken,
                key: args.key,
                filterValue: nextSnapshot.filterValue,
                privacy: nextSnapshot.privacy,
                delta: 1,
            });
        }

        return shapeRecord(finalRecord);
    },
});

export const updatePrivacy = mutation({
    args: {
        key: v.string(),
        privacy: v.union(
            v.literal("PUBLIC"),
            v.literal("PRIVATE"),
            v.object({ allowList: v.array(v.string()) })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");

        const userToken = identity.subject;

        const record = await ctx.db
            .query("user_vars")
            .withIndex("by_user_key", (q) =>
                q.eq("userToken", userToken).eq("key", args.key)
            )
            .unique();

        if (!record) {
            throw new Error(
                `Cannot update privacy for key="${args.key}" because the variable does not exist yet.`
            );
        }

        const previousSnapshot = {
            filterValue: record.filterValue as PrimitiveIndexValue | undefined,
            privacy: record.privacy as Privacy,
        };

        const nextPrivacy = normalizePrivacy(args.privacy);

        await ctx.db.patch(record._id, {
            privacy: nextPrivacy,
        });

        await syncPermissions(ctx, record._id, nextPrivacy);

        const finalRecord = await ctx.db.get(record._id);
        if (!finalRecord) {
            throw new Error("Failed to load updated variable");
        }

        if (!samePrivacy(previousSnapshot.privacy, nextPrivacy)) {
            await applyUserVarCountDelta(ctx, {
                ownerUserToken: userToken,
                key: args.key,
                filterValue: previousSnapshot.filterValue,
                privacy: previousSnapshot.privacy,
                delta: -1,
            });

            await applyUserVarCountDelta(ctx, {
                ownerUserToken: userToken,
                key: args.key,
                filterValue: finalRecord.filterValue as PrimitiveIndexValue | undefined,
                privacy: finalRecord.privacy as Privacy,
                delta: 1,
            });
        }

        return shapeRecord(finalRecord);
    },
});