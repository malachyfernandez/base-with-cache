import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GenerationContextType {
  generatingPages: Set<string>;
  recentlyCompletedPages: Set<string>;
  setGeneratingPage: (pageId: string, isGenerating: boolean) => void;
  isPageGenerating: (pageId: string) => boolean;
  isPageRecentlyCompleted: (pageId: string) => boolean;
  clearRecentlyCompleted: (pageId: string) => void;
  clearRecentlyCompletedForActivePage: (pageId: string) => void; // New function
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export const useGeneration = () => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
};

export const GenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [generatingPages, setGeneratingPages] = useState<Set<string>>(new Set());
  const [recentlyCompletedPages, setRecentlyCompletedPages] = useState<Set<string>>(new Set());

  const setGeneratingPage = (pageId: string, isGenerating: boolean) => {
    setGeneratingPages(prev => {
      const newSet = new Set(prev);
      if (isGenerating) {
        newSet.add(pageId);
        // Remove from recently completed when starting new generation
        setRecentlyCompletedPages(completed => {
          const newCompleted = new Set(completed);
          newCompleted.delete(pageId);
          return newCompleted;
        });
      } else {
        newSet.delete(pageId);
        // Add to recently completed when generation finishes
        setRecentlyCompletedPages(completed => {
          const newCompleted = new Set(completed);
          newCompleted.add(pageId);
          return newCompleted;
        });
      }
      return newSet;
    });
  };

  const isPageGenerating = (pageId: string) => {
    return generatingPages.has(pageId);
  };

  const isPageRecentlyCompleted = (pageId: string) => {
    return recentlyCompletedPages.has(pageId);
  };

  const clearRecentlyCompleted = (pageId: string) => {
    setRecentlyCompletedPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageId);
      return newSet;
    });
  };

  const clearRecentlyCompletedForActivePage = (pageId: string) => {
    // Clear the checkmark if the page is currently active
    if (recentlyCompletedPages.has(pageId)) {
      clearRecentlyCompleted(pageId);
    }
  };

  return (
    <GenerationContext.Provider value={{ 
      generatingPages, 
      recentlyCompletedPages,
      setGeneratingPage, 
      isPageGenerating, 
      isPageRecentlyCompleted,
      clearRecentlyCompleted,
      clearRecentlyCompletedForActivePage 
    }}>
      {children}
    </GenerationContext.Provider>
  );
};
