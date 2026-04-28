# Markdown Input/Output System

This document summarizes the interactive markdown input/output feature added to the Wolffspoint codebase. It enables embedding interactive form controls (text inputs and dropdowns) directly within markdown text, with live rendering and state management.

## Overview

The system allows users to embed input tokens in markdown using the syntax `/["Label":TYPE]/`. When rendered, these tokens become interactive UI elements that can collect and store user input. The feature is designed to be modular, reusable, and safe across different contexts (dialogs, previews, and main UI).

## Core Syntax

```markdown
/["Killing":SELECT_PLAYER_ALIVE]/
/["Victim":SELECT_PLAYER_DEAD]/
/["Role":SELECT_ROLE]/
/["Note":TEXT]/
```

- **Label**: Human-readable identifier used as the key in the state object and as the placeholder text
- **TYPE**: Determines the kind of input control to render

## Supported Input Types

| Type | Aliases | Renders As | Data Source |
|------|---------|------------|-------------|
| `TEXT` | `text`, `textbox` | Text input field | N/A |
| `SELECT_PLAYER_ALIVE` | `player_alive`, `SELECT_PLAYER_ALIVE` | Dropdown of alive players | `userTable` (livingState = 'alive') |
| `SELECT_PLAYER_DEAD` | `player_dead`, `SELECT_PLAYER_DEAD` | Dropdown of dead players | `userTable` (livingState = 'dead') |
| `SELECT_PLAYER_ALL` | `player_all`, `SELECT_PLAYER`, `PLAYER_SELECT` | Dropdown of all players | `userTable` (all) |
| `SELECT_ROLE` | `role`, `SELECT_ROLE`, `ROLE_SELECT` | Dropdown of visible roles | `roleTable` (isVisible = true) |

## Architecture

### 1. MarkdownRenderer (`app/components/ui/markdown/MarkdownRenderer.tsx`)

**Public Component**
- Remains the main entry point for all markdown rendering
- Handles parsing of markdown tokens including input syntax
- Manages rendering of both static markdown and interactive inputs
- Accepts optional `state` and `setState` props for input state management

**Internal Structure**
- `MarkdownRendererContent`: Internal rendering component that consumes context
- `MarkdownRendererInputDataProvider`: Context provider for dropdown option data
- `MarkdownInputField`: Renders individual input controls (text or dropdown)
- `InlineMarkdownWithInputs`: Renders inline segments including interactive inputs

**Key Design Decisions**
- Renderer is pure from a data-fetching perspective
- Dropdown options are injected via context from parent components
- Inputs are disabled when no `setState` is provided
- Self-contained parsing and rendering logic

### 2. Data Flow

```
Parent Component (e.g., TableMarkdownDialog)
    |
    |--- Provides playerOptions & roleOptions via MarkdownRendererInputDataProvider
    |
    v
MarkdownRenderer (public)
    |
    |--- Consumes options from context
    |--- Parses markdown tokens
    |--- Renders MarkdownInputField instances
    |
    v
MarkdownInputField
    |
    |--- Renders AppDropdown or PoppinsTextInput
    |--- Calls onChange with value updates
    |
    v
Parent setState callback
    |
    |--- Updates local state
    |--- Triggers re-render with new values
```

### 3. State Management

The system uses a simple key-value object for input state:

```typescript
interface MarkdownInputState {
  [label: string]: string | undefined;
}

// Example
{
  "Killing": "PlayerName",
  "Victim": "AnotherPlayer",
  "Role": "Detective",
  "Note": "Night 3 elimination"
}
```

- **Label**: Used as the key in the state object
- **Value**: Current selected/input value
- **Undefined**: Unfilled inputs

### 4. Context Provider Pattern

```typescript
// Parent provides data
<MarkdownRendererInputDataProvider 
  playerOptions={playerOptions} 
  roleOptions={roleOptions}
>
  <MarkdownRenderer 
    markdown={content}
    state={state}
    setState={setState}
  />
</MarkdownRendererInputDataProvider>
```

This pattern allows:
- Renderer to remain generic and reusable
- Different contexts to provide different option sets
- Clean separation of concerns
- Testability without Convex dependencies

## Integration Points

### 1. TableMarkdownDialog (`app/components/game/TableMarkdownDialog.tsx`)

**Features**
- Fetches `userTable` and `roleTable` via `useUserList`
- Wraps preview and input builder with `MarkdownRendererInputDataProvider`
- Enables `showInputs` flag to activate input features
- Manages local preview state for interactive testing

