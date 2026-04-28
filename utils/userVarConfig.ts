/**
 * Central configuration for the user variable system.
 *
 * This file controls:
 * - default optimistic-write timeout behavior
 * - whether stored config should be overwritten on normal value sets
 * - dev warning toggles
 *
 * Notes:
 * - `overwriteStoredConfigOnSet` keeps filter/search/sort props in sync on
 *   normal value writes (defaults to `true`).
 * - `overwriteStoredPrivacyOnSet` controls whether passed `privacy` keeps
 *   re-applying on normal writes (defaults to `false`).
 * - `defaultSortKey` is used when a variable is created without an explicit
 *   `sortKey`.
 */

export const userVarConfig = {
    // === Dev Warnings ===

    // Master switch to enable/disable all dev warnings.
    devWarningsEnabled: true,

    // Warn when a setter call is not confirmed by the server within the timeout.
    warnOnUserVarOpTimeout: true,

    // Log when an optimistic value is rolled back to the last confirmed value.
    logOnUserVarRollback: true,

    // Warn when `useUserListLength({ itemId })` resolves through shared list data.
    warnOnUserListLengthSharedItem: true,

    // === Default Behaviors ===

    // Default timeout (ms) before an optimistic write is considered timed out.
    defaultTimeoutMs: 5000,

    // When true (recommended), normal value writes keep the latest passed
    // filter/search/sort config in sync with props instead of freezing the
    // first-created values.
    overwriteStoredConfigOnSet: true,

    // Privacy changes happen frequently (dedicated hooks exist), so we keep the
    // original "set-once" behavior by default. Toggle this to true only if you
    // want normal value writes to keep re-applying the passed privacy.
    //
    // Example:
    // - First render creates the variable with privacy PUBLIC
    // - Later renders still pass privacy PUBLIC
    // - If the user later changed privacy through useUserVariablePrivacy,
    //   a normal setValue(...) call will NOT overwrite that change.
    //
    // Set this to true only if you explicitly want useUserVariable(...) to keep
    // re-applying the latest passed privacy on every write.
    overwriteStoredPrivacyOnSet: true,

    // Used when a new variable is created without a sortKey.
    defaultSortKey: "PROPERTY_LAST_MODIFIED",
} as const;
