# Current Session Context: The Great DataProvider Migration

This document serves as a comprehensive bridge between the legacy architecture and the new centralized data system. It documents the evolution of the codebase from direct, fragmented Convex subscriptions to a unified, cached, and performant architecture.

## Primary Documentation References
For deep dives into specific systems, refer to these foundational documents:
- [Paper Codebase Guide](file:///Users/malachyfernandez/Documents/1-programing/wolffspoint/utils/about-parts-of-this-codebase/about-this-codebase.md) - Overview of architecture, layout, and philosophy.
- [DataProvider & Data Hooks System](file:///Users/malachyfernandez/Documents/1-programing/wolffspoint/utils/about-parts-of-this-codebase/userVariables-system.md) - Reference for new hooks (`useValue`, `useList`, etc.).
- [Migration Guide](file:///Users/malachyfernandez/Documents/1-programing/wolffspoint/utils/about-parts-of-this-codebase/migrating-to-dataprovider.md) - Step-by-step instructions for converting legacy code.

---

## 1. The Starting Point: "None of this existed"

Before this migration began, the application relied on direct Convex hooks (`useQuery`, `useMutation`) and legacy wrappers (`useUserVariable`, `useUserList`) scattered across every component.

### The Problem (The "Why")
- **Subscription Fragmentation**: Every single call to `useUserVariable` created a separate websocket subscription to Convex. If a component was rendered 5 times, it opened 5 connections for the same data.
- **Tab Navigation Churn**: When navigating between tabs (e.g., in `PlayerGamePage`), components would unmount, destroying their subscriptions. Re-entering the tab forced a complete re-fetch, causing **UI Flickering** and **Network Spikes**.
- **State Inconsistency**: Components sometimes saw slightly different versions of the same data if their local `useQuery` calls weren't perfectly synchronized.

---

## 2. The Solution: Centralized DataProvider

We introduced a two-layer system to decouple components from the network:
1. **`DataStore` (The Brain)**: A global, non-React class that manages a cache of results and a reference-counting system. It ensures only ONE subscription exists for any unique data key/args combination.
2. **`DataProvider` (The Bridge)**: A React component that wraps the app and renders individual `DataSubscriber` children for every active subscription in the `DataStore`.

### The "Magic" of the Reference Count
When a component calls `useValue("profile")`, it "registers" interest. The `DataStore` increments a counter. If the counter moves from 0 to 1, the `DataProvider` mounts a real Convex hook. When the component unmounts, the counter drops. We keep the data "hot" for a 5-second grace period to allow for instant tab-switching without re-fetching.

---

## 3. Migration Examples

### Example A: Single Variable (`userData`)
**OLD (Direct hook with inline config):**
```tsx
const [userData, setUserData] = useUserVariable<UserData>({
    key: "userData",
    defaultValue: { name: "", email: "", userId: "" },
    privacy: "PUBLIC"
});
```

**NEW (Centralized config + clean hook):**
1. Define in `utils/dataConfig.ts`:
```ts
userData: {
    type: "variable",
    privacy: "PUBLIC",
    defaultValue: { name: "", email: "", userId: "" },
}
```
2. Use in component:
```tsx
const [userData, setUserData] = useValue<UserData>("userData");
```

### Example B: List Filtering (`myGames`)
**OLD:**
```tsx
const myGames = useUserListGet({
    key: "games",
    userIds: [userId]
});
```

**NEW:**
```tsx
const myGames = useFindListItems<GameInfo>("games", {
    userIds: [userId],
});
```

---

## 4. Key Discoveries & Hard-Won Lessons

### The React 18 `useEffect` Ordering Deadlock
During the migration of `MainPage.tsx`, we encountered a "stuck" loading state. We discovered that because React executes **child effects before parent effects**:
1. `MainPage` (Child) would register a subscription in its `useEffect`.
2. `DataProvider` (Parent) hadn't run its `useEffect` yet, so it hadn't attached its listener to the store.
3. The notification from `MainPage` was lost, and the background subscriber never mounted.

**The Fix:** We updated `DataProvider.tsx` to synchronously catch up on all active subscriptions the moment its effect runs.

### Stability & Memoization
We learned that `subId` generation (based on `JSON.stringify(args)`) is highly sensitive. Passing inline arrays like `userIds={[userId]}` caused continuous unmounting/remounting of subscriptions because `[userId] !== [userId]` referentially.
- **Best Practice**: Always memoize argument arrays or objects passed to data hooks.

---

## 5. Current Migration Status (Snapshot)

| Component | Status | Notes |
| :--- | :--- | :--- |
| `MainPage.tsx` | ✅ Migrated | Core logic now uses `useValue` and `useFindListItems`. |
| `PlayerGamePage.tsx` | ✅ Migrated | All tabs (`TownSquare`, `Newspaper`, etc.) are optimized. |
| `AllGamesPage.tsx` | ✅ Migrated | Filtered lists use the central cache. |
| `NewserGamePage.tsx` | ✅ Migrated | Tab switching is flicker-free. |
| `TopSiteBar.tsx` | ✅ Migrated | Now uses `useValue` and `useFindListItems`. |
| `GamePage.tsx` | ✅ Migrated | Now uses `useFindListItems` and `useFindValues`. |
| `GameList.tsx` | ✅ Migrated | Now uses `useValue`. |
| `ProfileInfo.tsx` | ✅ Migrated | Now uses `useValue`. |
| `RemoveGameButton.tsx` | ✅ Migrated | Now uses `useValue` and `useListRemove`. |
| `DaySelector.tsx` | ✅ Migrated | Now uses `useList`. |
| `ChangeDateInfo.tsx` | ✅ Migrated | Now uses `useList`. |
| `GetStartedButton.tsx` | ✅ Migrated | Now uses `useList`. |
| `ArchivedGamesDialog.tsx` | ✅ Migrated | Now uses `useValue` and `useFindListItems`. |
| `JoinedGames.tsx` | ✅ Migrated | Legacy import removed. |
| `JoinGameButton.tsx` | ✅ Migrated | Legacy import removed. |
| `JoinedGameListItem.tsx` | ✅ Migrated | Now uses `useFindListItems`. |
| `JoinedGameOptionsDialog.tsx` | ✅ Migrated | Now uses `useFindListItems`. |
| `JoinHandler.tsx` | ✅ Migrated | Now uses `useFindListItems`. |
| `FriendListItem.tsx` | ✅ Migrated | Now uses `useFindValues`. |
| `NameFromUserID.tsx` | ✅ Migrated | Now uses `useFindValues`. |
| `NewspaperPageOPERATOR.tsx` | ✅ Migrated | Now uses `useListSet`. |
| `ShareButton.tsx` | ✅ Migrated | Now uses `useListSet`. |
| `NewWolffspointButtonAndDialogue.tsx` | ✅ Migrated | Now uses `useListSet`. |
| `TownSquarePostDialog.tsx` | ✅ Migrated | Now uses `useListSet`. |
| `OperatorDayNavigation.tsx` | ✅ Migrated | Now uses `useListSet`. |
| `useTownSquareForum.ts` | ✅ Migrated | Now uses `useListSet` and `useListRemove`. |

---

## 6. Future Directions
- **Strict Typing**: Resolve remaining `any` types in list mappings across the app.
- **Legacy Cleanup**: All app components have been migrated. Legacy hook files (`hooks/useUserVariable.ts`, `hooks/useUserList.ts`, `hooks/useUserListGet.ts`, `hooks/useUserVariableGet.ts`) are no longer imported by any app component and can be safely deprecated/removed once confirmed stable.
- **Performance Auditing**: Use the Convex dashboard to confirm that "Read Quota" has stabilized during rapid navigation.
