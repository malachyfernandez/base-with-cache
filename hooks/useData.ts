import { useEffect, useSyncExternalStore, useMemo } from "react";
import { DATA_CONFIG } from "../utils/dataConfig";
import { globalDataStore } from "../contexts/DataProvider";

import { useUserListSet } from "./useUserListSet";
import { useUserListRemove } from "./useUserListRemove";
import { useUserVariablePrivacy } from "./useUserVariablePrivacy";
import { useUserListPrivacy } from "./useUserListPrivacy";

import type { UserVariableResult, UserVariableRecord } from "./useUserVariable";
import type { UserListRecord } from "./useUserList";

// Fallback states before the background subscriber mounts
const NO_OP = () => {};
const FALLBACK_GET = undefined;

/**
 * Gets or creates a single variable per user. 
 * Combines subscriptions in the background across components.
 */
export function useValue<T = any>(key: string, overrides: any = {}): [UserVariableResult<T>, (val: T) => void] {
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(() => ({ ...baseConfig, ...overrides }), [JSON.stringify(baseConfig), JSON.stringify(overrides)]);
  const subId = useMemo(() => JSON.stringify({ type: 'variable', key, args }), [key, args]);
  
  useEffect(() => {
    return globalDataStore.register(subId, { type: 'variable', key, args });
  }, [subId, key, args]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  const finalResult = result || [{ value: args.defaultValue, state: { isSyncing: true } }, NO_OP];
  
  return finalResult;
}

/**
 * Gets or creates a single item in a list per user.
 */
export function useList<T = any>(key: string, itemId: string, overrides: any = {}): [UserVariableResult<T>, (val: T) => void] {
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(() => ({ ...baseConfig, ...overrides }), [JSON.stringify(baseConfig), JSON.stringify(overrides)]);
  const subId = useMemo(() => JSON.stringify({ type: 'list', key, itemId, args }), [key, itemId, args]);

  useEffect(() => {
    const unregister = globalDataStore.register(subId, { type: 'list', key, itemId, args });
    return () => {
        unregister();
    };
  }, [subId, key, itemId, args]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return result || [{ value: args.defaultValue, state: { isSyncing: true } }, NO_OP];
}

/**
 * Finds accessible variables across all users based on search/filter criteria.
 */
export function useFindValues<T = any>(key: string, queryArgs: {
  searchFor?: string;
  filterFor?: string | number | boolean;
  userIds?: string[];
  returnTop?: number;
  startAfter?: number;
} = {}) {
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(() => ({ ...baseConfig, ...queryArgs }), [JSON.stringify(baseConfig), JSON.stringify(queryArgs)]);
  const subId = useMemo(() => JSON.stringify({ type: 'find-values', key, args }), [key, args]);

  useEffect(() => {
    return globalDataStore.register(subId, { type: 'find-values', key, args });
  }, [subId, key, args]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return (result || FALLBACK_GET) as UserVariableRecord<T>[] | undefined;
}

/**
 * Finds accessible list items across all users based on search/filter criteria.
 */
export function useFindListItems<T = any>(key: string, queryArgs: {
  itemId?: string;
  searchFor?: string;
  filterFor?: string | number | boolean;
  userIds?: string[];
  returnTop?: number;
  startAfter?: number;
} = {}) {
  const baseConfig = DATA_CONFIG[key] || {};
  const args = useMemo(() => ({ ...baseConfig, ...queryArgs }), [JSON.stringify(baseConfig), JSON.stringify(queryArgs)]);
  const subId = useMemo(() => JSON.stringify({ type: 'find-list-items', key, args }), [key, args]);

  useEffect(() => {
    const unregister = globalDataStore.register(subId, { type: 'find-list-items', key, args });
    return () => {
        unregister();
    };
  }, [subId, key, args]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return (result || FALLBACK_GET) as UserListRecord<T>[] | undefined;
}

/**
 * Gets the exact count of accessible variables for a given filter.
 */
export function useValueCount(key: string, queryArgs: { filterFor: string | number | boolean }) {
  const baseConfig = DATA_CONFIG[key] || {};
  const args = { ...baseConfig, ...queryArgs };
  const subId = JSON.stringify({ type: 'value-count', key, args });

  useEffect(() => {
    return globalDataStore.register(subId, { type: 'value-count', key, args });
  }, [subId]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return result || FALLBACK_GET;
}

/**
 * Gets the exact count of accessible list items for a given filter.
 */
export function useListCount(key: string, queryArgs: { filterFor: string | number | boolean, itemId?: string }) {
  const baseConfig = DATA_CONFIG[key] || {};
  const args = { ...baseConfig, ...queryArgs };
  const subId = JSON.stringify({ type: 'list-count', key, args });

  useEffect(() => {
    return globalDataStore.register(subId, { type: 'list-count', key, args });
  }, [subId]);

  const result = useSyncExternalStore(
    (onStoreChange) => globalDataStore.subscribe(subId, onStoreChange),
    () => globalDataStore.getResult(subId)
  );

  return result || FALLBACK_GET;
}

// -----------------------------------------------------------------------------
// Mutation Utilities 
// These don't need background subscriptions, but they do pull from DATA_CONFIG
// -----------------------------------------------------------------------------

export function useListSet<T = any>() {
  const setList = useUserListSet<T>();
  return (args: { key: string; itemId: string; value: T; [x: string]: any }) => {
    const baseConfig = DATA_CONFIG[args.key] || {};
    return setList({ ...(baseConfig as any), ...args });
  };
}

export function useListRemove() {
  return useUserListRemove();
}

export function usePrivacySet() {
  return useUserVariablePrivacy();
}

export function useListPrivacySet() {
  return useUserListPrivacy();
}
