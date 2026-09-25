import type { Metadata } from "next";
import { Providers } from "@/components/providers";
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
    <html lang="en">
      <body>
        {/* First tab stop: lets keyboard users bypass the nav (SC 2.4.1). */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <Navbar />
          <MobileNav />
          {/* Every page renders its own <main>, so the skip target is this
              wrapper. tabIndex={-1} makes it programmatically focusable so
              the browser moves the caret and announces the content. */}
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <Toaster />
          {/* Bottom padding for mobile tab bar */}
          <div className="h-14 md:hidden" />
        </Providers>
      </body>
    </html>
  );
}