**Props**
```typescript
interface TableMarkdownDialogProps {
  // ... existing props
  gameId?: string;        // Required for fetching player/role data
  showInputs?: boolean;  // Enables input features
}
```

### 2. MarkdownInputBuilderDialog (`app/components/game/MarkdownInputBuilderDialog.tsx`)

**Features**
- Separate component for building input tokens
- Live preview of the input being configured
- Dropdown for selecting input types
- Generates markdown syntax on insertion
- Uses centered dropdown positioning for dialog compatibility

**Usage Flow**
1. User clicks input button in toolbar
2. Dialog opens with label and type selection
3. Live preview shows how the input will render
4. Insert button adds `/["Label":TYPE]/` to markdown at cursor

### 3. Toolbar Integration (`app/components/game/townSquare/TownSquareComposerToolbar.tsx`)

**Features**
- Optional input button (chevron-down icon)
- Positioned to the right of link/image buttons
- Only visible when `showInputs={true}`
- Opens `MarkdownInputBuilderDialog`

## Styling Guidelines

### Input Field Appearance
- No outer borders or labels
- Soft background (`bg-text/10`)
- Hover state (`hover:bg-text/5`)
- Rounded corners (`rounded-xl`)
- Label used as placeholder text
- Consistent padding and spacing

### Dropdown Behavior
- `centered={true}` for dialog compatibility
- Custom trigger styling to match text inputs
- No double borders or extra chrome
- Proper z-index handling in modal contexts

## Usage Examples

### Basic Usage
```typescript
<MarkdownRenderer 
  markdown="Select target: /[\"Target\":SELECT_PLAYER_ALIVE]/"
  state={inputState}
  setState={setInputState}
/>
```

### With Data Provider
```typescript
<MarkdownRendererInputDataProvider 
  playerOptions={playerOptions} 
  roleOptions={roleOptions}
>
  <MarkdownRenderer 
    markdown={roleMessage}
    state={inputState}
    setState={setInputState}
  />
</MarkdownRendererInputDataProvider>
```

### In Dialog Context
```typescript
<TableMarkdownDialog
  gameId={gameId}
  showInputs={true}
  initialMarkdown={roleMessage}
  onSubmit={(markdown) => setRoleMessage(index, markdown)}
  // ... other props
/>
```

## Implementation Guidelines for New Features

### 1. Adding New Input Types

1. Update `normalizeMarkdownInputKind()` in `MarkdownRenderer.tsx`
2. Add type aliases to the normalization logic
3. Update placeholder logic if needed
4. Test with various label combinations

### 2. Extending Data Sources

1. Add new option types to `MarkdownRendererInputDataContextValue`
2. Update provider props to include new data
3. Modify `MarkdownInputField` to handle new input kinds
4. Update filtering logic as needed

### 3. Styling Changes

1. Maintain consistency with existing input field styling
2. Use `bg-text/10` and `hover:bg-text/5` for backgrounds
3. Avoid double borders or extra chrome
4. Test in dialog contexts with `centered={true}`

### 4. State Management

1. Keep state structure simple: `{ [label]: value }`
2. Use `undefined` for unfilled inputs
3. Provide `setState` for interactive usage
4. Handle disabled state gracefully when no setter provided

## Testing Considerations

### Unit Tests
- Test token parsing with various syntax combinations
- Test input type normalization
- Test state management callbacks
- Test option filtering logic

### Integration Tests
- Test full flow from builder to preview to submission
- Test with real Convex data sources
- Test in dialog contexts
- Test disabled state behavior

### UI Tests
- Test dropdown positioning in dialogs
- Test hover states and styling
- Test responsive behavior
- Test accessibility

## Migration Notes

### From Static Markdown
- Existing markdown continues to work unchanged
- Input tokens are ignored when no `setState` provided
- No breaking changes to existing `MarkdownRenderer` usage

### Adding to New Contexts
1. Provide `gameId` if using player/role data
2. Set `showInputs={true}` to enable input features
3. Wrap with `MarkdownRendererInputDataProvider` if needed
4. Manage local state for interactive usage

## Future Enhancements

### Potential Improvements
- Custom input validation
- Conditional rendering based on other inputs
- Input grouping and sections
- Rich text inputs
- File attachment inputs
- Date/time inputs
- Numeric inputs with validation

### Extension Points
- Custom input type plugins
- Custom styling themes
- Internationalization support
- Advanced state management patterns
- Integration with form validation libraries

---

This system provides a foundation for interactive markdown content while maintaining the simplicity and reusability of the existing markdown rendering pipeline.
