# BeanJar Development Guide

Quick reference for the BeanJar user data hooks.

## What to use

- `useUserVariable`: one value per user + key.
- `useUserList`: many items per user + key (by `itemId`).
- `useUserVariableGet` / `useUserListGet`: read accessible records across users.
- `useUserVariablePrivacy` / `useUserListPrivacy`: update privacy only.
- `useUserListSet`: upsert without mounting per-item hook.
- `useUserListRemove`: remove one list item.

## Core patterns

### `useUserVariable`

Persistent single value per user key.

```ts
const [profile, setProfile] = useUserVariable<Profile>({
  key: "profile", // REQUIRED: var key
  defaultValue: { name: "", username: "" }, // create fallback
  privacy: "PUBLIC", // access mode
  filterKey: "username", // exact filter key
  searchKeys: ["username", "name"], // text index keys
  sortKey: "PROPERTY_LAST_MODIFIED", // result order key
  overwriteStoredConfig: true, // default: keep filter/search/sort synced
  overwriteStoredPrivacy: false, // default: keep privacy sticky
  onOpStatusChange: (info) => {}, // op status callback
});
```

Output:
- `[record, setValue]`
- `record.value`: current UI value
- `record.confirmedValue`: last server value
- `record.state`: sync + op status metadata

### `useUserList`

Persistent single item in a keyed list.

```ts
const [post, setPost] = useUserList<Post>({
  key: "posts", // REQUIRED: list key
  itemId: "post_123", // REQUIRED: item id
  defaultValue: { title: "", body: "" }, // create fallback
  privacy: "PUBLIC", // list access mode
  filterKey: "status", // exact filter key
  searchKeys: ["title", "body"], // text index keys
  sortKey: "PROPERTY_LAST_MODIFIED", // result order key
  overwriteStoredConfig: true, // default: keep filter/search/sort synced
  overwriteStoredPrivacy: false, // default: keep privacy sticky
  onOpStatusChange: (info) => {}, // op status callback
});
```

Output:
- `[record, setValue]`
- same record-state shape as `useUserVariable`
- list uniqueness is `userToken + key + itemId`

### `useUserVariableGet`

Reads accessible variable rows by key.

```ts
const profiles = useUserVariableGet<Profile>({
  key: "profile", // REQUIRED: var key
  searchFor: "ali", // text search value
  filterFor: "admin", // exact filter value
  userIds: friendIds, // user-id filter
  returnTop: 10, // page size
  startAfter: cursorId, // pagination cursor
});
```

Output:
- record array or `undefined` while loading
- includes full variable rows
- sorting comes from stored `sortKey`

### `useUserListGet`

Reads accessible list rows by key.

```ts
const posts = useUserListGet<Post>({
  key: "posts", // REQUIRED: list key
  itemId: "post_123", // exact item id
  searchFor: "react", // text search value
  filterFor: "published", // exact filter value
  userIds: friendIds, // user-id filter
  returnTop: 10, // page size
  startAfter: cursorId, // pagination cursor
});
```

Output:
- record array or `undefined` while loading
- includes item fields plus list config fields
- sorting comes from stored `sortKey`

### `useUserVariableLength`

Exact accessible variable count for one `key + filterFor`.

```ts
const totalProfiles = useUserVariableLength({
  key: "profile", // REQUIRED: var key
  filterFor: "admin", // REQUIRED: exact filter value
});
```

Output:
- exact count or `undefined` while loading
- constant-time count path
- only supports `key + filterFor`

### `useUserListLength`

Exact accessible list-item count for one `key + filterFor`, with optional `itemId`.

```ts
const totalComments = useUserListLength({
  key: "comments", // REQUIRED: list key
  filterFor: postId, // REQUIRED: exact filter value
  itemId: "comment_123", // OPTIONAL: exact item id
});
```

Output:
- exact count or `undefined` while loading
- constant-time count path
- with `itemId`, counts exact `key + filterFor + itemId`
- without `itemId`, counts exact `key + filterFor`
- dev warning logs for shared `itemId` count shapes unless disabled in config

### `useUserListSet`

Upserts one list item.

```ts
const setPost = useUserListSet<Post>();

setPost({
  key: "posts", // REQUIRED: list key
  itemId: "post_123", // REQUIRED: item id
  value: { title: "Hi", body: "..." }, // REQUIRED: item value
  privacy: "PUBLIC", // access mode
  filterKey: "status", // exact filter key
  searchKeys: ["title", "body"], // text index keys
  sortKey: "PROPERTY_LAST_MODIFIED", // result order key
  overwriteStoredConfig: true, // default: keep filter/search/sort synced
  overwriteStoredPrivacy: false, // default: keep privacy sticky
});
```

Output:
- Convex mutation promise
- create if missing, replace if existing

### `useUserVariablePrivacy`

Updates one variable privacy only.

```ts
const setPrivacy = useUserVariablePrivacy();

setPrivacy({
  key: "profile", // REQUIRED: var key
  privacy: "PUBLIC", // REQUIRED: access mode
});
```

Output:
- Convex mutation promise
- does not change stored `value`

### `useUserListPrivacy`

Updates privacy for one whole list.

```ts
const setListPrivacy = useUserListPrivacy();

setListPrivacy({
  key: "posts", // REQUIRED: list key
  privacy: "PUBLIC", // REQUIRED: access mode
});
```

Output:
- Convex mutation promise
- applies to all items in that list

### `useUserListRemove`

Removes one item row from a list.

```ts
const removePost = useUserListRemove();

removePost({
  key: "posts", // REQUIRED: list key
  itemId: "post_123", // REQUIRED: item id
});
```

Output:
- Convex mutation promise
- removes item row only (definition stays)

## Privacy model

- `"PRIVATE"`: owner only.
- `"PUBLIC"`: everyone.
- `string[]` on hooks -> stored as `{ allowList: string[] }`.
- Owner always has access to own records.

## Config defaults (`utils/userVarConfig.ts`)

- `defaultTimeoutMs`: optimistic timeout default.
- `overwriteStoredConfigOnSet`: whether normal writes re-apply filter/search/sort.
- `overwriteStoredPrivacyOnSet`: whether normal writes re-apply privacy.
- `defaultSortKey`: fallback sort key when omitted.
- dev warning toggles:
  - `devWarningsEnabled`
  - `warnOnUserVarOpTimeout`
  - `logOnUserVarRollback`

## Notes that prevent bugs

- `userIds` in get hooks is an explicit filter. If provided, only those users are queried.
- For old local data, ensure friend/user lists are normalized to user-id strings.
- `filterValue` / `searchValue` / `sortValue` are computed server-side from config + value.
- exact fast counts are available through the dedicated `Length` hooks for `key + filterFor`, and `useUserListLength` also supports optional exact `itemId`

## Undo/Redo Pattern

Perfect example of implementing undo/redo with the `useUndoRedo` hook:

```ts
const { executeCommand } = useUndoRedo();
const createUndoSnapshot = useCreateUndoSnapshot();

const UNDOABLEsetUserTable = (updatedUsers: UserTableItem[]) => {
    const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
    const nextUserTable = createUndoSnapshot(updatedUsers);

    executeCommand({
        action: () => setUserTable(createUndoSnapshot(nextUserTable)),
        undoAction: () => setUserTable(createUndoSnapshot(previousUserTable)),
        description: "Updated user"
    });
};
```

This pattern:
1. Creates snapshots of the current and next state
2. Wraps the state change in an undoable command
3. Provides both action and undoAction functions
4. Includes a descriptive message for the undo stack

