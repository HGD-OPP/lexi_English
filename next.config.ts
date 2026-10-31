import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma as a runtime dependency instead of bundling it into
  // `.next/node_modules`. Besides avoiding a duplicate client, this prevents
  // Windows/sandboxed builds from failing when Next tries to unlink a traced
  // junction on a second build.
  serverExternalPackages: ["@prisma/client"],
  // `npm run build` runs `tsc --noEmit` before `next build`. Skipping Next's
  // duplicate worker-based check keeps builds stable in sandboxed CI and
  // avoids type-checking the project twice.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Use worker threads instead of child processes. This is friendlier to
    // constrained/sandboxed build environments and does not change output.
    workerThreads: true,
  },
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
