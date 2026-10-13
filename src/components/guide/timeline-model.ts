/** Pure model of a shipment's life-cycle timeline, derived from its status and the few timestamps we store. */

export const TIMELINE_KEYS = ["created", "extracted", "approved", "exported", "imported", "assessed", "paid", "corridor", "released", "closed"] as const;
export type TimelineKey = (typeof TIMELINE_KEYS)[number];

const RANK: Record<string, number> = {
  draft: 0,
  extracting: 1,
  review_lines: 2,
  classifying: 3,
  calculating: 4,
  awaiting_approval: 5,
  approved: 6,
  exported: 7,
  imported_to_ecustoms: 8,
  assessed: 9,
  paid: 10,
  corridor_green: 11,
  corridor_blue: 11,
  corridor_yellow: 11,
  corridor_red: 11,
  released: 12,
  closed: 13,
};

/** Minimum status rank at which each milestone counts as reached. */
const THRESHOLD: Record<TimelineKey, number> = {
  created: 0,
  extracted: 2,
  approved: 6,
  exported: 7,
  imported: 8,
  assessed: 9,
  paid: 10,
  corridor: 11,
  released: 12,
  closed: 13,
};

export type TimelineState = "done" | "current" | "todo";
export type TimelineEvent = { key: TimelineKey; state: TimelineState; at: Date | null };

export type TimelineInput = {
  status: string;
  createdAt: Date;
  /** latest finished invoice extraction (document row), when known */
  extractedAt?: Date | null;
  approvedAt?: Date | null;
  /** first generated export file */
  exportedAt?: Date | null;
  releasedAt?: Date | null;
  closedAt?: Date | null;
};

export function buildTimeline(i: TimelineInput): TimelineEvent[] {
  const rank = RANK[i.status] ?? 0;
  const times: Partial<Record<TimelineKey, Date | null | undefined>> = {
    created: i.createdAt,
    extracted: i.extractedAt,
    approved: i.approvedAt,
    exported: i.exportedAt,
    released: i.releasedAt,
    closed: i.closedAt,
  };
  let currentAssigned = false;
  return TIMELINE_KEYS.map((key) => {
    const at = times[key] ?? null;
    const done = rank >= THRESHOLD[key] || (key === "released" && !!i.releasedAt) || (key === "closed" && !!i.closedAt);
    let state: TimelineState = "todo";
    if (done) state = "done";
    else if (!currentAssigned && i.status !== "cancelled") {
      state = "current";
      currentAssigned = true;
    }
    return { key, state, at };
  });
}
