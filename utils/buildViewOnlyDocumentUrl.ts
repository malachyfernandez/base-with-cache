export const buildViewOnlyDocumentUrl = (documentId: string) => {
    if (typeof window === 'undefined') {
        return `/view-only/${documentId}`;
    }

    return `${window.location.origin}/view-only/${documentId}`;
};
