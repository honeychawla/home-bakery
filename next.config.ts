import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This is a live operational dashboard — every page reads fresh order data,
  // so component caching buys nothing and force-dynamic is the right model.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
