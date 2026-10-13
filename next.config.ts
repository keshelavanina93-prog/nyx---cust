import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // standalone output is used by the Cloud Run Dockerfile; skipped on Windows dev machines (symlink EPERM during trace)
  output: process.env.NEXT_OUTPUT_STANDALONE === "false" || (process.platform === "win32" && !process.env.NEXT_OUTPUT_STANDALONE) ? undefined : "standalone",
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "exceljs", "@google-cloud/storage"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default withNextIntl(nextConfig);
