# Paper Codebase Guide

Welcome to Paper! This document provides a comprehensive overview of the codebase architecture, patterns, and philosophy. For detailed information about the userVariables system, see [userVariables-system.md](./userVariables-system.md).

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Philosophy](#component-philosophy)
- [UserVariables System](#uservariables-system)
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

Paper is a React Native application built with a modular, component-first architecture. The app follows these key principles:

1. **Component-First Design**: Everything is a component with its own state and logic
2. **Modular Subscriptions**: Each component subscribes to its own userVariables
3. **Declarative Animations**: Page transitions use a tree-based animation system
4. **Consistent UI**: Shared components and styling across the entire app

### App Flow

```
app/index.tsx (Entry Point)
├── SignedOut → Auth Flow (Google OAuth)
└── SignedIn → MainPage.tsx (First Real Page)
    └── StateAnimatedView.Container
        ├── AllGamesPage (page 1)
        └── GamePage (page 2)
```

## Component Philosophy

### "Componentize EVERYTHING"

We believe in componentizing as much as possible because:

1. **Named JSX**: Components give your JSX meaningful names
2. **Modular Logic**: Each component owns its state and behavior
3. **UserVariables Integration**: Components can independently subscribe to data
4. **Reusability**: Components can be reused across different contexts
5. **Testability**: Smaller components are easier to test

### Subscription Pattern

**NEVER** pass userVariables through props. Instead:

```tsx
// ❌ WRONG - Passing userVariables through props
<ParentComponent userData={userData} />
<ChildComponent userData={userData} />

// ✅ RIGHT - Each component subscribes independently
function ParentComponent() {
  const userData = useUserVariable({ key: "userData" });
  // ... use userData
}

function ChildComponent() {
  const userData = useUserVariable({ key: "userData" });
  // ... use userData independently
}
```

### Self-Contained Logic

Each component should contain its own logic for the data it manages:

```tsx
// Button that manages its own table data
function AddRowButton({ tableId }: { tableId: string }) {
  const [tableData, setTableData] = useUserList({ key: "tables", itemId: tableId });
  
  const handleAddRow = () => {
    const newRow = createNewRow();
    setTableData([...tableData.value, newRow]);
  };
  
  return <AppButton onPress={handleAddRow}>Add Row</AppButton>;
}

// Table that automatically updates when data changes
function DataTable({ tableId }: { tableId: string }) {
  const [tableData] = useUserList({ key: "tables", itemId: tableId });
  
  return (
    <Column>
      {tableData.value.map(row => <RowComponent key={row.id} row={row} />)}
    </Column>
  );
}
```

## UserVariables System

The userVariables system is the backbone of WolffsPoint's state management. It provides:

- **Persistent Storage**: Data is stored per user and automatically synced
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
  <PoppinsText>Title</PoppinsText>
  <AppButton>Button</AppButton>
</Column>

// Row - Horizontal layout with gap spacing  
<Row gap={2} className="items-center">
  <PoppinsText>Label</PoppinsText>
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

#### PoppinsText
Our primary text component with Poppins font integration:

```tsx
<PoppinsText weight="medium" variant="heading" color="white">
  Heading Text
</PoppinsText>

<PoppinsText variant="subtext">
  Secondary text with opacity
</PoppinsText>
```

**Props:**
- `weight`: 'regular' | 'medium' | 'bold'
- `variant`: 'default' | 'heading' | 'subtext'
- `color`: 'black' | 'white'

### Buttons

#### AppButton
Versatile button component with multiple variants:

```tsx
<AppButton variant="outline" onPress={handleCancel}>
  <PoppinsText>Cancel</PoppinsText>
</AppButton>

<AppButton variant="green" onPress={handleSubmit}>
  <PoppinsText color="white">Submit</PoppinsText>
</AppButton>
```

**Variants:**
- `outline`: Transparent with border
- `outline-alt`: Lighter outline variant
- `black`: Solid dark background
- `grey`: Solid grey background
- `green`: Primary accent color

### Forms

#### PoppinsTextInput
Styled text input with Poppins font:

```tsx
<PoppinsTextInput
  value={text}
  onChangeText={setText}
  placeholder="Enter text..."
  className="border-b-2 border-border"
/>
```

#### SmartDateInput / SmartNumberInput
Intelligent inputs with automatic formatting and validation.

### Image Upload

#### PublicImageUpload
Complete image upload workflow with UploadThing integration:

```tsx
<PublicImageUpload
  url={imageUrl}
  setUrl={setImageUrl}
  buttonLabel="Upload profile picture"
/>
```

**Features:**
- Media library permissions
- Image editing
- Upload progress
- Error handling
- Image preview

## Styling Approach

### Tailwind (Uniwind)

We use Tailwind CSS for React Native via Uniwind:

```tsx
<View className="flex-1 bg-background p-4">
  <PoppinsText className="text-text font-bold">Styled text</PoppinsText>
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

**Animation Presets:**
- `fromRight`: Enter from right, exit to left (default)
- `fromLeft`: Enter from left, exit to right
- `fromTop`: Enter from top, exit to bottom
- `fromBottom`: Enter from bottom, exit to top

## State Management

### UserVariables Hooks

Primary hooks for state management:

```tsx
// Single value per user
const [profile, setProfile] = useUserVariable({
  key: "profile",
  defaultValue: { name: "" },
  privacy: "PUBLIC"
});

// List of items per user
const [games, setGames] = useUserList({
  key: "games",
  itemId: "game_123",
  defaultValue: { name: "Game 1" }
});

// Read other users' data
const profiles = useUserVariableGet({
  key: "profile",
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
- Works with userVariables system

## Toast Notifications

Global toast system for user feedback:

```tsx
const { showToast } = useToast();

// Show toast
showToast("Operation completed successfully!");

// Toast automatically disappears after 3 seconds
// User can tap to dismiss manually
```

**Implementation:**
- Context-based global state
- Animated enter/exit transitions
- Auto-dismiss after 3 seconds
- Manual dismiss option

## Third-Party Libraries

### Core Dependencies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and tools
- **Clerk**: Authentication and user management
- **Convex**: Backend database and real-time sync
- **React Native Reanimated**: Advanced animations
- **Uniwind**: Tailwind CSS for React Native

### UI Libraries

- **HeroUI**: Component library (used where applicable)
- **Expo Image Picker**: Image selection
- **UploadThing**: File upload service

### Development Tools

- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Development Patterns

### File Organization

```
app/
├── components/
│   ├── ui/          # Reusable UI components
│   ├── layout/      # Layout components
│   ├── game/        # Game-specific components
│   └── MainPage.tsx # Main app container
├── hooks/           # Custom React hooks
├── contexts/        # React contexts
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Naming Conventions

- **Components**: PascalCase (e.g., `PoppinsText`, `AppButton`)
- **Files**: Component name matches file name
- **Hooks**: camelCase with `use` prefix (e.g., `useUserVariable`)
- **Types**: PascalCase (e.g., `UserProfile`, `GameState`)

### Code Style

- **Component Exports**: Default export for main component
- **Prop Interfaces**: Named interfaces with `Props` suffix
- **JSDocs**: Comprehensive documentation for all components
- **TypeScript**: Strict mode enabled

### Testing Philosophy

- **Component Isolation**: Each component should be testable independently
- **UserVariables Mocking**: Mock userVariables hooks in tests
- **Animation Testing**: Test animation logic, not visual output

## Best Practices

### Component Design

1. **Single Responsibility**: Each component does one thing well
2. **Props Interface**: Always define prop interfaces
3. **Default Props**: Provide sensible defaults
4. **Error Boundaries**: Wrap components in error boundaries where needed

### UserVariables Usage

1. **Direct Subscription**: Always subscribe directly in components
2. **Privacy by Default**: Start with PRIVATE, expand as needed
3. **Search Keys**: Define search keys for discoverable data
4. **Filter Keys**: Use filter keys for categorization

### Performance

1. **Memoization**: Use React.memo for expensive components
2. **Animation Cleanup**: Ensure animations clean up properly
3. **Image Optimization**: Compress images before upload
4. **Bundle Size**: Monitor and optimize import sizes

## Getting Started

### New Component Checklist

1. Create component file in appropriate directory
2. Add comprehensive JSDocs
3. Define TypeScript interfaces
4. Subscribe to userVariables directly
5. Test component independently
6. Add to storybook/documentation if applicable

### UserVariables Integration

1. Determine data shape and privacy needs
2. Choose appropriate hook (useUserVariable vs useUserList)
3. Define search/filter keys
4. Implement optimistic updates where needed
5. Add undo/redo support for user actions

### Styling Guidelines

1. Use Uniwind classes for all styling
2. Follow the established color system
3. Use gap props for spacing in layouts
4. **Scrolling Content**: Always wrap ScrollView in ScrollShadow for consistent visual effects
5. Test on both iOS and Android
6. Ensure accessibility with proper contrast ratios

#### ScrollShadow Pattern

For all scrollable content, use the ScrollShadow wrapper from HeroUI:

```tsx
<ScrollShadow LinearGradientComponent={LinearGradient} className='h-full'>
  <ScrollView className='h-full'>
    {/* Scrollable content */}
  </ScrollView>
</ScrollShadow>
```

**Benefits:**
- Consistent fade effects at scroll boundaries
- Smooth visual transitions
- Cross-platform compatibility
- Automatic shadow direction based on scroll position

---

This guide should help you understand and contribute to the Paper codebase effectively. For specific implementation details, refer to the JSDocs in individual components and the [userVariables system documentation](./userVariables-system.md).
