export const STEPS = ["intake", "lines", "hs", "calc", "approve", "export", "ecustoms", "payment", "corridor", "close"] as const;
export type StepKey = (typeof STEPS)[number];

/** Highest step index reachable for a shipment status. */
export function stepIndexForStatus(status: string): number {
  switch (status) {
    case "draft":
    case "extracting":
      return 0;
    case "review_lines":
      return 1;
    case "classifying":
      return 2;
    case "calculating":
      return 3;
    case "awaiting_approval":
      return 4;
    case "approved":
      return 5;
    case "exported":
      return 6;
    case "imported_to_ecustoms":
    case "assessed":
      return 7;
    case "paid":
      return 8;
    case "corridor_green":
    case "corridor_blue":
    case "corridor_yellow":
    case "corridor_red":
    case "released":
      return 9;
    case "closed":
      return 9;
    default:
      return 0;
  }
}

export const STATUS_TONE: Record<string, "neutral" | "ok" | "warn" | "danger" | "info" | "brand"> = {
  draft: "neutral",
  extracting: "info",
  review_lines: "info",
  classifying: "info",
  calculating: "info",
  awaiting_approval: "warn",
  approved: "ok",
  exported: "ok",
  imported_to_ecustoms: "ok",
  assessed: "ok",
  paid: "ok",
  corridor_green: "ok",
  corridor_blue: "info",
  corridor_yellow: "warn",
  corridor_red: "danger",
  released: "ok",
  closed: "neutral",
  cancelled: "neutral",
};
