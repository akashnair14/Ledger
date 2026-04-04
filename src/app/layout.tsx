import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { BookProvider } from "@/context/BookContext";
import { AppLock } from "@/components/auth/AppLock";
import { AuthStateListener } from "@/components/auth/AuthStateListener";
import { Shell } from "@/components/layout/Shell";
import { ToastProvider } from "@/context/ToastContext";
import { SettingsSync } from "@/components/layout/SettingsSync";
import { AuthGuard } from "@/components/auth/AuthGuard";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: '--font-display',
  weight: ['400', '600', '700', '800']
});

const bodyFont = Instrument_Sans({
  subsets: ["latin"],
  variable: '--font-body'
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-mono',
  weight: ['400', '700']
});

export const metadata: Metadata = {
  title: "LedgerManager - Personal Ledger",
  description: "Secure, offline-first personal ledger management.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LedgerManager",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#06090A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          <BookProvider>
            <ToastProvider>
              <AppLock>
                <SettingsSync />
                <AuthStateListener />
                <AuthGuard>
                  <Shell>{children}</Shell>
                </AuthGuard>
              </AppLock>
            </ToastProvider>
          </BookProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
