import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { BookProvider } from "@/context/BookContext";
import { AppLock } from "@/components/auth/AppLock";
import { Shell } from "@/components/layout/Shell";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: '--font-fraunces',
  weight: ['400', '600', '700', '800']
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: '--font-hanken'
});

const spaceMono = Space_Mono({
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
    statusBarStyle: "default",
    title: "LedgerManager",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f1d",
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
      <body className={`${fraunces.variable} ${hanken.variable} ${spaceMono.variable}`}>
        <ThemeProvider>
          <BookProvider>
            <AppLock>
              <Shell>{children}</Shell>
            </AppLock>
          </BookProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
