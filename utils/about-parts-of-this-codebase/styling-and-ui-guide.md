# Styling and UI Guide

This guide is the practical reference for building pages that look and feel like the rest of WolffsPoint.

Use it when you are:

- making a new page
- restyling an existing screen
- choosing between UI primitives
- deciding whether a component should be a button, dialog, inline editor, card, selector, or animated nested page

This is meant to complement `about-this-codebase.md`. That file explains overall architecture. This file focuses on **styling**, **page composition**, and **how to use the UI components in `app/components/ui`**.

# Core style rules

## General page feel

Pages in this codebase usually aim for:

- no heavy app-shell background fills
- soft structure from spacing, dividers, borders, and subtle tinted surfaces
- readable typography with Poppins-based text components
- components that feel lightweight and modular
- small self-contained UI pieces instead of giant page files

## Page background rules

For page-level layouts:

- prefer **no background** or a very light treatment
- prefer borders like `border-border/15` or `border-subtle-border`
- use `bg-text/5` for lightly pressable or highlighted cards
- use `bg-none` freely for transparent surfaces
- avoid introducing large flat colored blocks unless the component is meant to be a strong CTA or a dialog header

For this project specifically:

- **do not default to `bg-background` for normal pages**
- use dividers, spacing, and hierarchy before adding more filled surfaces

## Structure before decoration

Most pages should be made readable using:

- `Column` and `Row` layout wrappers
- consistent gap spacing
- section wrappers with `border-y` or `border-b`
- subtext labels
- restrained rounded corners

A good page usually looks like:

- top-level `Column`
- section groups separated by borders
- pressable cards using `bg-text/5`
- text hierarchy using `PoppinsText`
- controls aligned with `Row className='items-center justify-between gap-4'`

## Reuse patterns already in the codebase

When possible, match one of these patterns:

- **simple settings section**: bordered rows with label + control
- **pressable preview card**: rounded card with `bg-text/5`
- **dialog flow**: `ConvexDialog` + `DialogHeader` + action row
- **nested page animation**: `LayoutStateAnimatedView`
- **state-based micro-animation**: `StateAnimatedView`
- **horizontal selector strip**: `ComprehensiveDaySelector` or `DaySelector`

# How to style pages so they match the codebase

## Recommended page skeleton

A common page shell looks like this conceptually:

- outer `Column`
- inner `Column className='pb-6' gap={6}`
- section group `Column className='border-y border-border/15' gap={0}`
- row items with `py-4` and optional `border-b border-border/15`

Good defaults:

- **page spacing**: `gap={4}` to `gap={6}`
- **row spacing**: `gap={3}` or `gap={4}`
- **small text**: `PoppinsText varient='subtext'`
- **pressable cards**: `rounded-3xl bg-text/5 px-4 py-4`
- **inline control wrappers**: `min-w-[220px]` or `min-w-[280px]` style constraints when needed

## Section styling

Prefer section dividers like:

- `border-b border-border/15`
- `border-y border-border/15`
- `border border-subtle-border`

Prefer sections that breathe instead of boxed-in dashboards.

Good examples:

- configuration rows with title on the left and control on the right
- pressable preview cards at the top of the page
- text-heavy content wrapped in `Column gap={2}` or `gap={4}`

## Interactive cards

Use interactive cards when the whole area is meant to be clicked.

Typical styling:

- `Pressable`
- `rounded-3xl`
- `bg-text/5`
- `px-4 py-4`
- internal `Row` with icon + text block

This is the right pattern for:

- rule book previews
- summary cards
- action shortcuts
- expandable or nested page entry points

## Text hierarchy

Most pages should use:

- **main heading**: `PoppinsText weight='bold' className='text-xl'`
- **section label**: `PoppinsText weight='medium'`
- **supporting copy**: `PoppinsText varient='subtext'`
- **micro label**: `PoppinsText varient='cardHeader'`

Avoid over-styling raw `Text` directly unless there is a very specific reason.

## Inputs and controls

For text and numeric controls:

- keep them compact
- prefer borders over filled containers
- use helper text instead of large validation banners
- use the app-specific input primitives instead of raw `TextInput`

## Motion and nested navigation

If a screen transitions between internal sub-pages:

- prefer `LayoutStateAnimatedView`
- give pages meaningful `page` numbers
- use a pressable top-level card or row to move deeper
- keep the transition horizontal for nested page-like movement

If you only need a tiny animation between two states in place:

