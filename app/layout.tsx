import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar, Footer, SkipLinks, RouteFocus } from "@/components/layout";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NetworkBanner } from "@/components/network/NetworkBanner";
import { EscapeBanner } from "@/components/escape/EscapeBanner";
import { buildPreferencesScript } from "@/lib/preferences-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarSettle",
  description: "Modern web interface for decentralized invoice financing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* #650/#651 — apply stored display preferences before first paint so
            there is no layout shift. Built from a pure, unit-tested builder. */}
        <script dangerouslySetInnerHTML={{ __html: buildPreferencesScript() }} />
      </head>
      <body>
        <TooltipProvider>
          <Providers>
            {/* #652: the skip links must be the first Tab stop on every route. */}
            <SkipLinks />
            <RouteFocus />
            {/* #443 — shown on every page while the testnet is selected */}
            <NetworkBanner />
            {/* #592 — protocol pause / escape hatch countdown */}
            <EscapeBanner />
            <Navbar />
            {children}
            <Footer />
            <Toaster />
          </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
