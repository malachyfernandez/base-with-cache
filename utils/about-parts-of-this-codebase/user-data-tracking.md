# User Variable and User List Source of Truth

This file is the authoritative app-level reference for every app-defined `useUserVariable` and `useUserList` key currently used in the codebase.

Use this file when updating existing data, creating new reads/writes, or prompting a weaker model.

## Global Rules

- **Same key = same shape/config**.
- **Do not change field names for an existing key in only one place**.
- **Components should subscribe directly** instead of receiving user-var/list records through props.
- **Game join code** is the game's `id` field from the `games` list.
- **Game-scoped variable keys** are built with:

```ts
getGameScopedKey(baseKey, gameId) === `${baseKey}-${gameId}`
```

- **Day-scoped player submission keys** are built with:

```ts
getGameScopedKey(`playerNightSubmission-day-${dayIndex}`, gameId)
```

## Value Types

### `UserData`

```ts
type UserData = {
  email?: string;
  name?: string;
  userId?: string;
};
```

### `GameInfo`

```ts
type GameInfo = {
  id: string;
  name: string;
  description: string;
};
```

### `PlayerProfile`

```ts
type PlayerProfile = {
  gameId: string;
  email: string;
  userId: string;
  inGameName: string;
  profileImageUrl: string;
  phoneNumber: string;
  instagram: string;
  discord: string;
  otherContact: string;
  bioMarkdown: string;
  claimedAt: number;
};
```

### `GameSchedule`

```ts
type GameSchedule = {
  newspaperReleaseTime: string;
  nightlyDeadlineTime: string;
  nightlyResponseReleaseTime: string;
};
```

### `PlayerNightSubmission`

```ts
type PlayerNightSubmission = {
  gameId: string;
  gameDayId: string;
  dayIndex: number;
  playerEmail: string;
  playerUserId: string;
  vote: string;
  action: string;
  submittedVoteAt: number | null;
  submittedActionAt: number | null;
};
```

### `TownSquarePost`

```ts
type TownSquarePost = {
  gameId: string;
  postId: string;
  authorUserId: string;
  markdown: string;
  title?: string;
  bodyMarkdown?: string;
  bodyHtml?: string;
  plainText?: string;
  createdAt: number;
};
```

### `TownSquareComment`

```ts
type TownSquareComment = {
  gameId: string;
  postId: string;
  commentId: string;
  authorUserId: string;
  markdown: string;
  bodyHtml?: string;
  plainText?: string;
  parentCommentId?: string;
  replyToCommentId?: string;
  createdAt: number;
};
```

### `UserTableItem`

```ts
type PlayerData = {
  livingState: 'alive' | 'dead';
  extraColumns?: string[];
};

type DayData = {
  vote?: string;
  action?: string;
  extraColumns?: string[];
};

type UserTableItem = {
  realName: string;
  email: string;
  userId: string | 'NOT-JOINED';
  role: string;
  playerData: PlayerData;
  days: DayData[];
};
```

### `UserTableTitle`

```ts
type UserTableTitle = {
  extraUserColumns: string[];
  extraDayColumns: string[];
};
```

### `UserTableColumnVisibility`

```ts
type UserTableColumnVisibility = {
  extraUserColumns: boolean[];
  extraDayColumns: boolean[];
};
```

### `RoleTableItem`

```ts
type RoleTableItem = {
  role: string;
  doesRoleVote: boolean;
  roleMessage: string;
  isVisible: boolean;
};
```

### `Usepaper`

```ts
interface Usepaper {
  columns: string[];
}
```

### `MathDocument`

```ts
interface MathDocument {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  lastOpenedAt: number;
}
```

### `MathDocumentPage`

```ts
interface MathDocumentPageFollowUp {
  id: string;
  prompt: string;
  createdAt: number;
  resultingMarkdown: string;
}

interface MathDocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  title: string;
  imageUrl: string;
  markdown: string;
  lastAiPrompt: string;
  lastGeneratedAt?: number;
  followUps: MathDocumentPageFollowUp[];
}
```

## User Variables

### `userData`

