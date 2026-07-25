import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your LedgerManager account to securely sync your digital ledger and khata book.",
  alternates: {
    canonical: "https://ledgermanager.vercel.app/login",
  },
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
