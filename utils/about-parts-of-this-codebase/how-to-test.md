# AI-Assisted Debugging Methodology: Terminal-Driven Isolation and Verification

This guide outlines a systematic, reproducible approach for AI models (or human developers) to debug complex runtime issues in React/Next.js/Expo apps. It emphasizes **automation over manual testing**, **isolation via layered harnesses**, and **terminal-verifiable repros** to eliminate subjectivity. The methodology turns debugging into a deterministic process: build → isolate → fix → verify → publish.

Inspired by real-world fixes (e.g., resolving a React "Maximum update depth exceeded" loop in an Expo web app), this method scales to infinite loops, hydration mismatches, provider/context bugs, and hook effects.

## Core Principles

- **Never rely on manual browser clicks**: Use Puppeteer/Playwright for scripted, repeatable interactions.
- **Binary search the stack**: Create debug modes (`raw-static` → `full-real`) to pinpoint the first failure.
- **Preserve outer context minimally**: Test in isolation *then* compose upward.
- **Typecheck religiously**: Run `npx tsc --noEmit` after every change.
- **Git hygiene**: Branch early (`git switch -c fix-dialog-loop`), commit atomically.
- **Log surgically**: Add render counts/mount logs; remove post-fix.
- **Verify exhaustively**: Re-run full suite *after* fix.

## Step 1: Setup Reproducible Environment

Start with a clean branch and confirm the bug reproduces reliably.

```bash
git switch -c fix-infinite-loop
npx expo start --web --clear  # Or `next dev` 
# Manually verify: Visit buggy route, trigger action → crash
```

**AI Action**: Announce: "I'll set up a reproducible terminal-driven verification loop..."

## Step 2: Build Debug Harness with Isolation Modes

Create an isolated route (`app/debug-bug.tsx`) rendering a harness component with **modes** that peel back layers:

- `raw-static`: Pure UI (e.g., raw HeroUI Dialog + static text).
- `raw-inputs`: Add inputs/effects.
- `convex-static`: Add wrappers/providers.
- `home-page`: Real page composition.
- `cache-loop`: Hook-specific probe.

Use URL params for mode selection (avoids React state leakage).

**Example: `app/debug-bug.tsx` (Expo Router route)**

```tsx
import { useLocalSearchParams } from 'expo-router';
import DialogOpenDebugHarness from '../components/debug/DialogOpenDebugHarness';

export default function DebugBug() {
  const { mode = 'raw-static', autoOpen = 'false' } = useLocalSearchParams();
  return (
    <DialogOpenDebugHarness
      mode={mode as any}
      autoOpen={autoOpen === 'true'}
    />
  );
}
```

**Example: Harness Modes in `DialogOpenDebugHarness.tsx`**

```tsx
const [isOpen, setIsOpen] = useState(false);
const renderCount = useRef(0);
renderCount.current++;

console.log(`[${mode}] Render #${renderCount.current}, isOpen: ${isOpen}`);

switch (mode) {
  case 'raw-static':
    return (
      <Dialog.Root isOpen={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger>New</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>Static content</Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  case 'cache-loop':
    const { items } = useListSearch({ /* mock params */ });
    return <div>Cache probe renders: {renderCount.current}</div>;  // Fails if loop
  case 'current':
    return <NewDocumentDialog />;  // Real buggy component
  // ...
}
```

**Test Manually First**: Visit `/debug-bug?mode=raw-static` → Cycle modes → Note first failure.

## Step 3: Automate Terminal Testing with Puppeteer

Script interactions: Load page → Click trigger → Wait → Assert no errors.

**Example: `scripts/bug-repro.mjs`**

```mjs
import puppeteer from 'puppeteer';

const MODES = ['raw-static', 'raw-inputs', 'convex-static', 'cache-loop', 'current'];

for (const mode of MODES) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8081/debug-bug?mode=' + mode + '&autoOpen=true');
  await page.waitForSelector('[data-testid="trigger"]');  // Or text-based: page.getByText('New')
  
  // Click trigger
  await page.click('[data-testid="trigger"]');
  await page.waitForTimeout(2000);  // Allow passive effects
  
  // Check for crash
  const errors = await page.evaluate(() => {
    return console.errorMessages || [];  // Mocked via `page.on('console', ...)` 
  });
  
  if (errors.some(e => e.includes('Maximum update depth'))) {
    console.error(`❌ FAIL: ${mode}`);
    await browser.close();
    process.exit(1);
  }
  
  console.log(`✅ PASS: ${mode}`);
  await browser.close();
}
```

**Run**: `node scripts/bug-repro.mjs` 

**AI Action**: "I'm running the terminal repro now to identify the first failing mode."

## Step 4: Binary Search the Failure Surface

Run harness → Report:

```
Mode raw-static: ✅ PASS (opens, no loop)
Mode raw-inputs: ✅ PASS
Mode convex-static: ✅ PASS  // Hypothesis wrong!
Mode cache-loop: ❌ FAIL (Max depth @ render #128)
```

**Toggle Experiments**: Add flags (e.g., `DEBUG_DISABLE_PROVIDER = true`).

**AI Action**: "The isolated dialog stack passes. Extending to real page composition..."

## Step 5: Isolate Root Cause

Once pinpointed (e.g., `useListSearch` cache effect):

**Before (Looping Hook)**:
```tsx
const [cachedItems, setCachedItems] = useState([]);
useEffect(() => {
  if (items !== previousItems.current) {  // New array each render
    setCachedItems(items);  // → Re-render → New array → Loop
  }
}, [items]);
```

**Probe Mode**: Force fresh arrays → Confirm loop.

## Step 6: Apply Minimal Fix

Refactor surgically.

**After (Fixed with Refs)**:
```tsx
function usePreservedListResults(items) {
  const cachedItems = useRef([]);
  useEffect(() => {
    cachedItems.current = items;  // No re-render!
  }, [items]);
  return cachedItems.current;
}
```

**AI Action**: "I've reproduced the failure in the cache logic. Fixing with refs..."

## Step 7: Full Verification Suite

```bash
npx tsc --noEmit
DIALOG_DEBUG_MODES=cache-loop node scripts/bug-repro.mjs  # Fix target
node scripts/bug-repro.mjs  # Full suite
```

All PASS → Original flow works.

**AI Action**: "Verified fix in cache probe, full suite, and real page."

## Step 8: Cleanup and Publish

- Remove runtime logs.
- Keep repro tools (comment: `// For future dialog issues`).
- Commit/push.

```bash
git add .
git commit -m "fix: resolve infinite loop in useListSearch via ref-based caching

- Extracted preservation logic
- Full terminal repro suite passes"
git push origin fix-infinite-loop
```

**Status Report**:
```
✅ Bug fixed
✅ Typecheck passing
✅ Terminal verification passing
✅ Changes published to main
```

## Common Pitfalls Avoided

| Issue | How Method Handles |
|-------|--------------------|
| State leakage | URL params per mode |
| Manual flakiness | Puppeteer + timeouts |
| Wrong hypothesis | Binary search proves layers |
| Regressions | Full suite post-fix |
| Non-deterministic data | Mock hooks in probes |

## When to Use This

- Runtime crashes (loops, hydration).
- Provider/context leaks.
- Hook effects (useEffect deps).
- Platform-specific (web vs. native).

This methodology ensures **AI models debug like senior engineers**: methodical, verifiable, zero-assumption. Adapt modes/scripts to your stack.
