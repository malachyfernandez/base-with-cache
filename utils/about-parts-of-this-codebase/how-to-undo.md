# How to Implement Undo/Redo Functionality

This guide explains how to implement undoable operations in the Wolffspoint project using the existing undo/redo system.

## Overview

The project uses a command pattern-based undo/redo system that tracks operations and allows users to undo/redo them using keyboard shortcuts (Ctrl+Z/Cmd+Z for undo, Ctrl+Shift+Z/Cmd+Shift+Z for redo).

## Key Components

### 1. useUndoRedo Hook
```tsx
import { useUndoRedo, useCreateUndoSnapshot } from '../../../hooks/useUndoRedo';

const { executeCommand } = useUndoRedo();
const createUndoSnapshot = useCreateUndoSnapshot();
```

### 2. Command Pattern
Each undoable operation follows this pattern:
- `action`: The function that performs the operation
- `undoAction`: The function that reverses the operation
- `description`: User-friendly description for toast notifications

## Implementation Pattern

### Step 1: Separate Concerns
Keep your business logic separate from undo tracking:

```tsx
// Pure business logic function
const addRole = () => {
    const newRole: RoleTableItem = {
        role: "New Role",
        doesRoleVote: false,
        roleMessage: "Unset role message",
        aboutRole: "## NEW ROLE - No description set",
        isVisible: true
    };
    setRoleTable([...roles, newRole]);
    setDoSync(true);
};

// Undo tracking wrapper
const UNDOABLEaddRole = () => {
    const previousRoleTable = createUndoSnapshot(roleTable?.value ?? []);
    
    executeCommand({
        action: addRole,
        undoAction: () => {
            setRoleTable(previousRoleTable);
            setDoSync(true);
        },
        description: "Add Role"
    });
};
```

### Step 2: Create Snapshots
Use `createUndoSnapshot` to create deep copies of your state:

```tsx
const previousState = createUndoSnapshot(yourState?.value ?? []);
```

This handles:
- Deep cloning of complex objects
- Proper handling of null/undefined values
- Uses `structuredClone` when available, falls back to JSON parse/stringify

### Step 3: Execute Command
Wrap your operation in the executeCommand:

```tsx
executeCommand({
    action: yourActionFunction,
    undoAction: yourUndoFunction,
    description: "User-friendly description"
});
```

## Important Lessons Learned

### 1. Separation of Concerns is Critical
- **Business Logic**: Keep your core operation logic in a separate function
- **Undo Logic**: The undo wrapper should only handle snapshot tracking
- **Benefits**: Cleaner code, easier testing, reusable business logic

### 2. Proper State Management
- Always create snapshots **before** modifying state
- Ensure both action and undoAction handle any side effects (like `setDoSync`)
- Use the same state setting pattern in both directions

### 3. User Experience
- Provide descriptive messages for toast notifications
- Users see "Undo: Add Role" when they undo an operation
- Keyboard shortcuts work automatically (Ctrl+Z/Cmd+Z)

### 4. Integration with UserVariables
The system works seamlessly with the userVariables hooks:
```tsx
const [roleTable, setRoleTable] = useUserList<RoleTableItem[]>({
    key: "roleTable",
    itemId: gameId,
    privacy: "PUBLIC",
});
```

## Common Patterns

### Adding Items
```tsx
const UNDOABLEaddItem = () => {
    const previousItems = createUndoSnapshot(items?.value ?? []);
    
    executeCommand({
        action: () => {
            const newItem = createNewItem();
            setItems([...items, newItem]);
        },
        undoAction: () => {
            setItems(previousItems);
        },
        description: "Add Item"
    });
};
```

### Updating Items
```tsx
const UNDOABLEupdateItem = (index: number, newValue: any) => {
    const previousItems = createUndoSnapshot(items?.value ?? []);
    const nextItems = createUndoSnapshot(previousItems);
    nextItems[index] = { ...nextItems[index], ...newValue };

    executeCommand({
        action: () => setItems(nextItems),
        undoAction: () => setItems(previousItems),
        description: "Update Item"
    });
};
```

### Deleting Items
```tsx
const UNDOABLEdeleteItem = (index: number) => {
    const previousItems = createUndoSnapshot(items?.value ?? []);
    const nextItems = createUndoSnapshot(previousItems);
    nextItems[index] = { ...nextItems[index], isVisible: false };

    executeCommand({
        action: () => setItems(nextItems),
        undoAction: () => setItems(previousItems),
        description: "Delete Item"
    });
};
```

## Best Practices

1. **Always create snapshots before modifying state**
2. **Keep business logic separate from undo tracking**
3. **Handle all side effects in both action and undoAction**
4. **Use descriptive operation names**
5. **Test both the action and undo behavior**
6. **Consider edge cases (empty arrays, null values, etc.)**

## Integration Points

The undo system integrates with:
- **Toast Notifications**: Shows undo/redo feedback to users
- **Keyboard Shortcuts**: Ctrl+Z/Cmd+Z work automatically
- **UserVariables**: Seamlessly works with persistent state
- **Component State**: Can be used with any React state management

## Troubleshooting