- prefer `StateAnimatedView`

# UI component catalog

This section covers the components currently in `app/components/ui`.

# Root-level UI components

## `CopyableText.tsx`

Purpose:

- displays copyable text with animated copied state
- can work alone or in grouped mode via `CopyableText.Container`

Use it for:

- invite codes
- share codes
- short URLs
- values where copy feedback matters

Styling notes:

- uses `PoppinsText`
- uses `StateAnimatedView` to animate between normal text and copied state
- best for short inline values rather than large blocks of text

## `CustomCheckbox.tsx`

Purpose:

- simple boolean toggle with red/green visual states

Use it for:

- compact binary toggles
- specialized legacy controls

Styling notes:

- uses explicit `StyleSheet` colors instead of the broader design token system
- use carefully if you need visual consistency with newer surfaces

## `Divider.tsx`

Purpose:

- renders a horizontal divider with configurable inset percentage

Use it for:

- separating stacked content blocks
- creating subtle structure without another card background

Styling notes:

- this matches the codebase preference for separation through lines and spacing
- good alternative to wrapping everything in containers

## `LayoutStateAnimatedView.tsx`

Purpose:

- compound animated view system for page-like state transitions

Use it for:

- nested pages inside one tab
- left/right animated flows
- preview card -> detail page transitions

Main pieces:

- `LayoutStateAnimatedView.Container`
- `LayoutStateAnimatedView.Option`
- `LayoutStateAnimatedView.OptionContainer`
- presets like `fromRight` and `fromLeft`

Use this when the UI should feel like one screen sliding into another.

## `PaperContainer.tsx`

Purpose:

- paper-textured content wrapper

Use it for:

- document-like displays
- stylized note or newspaper surfaces

Styling notes:

- gives a textured overlay and rounded paper card treatment
- more decorative than the standard no-background page style

## `StateAnimatedView.tsx`

Purpose:

- state-based micro-animation system

Use it for:

- small swaps like labels, icons, status chips, and copy feedback
- local animated state changes without page navigation

Prefer this when the content stays in place and only its state changes.

## `StatusButton.tsx`

Purpose:

- a button-like status affordance that changes label and shakes when pressed

Use it for:

- disabled-ish affordances that still explain why something is unavailable
- “not ready yet” or “missing input” feedback

Important behavior:

- not a true disabled button
- pressing it shows alternate text briefly
- wraps an `AppButton` internally

## `StatusIconButton.tsx`

Purpose:

- icon-only version of the status/shake pattern

Use it for:

- compact action icons that need shake feedback
- utility icon buttons

## `select.tsx`

Purpose:

- lower-level select primitive based on `@rn-primitives/select`

Use it for:

- cases where `AppDropdown` is not enough
- native-style structured selects with portal/content/item primitives

Preferred default:

- usually reach for `AppDropdown` first for consistency
- use `select.tsx` when you need lower-level select composition

# Buttons

## `buttons/AppButton.tsx`

This is the **main button primitive** in the codebase.

Use it by default for almost all custom buttons.

Supported variants:

- `outline`
- `outline-alt`
- `outline-accent`
- `outline-invert`
- `filled`
- `grey`
- `accent`
- `red`
- `none`
- `black`
- `green`

How to choose variants:

- **`outline`**: default neutral secondary action
- **`outline-alt`**: transparent button with slightly stronger hover feel
- **`outline-accent`**: secondary action with accent-colored emphasis
- **`outline-invert`**: outline on dark/inverted surfaces
- **`filled`**: strong dark CTA
- **`black`**: same family as filled, used when you want explicit naming
- **`accent`**: primary colorful CTA
- **`green`**: currently styled the same family as accent
- **`grey`**: utility button, selectors, tabs, muted actions
- **`red`**: destructive outline action
- **`none`**: transparent button shell with no visual chrome

Usage rules:

- pass text as children, usually via `PoppinsText`
- choose text color manually inside the button where needed
- use `disabled` for true disabled behavior
- use `blurred` only when you intentionally want a blur wrapper

Typical examples:

- `outline` + black text for cancel/secondary actions
- `filled` + white text for confirm/save
- `accent` + white text for primary action
- `grey` for selectors or muted tabs

## `buttons/DisableableButton.tsx`

Purpose:

- wraps an enabled button state and a disabled explanatory state

Props pattern:

- `isEnabled`
- `enabledText`
- `disabledText`
- `onPress`
- `enabledVariant`

