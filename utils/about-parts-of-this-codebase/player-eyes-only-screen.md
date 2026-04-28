# Player Eyes-Only Screen

This document explains the redesigned player eyes-only screen that renders role information from markdown, provides morning message navigation, and integrates live markdown-input actions with vote/deadline UI.

## Overview

The player eyes-only screen is the private interface where players view their role details, receive morning messages, and submit nightly votes and actions. The redesign replaces the old programmer-style UI with a clean, markdown-driven experience that matches the rulebook's visual language.

## Key Files

### Primary Component
- `app/components/game/YourEyesOnlyPagePLAYER.tsx` - Main player screen component

### Supporting Types & Utilities
- `types/multiplayer.ts` - Defines `MarkdownInputState`, `PlayerActionValue`, and `PlayerNightSubmission`
- `types/playerTable.ts` - Updated `DayData.action` to use `PlayerActionValue`
- `utils/multiplayer.ts` - Shared helpers for action normalization, summaries, and time calculations

### Compatibility Updates
- `app/components/game/NightlyPageOPERATOR.tsx` - Operator nightly page with action counting
- `app/components/game/NightlyCertificationDialog.tsx` - Certification dialog with action summaries
- `app/components/game/DayUserRow.tsx` - Day table rows with action display
- `app/components/game/NightlyDayUserRow.tsx` - Nightly day rows with action display

### Reference Components
- `app/components/game/RuleBookPagePLAYER.tsx` - Reference for markdown rendering style
- `app/components/ui/markdown/MarkdownRenderer.tsx` - Core markdown renderer with interactive inputs
- `app/components/game/TableMarkdownDialog.tsx` - Reference for markdown input data provider usage

## Data Flow

### User Lists (Shared Game State)
- `userTable` - All players with their roles, living state, and day-by-day data
- `roleTable` - All roles with their markdown content (`aboutRole`, `roleMessage`)
- `morningMessagesList` - Morning messages organized by player email and day index
- `dayDatesArray` - Start dates for each in-game day; each day may span multiple real dates until the next start date

### User Variables (Per-Player State)
- `playerNightSubmission-day-{N}` - Current day's vote and action submission
- `gameSchedule` - Timing configuration (deadline, wake-up time)

### Key Data Structures

```typescript
// Action can now be either plain text or structured markdown input state
type PlayerActionValue = string | MarkdownInputState;

// Structured input state from embedded markdown controls
type MarkdownInputState = Record<string, string | undefined>;

// Player submission with widened action field
type PlayerNightSubmission = {
    gameId: string;
    gameDayId: string;
    dayIndex: number;
    playerEmail: string;
    playerUserId: string;
    vote: string;
    action: PlayerActionValue; // Now supports structured objects
    submittedVoteAt: number | null;
    submittedActionAt: number | null;
};
```

## Screen Sections

### 1. Role About Section
- Renders `roleData.aboutRole` markdown using `MarkdownRenderer`
- Same styling and behavior as the rulebook
- No hardcoded role information - entirely operator-authored

### 2. Morning Message Navigation
- Left/right arrows to browse released morning messages
- Navigation locked by `wakeUpTime` - morning messages for an in-game day unlock on the next in-game day after wake-up time
- Auto-snaps to the latest released morning when new days unlock
- Shows the in-game day range label (for example `4/11 - 4/12`) and unlock time if no mornings released yet

### 3. Vote/Deadline Section
- Large countdown display showing time until the current in-game day closes
- Vote due time display for the end of the current in-game day range
- Action due relative timing ("in 2h 15m" or "now")
- Updates every second with live countdown

### 4. Split Action Panel
- **Left side**: Vote dropdown for selecting target player
  - Respects `roleData.doesRoleVote` flag
  - Disabled when submission window closed
- **Right side**: Live markdown action panel
  - Renders `roleData.roleMessage` with interactive inputs
  - Uses `MarkdownRendererInputDataProvider` for player/role options
  - Direct state management - inputs update submission immediately

