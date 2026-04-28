# Final Workflow

## Goal

Provide a single, unambiguous workflow that:
- Stabilizes this project for local development and production deployment
- Prevents the same runtime, upload, and environment mistakes from recurring
- Enables future projects with the same stack to start from a known-good process
- Can be followed by even a weak automation agent without error

Stack:
- Expo / React Native Web
- Expo Router
- Convex
- Clerk
- UploadThing
- OpenRouter
- Vercel

This document is written so that even a weak automation agent can follow it without making the same mistakes again.

---

## 1. Non-Negotiable Rules

- Never commit real secrets to git.
- Never rely on `.env` file swapping between branches.
- Never store production secrets in tracked repo files.
- Never assume mobile web on iPhone is the same as native iOS.
- Never update production secrets in code when the real source of truth is a deployment environment.
- Never push to `main` until:
  - local Expo web boots
  - Convex dev works
  - auth works locally
  - upload flow is verified
  - git status is understood
- Never leave `.env.production` or any other real env file tracked in git.
- Never proxy Clerk unless there is a very specific documented reason.
- Never use development Clerk keys in production.
- Never use production Clerk keys in local dev.

---

## 2. Source of Truth by Environment

### 2.1 Local development

Use:
- `.env.local`
- local running `npx convex dev`
- development Clerk publishable key
- development Convex deployment URL

Local development must be self-contained.

That means `npx expo --web` must work using `.env.local` without needing to copy values into `.env`.

### 2.2 Production frontend

Use:
- Vercel environment variables

Do not depend on any local `.env` file for production deployment.

### 2.3 Production backend

Use:
- Convex production environment variables

For this project specifically:
- `OPENROUTER_API_KEY` belongs in **Convex production env**
- `UPLOADTHING_TOKEN` belongs in **Convex production env**

---

## 3. Git / Branch Strategy

### 3.1 Branch roles

- `dev`
  - active working branch
  - safe place for local testing and iteration
- `main`
  - production branch
  - only receives changes after verification

### 3.2 Daily flow

1. Work on `dev`
2. Run local verification
3. Commit on `dev`
4. Merge `dev` into `main`
5. Push `main`
6. Verify Vercel production deployment

### 3.3 Required invariants

Before merging `dev` into `main`:
- `git status` is understood
- no secret env files are staged
- `.env*` files are ignored
- tracked env files have been removed from git index if necessary
- local app booted successfully

---

## 4. Required Git Ignore Rules

The repo must ignore env files broadly:

```gitignore
.env*
!.env.example
```

This prevents accidental commits of:
- `.env`
- `.env.local`
- `.env.dev`
- `.env.local.dev`
- `.env.production`
- `.env.production.local`

### 4.1 Critical follow-up rule

Ignoring files is **not enough** if one was already tracked.

If a secret env file is already tracked, remove it from git index:

```bash
git rm --cached .env.production
```

Do the same for any other tracked env file.

This removes it from future commits while leaving the local file on disk.

---

## 5. Local Development Setup

### 5.1 Required local variables

Local `.env.local` should contain the development values needed by Expo web and Convex dev.

Required keys:

```bash
CONVEX_DEPLOYMENT=dev:your-dev-deployment
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CONVEX_URL=https://your-dev.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://your-dev.convex.site
UPLOADTHING_TOKEN=<your_uploadthing_token>
OPENROUTER_API_KEY=<your_openrouter_key_if_needed_locally>
```

### 5.2 Start local development

Run in separate terminals:

```bash
npx convex dev
npx expo --web
```

### 5.3 Local verification checklist

All of these should be true:
- Expo web starts successfully
- Clerk loads from the correct Clerk dev domain
- Convex connects successfully
- no missing default export warnings from Expo Router for files under `app/**`
- uploading an image does not spin forever
- upload failures show a visible message

---

## 6. Expo Router Rule That Caused Warnings

Anything under `app/**` may be treated as a route by Expo Router.

### Safe options

Option A:
- keep reusable files outside `app/`

Option B:
- if reusable files remain under `app/`, ensure route-like files have a default export

For this project, the warning-prone files were inside `app/components/**`.

Long-term best practice:
- move reusable UI out of `app/` into top-level `components/`

---

## 7. Clerk Rules

### 7.1 Local dev

Use a development Clerk publishable key:
- starts with `pk_test_`

### 7.2 Production

Use a production Clerk publishable key:
- starts with `pk_live_`

### 7.3 Convex auth config

`convex/auth.config.ts` must trust the actual Clerk domains used by the environment.

Do not assume a custom Clerk subdomain works unless Clerk and DNS are both fully configured and verified.

### 7.4 Forbidden mistake

Do not try to “fix” Clerk by inventing proxy routes unless there is hard evidence that Clerk CDN loading is impossible in the target environment.

---

## 8. Upload / Image Flow Rules

### 8.1 Native app vs mobile web

This matters a lot:
- App Store / Expo native app on iPhone = native iOS behavior
- visiting `https://exampleproject.malachyf.com` on iPhone Safari = **web behavior**

If the user is on `exampleproject.malachyf.com` in Safari, the upload flow must be treated as **mobile web**.

### 8.2 Correct mobile web behavior

For mobile web uploads:
- use browser file input behavior
- handle cancel cleanly
- handle timeout cleanly
- show an actual error message on failure
- never leave the UI spinning forever

