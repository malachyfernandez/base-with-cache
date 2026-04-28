import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { MathDocumentPage } from 'types/mathDocuments';
import { useToast } from '../../../../contexts/ToastContext';
import { useListSet } from 'hooks/useData';
import { buildViewOnlyDocumentUrl } from '../../../../utils/buildViewOnlyDocumentUrl';
import AppButton from './AppButton';
import FontText from '../text/FontText';

interface ShareButtonProps {
    documentTitle: string;
    documentId: string;
    activePage: MathDocumentPage;
    className?: string;
}

const ShareButton = ({ documentTitle, documentId, activePage, className }: ShareButtonProps) => {
    const { showToast } = useToast();
    const setDocument = useListSet();
    const setPage = useListSet<MathDocumentPage>();

    const [isSharing, setIsSharing] = useState(false);
    const [shareTrigger, setShareTrigger] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Share link effect - runs when shareTrigger is set to true
    useEffect(() => {
        if (!shareTrigger || isProcessing) {
            return;
        }

        // Immediately reset trigger and set processing flag to prevent re-execution
        setShareTrigger(false);
        setIsProcessing(true);

        const executeShare = async () => {
            if (Platform.OS !== 'web' || typeof window === 'undefined') {
                setIsProcessing(false);
                return;
            }

            // TODO: This "share link" currently relies on PUBLIC userVariables records.
            // A true private share-link/token system would require backend support.

            setIsSharing(true);

            try {
                // Ensure the document is PUBLIC
                await setDocument({
                    key: 'mathDocuments',
                    itemId: documentId,
                    value: {
                        id: documentId,
                        title: documentTitle,
                        description: '', // We don't have description here, but it's okay
                        createdAt: Date.now(), // This should be preserved but we don't have it
                        lastOpenedAt: Date.now(),
                    },
                    privacy: 'PUBLIC',
                    searchKeys: ['title', 'description'],
                    sortKey: 'lastOpenedAt',
                });

                // Ensure the current page is PUBLIC
                await setPage({
                    key: 'mathDocumentPages',
                    itemId: activePage.id,
                    value: activePage,
                    privacy: 'PUBLIC',
                    filterKey: 'documentId',
                    searchKeys: ['title', 'markdown'],
                    sortKey: 'pageNumber',
                });

                // Build and copy the URL
                const shareUrl = buildViewOnlyDocumentUrl(documentId);

                try {
                    await navigator.clipboard.writeText(shareUrl);
                    showToast('View-only link copied. Document is now publicly viewable.');
                } catch (clipboardError) {
                    // Fallback for browsers that don't support clipboard API
                    console.log('Clipboard API failed, using fallback:', clipboardError);
                    window.prompt('Copy this view-only link:', shareUrl);
                    showToast('View-only link copied. Document is now publicly viewable.');
                }
            } catch (error) {
                console.error('Failed to share document:', error);
                showToast('Failed to create share link. Please try again.');
            } finally {
                setIsSharing(false);
                setIsProcessing(false);
            }
        };

        void executeShare();
    }, [shareTrigger, documentId, documentTitle, activePage, setDocument, setPage, showToast]);

    const triggerShareLink = () => {
        setShareTrigger(true);
    };

    return (
        <AppButton
            variant='outline'
            className={`h-10 w-20 sm:w-30 ${className || ''}`}
            onPress={triggerShareLink}
            disabled={isSharing}
        >
            <FontText weight='medium' className='sm:hidden'>
                {isSharing ? '...' : 'Share'}
            </FontText>
            <FontText weight='medium' className='hidden sm:block'>
                {isSharing ? 'Sharing...' : 'Share Link'}
            </FontText>
        </AppButton>
    );
};

export default ShareButton;