- **Hook**: `useUserVariable<UserData>`
- **Canonical shape**: `UserData`
- **Default value**:

```ts
{ name: '', email: '', userId: '' }
```

- **Privacy**: `PUBLIC`
- **searchKeys**: `['name']`
- **Used by**:
  - `MainPage.tsx`
  - `AllGamesPage.tsx`
  - `UserProfileDialog.tsx`
  - `PlayerAccessGate.tsx`
  - `NameFromUserID.tsx` via `useUserVariableGet`
  - `FriendListItem.tsx` via `useUserVariableGet`
- **Important note**: This must stay `PUBLIC` because other components query other users' `userData` by `userId`.

### `activeGameId`

- **Hook**: `useUserVariable<string>`
- **Canonical shape**: `string`
- **Default value**: `''`
- **Privacy**: implicit default (`PRIVATE`)
- **Used by**:
  - `MainPage.tsx`
  - `TopSiteBar.tsx`
- **Meaning**: currently opened game id for the current user.

### `gamesTheyJoined`

- **Hook**: `useUserVariable<string[]>`
- **Canonical shape**: `string[]`
- **Default value**: `[]`
- **Privacy**: implicit default (`PRIVATE`)
- **Used by**:
  - `AllGamesPage.tsx`
- **Meaning**: list of game ids this user has joined.

### `aiGuidance`

- **Hook**: `useUserVariable<string>`
- **Canonical shape**: `string`
- **Default value**:

```ts
'Convert this handwritten math to Markdown + LaTeX with exact transcription.'
```

- **Privacy**: `PRIVATE`
- **Used by**:
  - `hooks/useMathGeneration.ts`

### `ruleBook-{gameId}`

- **Hook**: `useUserVariable<string>` / `useUserVariableGet<string>`
- **Canonical shape**: `string`
- **Default value**: `''`
- **Privacy**: `PUBLIC`
- **Key builder**: `getGameScopedKey('ruleBook', gameId)`
- **Used by**:
  - `RuleBookPageOPERATOR.tsx`
  - `RuleBookPagePLAYER.tsx`

### `gameSchedule-{gameId}`

- **Hook**: `useUserVariable<GameSchedule>` / `useUserVariableGet<GameSchedule>`
- **Canonical shape**: `GameSchedule`
- **Default value**:

```ts
{
  newspaperReleaseTime: '08:00',
  nightlyDeadlineTime: '22:00',
  nightlyResponseReleaseTime: '23:00',
}
```

- **Privacy**: `PUBLIC`
- **Key builder**: `getGameScopedKey('gameSchedule', gameId)`
- **Used by**:
  - `NewspaperPageOPERATOR.tsx`
  - `NightlyPageOPERATOR.tsx`
  - `ReadOnlyNewspaperPagePLAYER.tsx`
  - `YourEyesOnlyPagePLAYER.tsx`

### `playerProfile-{gameId}`

- **Hook**: `useUserVariable<PlayerProfile>` / `useUserVariableGet<PlayerProfile>`
- **Canonical shape**: `PlayerProfile`
- **Privacy**: `PUBLIC`
- **searchKeys**: `['inGameName', 'bioMarkdown']`
- **sortKey**: `'inGameName'`
- **Key builder**: `getGameScopedKey('playerProfile', gameId)`
- **Used by**:
  - `PhoneBookPagePLAYER.tsx`
  - `PlayerAccessGate.tsx`
- **Meaning**: one player profile per user, per game.

### `playerNightSubmission-day-{dayIndex}-{gameId}`

- **Hook**: `useUserVariable<PlayerNightSubmission>` / `useUserVariableGet<PlayerNightSubmission>`
- **Canonical shape**: `PlayerNightSubmission`
- **Privacy**: `PUBLIC`
- **filterKey**: `'playerEmail'`
- **searchKeys**: `['playerEmail', 'vote', 'action']`
- **sortKey**: `'submittedActionAt'`
- **Key builder**:

```ts
getGameScopedKey(`playerNightSubmission-day-${dayIndex}`, gameId)
```

