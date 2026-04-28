import { useFindListItems } from './useData';
import { useEffect, useRef } from 'react';
import { MathDocument, MathDocumentPage } from 'types/mathDocuments';

interface UseListSearchOptions<T = any> {
    searchQuery: string;
    userIds: string[];
    searchKey: string; // Required: the key to search
    additionalKeys?: string[]; // Optional: additional keys to fetch (like pages)
    preserveResultsDuringLoading?: boolean; // New prop to enable caching behavior
}

interface UseListSearchResult<T = any> {
    items: T[] | undefined;
    additionalItems?: any[][] | undefined; // For additional keys like pages
    isLoading: boolean;
    hasResults: boolean;
    resultCount: number;
}

interface UsePreservedListResultsOptions<T = any> {
    additionalItemValues?: any[][] | undefined;
    isLoading: boolean;
    itemValues: T[] | undefined;
    preserveResultsDuringLoading?: boolean;
}

export function usePreservedListResults<T = any>({
    additionalItemValues,
    isLoading,
    itemValues,
    preserveResultsDuringLoading = true,
}: UsePreservedListResultsOptions<T>) {
    const cachedItemsRef = useRef<T[] | undefined>(undefined);
    const cachedAdditionalItemsRef = useRef<any[][] | undefined>(undefined);

    useEffect(() => {
        if (!isLoading && itemValues !== undefined) {
            cachedItemsRef.current = itemValues;
            cachedAdditionalItemsRef.current = additionalItemValues;
        }
    }, [isLoading, itemValues, additionalItemValues]);

    const displayItems = (preserveResultsDuringLoading && isLoading && cachedItemsRef.current !== undefined)
        ? cachedItemsRef.current
        : itemValues;
    const displayAdditionalItems = (preserveResultsDuringLoading && isLoading && cachedAdditionalItemsRef.current !== undefined)
        ? cachedAdditionalItemsRef.current
        : additionalItemValues;

    const displayHasResults = Boolean(displayItems && displayItems.length > 0);
    const displayResultCount = displayItems?.length ?? 0;

    return {
        displayAdditionalItems,
        displayHasResults,
        displayItems,
        displayResultCount,
    };
}

/**
 * Generic hook for searching any list with real-time search functionality.
 * Encapsulates all search logic and provides clean, reusable interface.
 * 
 * @param options - Search configuration options
 * @param options.searchQuery - The search query string
 * @param options.userIds - Array of user IDs to search within
 * @param options.searchKey - The key to search (required)
 * @param options.additionalKeys - Optional additional keys to fetch (e.g., related data)
 * @param options.preserveResultsDuringLoading - If true, maintains last successful results during loading (default: true)
 * @returns Object containing search results and metadata
 */
export function useListSearch<T = any>({ 
    searchQuery, 
    userIds, 
    searchKey,
    additionalKeys,
    preserveResultsDuringLoading = true,
}: UseListSearchOptions<T>): UseListSearchResult<T> {
    // Get primary items with search functionality
    const items = useFindListItems<T>(searchKey, {
        userIds,
        searchFor: searchQuery.trim() || undefined,
    });

    // Get additional items if specified (like pages for documents)
    const additionalItems = additionalKeys?.map(key => 
        useFindListItems<any>(key, {
            userIds,
        })
    );

    // Convert UserListRecord arrays to clean value arrays
    const itemValues = items?.map(item => item.value);
    const additionalItemValues = additionalItems?.map(results => 
        results?.map(item => item.value) ?? []
    );

    // Calculate derived state
    const isLoading = items === undefined || additionalItems?.some(result => result === undefined);
    const hasResults = Boolean(itemValues && itemValues.length > 0);
    const resultCount = itemValues?.length ?? 0;

    const {
        displayAdditionalItems,
        displayHasResults,
        displayItems,
        displayResultCount,
    } = usePreservedListResults<T>({
        additionalItemValues,
        isLoading: isLoading || false,
        itemValues,
        preserveResultsDuringLoading,
    });

    return {
        items: displayItems,
        additionalItems: displayAdditionalItems,
        isLoading: isLoading || false,
        hasResults: displayHasResults,
        resultCount: displayResultCount,
    };
}

/**
 * Convenience hook specifically for document search
 * @deprecated Use useListSearch instead for more flexibility
 */
export function useDocumentSearch({ 
    searchQuery, 
    userIds, 
}: { searchQuery: string; userIds: string[] }) {
    const result = useListSearch<MathDocument>({
        searchQuery,
        userIds,
        searchKey: 'mathDocuments',
        additionalKeys: ['mathDocumentPages'],
        preserveResultsDuringLoading: true, // Default to true for backward compatibility
    });

    // Transform the generic result back to the specific document interface
    return {
        documents: result.items,
        pages: result.additionalItems?.[0],
        isLoading: result.isLoading,
        hasResults: result.hasResults,
        resultCount: result.resultCount,
    };
}
