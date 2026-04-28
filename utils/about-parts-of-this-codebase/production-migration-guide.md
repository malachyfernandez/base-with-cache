# Production Migration Guide
## For React Native + Expo + Convex + Clerk Projects

This guide provides the exact steps to migrate a project with the same stack (React Native/Expo, Convex backend, Clerk authentication, user variable system) from development to production without the headaches we encountered.

---

## 1. Prerequisites

Before starting, ensure you have:
- Vercel CLI installed: `npm install -g vercel`
- Convex CLI available: `npx convex` (comes with your project)
- Access to your Clerk dashboard
- Access to your Convex dashboard
- Your production API keys ready

---

## 2. Critical User Variable System Changes

### 2.1 Fix useUserVariable Hook

**Problem:** The hook attempts mutations before Convex auth is ready, causing "Unauthorized" errors and retry loops.

**Solution:** Add Convex auth checks to both setValue and auto-creation logic.

**File:** `hooks/useUserVariable.ts`

**Changes:**
```typescript
// Add import
import { useConvexAuth } from "convex/react";

// Inside the hook, add:
const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

// Block setValue when auth not ready
const setValue = (newValue: T) => {
    if (isConvexAuthLoading || !isConvexAuthenticated) {
        devWarn(
            "uservar_auth_not_ready",
            `Blocked set for key="${key}" because Convex auth is not ready.`
        );
        return;
    }
    // ... rest of setValue logic
};

// Block auto-creation when auth not ready
useEffect(() => {
    if (didAutoCreateRef.current) return;
    if (isConvexAuthLoading) return;
    if (!isConvexAuthenticated) return;
    if (record !== null) return;
    if (defaultValue === undefined) return;

    didAutoCreateRef.current = true;
    setValue(defaultValue as T);
}, [record, defaultValue, isConvexAuthLoading, isConvexAuthenticated]);
```

### 2.2 Fix useSyncUserData Hook

**Problem:** Sync hook doesn't wait for Convex auth, causing mutation failures.

**Solution:** Gate sync on Convex auth readiness and sanitize user data.

**File:** `hooks/useSyncUserData.ts`

**Changes:**
```typescript
// Add import
import { useConvexAuth } from "convex/react";

// Inside the hook, add:
const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();

// Update the useEffect
useEffect(() => {
    if (!isClerkLoaded || isConvexAuthLoading || !isConvexAuthenticated) return;
    
    const isLoggedIn = !!user;
    const isLoaded = userData !== undefined;
    
    if (!isLoggedIn && isLoaded) {
        setUserData({ name: "", email: "", userId: "" });
        console.log("↻ Cleared userData on logout");
        return;
    }
    
    if (isLoggedIn && isLoaded) {
        const clerkEmail = user.primaryEmailAddress?.emailAddress ?? "";
        const clerkName = user.fullName ?? "";
        const clerkUserId = user.id ?? "";
        
        if (userData.email !== clerkEmail || userData.name !== clerkName || userData.userId !== clerkUserId) {
            setUserData({ ...userData, name: clerkName ?? "", email: clerkEmail ?? "", userId: clerkUserId ?? "" });
            console.log("↻ Syncing userData with Clerk");
        }
    }
}, [user, userData, isClerkLoaded, isConvexAuthLoading, isConvexAuthenticated]);
```

### 2.3 Fix userValueSerialization

**Problem:** Undefined values in objects cause Convex mutation failures.

**Solution:** Strip undefined keys before encoding.

**File:** `hooks/userValueSerialization.ts`

**Changes:**
```typescript
export function encodeUserValue<T>(value: T): T {
    if (value === null || value === undefined) {
        return value;
    }
    
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, nestedValue]) => nestedValue !== undefined)
                .map(([key, nestedValue]) => [key, encodeUserValue(nestedValue)])
        ) as T;
    }
    
    return value;
}
```

### 2.4 Fix Default Values

**Problem:** Empty object defaults cause undefined fields.

**Solution:** Use stable default shapes.

**File:** `app/components/MainPage.tsx` (or wherever you use userVariable)

**Changes:**
```typescript
// Instead of:
defaultValue: {}

// Use:
defaultValue: { name: "", email: "", userId: "" }
```

---

## 3. Convex Backend Configuration

### 3.1 Deploy Convex Functions

**Command:**
```bash
npx convex deploy
```

This deploys your functions to production. Note the deployment URL (e.g., `https://your-project.convex.cloud`).

### 3.2 Set Convex Environment Variables

**Required variables:**
```bash
npx convex env set UPLOADTHING_TOKEN <your_uploadthing_token> --prod
npx convex env set OPENROUTER_API_KEY <your_openrouter_key> --prod
```

**Check current variables:**
```bash
npx convex env list --prod
```

---

## 4. Clerk Authentication Setup

### 4.1 Get Production Keys

From your Clerk dashboard:
- Go to "API Keys"
- Copy your **production** publishable key (starts with `pk_live_`)

### 4.2 Configure Convex Auth

**File:** `convex/auth.config.ts`

**Important:** Trust BOTH the development domain AND your production domain:

```typescript
export default {
  providers: [
    {
      // Keep your development domain for local testing
      domain: "https://your-dev-instance.clerk.accounts.dev",
      applicationID: "convex",
    },
    {
      // Add your production domain
      domain: "https://your-production-domain.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
```

**Deploy auth config:**
```bash
npx convex deploy
```

---

## 5. Vercel Frontend Deployment