Use it for:

- flows where the action should be visibly present but not yet available
- image selection submit buttons
- gated confirm buttons where you want explanatory copy instead of a dim dead button

Behavior:

- when enabled, renders `AppButton`
- when disabled, renders `StatusButton`

This is usually better than a plain disabled button when user guidance matters.

## `buttons/AuthButton.tsx`

Purpose:

- specialized OAuth/auth action button

Use it for:

- auth flows only

Styling notes:

- currently more bespoke than the rest of the button system
- not the general-purpose button to copy for new in-app UI

## `buttons/NavButton.tsx`

Purpose:

- simple page-state toggle button built on `AppButton`

Use it for:

- older local nav clusters with a few fixed states

## `buttons/PagesButton.tsx`

Purpose:

- animated sidebar/pages affordance with bouncing arrow cue

Use it for:

- opening page lists or side panels
- explicit page-navigation utility controls

## `buttons/ShareButton.tsx`

Purpose:

- specialized share-link button for math document flows

Use it for:

- document share actions only

Styling notes:

- built on `AppButton`
- handles async state and responsive label text internally

# Text

## `text/PoppinsText.tsx`

This is the **default text component** for the app.

Use it instead of raw `Text` almost everywhere.

Key props:

- `weight`: `regular | medium | bold`
- `varient`: `default | heading | subtext | cardHeader | lowercaseCardHeader`
- `color`
- `className`

Common variants:

- `subtext`: small, reduced opacity support text
- `cardHeader`: small uppercase label
- `lowercaseCardHeader`: small label without forced uppercase

Rule:

- if you are writing app UI copy, default to `PoppinsText`

## `text/BigText.tsx`

Purpose:

- large display text helper

Use it for:

- rare oversized landing or hero text

This is not the everyday text primitive.

## `text/NameFromUserID.tsx`

Purpose:

- convenience display for user identity lookup from user id

Use it for:

- quick identity rendering when you specifically want email output from `userData`

# Forms

## `forms/AppDropdown.tsx`

This is the **main dropdown/select component** for the codebase.

Use it for:

- enums
- player selectors
- role selectors
- small validated option sets
- compact time/date sub-controls

Key strengths:

- supports web portal positioning
- supports disabled state
- customizable trigger/content/item class names
- consistent with existing app form styling

Prefer this before introducing a new select implementation.

## `forms/PoppinsTextInput.tsx`

This is the **default text input primitive**.

Use it for:

- single-line text
- multiline text
- inline edited labels
- lightweight form fields

Important styling option:

- `varient='styled'` gives `border-b-2 border-text/50 px-2 bg-text/5`

Other important behavior:

- supports `autoGrow` on web
- supports submit behavior for multiline textarea-like use

## `forms/PoppinsNumberInput.tsx`

Use it for:

- numeric form fields with bounds
- compact numeric settings

Key features:

- sanitizes to digits
- validates `minValue` and `maxValue`
- returns `(displayValue, isValid, numericValue)`
- supports `inline`
- supports `useDefaultStyling`

Best use:

- small settings controls
- day count inputs
- constrained numeric entries

## `forms/SmartNumberInput.tsx`

Purpose:

- lightweight convenience wrapper around number input patterns

Use it when you want a slightly simpler numeric input interface than `PoppinsNumberInput`.

## `forms/PoppinsDateInput.tsx`

Use it for:

- date entry with formatting and helper text

Best when:

- users must type or refine a calendar date
- you want app-consistent date formatting behavior

## `forms/SmartDateInput.tsx`

Purpose:

- convenience wrapper around date validation and formatting

Use it when:

- you want a cleaner date-input API than wiring `PoppinsDateInput` directly

## `forms/PoppinsTimeInput.tsx`

Use it for:

- time-of-day settings
- schedule controls
- operator config time fields

Key behavior:

- presents hour/minute/AM-PM dropdowns
- writes canonical `HH:mm`
- fits the codebase better than raw text time entry

This should usually be the first choice for time selection.

## `forms/InlineEditableText.tsx`

Purpose:

- inline text editing without moving into a full dialog

Use it for:

- editable labels
- small renamable fields

## `forms/JoinHandler.tsx`

Purpose:

- specialized join-flow form logic

Use it for:

- join code / game join interactions

## `forms/dropdown/*`

Internal subcomponents used by `AppDropdown`:

- `AppDropdownTrigger.tsx`
- `AppDropdownMenu.tsx`
- `AppDropdownItem.tsx`
- `AppDropdownEmptyState.tsx`

