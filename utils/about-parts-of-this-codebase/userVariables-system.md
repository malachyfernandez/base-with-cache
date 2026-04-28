# DataProvider & Data Hooks System

Quick reference for the new DataProvider system (`useValue`, `useList`, `useFindValues`, `useFindListItems`), which replaces the legacy `useUserVariable` and `useUserList` hooks.

## Why DataProvider?

The legacy `useUserVariable` hooks created individual Convex subscriptions per component. This meant that when components unmounted and mounted (e.g., during tab navigation), the subscriptions were torn down and recreated, causing **redundant network calls** and **UI flickering** while data re-fetched.

The new `DataProvider` solves this by introducing a global **Client Cache (DataStore)**:
- Components "register" and "unregister" from the DataStore cache.
- The DataProvider handles only *one* Convex subscription per piece of data.
- It uses a ref-count system. Data is kept in cache as long as at least one component is registered. If no components use it, it sticks around for an "unloaded changes threshold" (to protect against quick tab-switching) before finally unsubscribing.

## Centralized Configuration (`utils/dataConfig.ts`)

Instead of passing defaults and privacy directly to every hook invocation, everything is defined **once** in `utils/dataConfig.ts`.

```ts
// utils/dataConfig.ts
export const DATA_CONFIG: DataConfigType = {
  profile: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "", username: "" },
    searchKeys: ["username", "name"]
  },
  games: {
    type: "list",
    privacy: "PRIVATE",
    defaultValue: { score: 0 },
  }
};
```
If a key is missing from `DATA_CONFIG`, it will fallback to empty config, but **you should add everything to `DATA_CONFIG`** for safety and app-wide consistency.

---

## Core Hooks (`hooks/useData.ts`)

### `useValue`

Persistent single value per user per key.

```ts
const [profile, setProfile] = useValue<Profile>("profile");
// You can optionally override config locally (rarely needed)
// const [profile, setProfile] = useValue("profile", { defaultValue: { ... } });
```

Output:
- `[record, setValue]`
- `record.value`: current UI value
- `record.confirmedValue`: last server value
- `record.state`: sync + op status metadata

### `useList`

Persistent single item in a keyed list. Used for accessing a specific list item via `itemId`.

```ts
const [post, setPost] = useList<Post>("posts", "post_123");
```

Output:
- `[record, setValue]`
- same record-state shape as `useValue`

### `useFindValues`

Reads accessible variable rows by key across multiple users. **Requires an exact configuration of filters**.

```ts
const profiles = useFindValues<Profile>("profile", {
  searchFor: "ali", // text search value
  filterFor: "admin", // exact filter value
  userIds: friendIds, // user-id filter (IMPORTANT: Always use arrays or specific logic)
  returnTop: 10, // page size
});
```

Output:
- record array or `undefined` while loading
- includes full variable rows
- Cached just like single queries!

### `useFindListItems`

Reads accessible list rows by key, optionally across multiple users or an entire list.

```ts
const posts = useFindListItems<Post>("posts", {
  itemId: "post_123", // OPTIONAL: exact item id
  searchFor: "react", // text search value
  userIds: friendIds, // user-id filter
  returnTop: 10, // page size
});
```

Output:
- record array or `undefined` while loading
- Sorting comes from `dataConfig.ts`

### `useValueLength` & `useListLength`

Fast count lookups leveraging Convex index bounds without downloading the actual data.

```ts
const totalProfiles = useValueLength("profile", {
  filterFor: "admin", // REQUIRED: exact filter value
});

const totalComments = useListLength("comments", {
  filterFor: postId, // REQUIRED: exact filter value
  itemId: "comment_123", // OPTIONAL
});
```

## Privacy model

- `"PRIVATE"`: owner only.
- `"PUBLIC"`: everyone.
- `string[]` on hooks -> stored as `{ allowList: string[] }`.
- Owner always has access to own records.

Privacy is ideally defined in `utils/dataConfig.ts`.

## Avoiding Bugs & Best Practices

1. **Never pass variables through props just for performance**. It's safe to call `useValue` in 10 different child components. They all pull from the local DataStore cache instantly and only trigger one Convex backend query.
2. **Missing Imports**. We use the exports from `hooks/useData.ts`. If `useList is not defined`, make sure you imported it from `hooks/useData`.
3. **Array Dependencies**. When passing `userIds` to `useFindValues` or `useFindListItems`, try to memoize the array or rely on the stable cache mechanism to prevent continuous re-registration if the array reference changes every render. 
4. **Fallback Configs**. If your data behaves weirdly (no defaults, weird privacy rules), make sure the key exists in `utils/dataConfig.ts`.
