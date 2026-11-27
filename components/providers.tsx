"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { notifyApiError } from "@/lib/apiErrors";
import { I18nextProvider } from "react-i18next";

import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { NetworkMismatchProvider } from "@/context/NetworkMismatchContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AccreditationProvider } from "@/context/AccreditationContext";
import { PreferencesProvider } from "@/context/PreferencesContext";
import { PlatformOnboardingTour } from "@/components/onboarding/PlatformOnboardingTour";
import { RateLimitedToast } from "@/components/RateLimitedToast";
import i18n from "@/src/i18n";
import { initSentry, setRouteContext, setWalletNetworkContext } from "@/src/monitoring/sentry";
import { useWallet } from "@/context/WalletContext";
import { usePathname } from "next/navigation";

function SentryContextBridge() {
  const { address, network } = useWallet();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      setRouteContext(pathname);
    }
  }, [pathname]);

  useEffect(() => {
    setWalletNetworkContext({ address, network });
  }, [address, network]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
          mutations: { onError: notifyApiError },
        },
      }),
  );

  useEffect(() => {
    initSentry();
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage && ["en", "es", "fr"].includes(storedLanguage)) {
      i18n.changeLanguage(storedLanguage);
    } else {
      const navLang = navigator.language.split("-")[0];
      if (["en", "es", "fr"].includes(navLang)) {
        i18n.changeLanguage(navLang);
        localStorage.setItem("language", navLang);
      }
    }

    document.documentElement.lang = i18n.language;
    const handleLanguageChanged = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          {/* #379: one shared wallet session for the whole app */}
          <WalletProvider>
            <SentryContextBridge />
            {/* #610: global wrong-network detection and transaction guard */}
            <NetworkMismatchProvider>
              <AuthProvider>
                {/* #437: one shared display currency + live XLM/USD rate */}
                <CurrencyProvider>
                  <AccreditationProvider>
                    <PreferencesProvider>
                      {children}
                      <PlatformOnboardingTour />
                      <RateLimitedToast />
                      <Toaster position="top-right" />
                    </PreferencesProvider>
                  </AccreditationProvider>
                </CurrencyProvider>
              </AuthProvider>
            </NetworkMismatchProvider>
          </WalletProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
