import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Recover your LedgerManager account password securely.",
  alternates: {
    canonical: "https://ledgermanager.vercel.app/forgot-password",
  },
};

export default function ForgotPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
