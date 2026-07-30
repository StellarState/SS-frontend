import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import { GlobalErrorBoundary } from "@/components/ui/GlobalErrorBoundary";
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
        <GlobalErrorBoundary>
          <Providers>
            <Navbar />
            {children}
            <Toaster />
          </Providers>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