### Common Issues
1. **State not reverting**: Ensure undoAction properly restores the previous snapshot
2. **Missing sync**: Make sure both action and undoAction trigger any necessary sync operations
3. **Memory leaks**: Use proper snapshot creation to avoid reference issues

### Debug Tips
- Check that `createUndoSnapshot` is called before state changes
- Verify both action and undoAction handle the same side effects
- Test with keyboard shortcuts to ensure full integration

## Special Case: Tab-Based Undo/Redo Systems

Some components, like markdown editors with editing/preview tabs, require a different approach to undo tracking. Instead of tracking every single keystroke, these systems track complete editing sessions.

### Use Case
Markdown dialogs with separate editing and preview tabs where:
- Users type in the editing tab
- Users switch to preview tab to see results
- Each editing session should be tracked as a single undoable operation

### Implementation Pattern

#### 1. Track Editing Session Start
```tsx
const [editingStartText, setEditingStartText] = useState('');

// When dialog opens
useEffect(() => {
    if (isOpen) {
        setEditingStartText(initialMarkdown ?? '');
    }
}, [initialMarkdown, isOpen]);
```

#### 2. Handle Tab Changes for Undo Tracking
```tsx
const handleTabChange = (newTab: string) => {
    if (activeTab === 'editing' && newTab === 'preview') {
        // Switching from editing to preview - create undo/redo snapshot
        const previousText = createUndoSnapshot(editingStartText);
        const currentText = createUndoSnapshot(draftBody);
        
        executeCommand({
            action: () => setDraftBody(currentText),
            undoAction: () => setDraftBody(previousText),
            description: "Edit markdown"
        });
    } else if (activeTab === 'preview' && newTab === 'editing') {
        // Switching from preview to editing - set new editing start state
        setEditingStartText(draftBody);
    }
    
    setActiveTab(newTab);
};
```

#### 3. Key Workflow
1. **Dialog Entry**: Set `editingStartText` to initial value
2. **Editing Session**: User types in editing tab
3. **Switch to Preview**: Create undo command with start/current states
4. **Switch Back to Edit**: Update `editingStartText` for next session
5. **Repeat**: Each editing cycle creates a new undo command

### Benefits of This Approach

#### 1. Session-Based Tracking
- Each complete editing session becomes one undoable operation
- Users don't get overwhelmed with per-keystroke undos
- Natural workflow: edit, preview, undo if needed

#### 2. Clean User Experience
- "Undo: Edit markdown" clearly describes what was undone
- Keyboard shortcuts (Ctrl+Z/Cmd+Z) work automatically
- Toast notifications provide feedback

#### 3. State Management
- `editingStartText` tracks where each editing session began
- Snapshots capture the complete state change
- No conflicts between multiple editing sessions

### When to Use This Pattern

#### Good For:
- **Tab-based editors** where users switch between modes
- **Form wizards** with multi-step processes
- **Complex components** where changes happen in discrete phases
- **Content creation tools** with preview functionality

#### Not Good For:
- **Real-time editors** where every keystroke should be undoable
- **Simple form inputs** where traditional undo works better
- **Components without clear session boundaries**

### Implementation Tips

#### 1. Clear Session Boundaries
```tsx
// Define clear start/end points for editing sessions
const startEditingSession = () => {
    setEditingStartText(draftBody);
};

const endEditingSession = () => {
    // Create undo command
    createUndoCommand(editingStartText, draftBody);
};
```

#### 2. Handle Edge Cases
```tsx
// Handle empty or unchanged content
if (editingStartText === draftBody) {
    // No change, don't create undo command
    return;
}
```

#### 3. Reset State Properly
```tsx
// Reset when dialog closes
useEffect(() => {
    if (!isOpen) {
        setEditingStartText('');
        setActiveTab('editing');
    }
}, [isOpen]);
```

### Example: Complete Implementation
```tsx
const MarkdownDialog = ({ isOpen, initialMarkdown }) => {
    const [activeTab, setActiveTab] = useState('editing');
    const [draftBody, setDraftBody] = useState('');
    const [editingStartText, setEditingStartText] = useState('');
    const { executeCommand } = useUndoRedo();
    const createUndoSnapshot = useCreateUndoSnapshot();

    // Initialize editing session when dialog opens
    useEffect(() => {
        if (isOpen) {
            setDraftBody(initialMarkdown ?? '');
            setEditingStartText(initialMarkdown ?? '');
        }
    }, [isOpen, initialMarkdown]);

    // Handle tab changes for undo tracking
    const handleTabChange = (newTab) => {
        if (activeTab === 'editing' && newTab === 'preview') {
            // Create undo command for completed editing session
            const previousText = createUndoSnapshot(editingStartText);
            const currentText = createUndoSnapshot(draftBody);
            
            if (previousText !== currentText) {
                executeCommand({
                    action: () => setDraftBody(currentText),
                    undoAction: () => setDraftBody(previousText),
                    description: "Edit markdown"
                });
            }
        } else if (activeTab === 'preview' && newTab === 'editing') {
            // Start new editing session
            setEditingStartText(draftBody);
        }
        
        setActiveTab(newTab);
    };

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Tab content */}
        </Tabs>
    );
};
```

This pattern provides a clean, intuitive undo experience for tab-based editing interfaces while maintaining the same underlying undo/redo infrastructure.
