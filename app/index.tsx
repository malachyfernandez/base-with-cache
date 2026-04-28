import { Platform, View } from "react-native";
import { SafeAreaListener, SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { SignedIn, SignedOut, useClerk, useOAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Uniwind } from "uniwind";

import AuthButton from "./components/ui/buttons/AuthButton";
import AuthFailureFallback from "./components/AuthFailureFallback";
import Column from "./components/layout/Column";
import MainPage from "./components/MainPage";
import FontText from "./components/ui/text/FontText";

const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function HomeScreen() {
  useWarmUpBrowser();
  const { user, isLoaded: isClerkLoaded } = useUser();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const { buildSignInUrl } = useClerk();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const hasEmail = !!user?.primaryEmailAddress?.emailAddress;
  const needsReload = isClerkLoaded && waited && !hasEmail;

  // Wait for Convex auth after Clerk sign-in (for new-tab auth flow)
  const isAuthSyncing = isClerkLoaded && !isConvexAuthLoading && !isConvexAuthenticated;

  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: "oauth_google" });
  const authFlow = async () => {
    if (Platform.OS === "web") {
      // Open in new tab instead of popup
      const redirectUrl = AuthSession.makeRedirectUri({ path: "auth/callback" });
      const signInUrl = buildSignInUrl({
        redirectUrl,
      });
      window.open(signInUrl, "_blank");
      return { createdSessionId: undefined, setActive: undefined };
    }
    return startGoogleFlow();
  };

  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        Uniwind.updateInsets(insets);
      }}
    >
      <View className="flex-1 bg-outer-background">
        <SafeAreaView className="flex-1">
          <View className="w-full h-full items-center justify-center">
            <SignedIn>
              {needsReload || isAuthSyncing ? (
                <AuthFailureFallback />
              ) : (
                <MainPage />
              )}
            </SignedIn>

            <SignedOut>
              <Column className="gap-6 items-center bg-background border-2 border-border rounded-xl p-6 w-[80vw] max-w-96">
                <FontText className="text-2xl font-bold text-center mt-4" color="text">Base Project</FontText>
                <FontText className="text-lg text-center" color="text">Sign in with Google to continue.</FontText>
                <Column className="gap-8 items-center mb-4">
                  <AuthButton
                    authFlow={authFlow}
                    buttonText="Sign in with Google"
                  />
                </Column>
              </Column>
            </SignedOut>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaListener>
  );
}

// // ============================================================================
// // DEV NUKE COMPONENT - Uncomment entire section to enable
// // ============================================================================
// import { SafeAreaView } from "react-native-safe-area-context";
// import React from "react";

// import MainPage from "./components/MainPage";
// import DatabaseNukeButton from "./components/dev/DatabaseNukeButton";
// import { useNukeDatabase, useTableCounts } from "../hooks/useNukeDatabase";

// export default function DevNukeScreen() {


//   return (
//     <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
//       <DatabaseNukeButton />


//     </SafeAreaView>
//   );
// }
