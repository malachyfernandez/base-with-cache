import { useRef, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';

interface RateLimitConfig {
  /** Maximum number of calls allowed in the window (default: 100) */
  maxCalls: number;
  /** Time window in milliseconds (default: 30000 = 30 seconds) */
  windowMs: number;
  /** Message to show when rate limit is exceeded */
  warningMessage: string;
  /** Minimum time between toast warnings in ms (default: 10000 = 10 seconds) */
  throttleMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxCalls: 50,
  windowMs: 30000,
  warningMessage: '⚠️ High data activity detected - possible infinite loop bug',
  throttleMs: 10000,
};

/**
 * Hook to monitor mutation rate and warn about potential infinite loops.
 *
 * This tracks the timestamp of each call in a sliding window and shows a toast
 * when the rate exceeds the configured threshold. This helps catch bugs like
 * the infinite read-write loops that can occur with userVars normalization.
 *
 * Example usage:
 * ```ts
 * const rateLimiter = useRateLimitMonitor({ key: 'userTable', maxCalls: 100 });
 *
 * // In your mutation:
 * const setValue = (newValue: T) => {
 *   rateLimiter.trackCall(); // Track this mutation
 *   // ... perform mutation
 * };
 * ```
 */
export function useRateLimitMonitor(config: Partial<RateLimitConfig> & { key: string }) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { showToast } = useToast();

  // Track call timestamps in a sliding window
  const callTimestampsRef = useRef<number[]>([]);
  // Track last warning time to throttle toasts
  const lastWarningRef = useRef<number>(0);
  // Track if we've already warned for this burst
  const hasWarnedRef = useRef<boolean>(false);

  const trackCall = useCallback(() => {
    const now = Date.now();
    const windowStart = now - fullConfig.windowMs;

    // Add current timestamp
    callTimestampsRef.current.push(now);

    // Remove old timestamps outside the window
    callTimestampsRef.current = callTimestampsRef.current.filter(ts => ts > windowStart);

    const callCount = callTimestampsRef.current.length;

    // Check if we've exceeded the threshold
    if (callCount > fullConfig.maxCalls) {
      // Throttle warnings - don't show more than once per throttleMs
      if (now - lastWarningRef.current > fullConfig.throttleMs) {
        lastWarningRef.current = now;
        hasWarnedRef.current = true;

        showToast(
          `${fullConfig.warningMessage} (${callCount} calls in ${fullConfig.windowMs / 1000}s for "${config.key}")`
        );

        // Also log to console for debugging
        console.warn(
          `[RateLimitMonitor] ${config.key}: ${callCount} calls in last ${fullConfig.windowMs / 1000}s. ` +
          `Possible infinite loop detected. Recent timestamps:`,
          callTimestampsRef.current.slice(-10)
        );
      }
    } else if (callCount <= fullConfig.maxCalls / 2 && hasWarnedRef.current) {
      // Reset warning flag when activity drops significantly
      hasWarnedRef.current = false;
    }

    return callCount;
  }, [showToast, fullConfig, config.key]);

  const getStats = useCallback(() => {
    const now = Date.now();
    const windowStart = now - fullConfig.windowMs;
    const recentCalls = callTimestampsRef.current.filter(ts => ts > windowStart);

    return {
      callCount: recentCalls.length,
      windowMs: fullConfig.windowMs,
      maxCalls: fullConfig.maxCalls,
      isExceeded: recentCalls.length > fullConfig.maxCalls,
    };
  }, [fullConfig]);

  const reset = useCallback(() => {
    callTimestampsRef.current = [];
    hasWarnedRef.current = false;
    lastWarningRef.current = 0;
  }, []);

  return {
    trackCall,
    getStats,
    reset,
  };
}

/**
 * Global rate limit monitor for tracking across multiple hooks.
 *
 * This is useful for tracking aggregate mutation rates across all userVars
 * operations to detect system-wide infinite loops.
 */
class GlobalRateLimitMonitor {
  private callTimestamps: Map<string, number[]> = new Map();
  private lastWarnings: Map<string, number> = new Map();
  private hasWarned: Map<string, boolean> = new Map();
  private config: RateLimitConfig;
  private toastHandler: ((message: string) => void) | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setToastHandler(handler: (message: string) => void) {
    this.toastHandler = handler;
  }

  trackCall(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create timestamps array for this key
    let timestamps = this.callTimestamps.get(key) || [];
    timestamps.push(now);
    timestamps = timestamps.filter(ts => ts > windowStart);
    this.callTimestamps.set(key, timestamps);

    const callCount = timestamps.length;

    // Check threshold
    if (callCount > this.config.maxCalls) {
      const lastWarning = this.lastWarnings.get(key) || 0;

      if (now - lastWarning > this.config.throttleMs) {
        this.lastWarnings.set(key, now);
        this.hasWarned.set(key, true);

        const message = `${this.config.warningMessage} (${callCount} calls in ${this.config.windowMs / 1000}s for "${key}")`;
        this.toastHandler?.(message);

        console.warn(
          `[GlobalRateLimitMonitor] ${key}: ${callCount} calls in last ${this.config.windowMs / 1000}s. ` +
          `Possible infinite loop detected. Recent timestamps:`,
          timestamps.slice(-10)
        );
      }
    } else if (callCount <= this.config.maxCalls / 2 && this.hasWarned.get(key)) {
      this.hasWarned.set(key, false);
    }

    return callCount;
  }

  getStats(key: string) {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const timestamps = this.callTimestamps.get(key) || [];
    const recentCalls = timestamps.filter(ts => ts > windowStart);

    return {
      callCount: recentCalls.length,
      windowMs: this.config.windowMs,
      maxCalls: this.config.maxCalls,
      isExceeded: recentCalls.length > this.config.maxCalls,
    };
  }

  reset(key?: string) {
    if (key) {
      this.callTimestamps.delete(key);
      this.lastWarnings.delete(key);
      this.hasWarned.delete(key);
    } else {
      this.callTimestamps.clear();
      this.lastWarnings.clear();
      this.hasWarned.clear();
    }
  }
}

// Singleton instance for global tracking
export const globalRateLimitMonitor = new GlobalRateLimitMonitor();

/**
 * Hook to initialize the global rate limit monitor with toast support.
 *
 * Call this once at app startup (e.g., in your root layout or app component)
 * to enable toast notifications from the global monitor.
 */
export function useGlobalRateLimitMonitor() {
  const { showToast } = useToast();

  // Set up the toast handler once using useRef to persist across renders
  const setupRef = useRef(false);
  if (!setupRef.current) {
    globalRateLimitMonitor.setToastHandler(showToast);
    setupRef.current = true;
  }
}
