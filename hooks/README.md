# Generic List Search Hook

## Overview

The `useListSearch` hook is a generic, reusable hook for searching any user list with real-time search functionality. It encapsulates all search logic and provides a clean, flexible interface that can work with any list type.

## Usage

```typescript
import { useListSearch } from 'hooks/useDocumentSearch';

// Search documents
const { items: documents, additionalItems, isLoading, hasResults, resultCount } = useListSearch<MathDocument>({
    searchQuery: 'math homework',
    userIds: ['user123'],
    searchKey: 'mathDocuments',
    additionalKeys: ['mathDocumentPages'],
});

// Search any other list type
const { items: posts, isLoading, hasResults } = useListSearch<Post>({
    searchQuery: 'react',
    userIds: ['user123'],
    searchKey: 'blogPosts',
});
```

## Parameters

- `searchQuery` (string): The search query to filter items
- `userIds` (string[]): Array of user IDs to search within
- `searchKey` (string): The key of the list to search (required)
- `additionalKeys` (string[], optional): Additional keys to fetch related data
- `preserveResultsDuringLoading` (boolean, optional): If true, maintains last successful results during loading (default: true)

## Returns

- `items` (T[] | undefined): Array of matching items from the primary search
- `additionalItems` (any[][] | undefined): Array of additional data arrays (one per additionalKey)
- `isLoading` (boolean): Whether the search is in progress
- `hasResults` (boolean): Whether there are any search results
- `resultCount` (number): Number of items found

## Features

- **Generic**: Works with any list type (`useListSearch<YourType>`)
- **Flexible**: Specify any search key to search different lists
- **Additional data**: Fetch related data (like pages for documents)
- **Real-time search**: Updates automatically when searchQuery changes
- **Smart caching**: Preserves last successful results during loading (no UI flicker)
- **TypeScript support**: Fully typed with proper interfaces
- **Clean data**: Returns direct values, not UserListRecord objects
- **Derived state**: Provides helpful computed properties

## Examples

### Document Search (Current Usage)

```typescript
const { items: documents, additionalItems, isLoading, hasResults, resultCount } = useListSearch<MathDocument>({
    searchQuery: searchQuery,
    userIds: scopedUserIds,
    searchKey: 'mathDocuments',
    additionalKeys: ['mathDocumentPages'],
});

const pages = additionalItems?.[0] as MathDocumentPage[] | undefined;
```

### Blog Post Search

```typescript
const { items: posts, isLoading, hasResults, resultCount } = useListSearch<BlogPost>({
    searchQuery: searchQuery,
    userIds: [currentUser.id],
    searchKey: 'blogPosts',
});
```

### User Profile Search

```typescript
const { items: profiles, isLoading, hasResults } = useListSearch<UserProfile>({
    searchQuery: searchQuery,
    userIds: followingUserIds,
    searchKey: 'userProfiles',
});
```

## Implementation Details

The hook uses `useUserListGet` internally to:
- Search the primary list by the specified key
- Fetch additional related data from other keys
- Handle loading states for all queries
- Convert UserListRecord objects to clean value arrays
- Provide derived state for easier UI logic

## Migration from useDocumentSearch

The old `useDocumentSearch` is still available but deprecated:

```typescript
// Old way (deprecated)
const { documents, pages, isLoading } = useDocumentSearch({ searchQuery, userIds });

// New way (recommended)
const { items: documents, additionalItems, isLoading } = useListSearch<MathDocument>({
    searchQuery,
    userIds,
    searchKey: 'mathDocuments',
    additionalKeys: ['mathDocumentPages'],
});
const pages = additionalItems?.[0] as MathDocumentPage[] | undefined;
```

## Benefits

1. **Reusable**: Same hook can search any list type
2. **Flexible**: Specify any search key
3. **Type-safe**: Full TypeScript support with generics
4. **Extensible**: Can fetch additional related data
5. **Consistent**: Same interface across all search implementations
6. **Smooth UX**: No loading flicker - preserves results during search operations

## Smart Caching Behavior

When `preserveResultsDuringLoading` is enabled (default: true), the hook automatically:

1. **Caches successful results** - Stores the last non-empty result set
2. **Maintains display during loading** - Shows cached results while new search loads
3. **Updates only with real data** - Never shows empty/loading states to users
4. **Eliminates UI flicker** - Smooth transitions between search states

```typescript
// Default behavior - no loading flicker
const { items, isLoading } = useListSearch<MathDocument>({
    searchQuery,
    userIds,
    searchKey: 'mathDocuments',
    // preserveResultsDuringLoading: true (default)
});

// Disable caching if you want loading states
const { items, isLoading } = useListSearch<MathDocument>({
    searchQuery,
    userIds,
    searchKey: 'mathDocuments',
    preserveResultsDuringLoading: false,
});
```