- **Used by**:
  - `YourEyesOnlyPagePLAYER.tsx`
  - `NightlyPageOPERATOR.tsx`
- **Meaning**: one submission variable per user for one game day.

### `playerPageColumnSizes-{gameId}`

- **Hook**: `useUserVariable<PlayerPageColumnSizes>`
- **Canonical shape**:

```ts
type ColumnSizeOption = 'small' | 'medium' | 'large';

type PlayerPageColumnSizes = {
  playerBaseColumns: {
    status: ColumnSizeOption;
    player: ColumnSizeOption;
  };
  playerExtraColumns: ColumnSizeOption[];
  dayBaseColumns: {
    vote: ColumnSizeOption;
    action: ColumnSizeOption;
  };
  dayExtraColumns: ColumnSizeOption[];
};
```

- **Default value**:

```ts
{
  playerBaseColumns: {
    status: 'small',
    player: 'small',
  },
  playerExtraColumns: [],
  dayBaseColumns: {
    vote: 'small',
    action: 'small',
  },
  dayExtraColumns: [],
}
```

- **Privacy**: implicit default (`PRIVATE`)
- **Key builder**: `getGameScopedKey('playerPageColumnSizes', gameId)`
- **Used by**:
  - `DaysTable.tsx`
- **Meaning**: per-user remembered width choices for operator player-page columns, stored by column so the selection persists across days.

### `nightlyPageColumnSizes-{gameId}`

- **Hook**: `useUserVariable<NightlyPageColumnSizes>`
- **Canonical shape**:

```ts
type ColumnSizeOption = 'small' | 'medium' | 'large';

type NightlyPageColumnSizes = {
  vote: ColumnSizeOption;
  action: ColumnSizeOption;
  morningMessage: ColumnSizeOption;
};
```

- **Default value**:

```ts
{
  vote: 'small',
  action: 'small',
  morningMessage: 'medium',
}
```

- **Privacy**: implicit default (`PRIVATE`)
- **Key builder**: `getGameScopedKey('nightlyPageColumnSizes', gameId)`
- **Used by**:
  - `NightlyDaysTable.tsx`
  - `NightlyDayTitleRow.tsx`
  - `NightlyDayUserRow.tsx`
- **Meaning**: per-user remembered width choices for nightly page columns (Vote, Action, Morning Message). Separate from playerPageColumnSizes since this is a different table with different columns.

### `townSquareReadState-{gameId}`

- **Hook**: `useUserVariable<Record<string, number>>`
- **Canonical shape**:

```ts
Record<string, number>
```

- **Privacy**: implicit default (`PRIVATE`)
- **Key builder**: `getGameScopedKey('townSquareReadState', gameId)`
- **Used by**:
  - `TownSquarePagePLAYER.tsx`
- **Meaning**: per-user last-read timestamps keyed by `postId` for unread reply highlighting.

## User Lists

### `games`

- **Hook(s)**: `useUserListSet<GameInfo>`, `useUserListGet<GameInfo>`
- **Canonical shape**: `GameInfo`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **filterKey**: `'id'`
- **Used by**:
  - `MainPage.tsx`
  - `NewWolffspointButtonAndDialogue.tsx`
  - `JoinedGameListItem.tsx`
  - `JoinHandler.tsx`
  - `GamePage.tsx`
  - `TopSiteBar.tsx`
  - `RemoveGameButton.tsx`
- **Important note**: the **join code is `value.id`**. `JoinHandler` validates a code with `filterFor: gameCode` because this list is indexed by `id`.

### `dayDatesArray`

- **Hook**: `useUserList<string[]>`
- **Canonical shape**: `string[]`
- **Stored format**: array of `MM/DD/YYYY` strings
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Default value**: `[]`
- **Used by**:
  - `NewWolffspointButtonAndDialogue.tsx`
  - `NewspaperPage.tsx`
  - `NewspaperPageOPERATOR.tsx`
  - `NightlyPageOPERATOR.tsx`
  - `PlayerPageOPERATOR.tsx`
  - `PlayerDaysSection.tsx`
  - `ComprehensiveDaySelector.tsx`
  - `DaySelector.tsx`
  - `UserAddDialog.tsx`
  - `YourEyesOnlyPagePLAYER.tsx` via `useSharedListValue`
