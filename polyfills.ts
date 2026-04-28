// Polyfills for React Native to support Convex
// This file must be imported before any Convex imports

if (typeof window !== "undefined") {
  // Polyfill window.addEventListener for React Native
  if (typeof window.addEventListener === "undefined") {
    const listeners: Map<string, Set<EventListener>> = new Map();
    
    // @ts-ignore
    window.addEventListener = function(
      event: string,
      handler: EventListener,
      options?: boolean | AddEventListenerOptions
    ) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
    };
    
    // @ts-ignore
    window.removeEventListener = function(
      event: string,
      handler: EventListener,
      options?: boolean | EventListenerOptions
    ) {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(handler);
      }
    };
  }
}
