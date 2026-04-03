import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@esta-feito/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
};

export default nextConfig;
