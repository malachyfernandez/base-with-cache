import { mutation } from "./_generated/server";

type PrimitiveIndexValue = string | number | boolean;
type Privacy = "PUBLIC" | "PRIVATE" | { allowList: string[] };
type AccessScope = "PUBLIC" | "PRIVATE" | "SHARED";

function privacyToAccessScope(privacy: Privacy): AccessScope {
    if (privacy === "PUBLIC") return "PUBLIC";
    if (privacy === "PRIVATE") return "PRIVATE";
    return "SHARED";
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

export const migrateUserVars = mutation({
    args: {},
    handler: async (ctx) => {
        const vars = await ctx.db.query("user_vars").collect();
        let updated = 0;

        for (const doc of vars) {
            const patch: any = {};

            if (doc.lastModified === undefined || doc.lastModified === null) {
                patch.lastModified = Date.now();
            }

            if (doc.createdAt === undefined || doc.createdAt === null) {
                patch.createdAt = doc.lastModified ?? Date.now();
            }

            if (doc.privacy === undefined || doc.privacy === null) {
                patch.privacy = "PRIVATE";
            }

            if (Object.keys(patch).length > 0) {
                await ctx.db.patch(doc._id, patch);
                updated += 1;
            }
        }

        return { scanned: vars.length, updated };
    },
});

export const resetDevData = mutation({
    args: {},
    handler: async (ctx) => {
        const vars = await ctx.db.query("user_vars").collect();
        for (const doc of vars) {
            await ctx.db.delete(doc._id);
        }

        const perms = await ctx.db.query("permissions").collect();
        for (const doc of perms) {
            await ctx.db.delete(doc._id);
        }

        return { deletedVars: vars.length, deletedPerms: perms.length };
    },
});

export const rebuildUserListCounts = mutation({
    args: {},
    handler: async (ctx) => {
        const publicCounts = await ctx.db.query("user_list_public_counts").collect();
        for (const doc of publicCounts) {
            await ctx.db.delete(doc._id);
        }

        const ownerCounts = await ctx.db.query("user_list_owner_counts").collect();
        for (const doc of ownerCounts) {
            await ctx.db.delete(doc._id);
        }

        const sharedCounts = await ctx.db.query("user_list_shared_counts").collect();
        for (const doc of sharedCounts) {
            await ctx.db.delete(doc._id);
        }

        const items = await ctx.db.query("user_lists").collect();
        let rebuilt = 0;

        for (const item of items) {
            const definition = await ctx.db.get(item.definitionId);
            if (!definition) {
                continue;
            }

            await applyUserListCountDelta(ctx, {
                ownerUserToken: item.userToken,
                key: item.key,
                filterValue: item.filterValue as PrimitiveIndexValue | undefined,
                itemId: item.itemId,
                privacy: definition.privacy as Privacy,
                delta: 1,
            });

            rebuilt += 1;
        }

        return {
            cleared: {
                publicCounts: publicCounts.length,
                ownerCounts: ownerCounts.length,
                sharedCounts: sharedCounts.length,
            },
            rebuilt,
        };
    },
});
