import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

const postData: Record<string, { title: string; description: string; content: string }> = {
  "digital-ledger": {
    title: "Understanding Digital Ledger Apps: A Complete Guide for Modern Businesses",
    description: "Learn how switching to a digital ledger can eliminate accounting errors and streamline your cash flow tracking.",
    content: "Content architecture for Digital Ledger App guide.",
  },
  "khata-book": {
    title: "How to Choose the Best Khata Book App for Your Retail Shop",
    description: "A detailed comparison of digital khata apps vs traditional paper ledgers for micro and small enterprises.",
    content: "Content architecture for Khata Book app guide.",
  },
  "payment-tracking": {
    title: "Efficient Payment Tracking: Tips to Improve Receivables and Dues Recovery",
    description: "Proven strategies for self-employed creators and freelancers to collect client payments faster.",
    content: "Content architecture for Payment Tracker systems guide.",
  },
  "business-accounting": {
    title: "Small Business Accounting 101: Simple Ledger Management for Beginners",
    description: "Everything you need to get started with basic invoicing, expense logs, and profit metric calculations.",
    content: "Content architecture for Small Business Accounting guides.",
  },
  "customer-credit-management": {
    title: "Mastering Customer Credit Management: Limits, Reminders, and Statements",
    description: "How to set up customer transaction boundaries and share PDF statements to clear debts gracefully.",
    content: "Content architecture for Customer Credit Manager limits.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = postData[slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://ledgermanager.vercel.app/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://ledgermanager.vercel.app/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = postData[slug];
  if (!post) notFound();

  return (
    <div style={{ maxWidth: "800px", margin: "8rem auto 4rem", padding: "0 2rem", color: "white" }}>
      <Link href="/blog" style={{ color: "var(--primary, #f05c38)", textDecoration: "none", marginBottom: "2rem", display: "inline-block" }}>
        ← Back to Blog
      </Link>
      <article>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1.5rem", color: "white" }}>{post.title}</h1>
        <p style={{ fontSize: "1.2rem", color: "#94a3b8", fontStyle: "italic", marginBottom: "2rem", lineHeight: "1.6" }}>
          {post.description}
        </p>
        <div style={{ borderTop: "1px solid #334155", paddingTop: "2rem", color: "#cbd5e1", lineHeight: "1.8" }}>
          <p>{post.content}</p>
          <p style={{ marginTop: "2rem" }}>
            <em>This is a placeholder for the future article. The dynamic routing and metadata SEO tags are fully initialized.</em>
          </p>
        </div>
      </article>
    </div>
  );
}

export async function generateStaticParams() {
  return Object.keys(postData).map((slug) => ({
    slug,
  }));
}
