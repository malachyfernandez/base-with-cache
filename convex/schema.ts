import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const privacyValidator = v.union(
  v.literal("PUBLIC"),
  v.literal("PRIVATE"),
  v.object({ allowList: v.array(v.string()) })
);

const primitiveIndexValue = v.union(v.string(), v.number(), v.boolean());

export default defineSchema({
  globals: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  user_vars: defineTable({
    key: v.string(),
    value: v.any(),
    userToken: v.string(),

    // Metadata
    lastModified: v.number(),
    createdAt: v.number(),

    // Stored config
    privacy: privacyValidator,
    filterKey: v.optional(v.string()),
    searchKeys: v.optional(v.array(v.string())),
    sortKey: v.optional(v.string()),

    // Server-derived query values
    filterValue: v.optional(primitiveIndexValue),
    searchValue: v.optional(v.string()),
    sortValue: v.optional(primitiveIndexValue),
  })
    .index("by_user_key", ["userToken", "key"])
    .index("by_key_privacy_sort", ["key", "privacy", "sortValue"])
    .index("by_key_privacy_filter_sort", [
      "key",
      "privacy",
      "filterValue",
      "sortValue",
    ])
    .searchIndex("search_public", {
      searchField: "searchValue",
      filterFields: ["key", "filterValue", "privacy"],
    }),

  permissions: defineTable({
    varId: v.id("user_vars"),
    allowedUserId: v.string(),
  })
    .index("by_user", ["allowedUserId"])
    .index("by_var", ["varId"]),

  user_var_public_counts: defineTable({
    key: v.string(),
    filterValue: v.optional(primitiveIndexValue),
    count: v.number(),
  }).index("by_key_filter", ["key", "filterValue"]),

  user_var_owner_counts: defineTable({
    ownerUserToken: v.string(),
    key: v.string(),
    filterValue: v.optional(primitiveIndexValue),
    accessScope: v.union(
      v.literal("PUBLIC"),
      v.literal("PRIVATE"),
      v.literal("SHARED")
    ),
    count: v.number(),
  }).index("by_owner_key_filter_scope", [
    "ownerUserToken",
    "key",
    "filterValue",
    "accessScope",
  ]),

  user_var_shared_counts: defineTable({
    allowedUserId: v.string(),
    key: v.string(),
    filterValue: v.optional(primitiveIndexValue),
    count: v.number(),
  }).index("by_user_key_filter", ["allowedUserId", "key", "filterValue"]),

  // ---------------------------------------------------------------------------
  // New list definition table
  // One row per userToken + key
  // This is the source of truth for list-wide config.
  // ---------------------------------------------------------------------------
  user_list_definitions: defineTable({
    userToken: v.string(),
    key: v.string(),

    lastModified: v.number(),
    createdAt: v.number(),

    privacy: privacyValidator,
    filterKey: v.optional(v.string()),
    searchKeys: v.optional(v.array(v.string())),
    sortKey: v.optional(v.string()),
  })
    .index("by_user_key", ["userToken", "key"])
    .index("by_key", ["key"]),

  // ---------------------------------------------------------------------------
  // New list item table
  // One row per userToken + key + itemId
  // Stores actual item data and derived query values.
  // ---------------------------------------------------------------------------
  user_lists: defineTable({
    key: v.string(),
    value: v.any(),
    itemId: v.string(),
    userToken: v.string(),
    definitionId: v.id("user_list_definitions"),

    lastModified: v.number(),
    createdAt: v.number(),

    // Denormalized access marker for indexing only.
    // Source of truth is still the definition row's privacy.
    accessScope: v.union(
      v.literal("PUBLIC"),
      v.literal("PRIVATE"),
      v.literal("SHARED")
    ),

    filterValue: v.optional(primitiveIndexValue),
    searchValue: v.optional(v.string()),
    sortValue: v.optional(primitiveIndexValue),
  })
    // Exact owner lookup
    .index("by_user_key_item", ["userToken", "key", "itemId"])

    // Owner-scoped list reads
    .index("by_user_key_sort", ["userToken", "key", "sortValue"])
    .index("by_user_key_filter_sort", [
      "userToken",
      "key",
      "filterValue",
      "sortValue",
    ])

    // Shared-definition reads
    .index("by_definition_item", ["definitionId", "itemId"])
    .index("by_definition_sort", ["definitionId", "sortValue"])
    .index("by_definition_filter_sort", [
      "definitionId",
      "filterValue",
      "sortValue",
    ])

    // Public/global reads
    .index("by_key_access_item", ["key", "accessScope", "itemId"])
    .index("by_key_access_sort", ["key", "accessScope", "sortValue"])
    .index("by_key_access_filter_sort", [
      "key",
      "accessScope",
      "filterValue",
      "sortValue",
    ])

    .searchIndex("search_public_items", {
      searchField: "searchValue",
      filterFields: ["key", "accessScope", "filterValue"],
    })
    .searchIndex("search_user_items", {
      searchField: "searchValue",
      filterFields: ["userToken", "key", "filterValue"],
    })
    .searchIndex("search_definition_items", {
      searchField: "searchValue",
      filterFields: ["definitionId", "filterValue"],
    }),

  list_permissions: defineTable({
    definitionId: v.id("user_list_definitions"),
    allowedUserId: v.string(),

    // Denormalized helpers for lookup speed
    key: v.string(),
    ownerUserToken: v.string(),
  })
    .index("by_user", ["allowedUserId"])
    .index("by_user_key", ["allowedUserId", "key"])
    .index("by_definition", ["definitionId"]),

  user_list_public_counts: defineTable({
    key: v.string(),
    filterValue: v.optional(primitiveIndexValue),
    itemId: v.optional(v.string()),
    count: v.number(),
  }).index("by_key_filter_item", ["key", "filterValue", "itemId"]),

  user_list_owner_counts: defineTable({
    ownerUserToken: v.string(),
    key: v.string(),
    filterValue: v.optional(primitiveIndexValue),
    itemId: v.optional(v.string()),
    accessScope: v.union(
      v.literal("PUBLIC"),
      v.literal("PRIVATE"),
      v.literal("SHARED")
    ),
    count: v.number(),
  }).index("by_owner_key_filter_item_scope", [
    "ownerUserToken",
    "key",
    "filterValue",
    "itemId",
    "accessScope",
  ]),

  user_list_shared_counts: defineTable({
    allowedUserId: v.string(),
    key: v.string(),
    filterValue: v.optional(primitiveIndexValue),
    itemId: v.optional(v.string()),
    count: v.number(),
  }).index("by_user_key_filter_item", [
    "allowedUserId",
    "key",
    "filterValue",
    "itemId",
  ]),
});