### 5.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 5.2 Set Environment Variables

**Frontend variables:**
```bash
vercel env add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
# Select "Production" when prompted
# Enter your production Clerk key

vercel env add EXPO_PUBLIC_CONVEX_URL
# Select "Production"
# Enter your Convex URL from step 3.1

vercel env add EXPO_PUBLIC_CONVEX_SITE_URL
# Select "Production"
# Enter your Convex site URL (usually same as above with .site)

vercel env add UPLOADTHING_TOKEN
# Select "Production"
# Enter your UploadThing token
```

**Verify variables:**
```bash
vercel env ls
```

### 5.3 Deploy to Vercel

```bash
vercel --prod
```

---

## 6. Common Pitfalls to Avoid

### 6.1 Auth Mismatch
**Symptom:** "Unauthorized" errors in Convex logs
**Cause:** Convex auth config doesn't trust your Clerk domain
**Fix:** Ensure both development and production domains are in `convex/auth.config.ts`

### 6.2 Environment Variables
**Symptom:** Missing API keys in production
**Cause:** Variables only set locally, not in deployment environments
**Fix:** Always set variables in both Vercel AND Convex for production

### 6.3 Undefined Values
**Symptom:** Mutation failures with user variables
**Cause:** Undefined fields in objects sent to Convex
**Fix:** Use the serialization fix and stable default values

### 6.4 Auth Timing
**Symptom:** Retry loops and "loading" states
**Cause:** Client attempts mutations before Convex auth is ready
**Fix:** Use the auth gating patterns in hooks

---

## 7. Verification Checklist

After deployment, verify:

- [ ] Clerk authentication works without errors
- [ ] User data syncs automatically after sign-in
- [ ] No "Unauthorized" errors in Convex logs
- [ ] User variables can be created and updated
- [ ] UploadThing file uploads work
- [ ] AI features (if using OpenRouter) work

---

## 8. Troubleshooting

### Check Convex Logs
```bash
npx convex logs --prod
```

### Check Environment Variables
```bash
# Vercel
vercel env ls

# Convex
npx convex env list --prod
```

### Redeploy if Needed
```bash
# Convex
npx convex deploy

# Vercel
vercel --prod
```

---

## 10. OAuth Redirect Configuration

### 10.1 Create Auth Callback Handler

**Problem:** OAuth redirects fail on web platform without proper callback handling.

**Solution:** Create callback handler and configure redirect URI.

**File:** `app/auth/callback.tsx`
```typescript
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { View } from "react-native";

export default function Page() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirect to main app after OAuth completion
  if (isSignedIn) {
    router.replace("/");
  }

  return <View />;
}
```

### 10.2 Configure OAuth Redirect URI

**File:** `app/index.tsx`

**Changes:**
```typescript
import * as AuthSession from "expo-auth-session";

// Update OAuth flow configuration
const authFlow = () =>
  startGoogleFlow(
    Platform.OS === "web"
      ? {
          redirectUrl: AuthSession.makeRedirectUri({ path: "auth/callback" }),
        }
      : undefined,
  );

// Use authFlow instead of startGoogleFlow
<AuthButton authFlow={authFlow} buttonText="Sign in with Google" />
```

### 10.3 Configure Vercel Rewrites

**File:** `vercel.json`

**Changes:**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

---

## 12. Common Mistakes to Avoid

### 12.1 Don't Use Proxy Routes for Clerk

**What we tried:** Adding proxy routes in `vercel.json` to serve Clerk from our domain.

**Why it failed:** Complex and unnecessary. Clerk provides CDN URLs.

**Correct approach:** Use Clerk's standard CDN and production keys.

**Wrong:**
```json
{
  "routes": [
    {
      "src": "/npm/@clerk/clerk-js@(.*)",
      "dest": "https://js.clerk.dev/npm/@clerk/clerk-js@$1"
    }
  ]
}
```

**Correct:** Use standard Clerk keys and let Clerk handle CDN.

### 12.2 Don't Assume Subdomain Auto-Creation

**What we tried:** Assuming Clerk would automatically serve content from `clerk.yourdomain.com`.

**Why it failed:** Subdomains must be explicitly configured and DNS-propergated.

**Correct approach:** Use Clerk's standard domains or proper custom domain setup.

### 12.3 Don't Mix Development and Production Keys

**What we tried:** Using development keys (`pk_test_`) in production.

**Why it failed:** Causes "Development mode" warnings and usage limits.

**Correct approach:** Always use production keys (`pk_live_`) for production deployments.

---

## 13. Essential Commands Cheat Sheet

### Convex Commands
```bash
# Deploy to production
npx convex deploy

# Set environment variables
npx convex env set VAR_NAME <value> --prod

# List environment variables
npx convex env list --prod

# View logs
npx convex logs --prod
```

### Vercel Commands
```bash
# Deploy to production
vercel --prod

# Add environment variable
vercel env add VAR_NAME

# List environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.local
```

---

## 14. Summary

The key differences from development to production are:

1. **User variable hooks** must wait for Convex auth
2. **Environment variables** must be set in both platforms
3. **Auth domains** must be explicitly trusted in Convex
4. **Data sanitization** prevents undefined field errors
5. **OAuth redirects** need proper callback handling on web
6. **Vercel routing** needs rewrites for SPA behavior

Following this guide should prevent the authorization failures, retry loops, environment mismatches, and OAuth redirect issues we encountered during our migration.
