import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/docs', '/login', '/forgot-password', '/reset-password', '/blog'],
      disallow: [
        '/dashboard',
        '/customers/',
        '/settings',
        '/transactions',
        '/analytics',
        '/offline',
        '/auth/',
      ],
    },
    sitemap: 'https://ledgermanager.vercel.app/sitemap.xml',
  };
}
