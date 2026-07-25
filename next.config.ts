import type { NextConfig } from "next";

const defaultRuntimeCaching = require('next-pwa/cache');

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  publicExcludes: ['!dashboard/**/*', '!settings/**/*', '!customers/**/*', '!transactions/**/*', '!analytics/**/*'],
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
      handler: 'NetworkOnly',
    },
    ...defaultRuntimeCaching
  ]
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/features', destination: '/#features' },
      { source: '/faq', destination: '/#faq' },
      { source: '/pricing', destination: '/#seo-deepdive' },
      { source: '/contact', destination: '/docs#faq' },
      { source: '/user-guide', destination: '/docs' },
    ];
  },
};

module.exports = withPWA(nextConfig);
