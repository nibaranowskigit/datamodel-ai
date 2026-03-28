import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/fields', destination: '/data-model/fields', permanent: false },
    ];
  },
};

export default nextConfig;