Guideline:

- usually do **not** import these directly in feature code
- prefer `AppDropdown`

# Day selectors

## `daySelector/ComprehensiveDaySelector.tsx`

This is the **main day selector** for multiplayer screens.

Use it for:

- player, nightly, and newspaper day navigation
- reversed day lists with current-day awareness
- optional add-day flow
- initial setup flow

Key behavior:

- uses shared `selectedDayIndex`
- uses shared `dayDatesArray`
- uses shared `numberOfRealDaysPerInGameDay`
- supports `showAddButton`
- supports `showInitialSetupDialog`

Styling role:

- this is the canonical horizontally scrolling day ribbon

## `daySelector/DayButton.tsx`

Purpose:

- standardized individual day pill/button

Use it for:

- rendering a day chip in custom selector contexts

Behavior:

- selected/unselected visual styling
- optional current-day dot indicator

## `daySelector/DaySelector.tsx`

Purpose:

- older or simpler day-selection strip

Use it for:

- simpler date-strip use cases
- older parts of the UI that do not need the full comprehensive behavior

Preferred default:

- use `ComprehensiveDaySelector` unless the simpler behavior is clearly enough

# Dialogs

## `dialog/ConvexDialog.tsx`

This is the **standard dialog wrapper**.

Use it for all new app dialogs unless there is a very specific reason not to.

Why:

- wraps HeroUI dialog primitives
- provides Convex context inside dialog content
- centralizes overlay/content behavior

Pattern:

- `ConvexDialog.Root`
- `ConvexDialog.Portal`
- `ConvexDialog.Overlay`
- `ConvexDialog.Content`
- optional `ConvexDialog.Close`

## `dialog/DialogHeader.tsx`

Purpose:

- strong branded header row for dialogs

Use it for:

- dialogs that need a title banner
- modal flows where the header is part of the design

Visual behavior:

- accent background
- centered white text
- compact stacked title/subtext

## `dialog/UnsavedChangesDialog.tsx`

Purpose:

- standard leave/stay confirmation dialog

Use it for:

- protected navigation away from unsaved editor states

## `dialog/ImageUploadDialog.tsx`

Purpose:

- modal flow for selecting or pasting an image URL

Use it for:

- profile image changes
- image-upload flows that need preview + validation

Notable components inside it:

- `DisableableButton`
- `ImagePreview`
- `UrlInputControls`

## `dialog/ImagePreview.tsx`

Purpose:

- displays the currently selected image in image-upload flows

## `dialog/UrlInputControls.tsx`

Purpose:

- URL entry controls used inside image upload dialog flows

# Alert

## `alert/Alert.tsx`

Purpose:

- lightweight configurable alert dialog

Use it for:

- confirm/cancel prompts
- short decision modals
- generic notices with one or more action buttons

Benefits:

- declarative button config
- built on `ConvexDialog`
- consistent with `AppButton`

# Markdown

## `markdown/MarkdownRenderer.tsx`

This is the **main markdown rendering primitive**.

Use it for:

- rule book content
- role messages
- rich text display with inline images
- interactive markdown inputs

Important behavior:

- supports headings, paragraphs, lists, quotes, rules, images
- supports inline input tokens using syntax like `/["Label":TYPE]/`
- can become interactive if you provide `state` and `setState`
- uses `AppDropdown` and `PoppinsTextInput` internally for inline controls

Input token types currently normalize to:

- `text`
- `player_alive`
- `player_dead`
- `player_all`
- `role`

Guideline:

- if content is authored in markdown and needs to render consistently, use this
- if it needs structured inline responses, use the input token system instead of ad-hoc parsing

## `markdown/MarkdownMathPreview.tsx`
## `markdown/MarkdownMathPreview.web.tsx`

Purpose:

- math/markdown preview helpers for math-oriented content flows

## `markdown/createMarkdownMathSourceDocument.ts`

Purpose:

- utility for creating source documents for markdown math flows

# Image upload

## `imageUpload/PublicImageUpload.tsx`

Purpose:

- public-facing image upload flow

Use it for:

- uploads that are intended to end up on public/shared records

## `imageUpload/SimpleImageUpload.tsx`

Purpose:

- simpler upload helper than the public upload flow

Use it for:

- smaller internal upload scenarios

# Lists

## `lists/FriendListItem.tsx`

Purpose:

- specialized list row for friend/user-style displays

