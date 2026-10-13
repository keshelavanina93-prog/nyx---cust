/** Dashboard status groups (used by the KPI maths on the server and by the filter chips on the client). */
export const STATUS_GROUPS = {
  draft: ["draft"],
  working: ["extracting", "review_lines", "classifying", "calculating"],
  awaiting: ["awaiting_approval"],
  customs: ["approved", "exported", "imported_to_ecustoms", "assessed", "paid", "corridor_green", "corridor_blue", "corridor_yellow", "corridor_red"],
  done: ["released", "closed", "cancelled"],
} as const satisfies Record<string, readonly string[]>;

export type StatusGroup = keyof typeof STATUS_GROUPS;
export const STATUS_GROUP_KEYS = Object.keys(STATUS_GROUPS) as StatusGroup[];

const DONE = new Set<string>(STATUS_GROUPS.done);

/** A shipment is "in progress" until it is released, closed or cancelled. */
export const isInProgress = (status: string) => !DONE.has(status);