- **Meaning**: authoritative shared calendar for a game's day sequence.

### `numberOfRealDaysPerInGameDay`

- **Hook**: `useUserList<number>`
- **Canonical shape**: `number`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Default value**: `2`
- **Used by**:
  - `NewspaperPage.tsx`
  - `NightlyPageOPERATOR.tsx`
  - `PlayerPageOPERATOR.tsx`
  - `PlayerDaysSection.tsx`
  - `ComprehensiveDaySelector.tsx`
  - `DaySelector.tsx`
  - `ChooseDayDialog.tsx`
  - `ChangeDateInfo.tsx`
  - `GetStartedButton.tsx`
- **Meaning**: canonical shared spacing between in-game days.

### `startingDate`

- **Hook**: `useUserList<string>`
- **Canonical shape**: `string`
- **itemId**: `gameId`
- **Used by**:
  - `ChangeDateInfo.tsx`
  - `GetStartedButton.tsx`
- **Important note**: this is **legacy setup-only data**. The actual shared day timeline used by gameplay is `dayDatesArray`.

### `userTable`

- **Hook**: `useUserList<UserTableItem[]>`
- **Canonical shape**: `UserTableItem[]`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Used by**:
  - `DaysTable.tsx`
  - `UserRow.tsx`
  - `PlayerAddUserSection.tsx`
  - `UserAddDialog.tsx`
  - `PlayerPageOPERATOR.tsx`
  - `PlayerTable.tsx`
  - `NightlyDaysTable.tsx`
  - `NightlyUserRow.tsx`
  - `NightlyPageOPERATOR.tsx`
  - `PlayerAccessGate.tsx` via `useSharedListValue`
- **Meaning**: operator-maintained player roster plus per-day stored outcomes.

### `userTableTitle`

- **Hook**: `useUserList<UserTableTitle>`
- **Canonical shape**: `UserTableTitle`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Used by**:
  - `DaysTable.tsx`
  - `PlayerTable.tsx`
  - `UserAddDialog.tsx`

### `userTableColumnVisibility`

- **Hook**: `useUserList<UserTableColumnVisibility>`
- **Canonical shape**: `UserTableColumnVisibility`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Used by**:
  - `DaysTable.tsx`
  - `PlayerTable.tsx`

### `roleTable`

- **Hook**: `useUserList<RoleTableItem[]>` / `useSharedListValue<RoleTableItem[]>`
- **Canonical shape**: `RoleTableItem[]`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Used by**:
  - `RoleTable.tsx`
  - `UserAddDialog.tsx`
  - `NightlyPageOPERATOR.tsx`
  - `YourEyesOnlyPagePLAYER.tsx`

### `selectedDayIndex`

- **Hook**: `useUserList<number>`
- **Canonical shape**: `number`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Default value**: `0`
- **Used by**:
  - `NewspaperPage.tsx`
  - `NewspaperPageOPERATOR.tsx`
  - `NightlyPageOPERATOR.tsx`
  - `PlayerPageOPERATOR.tsx`
  - `PlayerDaysSection.tsx`
  - `ComprehensiveDaySelector.tsx`
  - `DaySelector.tsx`

### `usepaper`

- **Hook**: `useUserList<Usepaper>`
- **Canonical shape**: `Usepaper`
- **itemId**: day-specific game key such as `${gameId}-day-${dayIndex}`
- **Privacy**: `PUBLIC`
- **Used by**:
  - `NewspaperWritingView.tsx`
  - `NewspaperViewingView.tsx`

### `nightlyResponseList`

- **Hook**: `useUserList<Record<string, string[]>>` / `useSharedListValue<Record<string, string[]>>`
- **Canonical shape**:

```ts
Record<string, string[]>
```

- **Meaning**: map of `playerEmail -> array of day responses`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Default value**: `{}`
- **Used by**:
  - `NightlyPageOPERATOR.tsx`
  - `YourEyesOnlyPagePLAYER.tsx`