## `lists/ListRow.tsx`

Purpose:

- generic list row building block

Use list components when you want repeated rows with consistent alignment rather than freehand stacking.

# Loading

## `loading/LoadingState.tsx`

Purpose:

- delayed animated reveal for loading placeholders or delayed content

Use it for:

- content that should appear after a short delay to avoid flicker
- subtle enter animations on async UI

# Profile

## `profile/ProfilePhotoCircle.tsx`

Purpose:

- profile image avatar with built-in image-change flow

Use it for:

- editable profile photo rows
- avatar editing with `ImageUploadDialog`

# Icons

## `icons/*`

Current icon wrappers include:

- `CameraSVG.tsx`
- `ChevronDownIcon.tsx`
- `ChevronUpIcon.tsx`
- `CloseIconSVG.tsx`
- `DoubleBeanItArrowSVG.tsx`
- `DownArrow.tsx`
- `DropDownArrowSVG.tsx`
- `MonoIconsOptionsHorizontal.tsx`
- `SadEmoji.tsx`
- `SendSVG.tsx`
- `UpArrow.tsx`
- `UserIcon.tsx`

Guideline:

- use these wrappers when the project already has the icon you need
- prefer existing icons before adding new raw SVG components
- for generic app actions, `lucide-react-native` is also used in many feature files

# Recommended page-building recipes

## Recipe: settings/config page

Use:

- `Column className='pb-6' gap={6}`
- a top pressable preview card if there is a nested page
- bordered section rows
- `PoppinsText` for labels and subtext
- `PoppinsTimeInput`, `PoppinsNumberInput`, or `AppDropdown` for controls

Avoid:

- heavy full-page filled backgrounds
- raw `TextInput`
- large stacked cards for every row

## Recipe: confirm/cancel dialog

Use:

- `ConvexDialog`
- `DialogHeader` if the flow needs a header
- `Column gap={4}` for body
- `Row className='justify-center gap-4'` for action buttons
- `AppButton` variants for button hierarchy

## Recipe: nested page inside a tab

Use:

- `LayoutStateAnimatedView.Container`
- `Option page={1}` for outer page
- `OptionContainer page={2} pushInAnimation={fromRight}` for inner page
- top card or row entry point
- simple back row using icon + `PoppinsText`

## Recipe: inline feedback button

Use:

- `DisableableButton` when the control should explain why it cannot proceed
- `StatusButton` when a press should show temporary feedback text
- `StatusIconButton` for compact icon affordances

# Styling do and don’t list

## Do

- use `PoppinsText` for most text
- use `AppButton` for most buttons
- use `AppDropdown` for most selects
- use section borders and spacing instead of filling every area
- use `bg-text/5` for subtle interactive cards
- keep controls compact and aligned
- prefer modular self-contained UI components
- prefer dialogs for focused editing flows

## Don’t

- don’t default whole pages to `bg-background`
- don’t introduce raw inputs if a Poppins or app-specific input already exists
- don’t build custom buttons before checking `AppButton`, `DisableableButton`, and `StatusButton`
- don’t create ad-hoc dropdowns before checking `AppDropdown`
- don’t over-box every section with strong backgrounds
- don’t jump straight to a new screen when a dialog or nested animated page would fit better

# Quick decision table

If you need...

- **normal button** -> `AppButton`
- **button that explains why it is unavailable** -> `DisableableButton`
- **temporary status/shake text button** -> `StatusButton`
- **icon utility button** -> `StatusIconButton`
- **text input** -> `PoppinsTextInput`
- **number input** -> `PoppinsNumberInput`
- **date input** -> `PoppinsDateInput` or `SmartDateInput`
- **time input** -> `PoppinsTimeInput`
- **dropdown/select** -> `AppDropdown`
- **day strip** -> `ComprehensiveDaySelector`
- **dialog** -> `ConvexDialog`
- **dialog header** -> `DialogHeader`
- **markdown display** -> `MarkdownRenderer`
- **small state animation** -> `StateAnimatedView`
- **nested page animation** -> `LayoutStateAnimatedView`
- **copyable short text** -> `CopyableText`

# Final guidance

When in doubt, match the existing feel by doing less:

- fewer background fills
- more spacing
- more borders/dividers
- more consistent text hierarchy
- more reuse of shared UI primitives

If a new page feels too heavy, too boxy, or too custom, simplify it until it looks like it could live next to the current operator/player screens without standing out.
