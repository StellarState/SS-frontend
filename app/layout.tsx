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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <MobileNav />
          {children}
          <Toaster />
          {/* Bottom padding for mobile tab bar */}
          <div className="h-14 md:hidden" />
        </Providers>
      </body>
    </html>
  );
}
