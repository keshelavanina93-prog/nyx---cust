import type { VercelConfig } from "@vercel/config/v1";

/**
 * Vercel project config. Daily NBG FX sync (Phase 3) — rule VERIFIED (Customs Code art.8),
 * endpoint UNVERIFIED (NBG_RATES_URL). Protect with CRON_SECRET.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  crons: [{ path: "/api/cron/nbg", schedule: "15 6 * * *" }],
};
