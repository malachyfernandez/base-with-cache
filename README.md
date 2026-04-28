# Base Project

A minimal React Native + Expo base project with Convex backend, Clerk authentication, and a persistent DataProvider hook system. This is a clean foundation to build new projects on top of.

---

## Features

- **Auth** — Google OAuth sign-in via Clerk
- **DataProvider** — Persistent per-user data with `useValue`, `useList`, `useFindValues`, `useFindListItems`
- **Undo/Redo** — Command pattern-based undo/redo system
- **Toast Notifications** — Global toast feedback system
- **Dialogs** — Reusable dialog components with Convex context
- **Layout Primitives** — Column, Row, gap-based spacing
- **UI Components** — Buttons, text inputs, scroll views, loading states
- **Tailwind Styling** — Nativewind/unwind for React Native

---

## Technical Stack

- **Frontend**: React Native with Expo (mobile + web)
- **Backend**: Convex (real-time sync, serverless functions)
- **Authentication**: Clerk (Google OAuth, secure sessions)
- **Styling**: TailwindCSS
- **State Management**: DataProvider client cache + Convex real-time subscriptions

---

## Requirements

- **Node.js** (LTS recommended, e.g. 20.x)
- **npm** (comes with Node)
- **Git**

---

## Getting Started

1. **Configure environment variables**

   Create a `.env.local` file with:
   ```
   EXPO_PUBLIC_CONVEX_URL=your_convex_url
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the app**

   ```bash
   npm run start      # Start Metro dev server
   npm run android    # Run on Android
   npm run ios        # Run on iOS simulator
   npm run web        # Run on web
   ```

---

## Project Structure

```
app/
  components/ui/       # Reusable design system
  components/layout/   # Layout primitives
  components/game/     # Demo page (TownSquarePagePLAYER.tsx)
contexts/              # React contexts (DataProvider, Toast, etc.)
convex/                # Backend functions and schema
hooks/                 # Custom React hooks (useData, useUndoRedo, etc.)
types/                 # TypeScript type definitions
utils/                 # Utility functions and documentation
```

---

## License

Private — All rights reserved.