### 8.3 Required UX behavior

The upload button must:
- disable while work is active
- show a clear uploading state
- recover on cancel
- recover on timeout
- recover on network error
- render a visible error message

### 8.4 Verification steps for upload

On desktop web and iPhone Safari:
- open the upload flow
- choose an image
- confirm the image URL is returned
- confirm the button stops spinning
- confirm an error message appears if upload fails

### 8.5 If upload still fails on iPhone Safari

Check these in order:
- page is served over HTTPS
- browser file input actually opens
- selected file returns from the browser
- Convex action successfully generates signed upload URL
- UploadThing signed upload succeeds
- returned public URL is non-empty
- no CORS/network errors in browser console
- no Convex errors in logs

---

## 9. OpenRouter Rules

### 9.1 Where the production key goes

For this project, `OPENROUTER_API_KEY` is read by Convex server code.

That means the **production** key belongs in Convex production env:

```bash
npx convex env set OPENROUTER_API_KEY <your_openrouter_key> --prod
```

Do not “fix production” by editing a repo `.env` file.

### 9.2 Current production update procedure

When rotating the production OpenRouter key:

```bash
npx convex env set OPENROUTER_API_KEY <new_key> --prod
npx convex env list --prod
```

Then verify the AI conversion path.

---

## 10. Production Deployment Procedure

### 10.1 Convex production

```bash
npx convex deploy
npx convex env list --prod
```

### 10.2 Vercel production env

Required frontend env vars belong in Vercel:

```bash
vercel env ls
```

Typical required frontend vars:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
EXPO_PUBLIC_CONVEX_URL
EXPO_PUBLIC_CONVEX_SITE_URL
```

Only put a variable in Vercel if the frontend really needs it.

### 10.3 Push flow

Use this exact sequence:

```bash
git checkout dev
git status

git add <intended files>
git commit -m "<message>"
git push origin dev

git checkout main
git merge dev
git push origin main
```

Do not merge if env files are staged or tracked unexpectedly.

---

## 11. Production Verification Procedure

After `main` is pushed:

### 11.1 Verify git state

Back on `dev` if desired:

```bash
git checkout dev
git status
```

Desired result:
- nothing left to commit unless intentionally continuing work
- no hidden env files riding in tracked changes

### 11.2 Verify Vercel deployment

Check production site:
- site loads successfully
- Clerk auth loads successfully
- page routing works
- image upload works
- AI conversion works

### 11.3 Verify Convex production

```bash
npx convex logs --prod
```

Check for:
- auth failures
- UploadThing failures
- missing `OPENROUTER_API_KEY`
- conversion action errors

---

## 12. Recovery / Cleanup Commands

### Remove tracked env files from git index

```bash
git rm --cached .env.production
```

### See whether an env file is still tracked

```bash
git ls-files .env.production
```

### Confirm ignore behavior

```bash
git check-ignore -v .env.dev .env.local.dev .env .env.local .env.production
```

---

## 13. Exact Future-Project Setup Checklist

When building another project with this same stack, do this in order.

### Phase 1: repo setup

1. Create repo
2. Add `.gitignore` with `.env*` ignored
3. Create `dev` branch
4. Keep `main` clean for production

### Phase 2: local env setup

1. Create `.env.local`
2. Put only local-development values there
3. Start `npx convex dev`
4. Start `npx expo --web`
5. Verify Clerk and Convex connect locally

### Phase 3: route hygiene

1. Keep reusable components outside `app/` if possible
2. If not, ensure files inside `app/` that Expo Router sees have correct exports
3. Fix route warnings before production work

### Phase 4: upload behavior

1. Treat desktop web and mobile web as browser flows
2. Treat native iOS/Android as native flows
3. Ensure cancel/timeout/error states are visible
4. Test image upload on real iPhone Safari if the app will be used there

### Phase 5: production setup

1. Deploy Convex
2. Put backend secrets in Convex env
3. Put frontend public vars in Vercel env
4. Use production Clerk key on Vercel
5. Verify auth domains match the real deployment

### Phase 6: release process

1. Verify everything on `dev`
2. Commit and push `dev`
3. Merge `dev` into `main`
4. Push `main`
5. Verify Vercel production
6. Verify Convex production logs
7. Confirm repo is clean afterward

---

## 14. Forbidden Agent Mistakes

Any future AI or automation working on this project must avoid these mistakes:

- Do not commit `.env` files.
- Do not store real production secrets in tracked markdown or code.
- Do not assume Safari on iPhone is native iOS.
- Do not update production backend secrets in Vercel if the server code actually runs in Convex.
- Do not push to `main` before checking tracked env files.
- Do not delete or rewrite workflow files unless replacing them with a clearly better canonical guide.
- Do not merge unrelated deletions into `main` without checking whether they were intentional.
- Do not claim a deploy is healthy without verifying the running site and logs.

---

## 15. Success Criteria

You are done only when all of the following are true:

- local `npx convex dev` works
- local `npx expo --web` works
- Clerk works locally
- route warnings are resolved or intentionally contained
- image upload works on desktop web
- image upload works on iPhone Safari if using mobile web
- upload failures do not spin forever
- production OpenRouter key is set in Convex production env
- no `.env*` files are being pushed
- `dev` remains available
- `main` contains the intended verified changes
- Vercel production is verified after push
- `git status` is clean when release work is complete
