

import "../polyfills";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Slot } from "expo-router";
import { HeroUINativeProvider } from "heroui-native/provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PortalHost } from "@rn-primitives/portal";
import { tokenCache } from '../utils/tokenCache';
import { ToastProvider } from '../contexts/ToastContext';
import { useGlobalRateLimitMonitor } from '../hooks/useRateLimitMonitor';
import { GenerationProvider } from '../contexts/GenerationContext';
import { WebDropdownProvider } from '../contexts/WebDropdownProvider';
import { DataProvider } from '../contexts/DataProvider';
import { useEffect } from "react";
import "../global.css";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Component to initialize global rate limit monitoring
function GlobalRateLimitMonitor() {
  useGlobalRateLimitMonitor();
  return null;
}

function WebThemeColorSync() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Set page title
    if (typeof document !== 'undefined') {
      document.title = 'Base Project';
    }
    const previousTitle = document.title;
    const themeColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-outer-background")
      .trim() || "rgb(30, 30, 30)";

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlBackgroundColor = html.style.backgroundColor;
    const previousBodyBackgroundColor = body.style.backgroundColor;
    const previousColorScheme = html.style.colorScheme;

    html.style.backgroundColor = themeColor;
    body.style.backgroundColor = themeColor;
    html.style.colorScheme = "light";

    const upsertMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      const created = !meta;
      const previousContent = meta?.content;

      if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
      }

      meta.content = content;

      return () => {
        if (!meta) return;
        if (created) {
          meta.remove();
          return;
        }
        meta.content = previousContent ?? "";
      };
    };

    const restoreThemeColor = upsertMeta("theme-color", themeColor);
    const restoreAppleStatusBar = upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");

    // Inject favicon links
    const upsertLink = (rel: string, href: string, type?: string, sizes?: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      const created = !link;
      const previousHref = link?.href;
      const previousType = link?.type;
      const previousSizes = link?.sizes?.toString();

      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }

      link.href = href;
      if (type) link.type = type;
      if (sizes) link.sizes = sizes;

      return () => {
        if (!link) return;
        if (created) {
          link.remove();
          return;
        }
        link.href = previousHref ?? "";
        link.type = previousType ?? "";
        if (sizes) link.sizes = previousSizes ?? "";
      };
    };

    const restoreFavicon = upsertLink("icon", "/favicon.svg", "image/svg+xml");
    const restoreFaviconPng = upsertLink("shortcut icon", "/favicon.png", "image/png");

    return () => {
      document.title = previousTitle;
      restoreThemeColor();
      restoreAppleStatusBar();
      restoreFavicon();
      restoreFaviconPng();
      html.style.backgroundColor = previousHtmlBackgroundColor;
      body.style.backgroundColor = previousBodyBackgroundColor;
      html.style.colorScheme = previousColorScheme;
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GenerationProvider>
        <ToastProvider>
          <GlobalRateLimitMonitor />
          <WebThemeColorSync />
          <HeroUINativeProvider
            config={{
              devInfo: {
                stylingPrinciples: false,
              },
            }}
          >
            <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
              <ClerkLoaded>
                <WebDropdownProvider>
                  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                    <DataProvider>
                      <Slot />
                      <PortalHost />
                    </DataProvider>
                  </ConvexProviderWithClerk>
                </WebDropdownProvider>
              </ClerkLoaded>
            </ClerkProvider>
          </HeroUINativeProvider>
        </ToastProvider>
      </GenerationProvider>
    </GestureHandlerRootView>
  );
}
