import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "baoxianjiance.cn" }],
        destination: "https://www.baoxianjiance.cn/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
