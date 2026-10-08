import type { NextConfig } from "next";

// Turbopack spawns PostCSS child processes via PATH 'node'. Force v20 first
// so those children don't pick up the system Node v14.17.4.
const NVM_V20 = '/Users/abhipatodi/.nvm/versions/node/v20.20.2/bin';
if (process.env.PATH && !process.env.PATH.startsWith(NVM_V20)) {
  process.env.PATH = `${NVM_V20}:${process.env.PATH}`;
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only our own pages may frame us (portal embeds same-origin prototypes)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json in the parent folder
  // makes Turbopack pick the wrong root and 404 every route in dev.
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