### `nightlyMessagesList`

- **Hook**: `useUserList<Record<string, string[]>>` / `useSharedListValue<Record<string, string[]>>`
- **Canonical shape**:

```ts
Record<string, string[]>
```

- **Meaning**: map of `playerEmail -> array of day messages`
- **itemId**: `gameId`
- **Privacy**: `PUBLIC`
- **Default value**: `{}`
- **Used by**:
  - `NightlyPageOPERATOR.tsx`
  - `YourEyesOnlyPagePLAYER.tsx`

### `townSquarePosts-{gameId}`

- **Hook**: `useUserListSet<TownSquarePost>` / `useUserListGet<TownSquarePost>`
- **Canonical shape**: `TownSquarePost`
- **Key builder**: `getGameScopedKey('townSquarePosts', gameId)`
- **itemId**: `postId`
- **Privacy**: `PUBLIC`
- **searchKeys**: `['title', 'plainText', 'markdown', 'authorInGameName']`
- **sortKey**: `'createdAt'`
- **Used by**:
  - `TownSquarePagePLAYER.tsx`
  - `TownSquarePageOPERATOR.tsx`

### `townSquareComments-{gameId}`

- **Hook**: `useUserListSet<TownSquareComment>` / `useUserListGet<TownSquareComment>`
- **Canonical shape**: `TownSquareComment`
- **Key builder**: `getGameScopedKey('townSquareComments', gameId)`
- **itemId**: `commentId`
- **Privacy**: `PUBLIC`
- **filterKey**: `'postId'`
- **searchKeys**: `['plainText', 'markdown', 'authorInGameName']`
- **sortKey**: `'createdAt'`
- **Used by**:
  - `TownSquarePagePLAYER.tsx`
  - `TownSquarePostDialog.tsx`

### `mathDocuments`

- **Hook**: `useUserListSet<MathDocument>` / searched via `useListSearch`
- **Canonical shape**: `MathDocument`
- **itemId**: `documentId`
- **Privacy**: `PUBLIC` when shared
- **searchKeys**: `['title', 'description']`
- **sortKey**: `'lastOpenedAt'`
- **Used by**:
  - `ShareButton.tsx`
  - `useListSearch.ts`

### `mathDocumentPages`

- **Hook**: `useUserListSet<MathDocumentPage>` / searched via `useListSearch`
- **Canonical shape**: `MathDocumentPage`
- **itemId**: `page.id`
- **Privacy**: `PUBLIC` when shared
- **filterKey**: `'documentId'`
- **searchKeys**: `['title', 'markdown']`
- **sortKey**: `'pageNumber'`
- **Used by**:
  - `ShareButton.tsx`
  - `useListSearch.ts`

## Canonical Join Code Flow

If you need the displayed join code for a game, use the `games` list:

```ts
const [activeGameId] = useUserVariable<string>({
  key: 'activeGameId',
  defaultValue: '',
});

const gameRows = useUserListGet<GameInfo>({
  key: 'games',
  filterFor: activeGameId.value || undefined,
  returnTop: 1,
});

const joinCode = gameRows?.[0]?.value?.id;
```

Reason:

- `games` is indexed with `filterKey: 'id'`
- join flow validates `filterFor: gameCode`
- the visible join code is just the game's `id`

## Deprecated / Legacy Notes

### `realDaysPerInGameDay`

- **Do not use this key anymore.**
- Old setup components used it as a string key.
- The canonical replacement is:

```ts
key: 'numberOfRealDaysPerInGameDay'
value: number
defaultValue: 2
```

### `startingDate`

- Still exists in setup flows.
- Not authoritative for gameplay day progression.
- The actual shared gameplay timeline is `dayDatesArray`.

## Checklist Before Editing an Existing Key

- **Confirm the exact key string**.
- **Confirm the exact stored value shape**.
- **Confirm privacy matches other writers for that same key**.
- **Confirm filter/search/sort config matches other writers for that same key**.
- **If the key is game-scoped, confirm whether it uses `getGameScopedKey(...)`**.
- **If you change a central key, update every writer and every reader together**.
