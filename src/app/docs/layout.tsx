import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation & User Guide",
  description: "Learn how to use LedgerManager to manage your business credit ledgers, track customer payments, generate PDF statements, and handle offline-first transactions.",
  alternates: {
    canonical: "https://ledgermanager.vercel.app/docs",
  },
};

export default function DocsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
