# Migrating to the DataProvider System

This guide outlines how and why we migrated from the legacy `useUserVariable` and `useUserList` hooks to the new `DataProvider` system.

## Why did we migrate?

The old system mounted a direct Convex subscription (`useQuery`) for **every** hook invocation. 
When navigating between screens or tabs (like the `RolesPage` and `PlayersPage` in the game operator dashboard), components would unmount. This caused their associated Convex subscriptions to be destroyed. When returning to the tab, the component would mount and re-initiate the query, causing:
1. **Network Churn**: Re-fetching data that we already had a second ago.
2. **UI Flickering**: Displaying loading states needlessly on fast tab transitions.
3. **Read Amplification**: Eating up Convex read quotas.

## The Solution: `DataProvider` and `DataStore`

We introduced a client-side global state manager (`DataStore`) and a context provider (`DataProvider`). 

Instead of directly talking to Convex, the new hooks (`useValue`, `useList`, `useFindValues`, `useFindListItems`) talk to the `DataProvider`. 
- The `DataProvider` handles the physical Convex query.
- Multiple components requesting the same data key simply "register" interest with the `DataProvider` (bumping a reference count).
- When a component unmounts, the ref-count goes down. The `DataProvider` keeps the data in memory and delays destroying the Convex subscription (controlled by `unloadedChangesThreshold`) to accommodate quick tab switching.

## Migration Guide

### 1. Centralize Configurations

Previously, defaults, privacy rules, and search keys were passed inline to every hook:

**OLD:**
```ts
const [profile, setProfile] = useUserVariable({
    key: "profile",
    defaultValue: { name: "" },
    privacy: "PUBLIC"
});
```

**NEW:**
Move the configuration to `utils/dataConfig.ts`:
```ts
// utils/dataConfig.ts
export const DATA_CONFIG: DataConfigType = {
  profile: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "" },
  }
};
```

### 2. Update Hook Invocations

Use the simpler signature. The hook will automatically read its behavior from `dataConfig.ts`.

**OLD Variables:**
```ts
import { useUserVariable, useUserVariableGet } from 'hooks/useUserVariable';

const [profile, setProfile] = useUserVariable({ key: "profile" });
const friends = useUserVariableGet({ key: "profile", userIds: ["1", "2"] });
```

**NEW Variables:**
```ts
import { useValue, useFindValues } from 'hooks/useData';

const [profile, setProfile] = useValue("profile");
const friends = useFindValues("profile", { userIds: ["1", "2"] });
```

**OLD Lists:**
```ts
import { useUserList, useUserListGet } from 'hooks/useUserList';

const [post, setPost] = useUserList({ key: "posts", itemId: "123" });
const userPosts = useUserListGet({ key: "posts", itemId: "123" });
```

**NEW Lists:**
```ts
import { useList, useFindListItems } from 'hooks/useData';

const [post, setPost] = useList("posts", "123");
const userPosts = useFindListItems("posts", { itemId: "123" });
```

### 3. Cleanup Legacy Imports

Once migrated, remove any imports of the old `hooks/useUserVariable.ts` and `hooks/useUserList.ts`. Always import the replacements from `hooks/useData.ts`.

## Performance Notes

- Feel free to "prop-drill" LESS. With the new `DataProvider`, you can safely drop `useValue` or `useList` into deeply nested components without worrying about causing multiple backend queries. The `DataStore` correctly multiplexes these requests on the client!
