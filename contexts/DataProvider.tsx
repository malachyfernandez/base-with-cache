import React, { useEffect, useState, useRef } from "react";
import { useUserVariable } from "../hooks/useUserVariable";
import { useUserList } from "../hooks/useUserList";
import { useUserVariableGet } from "../hooks/useUserVariableGet";
import { useUserListGet } from "../hooks/useUserListGet";
import { useUserVariableLength } from "../hooks/useUserVariableLength";
import { useUserListLength } from "../hooks/useUserListLength";

export type SubId = string;

class DataStore {
  results: Map<SubId, any> = new Map();
  listeners: Map<SubId, Set<() => void>> = new Map();
  refCounts: Map<SubId, number> = new Map();
  configs: Map<SubId, any> = new Map();
  
  providerListeners: Set<() => void> = new Set();
  
  subscribe(subId: SubId, listener: () => void) {
    if (!this.listeners.has(subId)) {
      this.listeners.set(subId, new Set());
    }
    this.listeners.get(subId)!.add(listener);
    return () => {
      this.listeners.get(subId)?.delete(listener);
    };
  }
  
  getResult(subId: SubId) {
    return this.results.get(subId);
  }
  
  setResult(subId: SubId, result: any) {
    this.results.set(subId, result);
    this.listeners.get(subId)?.forEach(fn => fn());
  }

  register(subId: SubId, config: any) {
    if (!this.configs.has(subId)) {
      this.configs.set(subId, config);
    }
    
    const current = this.refCounts.get(subId) || 0;
    this.refCounts.set(subId, current + 1);
    this.notifyProvider();
    
    return () => {
      const updated = Math.max(0, (this.refCounts.get(subId) || 1) - 1);
      this.refCounts.set(subId, updated);
      this.notifyProvider();
    };
  }

  killSub(subId: SubId) {
    this.configs.delete(subId);
    this.results.delete(subId);
    this.refCounts.delete(subId);
    this.notifyProvider();
  }

  subscribeToProvider(listener: () => void) {
    this.providerListeners.add(listener);
    return () => { this.providerListeners.delete(listener); };
  }

  getActiveSubs() {
    return Array.from(this.configs.entries()).map(([subId, config]) => ({
      subId,
      config,
      refCount: this.refCounts.get(subId) || 0
    }));
  }
  
  notifyProvider() {
    this.providerListeners.forEach(fn => fn());
  }
}

export const globalDataStore = new DataStore();

// Safely stringify to detect real data changes, ignoring functions
function safeStringify(obj: any) {
  return JSON.stringify(obj, (key, value) => 
    typeof value === 'function' ? undefined : value
  );
}

function DataSubscriber({ subId, config, refCount }: { subId: SubId, config: any, refCount: number }) {
  const [unloadedChanges, setUnloadedChanges] = useState(0);

  let result: any;
  
  // Disable rules of hooks because config.type is completely static for a given subId.
  // A subscriber component is never re-used for a different type.
  /* eslint-disable react-hooks/rules-of-hooks */
  switch (config.type) {
    case 'variable':
      result = useUserVariable({ key: config.key, ...config.args });
      break;
    case 'list':
      result = useUserList({ key: config.key, itemId: config.itemId, ...config.args });
      break;
    case 'find-values':
      result = useUserVariableGet({ key: config.key, ...config.args });
      break;
    case 'find-list-items':
      // Explicitly spread query args to ensure userIds and other filters are passed
      const listGetArgs = { key: config.key, ...config.args };
      result = useUserListGet(listGetArgs);
      break;
    case 'value-count':
      result = useUserVariableLength({ key: config.key, ...config.args });
      break;
    case 'list-count':
      result = useUserListLength({ key: config.key, ...config.args });
      break;
    default:
      result = undefined;
  }
  /* eslint-enable react-hooks/rules-of-hooks */

  const prevStringifiedRef = useRef<string | undefined>(undefined);
  
  useEffect(() => {
    const stringified = safeStringify(result);
    if (stringified !== prevStringifiedRef.current) {
      prevStringifiedRef.current = stringified;
      
      // Update global store
      globalDataStore.setResult(subId, result);
      
      // Track changes if nobody is actively listening
      if (refCount === 0) {
        setUnloadedChanges(c => c + 1);
      }
    }
  }, [result, subId, refCount]);

  useEffect(() => {
    if (refCount > 0) {
      setUnloadedChanges(0);
    }
  }, [refCount]);

  useEffect(() => {
    const maxChanges = config.args?.unloadedChangesThreshold ?? 3;
    if (unloadedChanges > maxChanges) {
      globalDataStore.killSub(subId);
    }
  }, [unloadedChanges, config.args, subId]);

  return null;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [subs, setSubs] = useState(() => globalDataStore.getActiveSubs());

  useEffect(() => {
    // Catch any subscriptions that were added between initial render and this effect
    setSubs(globalDataStore.getActiveSubs());
    
    return globalDataStore.subscribeToProvider(() => {
      setSubs(globalDataStore.getActiveSubs());
    });
  }, []);

  return (
    <>
      {subs.map(({ subId, config, refCount }) => (
        <DataSubscriber key={subId} subId={subId} config={config} refCount={refCount} />
      ))}
      {children}
    </>
  );
}
