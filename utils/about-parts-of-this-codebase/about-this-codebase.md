# Base Project Codebase Guide

Welcome to Base Project! This document provides a comprehensive overview of the codebase architecture, patterns, and philosophy. For detailed information about the data management system, see [userVariables-system.md](./userVariables-system.md).

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Philosophy](#component-philosophy)
- [Data System (DataProvider)](#data-system-dataprovider)
- [Layout System](#layout-system)
- [UI Components](#ui-components)
- [Styling Approach](#styling-approach)
- [Animation System](#animation-system)
- [State Management](#state-management)
- [Undo/Redo System](#undo-redo-system)
- [Toast Notifications](#toast-notifications)
- [Third-Party Libraries](#third-party-libraries)
- [Development Patterns](#development-patterns)

## Architecture Overview

Base Project is a React Native application built with a modular, component-first architecture. The app follows these key principles:

1. **Component-First Design**: Everything is a component with its own state and logic
2. **Modular Data Subscriptions**: Each component subscribes to its own data via `DataProvider` hooks, which are cached globally to avoid network churn
3. **Declarative Animations**: Page transitions use a tree-based animation system
4. **Consistent UI**: Shared components and styling across the entire app

### App Flow

```
app/index.tsx (Entry Point)
├── SignedOut → Auth Flow (Google OAuth)
└── SignedIn → MainPage.tsx (First Real Page)
    └── TownSquarePagePLAYER (demo of DataProvider hooks)
```

## Component Philosophy

### "Componentize EVERYTHING"

We believe in componentizing as much as possible because:

1. **Named JSX**: Components give your JSX meaningful names
2. **Modular Logic**: Each component owns its state and behavior
3. **Data Integration**: Components can independently subscribe to data without causing redundant network calls (thanks to our `DataProvider` client cache)
4. **Reusability**: Components can be reused across different contexts
5. **Testability**: Smaller components are easier to test

### Subscription Pattern

**NEVER** pass persistent data through props just to avoid multiple queries. Because of our `DataProvider` architecture, multiple components subscribing to the same data will use the client-side cache and will NOT cause extra network requests. Instead:

```tsx
// ❌ WRONG - Passing data through props for performance (Anti-pattern)
<ParentComponent userData={userData} />
<ChildComponent userData={userData} />

// ✅ RIGHT - Each component subscribes independently
function ParentComponent() {
  const userData = useValue("userData");
  // ... use userData
}

function ChildComponent() {
  const userData = useValue("userData");
  // ... use userData independently (cached!)
}
```

### Self-Contained Logic

Each component should contain its own logic for the data it manages:

```tsx
// Button that manages its own table data
function AddRowButton({ tableId }: { tableId: string }) {
  const [tableData, setTableData] = useList("tables", tableId);
  
  const handleAddRow = () => {
    const newRow = createNewRow();
    setTableData([...tableData.value, newRow]);
  };
  
  return <AppButton onPress={handleAddRow}>Add Row</AppButton>;
}

// Table that automatically updates when data changes
function DataTable({ tableId }: { tableId: string }) {
  const [tableData] = useList("tables", tableId);
  
  return (
    <Column>
      {tableData.value.map(row => <RowComponent key={row.id} row={row} />)}
    </Column>
  );
}
```

## Data System (DataProvider)

The `DataProvider` system is the backbone of WolffsPoint's state management. It provides:

- **Persistent Storage**: Data is stored per user and automatically synced via Convex
- **Client-Side Caching**: Eliminates redundant subscriptions and network calls when components mount/unmount or during tab transitions
- **Real-time Updates**: Components automatically update when data changes
- **Privacy Controls**: Fine-grained access control for data sharing
- **Search & Filter**: Built-in search and filtering capabilities

For complete documentation, see [userVariables-system.md](./userVariables-system.md).

## Layout System

### Column and Row Components

We use custom layout components that provide consistent spacing and behavior:

```tsx
// Column - Vertical layout with gap spacing
<Column gap={4} className="items-center">
  <FontText>Title</FontText>
  <AppButton>Button</AppButton>
</Column>

// Row - Horizontal layout with gap spacing  
<Row gap={2} className="items-center">
  <FontText>Label</FontText>
  <AppButton>Action</AppButton>
</Row>
```

### Key Features

- **Gap System**: `gap` prop uses 4px units (gap={4} = 16px)
- **Flexbox Integration**: Full flexbox support via className
- **Consistent Spacing**: Standardized spacing across the app
- **Layout Composition**: Easy to nest and combine layouts

## UI Components

### Typography

#### FontText
Our primary text component with custom font integration:

```tsx
<FontText weight="medium" variant="heading" color="text-inverted">
  Heading Text
</FontText>

<FontText variant="subtext">
  Secondary text with opacity
</FontText>
```

**Props:**
- `weight`: 'regular' | 'medium' | 'bold'
- `variant`: 'default' | 'heading' | 'subtext'
- `color`: 'black' | 'text-inverted' | 'primary'

### Buttons

#### AppButton
Versatile button component with multiple variants:

```tsx
<AppButton variant="outline" onPress={handleCancel}>
  <FontText>Cancel</FontText>
</AppButton>

<AppButton variant="green" onPress={handleSubmit}>
  <FontText color="text-inverted">Submit</FontText>
</AppButton>
```

**Variants:**
- `outline`: Transparent with border
- `outline-alt`: Lighter outline variant
- `black`: Solid dark background
- `grey`: Solid grey background
- `green`/`accent`: Primary accent color

### Forms

#### FontTextInput
Styled text input with correct fonts:

```tsx
<FontTextInput
  value={text}
  onChangeText={setText}
  placeholder="Enter text..."
  className="border-b-2 border-border"
/>
```

## Styling Approach

### Tailwind
We use Tailwind CSS for React Native:

```tsx
<View className="flex-1 bg-background p-4">
  <FontText className="text-text font-bold">Styled text</FontText>
</View>
```

### Color System

- `background`: Primary background color
- `text`: Primary text color
- `border`: Border color
- `primary-accent`: Primary action color
- `subtle-border`: Lighter border variant

### Spacing System

- Uses standard Tailwind spacing (4px base unit)
- Gap props in layout components use 4px multipliers
- Consistent padding and margins throughout

## Animation System

### StateAnimatedView

Our custom page transition system using a tree-based approach:

```tsx
<StateAnimatedView.Container stateVar={currentScreen} className='flex-1'>
  <StateAnimatedView.Option page={1} stateValue='allGames'>
    <AllGamesPage />
  </StateAnimatedView.Option>
  
  <StateAnimatedView.OptionContainer page={2}>
    <StateAnimatedView.Option stateValue='game'>
      <GamePage />
    </StateAnimatedView.Option>
  </StateAnimatedView.OptionContainer>
</StateAnimatedView.Container>
```

**Key Concepts:**
- **Page-Based**: Animation direction determined by page numbers
- **Adjacent Only**: Only adjacent page changes animate
- **Default Animation**: `fromRight` is the default (can be overridden)
- **DOM Cleanup**: Elements are removed after animation completes

## State Management

### DataProvider Hooks

Primary hooks for state management using the centralized config `utils/dataConfig.ts`:

```tsx
// Single value per user (reads configuration from dataConfig.ts)
const [profile, setProfile] = useValue("profile");

// List of items per user
const [game, setGame] = useList("games", "game_123");

// Read multiple users' data
const profiles = useFindValues("profile", {
  userIds: friendIds
});
```

### Component State

For local component state, use standard React hooks:

```tsx
const [isOpen, setIsOpen] = useState(false);
const [text, setText] = useState("");
```

## Undo/Redo System

We have a comprehensive undo/redo system using command pattern:

```tsx
const { executeCommand } = useUndoRedo();
const createUndoSnapshot = useCreateUndoSnapshot();

const UNDOABLEsetUserTable = (updatedUsers: UserTableItem[]) => {
  const previousUserTable = createUndoSnapshot(userTable?.value ?? []);
  const nextUserTable = createUndoSnapshot(updatedUsers);

  executeCommand({
    action: () => setUserTable(nextUserTable),
    undoAction: () => setUserTable(previousUserTable),
    description: "Updated user table"
  });
};
```

**Features:**
- Command pattern implementation
- Automatic snapshot creation
- Descriptive undo messages
- Works harmoniously with the data system

## Toast Notifications

Global toast system for user feedback:

```tsx
const { showToast } = useToast();

// Show toast
showToast("Operation completed successfully!");

// Toast automatically disappears after 3 seconds
// User can tap to dismiss manually
```

## Third-Party Libraries

### Core Dependencies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and tools
- **Clerk**: Authentication and user management
- **Convex**: Backend database and real-time sync
- **React Native Reanimated**: Advanced animations

## Development Patterns

### File Organization

```
app/
├── components/
│   ├── ui/          # Reusable UI components
│   ├── layout/      # Layout components
│   ├── game/        # Demo components
│   └── MainPage.tsx # Main app container
├── hooks/           # Custom React hooks
├── contexts/        # React contexts
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Naming Conventions

- **Components**: PascalCase (e.g., `FontText`, `AppButton`)
- **Files**: Component name matches file name
- **Hooks**: camelCase with `use` prefix (e.g., `useValue`)
- **Types**: PascalCase (e.g., `UserProfile`, `GameState`)

### Code Style

- **Component Exports**: Default export for main component
- **Prop Interfaces**: Named interfaces with `Props` suffix
- **JSDocs**: Comprehensive documentation for all components
- **TypeScript**: Strict mode enabled

### Testing Philosophy

- **Component Isolation**: Each component should be testable independently
- **Data Mocking**: Mock DataProvider hooks in tests
- **Animation Testing**: Test animation logic, not visual output

## Getting Started

### New Component Checklist

1. Create component file in appropriate directory
2. Add comprehensive JSDocs
3. Define TypeScript interfaces
4. Subscribe to data via `useValue`/`useList` directly without prop-drilling
5. Test component independently

### Data Integration

1. Define data shape, privacy, and defaults centrally in `utils/dataConfig.ts`
2. Choose appropriate hook (`useValue` vs `useList`)
3. Componentize freely, knowing the client cache will optimize network requests
4. Implement optimistic updates where needed via `useUndoRedo`

### Styling Guidelines

1. Use Tailwind classes for all styling
2. Follow the established color system
3. Use gap props for spacing in layouts
4. **Scrolling Content**: Always wrap ScrollView in ScrollShadow for consistent visual effects

#### ScrollShadow Pattern

For all scrollable content, use the ScrollShadow wrapper from HeroUI:

```tsx
<ShadowScrollView>
    {/* Scrollable content */}
</ShadowScrollView>
```

---

This guide should help you understand and contribute to the Base Project codebase effectively. For specific implementation details, refer to the JSDocs in individual components and the [userVariables system documentation](./userVariables-system.md).
