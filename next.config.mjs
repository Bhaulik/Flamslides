/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_OPEN_AI_KEY: process.env.NEXT_PUBLIC_OPEN_AI_KEY,
  },
  // Enable static exports
  output: 'export',
  // Configure images for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
