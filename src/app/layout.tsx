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
  title: {
    default: "LedgerManager | Free Digital Ledger & Khata Book for Small Businesses",
    template: "%s | LedgerManager",
  },
  description: "Manage customers, payments, and business ledgers with LedgerManager. Offline-first digital khata book with cloud sync, PDF statements, analytics, and secure backups.",
  keywords: ['ledger manager', 'khata book', 'credit ledger', 'debt tracker', 'business accounts', 'offline-first ledger', 'digital ledger', 'small business ledger'],
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://ledgermanager.vercel.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "LedgerManager | Free Digital Ledger & Khata Book for Small Businesses",
    description: "Manage customers, payments, and business ledgers with LedgerManager. Offline-first digital khata book with cloud sync, PDF statements, analytics, and secure backups.",
    url: "https://ledgermanager.vercel.app",
    siteName: "LedgerManager",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/app_logo.jpeg",
        width: 1200,
        height: 630,
        alt: "LedgerManager App Logo",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LedgerManager | Free Digital Ledger & Khata Book for Small Businesses",
    description: "Manage customers, payments, and business ledgers with LedgerManager. Offline-first digital khata book with cloud sync, PDF statements, analytics, and secure backups.",
    images: ["/app_logo.jpeg"],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/appstore-images/ios/16.png', sizes: '16x16', type: 'image/png' },
      { url: '/appstore-images/ios/32.png', sizes: '32x32', type: 'image/png' },
      { url: '/appstore-images/android/launchericon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/appstore-images/android/launchericon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/appstore-images/ios/180.png', sizes: '180x180', type: 'image/png' },
      { url: '/appstore-images/ios/152.png', sizes: '152x152', type: 'image/png' },
      { url: '/appstore-images/ios/167.png', sizes: '167x167', type: 'image/png' },
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
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
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
      <head>
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`
            }}
          />
        )}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');`
              }}
            />
          </>
        )}
        {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");`
            }}
          />
        )}
      </head>
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
