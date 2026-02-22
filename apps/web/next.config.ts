import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile shared packages from the monorepo
  transpilePackages: ["@eduplay/types", "@eduplay/utils"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google avatar
      },
    ],
  },

  // Allow CORS for API routes
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },

  // Webpack config for Ollama/LangChain
  webpack: (config) => {
    config.externals.push({
      "node:fs": "commonjs fs",
      "node:path": "commonjs path",
    });
    return config;
  },
};

export default nextConfig;
