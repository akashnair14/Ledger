import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Official Business Ledger & Accounting Blog",
  description: "Read the latest tips, guides, and tutorials on customer credit management, small business accounting, and digital bahi khata best practices.",
  alternates: {
    canonical: "https://ledgermanager.vercel.app/blog",
  },
};

const posts = [
  {
    title: "Understanding Digital Ledger Apps: A Complete Guide for Modern Businesses",
    slug: "digital-ledger",
    description: "Learn how switching to a digital ledger can eliminate accounting errors and streamline your cash flow tracking.",
  },
  {
    title: "How to Choose the Best Khata Book App for Your Retail Shop",
    slug: "khata-book",
    description: "A detailed comparison of digital khata apps vs traditional paper ledgers for micro and small enterprises.",
  },
  {
    title: "Efficient Payment Tracking: Tips to Improve Receivables and Dues Recovery",
    slug: "payment-tracking",
    description: "Proven strategies for self-employed creators and freelancers to collect client payments faster.",
  },
  {
    title: "Small Business Accounting 101: Simple Ledger Management for Beginners",
    slug: "business-accounting",
    description: "Everything you need to get started with basic invoicing, expense logs, and profit metric calculations.",
  },
  {
    title: "Mastering Customer Credit Management: Limits, Reminders, and Statements",
    slug: "customer-credit-management",
    description: "How to set up customer transaction boundaries and share PDF statements to clear debts gracefully.",
  },
];

export default function BlogListingPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "8rem auto 4rem", padding: "0 2rem", color: "white" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--primary, #f05c38)" }}>LedgerManager Blog</h1>
      <p style={{ color: "#94a3b8", marginBottom: "3rem", fontSize: "1.1rem" }}>
        Guides and tips to optimize your small business accounting, billing credits, and payment directories.
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {posts.map((post) => (
          <article key={post.slug} style={{ borderBottom: "1px solid #334155", paddingBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
              <Link href={`/blog/${post.slug}`} style={{ color: "white", textDecoration: "none" }} hover-style={{ color: "var(--primary)" }}>
                {post.title}
              </Link>
            </h2>
            <p style={{ color: "#94a3b8", marginBottom: "1rem", fontSize: "0.95rem" }}>{post.description}</p>
            <Link href={`/blog/${post.slug}`} style={{ color: "var(--primary, #f05c38)", fontWeight: "600", textDecoration: "none" }}>
              Read Article →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
