import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const WebDropdownPortalContext = createContext<HTMLElement | null>(null);

interface WebDropdownProviderProps {
    children: React.ReactNode;
}

const PORTAL_ELEMENT_ID = 'app-web-dropdown-portal-root';

export const WebDropdownProvider = ({ children }: WebDropdownProviderProps) => {
    const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            return;
        }

        const existingPortalElement = document.getElementById(PORTAL_ELEMENT_ID);
        const nextPortalElement = existingPortalElement ?? document.createElement('div');

        if (!existingPortalElement) {
            nextPortalElement.id = PORTAL_ELEMENT_ID;
            nextPortalElement.style.inset = '0';
            nextPortalElement.style.pointerEvents = 'none';
            nextPortalElement.style.position = 'fixed';
            nextPortalElement.style.zIndex = '2147483647';
            document.body.appendChild(nextPortalElement);
        }

        setPortalElement(nextPortalElement);

        return () => {
            if (!existingPortalElement && nextPortalElement.parentNode) {
                nextPortalElement.parentNode.removeChild(nextPortalElement);
            }
        };
    }, []);

    return (
        <WebDropdownPortalContext.Provider value={portalElement}>
            {children}
        </WebDropdownPortalContext.Provider>
    );
};

export const useWebDropdownPortalElement = () => useContext(WebDropdownPortalContext);

interface WebDropdownPortalProps {
    children: React.ReactNode;
}

export const WebDropdownPortal = ({ children }: WebDropdownPortalProps) => {
    const portalElement = useWebDropdownPortalElement();

    useEffect(() => {
        if (Platform.OS !== 'web' || !portalElement || !portalElement.parentNode) {
            return;
        }

        document.body.appendChild(portalElement);
    }, [portalElement]);

    if (Platform.OS !== 'web' || !portalElement) {
        return null;
    }

    const { createPortal } = require('react-dom');

    return createPortal(children, portalElement);
};
