import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
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
    // next-themes writes the theme class onto <html> from an inline script that
    // runs before hydration, so this element must opt out of mismatch warnings.
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <Navbar />
            <MobileNav />
            {children}
            <Toaster />
            {/* Bottom padding for mobile tab bar */}
            <div className="h-14 md:hidden" />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}