/** Phase 2 intake adapters (email / Telegram / Viber). Confirmation happens ONLY in the web app. */
export type IntakeFile = { name: string; mime: string; data: Buffer };

export type IntakeEnvelope = {
  kind: "email" | "telegram" | "viber";
  /** channel address (email) or chat id (telegram/viber) */
  address: string;
  from: string;
  externalId: string;
  subject?: string | null;
  text?: string | null;
  files: IntakeFile[];
  rawMeta?: unknown;
  /** one-time link code (`/start <code>`) for chat bots */
  linkCode?: string | null;
};

export type IntakeResult = { status: "attached" | "ignored" | "error" | "linked"; shipmentId?: string; reason?: string; replyText?: string };

export interface IntakeAdapter {
  kind: "email" | "telegram" | "viber";
  /** Verify the webhook authenticity (shared secret / signature). */
  verify(req: Request, rawBody: string): Promise<boolean>;
  /** Parse the webhook body into envelopes (may fetch files). */
  parse(rawBody: string, req: Request): Promise<IntakeEnvelope[]>;
  /** Reply to the sender (status + link). */
  reply(envelope: IntakeEnvelope, result: IntakeResult): Promise<void>;
}
