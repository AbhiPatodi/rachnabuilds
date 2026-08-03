import type { NextConfig } from "next";

// Turbopack spawns PostCSS child processes via PATH 'node'. Force v20 first
// so those children don't pick up the system Node v14.17.4.
const NVM_V20 = '/Users/abhipatodi/.nvm/versions/node/v20.20.2/bin';
if (process.env.PATH && !process.env.PATH.startsWith(NVM_V20)) {
  process.env.PATH = `${NVM_V20}:${process.env.PATH}`;
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