## Markdown Input Integration

### Input Provider Setup
```tsx
<MarkdownRendererInputDataProvider playerOptions={playerOptions} roleOptions={roleOptions}>
    <MarkdownRenderer
        markdown={roleData.roleMessage}
        state={currentActionState}
        setState={canEditNight ? (nextState) => {
            setSubmission({
                ...submission.value,
                action: nextState,
                submittedActionAt: Date.now(),
            });
        } : undefined}
    />
</MarkdownRendererInputDataProvider>
```

### Supported Input Types
- `SELECT_PLAYER_ALIVE` - Dropdown of living players
- `SELECT_PLAYER_DEAD` - Dropdown of dead players  
- `SELECT_ROLE` - Dropdown of game roles
- `TEXT` - Text input field

### Example Role Message Markdown
```markdown
Choose your target for tonight:

/["Target":SELECT_PLAYER_ALIVE]/

Optional note:
/["Note":TEXT]/
```

## Time Calculations

### Shared Helpers
- `isNightWindowOpen()` - Checks if submission window is still open through the end date of the current in-game day range
- `getLatestReleasedDayIndex()` - Finds the newest day whose morning message has been released (Day N releases on Day N+1)
- `getDayEndDate()` - Resolves the end date for an in-game day using the next configured start date or the fallback span
- `getDayRangeLabel()` - Formats an in-game day as a date range like `4/11 - 4/12`
- `getDayReleaseDate()` - Resolves when a day's morning content unlocks on the following in-game day
- `formatCountdown()` - Formats remaining time as HH:MM:SS
- `formatRelativeDuration()` - Formats time as "2h 15m" or "now"

### Schedule Integration
- Uses normalized `gameSchedule` with fallback defaults
- Respects `nightlyDeadlineTime` for submission windows at the end of the current in-game day range
- Respects `wakeUpTime` for morning message releases (Day N messages release on Day N+1)

## Compatibility Layer

### Action Summary Helpers
- `normalizePlayerActionState()` - Safely converts string to object or returns empty
- `getPlayerActionSummary()` - Creates readable summary from structured action
- `hasPlayerActionContent()` - Checks if action has meaningful content

### Backward Compatibility
- Old string actions still work and display normally
- New structured actions show as readable summaries in operator views
- No breaking changes to existing submission data

## UI Styling

### Design Principles
- Minimal, clean aesthetic matching `TownSquarePagePLAYER`
- No white background cards or heavy borders
- Relies on container backgrounds and subtle borders
- Consistent typography and spacing with rulebook

### Key Classes
- `border-y border-border/15` - Subtle horizontal dividers
- `rounded-2xl border border-border/15` - Modern dropdown styling
- `tracking-[0.45em]` - Stylized header text
- `leading-[3.5rem]` - Large countdown display

## Edge Cases Handled

### Missing Content
- No `aboutRole` markdown - shows placeholder message
- No `roleMessage` markdown - shows placeholder message
- No released mornings - shows unlock date/time for the first in-game day range

### Timing States
- Before wake-up time - navigation disabled, shows the next unlock date/time
- After deadline - inputs disabled, shows "window closed" message
- Role doesn't vote - dropdown disabled, shows explanatory text

### Data Validation
- Empty or malformed action state - normalizes to empty object safely
- Missing role data - gracefully degrades with placeholders
- Invalid day indices - bounds checking and fallbacks

## Testing Notes

### Key Behaviors to Verify
- Morning navigation respects wake-up time locks
- Morning headers show date ranges instead of `Day X of Y`
- Countdown updates correctly and stops at deadline
- Vote and action windows stay open through the full in-game day range
- Markdown inputs update submission state immediately
- Action summaries display properly in operator views
- Old string actions still work in certification dialog

### Time-Based Testing
- Test before/after the final real date in an in-game day range
- Test before/after wake-up time for different days (morning messages should appear the next day)
- Verify countdown second-by-second updates
- Check navigation auto-snap when new days release
