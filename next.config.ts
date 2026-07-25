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
  /* config options here */
};

module.exports = withPWA(nextConfig);
