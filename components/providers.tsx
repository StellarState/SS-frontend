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
import { PlatformOnboardingTour } from "@/components/onboarding/PlatformOnboardingTour";
import i18n from "@/src/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
          // #281 — surface every failed mutation as a toast notification
          mutations: { onError: notifyApiError },
        },
      }),
  );

  // Set document.documentElement.lang on mount and when i18n language changes
  useEffect(() => {
    // Initialize language from localStorage if available
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage && ["en", "es", "fr"].includes(storedLanguage)) {
      i18n.changeLanguage(storedLanguage);
    } else {
      // Detect from navigator.language
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
          {/* #379 — one shared wallet session for the whole app */}
          <WalletProvider>
            {/* #610 — global wrong-network detection and transaction guard */}
            <NetworkMismatchProvider>
              <AuthProvider>
                {/* #437 — one shared display currency + live XLM/USD rate for the app */}
                <CurrencyProvider>
                  <AccreditationProvider>
                    {children}
                    <PlatformOnboardingTour />
                    <Toaster position="top-right" />
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
