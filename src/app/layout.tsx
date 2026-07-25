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
  metadataBase: new URL('https://ledgermanager.vercel.app'),
  title: "LedgerManager - Secure Personal Ledger & Khata Book",
  description: "Secure, offline-first personal ledger management. Track customer credits, supplier payments, and business logs with local data ownership.",
  keywords: ['ledger manager', 'khata book', 'credit ledger', 'debt tracker', 'business accounts', 'offline-first ledger', 'digital ledger'],
  manifest: "/manifest.json",
  openGraph: {
    title: "LedgerManager - Secure Personal Ledger & Khata Book",
    description: "Secure, offline-first personal ledger management. Keep track of transaction history and balances.",
    url: "https://ledgermanager.vercel.app",
    siteName: "LedgerManager",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LedgerManager - Secure Personal Ledger & Khata Book",
    description: "Secure, offline-first personal ledger management. Keep track of transaction history and balances.",
  },
  icons: {
    icon: [
      { url: '/appstore-images/ios/16.png', sizes: '16x16', type: 'image/png' },
      { url: '/appstore-images/ios/32.png', sizes: '32x32', type: 'image/png' },
      { url: '/appstore-images/android/launchericon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/appstore-images/android/launchericon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/appstore-images/ios/152.png', sizes: '152x152', type: 'image/png' },
      { url: '/appstore-images/ios/167.png', sizes: '167x167', type: 'image/png' },
      { url: '/appstore-images/ios/180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
